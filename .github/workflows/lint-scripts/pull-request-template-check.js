// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Checks that a pull request's description contains the parts of
// .github/PULL_REQUEST_TEMPLATE.md that apply to the files it changes:
//
//   1. The "Overall Checklist" section is always required.
//
//   2. A "#### for <file name>" section is required whenever the pull request
//      adds lines to quirks/<file name>. Sections for other files (including
//      files the pull request only removes lines from) may be removed or left
//      as-is.
//
// Within each required section:
//
//   - every checkbox from the template must be present and checked. Text is
//     compared without Markdown links and code formatting, so text copied from
//     the rendered template matches. A checkbox may be shortened, as long as it
//     keeps at least the template text's first clause (the text before its first
//     comma, period, or parenthesis).
//   - checkboxes nested under a list item without a checkbox (e.g. "- One or
//     more of the following:") form a group, and only one checkbox in the group
//     needs to be present and checked.
//   - every "Label:" field left blank in the template must be filled in on the
//     same line.
//
// The template is the single source of truth, so changing its wording doesn't
// require changing this script.
//
// Usage: node pull-request-template-check.js <template> <event.json> <changed-files.txt>
//
// <changed-files.txt> lists the paths of the files the pull request adds lines
// to, one per line.

"use strict";

const fs = require("fs");
const path = require("path");

const [templatePath, eventPath, changedFilesPath] = process.argv.slice(2);
if (!templatePath || !eventPath || !changedFilesPath) {
    console.error("Usage: node pull-request-template-check.js <template> <event.json> <changed-files.txt>");
    process.exit(2);
}

const OVERALL_HEADING = "Overall Checklist";
const FILE_HEADING_PREFIX = "for ";

const headingPattern = /^#{1,6}\s+(.*?)\s*#*\s*$/;
// Also matches malformed checkboxes like "[x ]" so they can be reported clearly.
const checkboxPattern = /^\s*[-*]\s+\[(\s*[xX]?\s*)\]\s+(.*?)\s*$/;
// Allows a leading bullet and bold or italic formatting, e.g. "- **Download link:** https://...".
const fieldPattern = /^(?:[-*]\s+)?[*_]*([A-Za-z][^:\[\]*_]*?)[*_]*:[*_]*(.*)$/;
const fencePattern = /^\s*(`{3,}|~{3,})/;
const groupPattern = /^[-*]\s+(?!\[)(.*?)\s*$/;

function normalize(text) {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function checkboxKey(text) {
    const withoutMarkdown = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`/g, "");
    return normalize(withoutMarkdown).replace(/[.\s]+$/, "");
}

// A body checkbox matches a template checkbox if one starts with the other, and
// the body checkbox keeps at least the template text's first clause.
function findCheckbox(section, templateCheckbox) {
    const templateKey = templateCheckbox.key;
    const firstClauseLength = templateKey.slice(0, templateKey.search(/[,.(]|$/)).trimEnd().length;
    return section.checkboxes.find(({ key }) => key.startsWith(templateKey) || (templateKey.startsWith(key) && key.length >= firstClauseLength));
}

// Returns a Map from normalized heading to { heading, checkboxes, fields }.
// Each checkbox's group is the text of the list item it's nested under, if any.
// Fenced code blocks, like pasted command output, are skipped, and only the
// first copy of a repeated heading is kept.
function parseSections(markdown) {
    const sections = new Map();
    let current = null;
    let group = null;
    let fence = null;
    const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, "");
    for (const line of withoutComments.split(/\r?\n/)) {
        const fenceLine = line.match(fencePattern);
        if (fence) {
            if (fenceLine && fenceLine[1][0] === fence[0] && fenceLine[1].length >= fence.length)
                fence = null;
            continue;
        }
        if (fenceLine) {
            fence = fenceLine[1];
            continue;
        }
        const heading = line.match(headingPattern);
        if (heading) {
            current = { heading: heading[1], checkboxes: [], fields: [] };
            group = null;
            // If a heading is repeated, e.g. by pasting the template again, only the first copy counts.
            if (!sections.has(normalize(heading[1])))
                sections.set(normalize(heading[1]), current);
            continue;
        }
        if (!current)
            continue;
        const field = line.match(fieldPattern);
        const groupLine = line.match(groupPattern);
        // A list item is a field if it has a value, and otherwise starts a group.
        if (groupLine && !field?.[2].trim()) {
            group = groupLine[1];
            continue;
        }
        const checkbox = line.match(checkboxPattern);
        if (checkbox) {
            const mark = checkbox[1].toLowerCase();
            const text = checkbox[2];
            const nested = /^\s/.test(line);
            current.checkboxes.push({ checked: mark === "x", malformed: mark !== " " && mark !== "x", text, key: checkboxKey(text), group: nested ? group : null });
            continue;
        }
        if (!/^\s/.test(line))
            group = null;
        if (field)
            current.fields.push({ label: field[1].trim(), key: normalize(field[1]), value: field[2].trim() });
    }
    return sections;
}

