// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Checks that a pull request's description contains the parts of .github/PULL_REQUEST_TEMPLATE.md that apply to the
// files it changes:
//
//   1. A "#### for <file name>" section is required whenever the pull request adds lines to quirks/<file name>. Lines
//      that were only moved, or that only lost a trailing comma (as when the last entry of a JSON object or array is
//      removed), don't count. Sections for other files may be removed or left as-is.
//
//   2. Every other section, like "Overall Checklist", is always required.
//
// Headings deeper than the template's "for <file name>" headings, like "##### Details" under "#### for ...", are part
// of the section above them.
//
// Within each required section:
//
//   - every checkbox from the template must be present and checked. Text is compared without Markdown links and code
//     formatting, so text copied from the rendered template matches, and without parenthetical asides, so they may be
//     removed or changed. A checkbox may also have text added after the template's text.
//   - checkboxes nested under a list item without a checkbox (e.g. "- One or more of the following:"), at the same
//     depth, form a group, and only one checkbox in the group needs to be present and checked.
//   - every "Label:" field left blank in the template must be filled in on the same line.
//
// The template is the single source of truth, so changing its wording doesn't require changing this script.
//
// Usage: node pull-request-template-check.js <template> <event.json> <changed-files.jsonl>
//
// <changed-files.jsonl> has one line per file the pull request changes, each a JSON object with the file's "filename",
// "additions", and "patch" from GitHub's API.

"use strict";

const fs = require("fs");
const path = require("path");

const [templatePath, eventPath, changedFilesPath] = process.argv.slice(2);
if (!templatePath || !eventPath || !changedFilesPath) {
    console.error("Usage: node pull-request-template-check.js <template> <event.json> <changed-files.jsonl>");
    process.exit(2);
}

// The description is untrusted, so these patterns only match a line's prefix, and the rest of the line is trimmed with
// string operations. Patterns like /\s+(.*?)\s*$/ can take hours to fail on a long line of spaces.
// Like GitHub, allows up to 3 spaces before a heading; 4 would make it code.
const headingPattern = /^ {0,3}#{1,6}\s/;
// Any list marker GitHub accepts: "-", "*", "+", "1.", or "1)".
const listMarkerPatternSource = String.raw`(?:[-*+]|\d{1,9}[.)])`;
// Also matches malformed checkboxes like "[x ]" so they can be reported clearly.
const checkboxPattern = new RegExp(String.raw`^\s*${listMarkerPatternSource}\s+\[([^\]]*)\]\s`);
// Allows indentation, a leading bullet, and bold or italic formatting, e.g. "  - **Download link:** https://...". A URL
// like "https://..." isn't a field.
const fieldPattern = new RegExp(
    String.raw`^\s*(?:${listMarkerPatternSource}\s+)?[*_]*([A-Za-z][^:\[\]*_]*?)[*_]*:(?!\/\/)[*_]*([\s\S]*)`);
const fencePattern = /^\s*(`{3,}|~{3,})/;
const fileHeadingPattern = /^for\s+(.+)$/i;
const listItemPattern = new RegExp(String.raw`^${listMarkerPatternSource}\s+`);

function normalize(text) {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function trimTrailingCharacters(text, characters) {
    let end = text.length;
    while (end > 0 && characters.includes(text[end - 1]))
        end--;

    return text.slice(0, end);
}

function headingTextFromLine(line, markerLength) {
    // Remove an optional closing sequence of #s, as in "## Heading ##".
    const text = line.slice(markerLength).trim();
    const textWithoutClosingSequence = trimTrailingCharacters(text, "#");
    return /\s$/.test(textWithoutClosingSequence) ? textWithoutClosingSequence.trim() : text;
}

function checkboxComparisonKey(text) {
    const textWithoutMarkdown = text.replace(/\[([^\[\]]*)\]\([^()]*\)/g, "$1").replace(/`/g, "");
    const textWithoutAsides = textWithoutMarkdown.replace(/\([^()]*\)/g, "");
    return trimTrailingCharacters(normalize(textWithoutAsides).replace(/ ([,.;:])/g, "$1"), ". ");
}

function removeHTMLComments(markdown) {
    let markdownWithoutComments = "";
    let searchStart = 0;
    while (searchStart < markdown.length) {
        const commentStart = markdown.indexOf("<!--", searchStart);
        if (commentStart === -1)
            return markdownWithoutComments + markdown.slice(searchStart);

        markdownWithoutComments += markdown.slice(searchStart, commentStart);

        const commentEnd = markdown.indexOf("-->", commentStart + 4);
        if (commentEnd === -1)
            return markdownWithoutComments;

        searchStart = commentEnd + 3;
    }
    return markdownWithoutComments;
}

