// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Tests for pull-request-template-check.js. Each test writes a template, a pull
// request description, and a list of changed files to a temporary directory,
// runs the script the same way the workflow does, and checks its exit code and
// errors.
//
// Most tests use a small fixture template, so rewording the real template
// doesn't break them. A few tests at the end check the real template.
//
// Usage: node --test .github/workflows/lint-scripts/pull-request-template-check-test.js

"use strict";

const assert = require("assert/strict");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, test } = require("node:test");

const scriptPath = path.join(__dirname, "pull-request-template-check.js");
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const realTemplatePath = path.join(repoRoot, ".github", "PULL_REQUEST_TEMPLATE.md");

const fixtureTemplate = `<!-- Check the boxes by putting an x in the [ ] (do: [x]) -->

### Overall Checklist
- [ ] I agree to the project's [license](https://example.com/license)
- [ ] There are no open pull requests for the same update

#### for alpha.json
- [ ] There's evidence the domains are related (DNS entries, legal documents, etc.)
- [ ] The \`rule\` was tested, and it works
- One or more of the following:
  - [ ] If using \`shared\`, the domains share a backend
  - [ ] If using \`from\` and \`to\`, the \`from\` domain redirects to the \`to\` domain

Note: this line is prose, not a field.

#### for beta.json
- [ ] The website was tested

Name:
Download link:
`;

// Checks every checkbox and fills in every empty field.
function fillIn(template) {
    return template
        .replace(/^(\s*- )\[ \]/gm, "$1[x]")
        .replace(/^([A-Za-z][^:\[\]]*):$/gm, "$1: x");
}

// changedFiles can contain file names, for files with an added line, or objects
// like the ones GitHub's API returns.
function check({ template = fixtureTemplate, body, changedFiles = [], createdAt, updatedAt, timeout }) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pull-request-template-check-"));
    try {
        const templatePath = path.join(directory, "template.md");
        const eventPath = path.join(directory, "event.json");
        const changedFilesPath = path.join(directory, "changed-files.jsonl");
        fs.writeFileSync(templatePath, template);
        fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { body, created_at: createdAt, updated_at: updatedAt } }));
        const files = changedFiles.map(file => typeof file === "string" ? { filename: file, additions: 1, patch: "@@ -1 +1,2 @@\n+\"added.example\"," } : file);
        fs.writeFileSync(changedFilesPath, files.map(file => JSON.stringify(file)).join("\n"));
        const result = spawnSync(process.execPath, [scriptPath, templatePath, eventPath, changedFilesPath], { encoding: "utf8", timeout });
        const errors = result.stdout.split("\n").filter(line => line.startsWith("::error::")).map(line => line.slice("::error::".length));
        return { status: result.status, errors, stdout: result.stdout };
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

function assertPasses(options) {
    const result = check(options);
    assert.deepEqual(result.errors, []);
    assert.equal(result.status, 0);
}

function assertFails(options, ...expectedErrorFragments) {
    const result = check(options);
    assert.equal(result.status, 1);
    assert.equal(result.errors.length, expectedErrorFragments.length, `Unexpected errors:\n${result.errors.join("\n")}`);
    expectedErrorFragments.forEach((fragment, index) => assert.match(result.errors[index], fragment));
}