const template = parseSections(fs.readFileSync(templatePath, "utf8"));
const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const body = parseSections(event.pull_request?.body ?? "");
const changedFileNames = new Set(
    fs.readFileSync(changedFilesPath, "utf8")
        .split(/\r?\n/)
        .filter(file => file.startsWith("quirks/"))
        .map(file => path.basename(file))
);

const overallKey = normalize(OVERALL_HEADING);
const requiredSections = [...template].filter(([key, section]) =>
    key === overallKey || (key.startsWith(FILE_HEADING_PREFIX) && changedFileNames.has(section.heading.slice(FILE_HEADING_PREFIX.length).trim()))
).map(([, section]) => section);

const problems = [];
for (const templateSection of requiredSections) {
    const bodySection = body.get(normalize(templateSection.heading));
    if (!bodySection) {
        problems.push(`The "${templateSection.heading}" section is missing. Please restore it from the pull request template.`);
        continue;
    }
    const groups = new Map();
    for (const checkbox of templateSection.checkboxes.filter(checkbox => checkbox.group))
        groups.set(checkbox.group, [...(groups.get(checkbox.group) ?? []), checkbox]);
    for (const [group, templateCheckboxes] of groups) {
        const bodyCheckboxes = templateCheckboxes.map(checkbox => findCheckbox(bodySection, checkbox)).filter(Boolean);
        if (bodyCheckboxes.some(checkbox => checkbox.checked))
            continue;
        const choices = templateCheckboxes.map(checkbox => `"${checkbox.text}"`).join(", ");
        const hint = bodyCheckboxes.some(checkbox => checkbox.malformed) ? " Use [x] to check a checkbox." : "";
        problems.push(`"${templateSection.heading}": for "${group}", at least one of these checkboxes must be checked: ${choices}.${hint}`);
    }
    for (const templateCheckbox of templateSection.checkboxes.filter(checkbox => !checkbox.group)) {
        const bodyCheckbox = findCheckbox(bodySection, templateCheckbox);
        if (!bodyCheckbox)
            problems.push(`"${templateSection.heading}": the checkbox "${templateCheckbox.text}" is missing.`);
        else if (bodyCheckbox.malformed)
            problems.push(`"${templateSection.heading}": the checkbox "${templateCheckbox.text}" is malformed. Use [x] to check it.`);
        else if (!bodyCheckbox.checked)
            problems.push(`"${templateSection.heading}": the checkbox "${templateCheckbox.text}" is not checked.`);
    }
    // Only fields left blank in the template are for the author to fill in.
    for (const templateField of templateSection.fields.filter(field => !field.value)) {
        const bodyField = bodySection.fields.find(field => field.key === templateField.key);
        if (!bodyField)
            problems.push(`"${templateSection.heading}": the "${templateField.label}:" field is missing.`);
        else if (!bodyField.value)
            problems.push(`"${templateSection.heading}": the "${templateField.label}:" field is empty. Please fill it in on the same line.`);
    }
}

console.log(`Checked sections: ${requiredSections.map(section => `"${section.heading}"`).join(", ")}.`);
if (problems.length === 0) {
    console.log("The pull request description is complete.");
    process.exit(0);
}

for (const problem of problems)
    console.log(`::error::${problem}`);
console.log("Please edit the pull request description to fix the problems above (use [x], not [x ] or [ x]). This check runs again automatically when the description is edited.");
process.exit(1);