function hasNewLines(changedFile) {
    // GitHub omits the patch for very large diffs.
    if (typeof changedFile.patch !== "string")
        return changedFile.additions > 0;

    const comparableLine = patchLine => trimTrailingCharacters(patchLine.slice(1), ", \t");
    const patchLines = changedFile.patch.split("\n");
    const removalCounts = new Map();
    for (const removedLine of patchLines.filter(patchLine => patchLine.startsWith("-")))
        removalCounts.set(comparableLine(removedLine), (removalCounts.get(comparableLine(removedLine)) ?? 0) + 1);
    for (const addedLine of patchLines.filter(patchLine => patchLine.startsWith("+"))) {
        const remainingRemovalCount = removalCounts.get(comparableLine(addedLine));
        if (!remainingRemovalCount)
            return true;
        removalCounts.set(comparableLine(addedLine), remainingRemovalCount - 1);
    }
    return false;
}

function findMatchingCheckbox(descriptionCheckboxes, templateCheckbox) {
    return descriptionCheckboxes.find(({ comparisonKey }) => comparisonKey.startsWith(templateCheckbox.comparisonKey));
}

// Returns a Map from normalized heading to { heading, depth, checkboxes, fields }.
// Headings deeper than sectionDepth are part of the section above them.
// Each checkbox's group is the list item it's nested under, if any, as { text, indentation }.
// Checkboxes nested more deeply than the group's first checkbox aren't part of the group, and less deeply nested lines
// end it.
// A checkbox's text continues onto following lines, as when it's hard-wrapped, until a blank line or a line that starts
// something else. Fenced code blocks, like pasted command output, are skipped, and only the first copy of a repeated
// heading is kept.
function parseSections(markdown, sectionDepth = Infinity) {
    const sections = new Map();
    let currentSection = null;
    let currentGroup = null;
    let openFence = null;
    // A list item without a checkbox starts a group if checkboxes are nested under it, and is otherwise a possible
    // field.
    let pendingListItem = null;
    let checkboxToContinue = null;

    function addField(fieldMatch) {
        if (fieldMatch) {
            const label = fieldMatch[1].trim();
            currentSection.fields.push({ label, comparisonKey: normalize(label), value: fieldMatch[2].trim() });
        }
    }
    function flushPendingListItem() {
        if (pendingListItem)
            addField(pendingListItem.fieldMatch);
        pendingListItem = null;
    }

    for (const line of removeHTMLComments(markdown).split(/\r?\n/)) {
        const fenceMatch = line.match(fencePattern);
        const textAfterFence = fenceMatch ? line.slice(fenceMatch[0].length) : "";
        if (openFence) {
            // Only a line with nothing but a long enough fence closes a code block.
            if (fenceMatch?.[1].startsWith(openFence) && !textAfterFence.trim())
                openFence = null;
            continue;
        }

        // A line like "```code```" is inline code, not the start of a code block.
        if (fenceMatch && !(fenceMatch[1][0] === "`" && textAfterFence.includes("`"))) {
            openFence = fenceMatch[1];
            checkboxToContinue = null;
            continue;
        }

        const headingMatch = line.match(headingPattern);
        if (headingMatch) {
            flushPendingListItem();
            checkboxToContinue = null;
            currentGroup = null;
            const headingDepth = headingMatch[0].trim().length;
            if (headingDepth > sectionDepth)
                continue;

            const heading = headingTextFromLine(line, headingMatch[0].length);
            currentSection = { heading, depth: headingDepth, checkboxes: [], fields: [] };
            if (!sections.has(normalize(heading)))
                sections.set(normalize(heading), currentSection);

            continue;
        }

        if (!line.trim()) {
            checkboxToContinue = null;
            continue;
        }

        if (!currentSection)
            continue;

        const indentation = line.length - line.trimStart().length;
        const isNested = indentation > 0;
        if (currentGroup && indentation < currentGroup.indentation)
            currentGroup = null;

        const checkboxMatch = line.match(checkboxPattern);
        const checkMark = checkboxMatch?.[1].toLowerCase();
        const isCheckbox = checkboxMatch && (checkMark.trim() === "" || checkMark.trim() === "x");
        if (isCheckbox) {
            if (isNested && pendingListItem) {
                currentGroup = { text: pendingListItem.text, indentation };
                pendingListItem = null;
            } else
                flushPendingListItem();

            const isInGroup = currentGroup && indentation === currentGroup.indentation;
            checkboxToContinue = {
                text: line.slice(checkboxMatch[0].length).trim(),
                isChecked: checkMark === "x",
                isMalformed: checkMark !== " " && checkMark !== "x",
                group: isInGroup ? currentGroup : null,
            };
            currentSection.checkboxes.push(checkboxToContinue);

            continue;
        }
        const fieldMatch = line.match(fieldPattern);
        const listItemMatch = line.match(listItemPattern);
        if (checkboxToContinue && !fieldMatch && !listItemMatch) {
            checkboxToContinue.text += " " + line.trim();
            continue;
        }
        checkboxToContinue = null;
        flushPendingListItem();
        if (listItemMatch)
            pendingListItem = { text: line.slice(listItemMatch[0].length).trim(), fieldMatch };
        else
            addField(fieldMatch);
    }

    flushPendingListItem();

    for (const section of sections.values()) {
        for (const checkbox of section.checkboxes)
            checkbox.comparisonKey = checkboxComparisonKey(checkbox.text);
    }

    return sections;
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));