const alpha = ["quirks/alpha.json"];
const beta = ["quirks/beta.json"];
const overallOnlyBody = fillIn(fixtureTemplate).replace(/#### for alpha\.json[\s\S]*/, "");

describe("usage", () => {
    test("exits with status 2 without arguments", () => {
        const result = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
        assert.equal(result.status, 2);
        assert.match(result.stderr, /Usage:/);
    });
});

describe("required sections", () => {
    test("a filled-in template passes", () => {
        assertPasses({ body: fillIn(fixtureTemplate), changedFiles: [...alpha, ...beta] });
    });

    test("the Overall Checklist is required even when no quirks files change", () => {
        assertFails({ body: "Just a description.", changedFiles: ["tools/PasswordRulesParser/PasswordRulesParser.js"] },
            /"Overall Checklist" section is missing/);
    });

    test("a file's section is required when the pull request adds lines to it", () => {
        const body = fillIn(fixtureTemplate).replace(/#### for alpha\.json[\s\S]*?(?=#### for beta)/, "");
        assertFails({ body, changedFiles: alpha }, /"for alpha\.json" section is missing/);
    });

    test("sections for files the pull request doesn't add lines to aren't required", () => {
        assertPasses({ body: overallOnlyBody, changedFiles: [] });
    });

    test("only files in quirks/ require sections", () => {
        assertPasses({ body: overallOnlyBody, changedFiles: ["tools/alpha.json", "quirks/schemas/alpha-schema.json"] });
    });

    test("a file whose added lines only lost a trailing comma doesn't require its section", () => {
        const patch = "@@ -43,8 +43,7 @@\n             \"amazon.se\",\n-            \"amazon.pl\",\n-            \"ring.com\"\n+            \"amazon.pl\"\n         ]";
        assertPasses({ body: overallOnlyBody, changedFiles: [{ filename: "quirks/alpha.json", additions: 1, patch }] });
    });

    test("a file whose lines were only moved doesn't require its section", () => {
        const patch = "@@ -1,4 +1,4 @@\n-    \"b.example\",\n     \"a.example\",\n+    \"b.example\",\n     \"c.example\"";
        assertPasses({ body: overallOnlyBody, changedFiles: [{ filename: "quirks/alpha.json", additions: 1, patch }] });
    });

    test("a file with a new line requires its section, even if it also has a moved line", () => {
        const patch = "@@ -1,3 +1,4 @@\n-    \"b.example\",\n     \"a.example\",\n+    \"b.example\",\n+    \"d.example\",\n     \"c.example\"";
        assertFails({ body: overallOnlyBody, changedFiles: [{ filename: "quirks/alpha.json", additions: 2, patch }] }, /"for alpha\.json" section is missing/);
    });

    test("a line added more times than it was removed counts", () => {
        const patch = "@@ -1,2 +1,3 @@\n-    \"a.example\",\n+    \"a.example\",\n+    \"a.example\"";
        assertFails({ body: overallOnlyBody, changedFiles: [{ filename: "quirks/alpha.json", additions: 2, patch }] }, /"for alpha\.json" section is missing/);
    });

    test("without a patch, a file with additions requires its section", () => {
        assertFails({ body: overallOnlyBody, changedFiles: [{ filename: "quirks/alpha.json", additions: 1 }] }, /"for alpha\.json" section is missing/);
        assertPasses({ body: overallOnlyBody, changedFiles: [{ filename: "quirks/alpha.json", additions: 0 }] });
    });

    test("a section that isn't for a file is always required", () => {
        const template = fixtureTemplate + "\n### Notes\n- [ ] I read the notes\n";
        assertFails({ template, body: overallOnlyBody }, /"Notes" section is missing/);
    });

    test("headings are matched case-insensitively", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace("### Overall Checklist", "### overall checklist"), changedFiles: alpha });
    });

    test("headings can be indented by up to 3 spaces", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace("### Overall Checklist", "   ### Overall Checklist") });
        assertFails({ body: fillIn(fixtureTemplate).replace("### Overall Checklist", "    ### Overall Checklist") }, /"Overall Checklist" section is missing/);
    });

    describe("sub-headings", () => {
        const template = fixtureTemplate.replace("\nName:", "\n##### Details\nName:");

        test("a sub-heading in the template isn't a separate section", () => {
            assertPasses({ template, body: overallOnlyBody, changedFiles: [] });
        });

        test("checkboxes and fields under a sub-heading belong to the section above", () => {
            assertPasses({ template, body: fillIn(template), changedFiles: beta });
            assertFails({ template, body: fillIn(template).replace("Download link: x", "Download link:"), changedFiles: beta },
                /"for beta\.json": the "Download link:" field is empty/);
        });

        test("a description can add sub-headings", () => {
            const body = fillIn(fixtureTemplate).replace("- [x] There are no open", "##### My notes\n- [x] There are no open");
            assertPasses({ body, changedFiles: [...alpha, ...beta] });
        });

        test("a heading at or above the file sections' depth starts a new section", () => {
            const body = fillIn(fixtureTemplate).replace("- [x] There are no open", "#### Notes\n- [x] There are no open");
            assertFails({ body }, /"Overall Checklist": the checkbox "There are no open pull requests for the same update" is missing/);
        });

        test("without file sections in the template, every heading is a section", () => {
            const template = "### Overall Checklist\n- [ ] I agree\n\n###### Details\n- [ ] The details are right\n";
            assertFails({ template, body: "### Overall Checklist\n- [x] I agree\n" }, /"Details" section is missing/);
        });
    });

    test("a null description reports every required section as missing", () => {
        assertFails({ body: null, changedFiles: alpha },
            /"Overall Checklist" section is missing/,
            /"for alpha\.json" section is missing/);
    });

    test("CRLF line endings are handled", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace(/\n/g, "\r\n"), changedFiles: [...alpha, ...beta] });
    });
});

describe("pull requests opened before the check was added", () => {
    const emptyDescription = { body: "", changedFiles: alpha };

    test("are skipped until February 1, 2027", () => {
        const result = check({ ...emptyDescription, createdAt: "2026-11-07T21:05:51Z", updatedAt: "2027-01-31T23:59:59Z" });
        assert.equal(result.status, 0);
        assert.match(result.stdout, /Skipping this check, because this pull request was opened before the check was added\./);
    });

    test("are checked from February 1, 2027", () => {
        assertFails({ ...emptyDescription, createdAt: "2026-11-07T21:05:51Z", updatedAt: "2027-02-01T00:00:00Z" },
            /"Overall Checklist" section is missing/,
            /"for alpha\.json" section is missing/);
    });

    test("doesn't include pull requests opened at or after the time the check was added", () => {
        for (const createdAt of ["2026-11-07T21:05:52Z", "2026-11-07T21:19:36Z", "2026-12-01T12:00:00Z"]) {
            assertFails({ ...emptyDescription, createdAt, updatedAt: createdAt },
                /"Overall Checklist" section is missing/,
                /"for alpha\.json" section is missing/);
        }
    });
});

describe("checkboxes", () => {
    test("an unchecked checkbox fails", () => {
        const body = fillIn(fixtureTemplate).replace("- [x] There are no open", "- [ ] There are no open");
        assertFails({ body }, /"Overall Checklist": the checkbox "There are no open pull requests for the same update" is not checked/);
    });

    test("a removed checkbox fails", () => {
        const body = fillIn(fixtureTemplate).replace(/- \[x\] There are no open.*\n/, "");
        assertFails({ body }, /"Overall Checklist": the checkbox "There are no open pull requests for the same update" is missing/);
    });

    test("[X] counts as checked", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace(/\[x\]/g, "[X]"), changedFiles: alpha });
    });

    for (const mark of ["[x ]", "[ x]", "[]"]) {
        test(`${mark} is reported as malformed`, () => {
            const body = fillIn(fixtureTemplate).replace("- [x] There are no open", `- ${mark} There are no open`);
            assertFails({ body }, /the checkbox "There are no open pull requests for the same update" is malformed\. Use \[x\]/);
        });
    }

    for (const marker of ["*", "+", "1.", "1)", "123456789."]) {
        test(`${marker} works as a list marker`, () => {
            const body = fillIn(fixtureTemplate).replace(/^(\s*)- /gm, `$1${marker} `).replace("Download link: x", `${marker} Download link: x`);
            assertPasses({ body, changedFiles: [...alpha, ...beta] });
        });
    }

    test("1234567890. isn't a list marker", () => {
        const body = fillIn(fixtureTemplate).replace("- [x] There are no open", "1234567890. [x] There are no open");
        assertFails({ body }, /the checkbox "There are no open pull requests for the same update" is missing/);
    });

    test("text copied from the rendered template, without link or code formatting, matches", () => {
        const body = fillIn(fixtureTemplate)
            .replace("[license](https://example.com/license)", "license")
            .replace("The `rule` was tested", "The rule was tested");
        assertPasses({ body, changedFiles: alpha });
    });

    test("whitespace and a trailing period don't matter", () => {
        const body = fillIn(fixtureTemplate).replace("There are no open pull requests for the same update", "There are  no open pull requests\tfor the same update.");
        assertPasses({ body });
    });

    test("a parenthetical aside can be removed", () => {
        const body = fillIn(fixtureTemplate).replace(" (DNS entries, legal documents, etc.)", "");
        assertPasses({ body, changedFiles: alpha });
    });

    test("a parenthetical aside can be changed", () => {
        const body = fillIn(fixtureTemplate).replace("(DNS entries, legal documents, etc.)", "(live redirects from alpha.example)");
        assertPasses({ body, changedFiles: alpha });
    });

    test("a shortened checkbox doesn't match", () => {
        const body = fillIn(fixtureTemplate)
            .replace("I agree to the project's [license](https://example.com/license)", "I agree")
            .replace("There's evidence the domains are related (DNS entries, legal documents, etc.)", "There's evidence the domains")
            .replace("The `rule` was tested, and it works", "The `rule` was tested");
        assertFails({ body, changedFiles: alpha },
            /"Overall Checklist": the checkbox "I agree to the project's \[license\]\(https:\/\/example\.com\/license\)" is missing/,
            /"for alpha\.json": the checkbox "There's evidence the domains are related .*" is missing/,
            /"for alpha\.json": the checkbox "The `rule` was tested, and it works" is missing/);
    });

    test("a checkbox with text added after the template's text matches", () => {
        const body = fillIn(fixtureTemplate).replace("for the same update", "for the same update (I searched for alpha.example)");
        assertPasses({ body });
    });

    test("a hard-wrapped checkbox matches", () => {
        const body = fillIn(fixtureTemplate)
            .replace("There are no open pull requests for the same update", "There are no open pull\n  requests for the same\nupdate")
            .replace("I agree to the project's [license](https://example.com/license)", "I agree to the project's [license](\nhttps://example.com/license)");
        assertPasses({ body });
    });

    test("a checkbox's text ends at a blank line, list item, field, heading, or code block", () => {
        const body = fillIn(fixtureTemplate).replace(/(There are no open pull requests for the same update)/, "There are no open pull requests");
        // If any of these continued the checkbox, its text would match the template's.
        for (const next of ["\nfor the same update", "- for the same update", "for the same update: yes", "#### Notes\nfor the same update", "```\ncode\n```\nfor the same update"]) {
            assertFails({ body: body.replace("There are no open pull requests", `There are no open pull requests\n${next}`) },
                /the checkbox "There are no open pull requests for the same update" is missing/);
        }
    });

    test("a checkbox with reworded text doesn't match", () => {
        const body = fillIn(fixtureTemplate).replace("the domains are related", "the domains are connected");
        assertFails({ body, changedFiles: alpha }, /the checkbox "There's evidence the domains are related .*" is missing/);
    });
});