// Until February 1, 2027, pull requests opened before this check was added are skipped, so they aren't held to template
// changes their authors never saw. The time of the event is when the pull request was last updated. Remove this after
// February 1, 2027.
// This check was added in #1892, which merged at this time.
const CHECK_PULL_REQUESTS_CREATED_SINCE = "2026-11-07T21:05:52Z";
const STOP_SKIPPING_OLDER_PULL_REQUESTS_AT = "2027-02-01T00:00:00Z";
const { created_at: createdAt, updated_at: updatedAt } = event.pull_request ?? {};
if (createdAt < CHECK_PULL_REQUESTS_CREATED_SINCE && updatedAt < STOP_SKIPPING_OLDER_PULL_REQUESTS_AT) {
    console.log("Skipping this check, because this pull request was opened before the check was added.");
    process.exit(0);
}

const templateMarkdown = fs.readFileSync(templatePath, "utf8");
const fileSectionDepths = [...parseSections(templateMarkdown).values()]
    .filter(section => fileHeadingPattern.test(section.heading))
    .map(section => section.depth);
const sectionDepth = fileSectionDepths.length ? Math.max(...fileSectionDepths) : Infinity;
const templateSections = parseSections(templateMarkdown, sectionDepth);
const descriptionSections = parseSections(event.pull_request?.body ?? "", sectionDepth);
const namesOfFilesWithNewLines = new Set(
    fs.readFileSync(changedFilesPath, "utf8")
        .split(/\r?\n/)
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(changedFile => changedFile.filename.startsWith("quirks/") && hasNewLines(changedFile))
        .map(changedFile => path.basename(changedFile.filename))
);

const requiredSections = [...templateSections.values()].filter(section => {
    const fileName = section.heading.match(fileHeadingPattern)?.[1];
    return !fileName || namesOfFilesWithNewLines.has(fileName);
});

const problems = [];
for (const templateSection of requiredSections) {
    const heading = templateSection.heading;
    const descriptionSection = descriptionSections.get(normalize(heading));
    if (!descriptionSection) {
        problems.push(`The "${heading}" section is missing. Please restore it from the pull request template.`);
        continue;
    }

    const templateCheckboxesByGroup = new Map();
    for (const checkbox of templateSection.checkboxes.filter(checkbox => checkbox.group)) {
        if (!templateCheckboxesByGroup.has(checkbox.group))
            templateCheckboxesByGroup.set(checkbox.group, []);
        templateCheckboxesByGroup.get(checkbox.group).push(checkbox);
    }

    for (const [group, templateCheckboxes] of templateCheckboxesByGroup) {
        const matchingDescriptionCheckboxes = templateCheckboxes
            .map(templateCheckbox => findMatchingCheckbox(descriptionSection.checkboxes, templateCheckbox))
            .filter(Boolean);
        if (matchingDescriptionCheckboxes.some(checkbox => checkbox.isChecked))
            continue;
        const quotedChoices = templateCheckboxes.map(checkbox => `"${checkbox.text}"`).join(", ");
        const malformedHint = matchingDescriptionCheckboxes.some(checkbox => checkbox.isMalformed)
            ? " Use [x] to check a checkbox."
            : "";
        problems.push(`"${heading}": for "${group.text}", at least one of these checkboxes must be checked: `
            + `${quotedChoices}.${malformedHint}`);
    }

    for (const templateCheckbox of templateSection.checkboxes.filter(checkbox => !checkbox.group)) {
        const descriptionCheckbox = findMatchingCheckbox(descriptionSection.checkboxes, templateCheckbox);
        if (!descriptionCheckbox)
            problems.push(`"${heading}": the checkbox "${templateCheckbox.text}" is missing.`);
        else if (descriptionCheckbox.isMalformed)
            problems.push(`"${heading}": the checkbox "${templateCheckbox.text}" is malformed. Use [x] to check it.`);
        else if (!descriptionCheckbox.isChecked)
            problems.push(`"${heading}": the checkbox "${templateCheckbox.text}" is not checked.`);
    }

    // Only fields left blank in the template are for the author to fill in.
    for (const templateField of templateSection.fields.filter(field => !field.value)) {
        const descriptionField = descriptionSection.fields
            .find(field => field.comparisonKey === templateField.comparisonKey);
        if (!descriptionField)
            problems.push(`"${heading}": the "${templateField.label}:" field is missing.`);
        else if (!descriptionField.value) {
            problems.push(`"${heading}": the "${templateField.label}:" field is empty. `
                + "Please fill it in on the same line.");
        }
    }
}

console.log(`Checked sections: ${requiredSections.map(section => `"${section.heading}"`).join(", ")}.`);
if (!problems.length) {
    console.log("The pull request description is complete.");
    process.exit(0);
}

for (const problem of problems)
    console.log(`::error::${problem}`);

console.log("Please edit the pull request description to fix the problems above. "
    + "This check runs again automatically when the description is edited.");
process.exit(1);