describe("groups of alternatives", () => {
    const groupError = /"for alpha\.json": for "One or more of the following:", at least one of these checkboxes must be checked: "If using `shared`, the domains share a backend", "If using `from` and `to`, .*"\.$/;

    test("one checked alternative is enough", () => {
        const body = fillIn(fixtureTemplate).replace("  - [x] If using `shared`", "  - [ ] If using `shared`");
        assertPasses({ body, changedFiles: alpha });
    });

    test("the other alternatives can be removed", () => {
        const body = fillIn(fixtureTemplate).replace(/ {2}- \[x\] If using `shared`.*\n/, "");
        assertPasses({ body, changedFiles: alpha });
    });

    test("alternatives don't need to be nested in the description", () => {
        const body = fillIn(fixtureTemplate).replace("- One or more of the following:\n", "").replace(/^ {2}- /gm, "- ");
        assertPasses({ body, changedFiles: alpha });
    });

    test("no checked alternative fails", () => {
        const body = fillIn(fixtureTemplate).replace(/^ {2}- \[x\]/gm, "  - [ ]");
        assertFails({ body, changedFiles: alpha }, groupError);
    });

    test("no alternatives at all fails", () => {
        const body = fillIn(fixtureTemplate).replace(/^ {2}- \[x\].*\n/gm, "");
        assertFails({ body, changedFiles: alpha }, groupError);
    });

    test("a malformed alternative gets a hint", () => {
        const body = fillIn(fixtureTemplate).replace(/^ {2}- \[x\]/gm, "  - [ x]");
        assertFails({ body, changedFiles: alpha }, /at least one of these checkboxes must be checked: .* Use \[x\] to check a checkbox\.$/);
    });

    test("a blank line between a group's list item and its checkboxes is allowed", () => {
        const template = fixtureTemplate.replace("- One or more of the following:\n", "- One or more of the following:\n\n");
        const body = fillIn(template).replace(/^ {2}- \[x\]/gm, "  - [ ]");
        assertFails({ template, body, changedFiles: alpha }, groupError);
    });

    test("a group's list item right after a checkbox doesn't continue it", () => {
        const template = fixtureTemplate.replace("One or more of the following:", "Pick at least one");
        const body = fillIn(template).replace("  - [x] If using `shared`", "  - [ ] If using `shared`");
        assertPasses({ template, body, changedFiles: alpha });
    });

    test("checkboxes nested under a checkbox aren't a group", () => {
        const template = fixtureTemplate.replace("\nNote: this line", "- [ ] The parent checkbox\n  - [ ] The nested checkbox\n\nNote: this line");
        const body = fillIn(template).replace("  - [x] The nested checkbox", "  - [ ] The nested checkbox");
        assertFails({ template, body, changedFiles: alpha }, /the checkbox "The nested checkbox" is not checked/);
    });

    test("groups with the same label are separate", () => {
        const template = fixtureTemplate.replace("\nNote: this line", "- One or more of the following:\n  - [ ] Option C\n  - [ ] Option D\n\nNote: this line");
        const body = fillIn(template).replace("  - [x] Option C", "  - [ ] Option C").replace("  - [x] Option D", "  - [ ] Option D");
        assertFails({ template, body, changedFiles: alpha }, /for "One or more of the following:", at least one of these checkboxes must be checked: "Option C", "Option D"\.$/);
    });

    test("a checkbox nested under an alternative isn't another alternative", () => {
        const template = fixtureTemplate.replace(/( {2}- \[ \] If using `shared`.*\n)/, "$1    - [ ] The detail was checked\n");
        const onlyDetail = fillIn(template).replace(/^ {2}- \[x\]/gm, "  - [ ]");
        assertFails({ template, body: onlyDetail, changedFiles: alpha }, groupError);
        const withoutDetail = fillIn(template).replace("    - [x] The detail", "    - [ ] The detail");
        assertFails({ template, body: withoutDetail, changedFiles: alpha }, /the checkbox "The detail was checked" is not checked/);
    });

    test("a less indented checkbox after the group isn't part of it", () => {
        const template = fixtureTemplate.replace("\nNote: this line", " - [ ] The last checkbox is required\n\nNote: this line");
        const body = fillIn(template).replace(" - [x] The last checkbox", " - [ ] The last checkbox");
        assertFails({ template, body, changedFiles: alpha }, /the checkbox "The last checkbox is required" is not checked/);
    });

    test("a checkbox after the group isn't part of it", () => {
        const template = fixtureTemplate.replace("\nNote: this line", "- [ ] The last checkbox is required\n\nNote: this line");
        const body = fillIn(template).replace("- [x] The last checkbox", "- [ ] The last checkbox");
        assertFails({ template, body, changedFiles: alpha }, /the checkbox "The last checkbox is required" is not checked/);
    });
});

describe("fields", () => {
    test("an empty field fails", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x", "Download link:");
        assertFails({ body, changedFiles: beta }, /"for beta\.json": the "Download link:" field is empty/);
    });

    test("a removed field fails", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x\n", "");
        assertFails({ body, changedFiles: beta }, /"for beta\.json": the "Download link:" field is missing/);
    });

    test("an empty bulleted field is reported as empty", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x", "- Download link:");
        assertFails({ body, changedFiles: beta }, /the "Download link:" field is empty/);
    });

    test("a bulleted field in the template is required", () => {
        const template = fixtureTemplate.replace("Download link:", "- Download link:");
        const body = fillIn(template);
        assertFails({ template, body, changedFiles: beta }, /the "Download link:" field is empty/);
        assertPasses({ template, body: body.replace("- Download link:", "- Download link: x"), changedFiles: beta });
    });

    for (const [description, line] of [
        ["in bold", "**Download link:** https://example.com/download"],
        ["in bold, before the colon", "**Download link**: https://example.com/download"],
        ["with underscores", "__Download link__: https://example.com/download"],
        ["as a bullet", "- Download link: https://example.com/download"],
        ["as a bullet, in bold", "* **Download link:** https://example.com/download"],
    ]) {
        test(`a field written ${description} counts`, () => {
            assertPasses({ body: fillIn(fixtureTemplate).replace("Download link: x", line), changedFiles: beta });
        });
    }

    test("a bulleted field right before a checkbox counts", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x\n", "").replace("- [x] The website was tested", "- Download link: x\n- [x] The website was tested");
        assertPasses({ body, changedFiles: beta });
    });

    test("a bulleted field right before a checkbox in the template is required", () => {
        const template = fixtureTemplate.replace("Download link:\n", "").replace("- [ ] The website was tested", "- Download link:\n- [ ] The website was tested");
        assertFails({ template, body: fillIn(template), changedFiles: beta }, /the "Download link:" field is empty/);
    });

    test("an indented field counts", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace("Download link: x", "  Download link: x"), changedFiles: beta });
    });

    test("a field nested under a checkbox counts, and ends the checkbox's text", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x\n", "").replace("- [x] The website was tested", "- [x] The website was tested\n  - Download link: x");
        assertPasses({ body, changedFiles: beta });
        const empty = fillIn(fixtureTemplate).replace("Download link: x\n", "").replace("- [x] The website was tested", "- [x] The website was tested\n  Download link:");
        assertFails({ body: empty, changedFiles: beta }, /the "Download link:" field is empty/);
    });

    test("an empty bold field is reported as empty", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x", "**Download link:**");
        assertFails({ body, changedFiles: beta }, /the "Download link:" field is empty/);
    });

    test("a template line that already has text after its colon isn't a field", () => {
        const body = fillIn(fixtureTemplate).replace("Note: this line is prose, not a field.\n", "");
        assertPasses({ body, changedFiles: alpha });
    });
});

describe("robustness", () => {
    test("headings, checkboxes, and fields inside code blocks are ignored", () => {
        const codeBlock = "```\n# codesign -d -vvvv /Applications/Example.app\n- [ ] Not a checkbox\nName:\n```\n";
        const body = fillIn(fixtureTemplate).replace("#### for beta.json\n", `#### for beta.json\n${codeBlock}`);
        assertPasses({ body, changedFiles: beta });
    });

    test("a code block can contain a shorter fence", () => {
        const codeBlock = "~~~~\n```\n# Not a heading\n```\nDownload link: inside a code block\n~~~~\n";
        const body = fillIn(fixtureTemplate).replace("Download link: x\n", `${codeBlock}Download link:\n`);
        assertFails({ body, changedFiles: beta }, /the "Download link:" field is empty/);
    });

    test("a line with inline code that starts with ``` isn't a code block", () => {
        const body = "```codesign -d -vvvv /Applications/Example.app```\n" + fillIn(fixtureTemplate);
        assertPasses({ body, changedFiles: [...alpha, ...beta] });
    });

    test("a code block can start with an info string, and doesn't end at one", () => {
        const codeBlock = "```sh\n# Not a heading\n```sh\nDownload link: inside a code block\n```\n";
        const body = fillIn(fixtureTemplate).replace("Download link: x\n", `${codeBlock}Download link:\n`);
        assertFails({ body, changedFiles: beta }, /the "Download link:" field is empty/);
    });

    test("an indented code block, as under a bullet, is skipped", () => {
        const codeBlock = "- Output:\n\n    ```\n    # codesign -d -vvvv /Applications/Example.app\n    ```\n";
        const body = fillIn(fixtureTemplate).replace("#### for beta.json\n", `#### for beta.json\n${codeBlock}`);
        assertPasses({ body, changedFiles: beta });
    });

    test("an HTML comment isn't parsed", () => {
        const body = fillIn(fixtureTemplate).replace("- [x] There are no open", "<!-- - [x] There are no open") + "\n-->";
        assertFails({ body }, /There are no open pull requests for the same update" is missing/);
    });

    test("when a heading is repeated, the first copy counts", () => {
        assertPasses({ body: fillIn(fixtureTemplate) + "\n" + fixtureTemplate, changedFiles: [...alpha, ...beta] });
        assertFails({ body: fixtureTemplate + "\n" + fillIn(fixtureTemplate) },
            /the checkbox "I agree to the project's .*" is not checked/,
            /the checkbox "There are no open pull requests for the same update" is not checked/);
    });

    test("lines in a repeated section don't spill into the previous section", () => {
        const body = fillIn(fixtureTemplate) + "\n#### for beta.json\nDownload link:\n";
        assertPasses({ body, changedFiles: beta });
    });

    test("headings can have a closing sequence of #s", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace("### Overall Checklist", "### Overall Checklist ###") });
    });

    // GitHub allows descriptions of up to 65,536 characters.
    const spaces = " ".repeat(65536);
    for (const [description, line] of [
        ["a heading", `# a${spaces}b`],
        ["a heading ending in #s", `# a${spaces}${"#".repeat(1000)}b`],
        ["a checkbox", `- [x] a${spaces}\rb`],
        ["a checkbox mark", `- [${spaces}y] a`],
        ["a list item", `-${spaces}\u2028`],
        ["a field", `a${spaces}\u2028:`],
        ["an indented field", `${spaces}a${spaces}\u2028:`],
        ["an indented heading", `   #${spaces}\u2028`],
        ["a numbered list item", `${"1".repeat(9)}.${spaces}\u2028`],
        ["unclosed links", `- [x] a ${"[".repeat(65536)}`],
        ["unclosed link URLs", `- [x] a ${"[a](".repeat(16384)}`],
        ["trailing periods", `- [x] a${". ".repeat(32768)}b`],
        ["unclosed HTML comments", "<!--".repeat(16384)],
        ["a hard-wrapped checkbox", `- [x] a${"\nb".repeat(32768)}`],
    ]) {
        test(`a long line in ${description} is checked quickly`, () => {
            const result = check({ body: `### Overall Checklist\n${line}`, timeout: 5000 });
            assert.equal(result.status, 1, "The script timed out or crashed");
        });
    }

    test("the output lists the sections that were checked", () => {
        const result = check({ body: fillIn(fixtureTemplate), changedFiles: alpha });
        assert.match(result.stdout, /Checked sections: "Overall Checklist", "for alpha\.json"\./);
    });
});

describe("the real template", () => {
    const realTemplate = fs.readFileSync(realTemplatePath, "utf8");
    const headings = [...realTemplate.matchAll(/^#{1,6}\s+(.*?)\s*$/gm)].map(match => match[1]);
    const sectionFiles = headings.map(heading => heading.match(/^for\s+(.+)$/i)?.[1]).filter(Boolean);
    const allQuirksFiles = sectionFiles.map(file => `quirks/${file}`);

    test("every section names a file that exists in quirks/", () => {
        assert.ok(sectionFiles.length > 0);
        for (const file of sectionFiles)
            assert.ok(fs.existsSync(path.join(repoRoot, "quirks", file)), `quirks/${file} doesn't exist`);
    });

    test("the filled-in template passes", () => {
        assertPasses({ template: realTemplate, body: fillIn(realTemplate), changedFiles: allQuirksFiles });
    });

    test("parenthetical asides can be removed from the middle of a checkbox", () => {
        const body = fillIn(realTemplate).replace(/ \(e\.g\. from the output of `codesign -d --entitlements[^)]*\)/, "");
        assert.notEqual(body, fillIn(realTemplate));
        assertPasses({ template: realTemplate, body, changedFiles: allQuirksFiles });
    });

    // The `from` and `to` alternative is unchecked so that the `shared` one has to match.
    const filledInWithoutFromTo = fillIn(realTemplate).replace("- [x] If using `from` and `to`", "- [ ] If using `from` and `to`");
    for (const [shortened, rest] of [
        ["If using `shared`", /, the new group serves login pages.*\n/],
        ["The platform-specific information", / \(e\.g\. bundle identifier.*\n/],
        ["The App ID was found as described in the [contributing guide](https://github.com/apple/password-manager-resources/blob/main/CONTRIBUTING.md#contributing-to-apple-application-ids-to-domains-that-share-credentials)", / \(e\.g\. from the output.*\n/],
    ]) {
        test(`"${shortened.slice(0, 40)}" without the rest of its claim doesn't match`, () => {
            assertPasses({ template: realTemplate, body: filledInWithoutFromTo, changedFiles: allQuirksFiles });
            const filledIn = filledInWithoutFromTo;
            const start = filledIn.indexOf(shortened);
            assert.ok(start !== -1);
            const body = filledIn.slice(0, start + shortened.length) + filledIn.slice(start + shortened.length).replace(rest, "\n");
            const result = check({ template: realTemplate, body, changedFiles: allQuirksFiles });
            assert.equal(result.status, 1);
        });
    }

    test("the blank template fails in every section", () => {
        const result = check({ template: realTemplate, body: realTemplate, changedFiles: allQuirksFiles });
        assert.equal(result.status, 1);
        for (const heading of headings)
            assert.ok(result.errors.some(error => error.startsWith(`"${heading}"`)), `No error for "${heading}"`);
    });
});
