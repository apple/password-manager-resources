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
        .replace(/^(Name|Download link):$/gm, "$1: x");
}

function check({ template = fixtureTemplate, body, changedFiles = [] }) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pull-request-template-check-"));
    try {
        const templatePath = path.join(directory, "template.md");
        const eventPath = path.join(directory, "event.json");
        const changedFilesPath = path.join(directory, "changed-files.txt");
        fs.writeFileSync(templatePath, template);
        fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { body } }));
        fs.writeFileSync(changedFilesPath, changedFiles.join("\n"));
        const result = spawnSync(process.execPath, [scriptPath, templatePath, eventPath, changedFilesPath], { encoding: "utf8" });
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
        const body = fillIn(fixtureTemplate).replace(/#### for alpha\.json[\s\S]*/, "");
        assertPasses({ body, changedFiles: [] });
    });

    test("only files in quirks/ require sections", () => {
        const body = fillIn(fixtureTemplate).replace(/#### for alpha\.json[\s\S]*/, "");
        assertPasses({ body, changedFiles: ["tools/alpha.json", "quirks/schemas/alpha-schema.json"] });
    });

    test("headings are matched case-insensitively", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace("### Overall Checklist", "### overall checklist"), changedFiles: alpha });
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

    test("* works as a list marker", () => {
        assertPasses({ body: fillIn(fixtureTemplate).replace(/^- \[x\]/gm, "* [x]"), changedFiles: alpha });
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

    test("a checkbox shortened to the first clause matches", () => {
        const body = fillIn(fixtureTemplate)
            .replace("There's evidence the domains are related (DNS entries, legal documents, etc.)", "There's evidence the domains are related")
            .replace("The `rule` was tested, and it works", "The `rule` was tested");
        assertPasses({ body, changedFiles: alpha });
    });

    test("a checkbox shortened to less than the first clause doesn't match", () => {
        const body = fillIn(fixtureTemplate)
            .replace("I agree to the project's [license](https://example.com/license)", "I agree")
            .replace("There's evidence the domains are related (DNS entries, legal documents, etc.)", "There's evidence the domains");
        assertFails({ body, changedFiles: alpha },
            /"Overall Checklist": the checkbox "I agree to the project's \[license\]\(https:\/\/example\.com\/license\)" is missing/,
            /"for alpha\.json": the checkbox "There's evidence the domains are related .*" is missing/);
    });

    test("a checkbox with text added after the template's text matches", () => {
        const body = fillIn(fixtureTemplate).replace("for the same update", "for the same update (I searched for alpha.example)");
        assertPasses({ body });
    });

    test("a checkbox with reworded text doesn't match", () => {
        const body = fillIn(fixtureTemplate).replace("(DNS entries, legal documents, etc.)", "(live redirects)");
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

    test("an empty bulleted field is reported as missing", () => {
        const body = fillIn(fixtureTemplate).replace("Download link: x", "- Download link:");
        assertFails({ body, changedFiles: beta }, /the "Download link:" field is missing/);
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

    test("an HTML comment isn't parsed", () => {
        const body = fillIn(fixtureTemplate).replace("- [x] There are no open", "<!-- - [x] There are no open") + "\n-->";
        const result = check({ body });
        assert.equal(result.status, 1);
        assert.ok(result.errors.some(error => /There are no open pull requests for the same update" is missing/.test(error)));
    });

    test("when a heading is repeated, the first copy counts", () => {
        assertPasses({ body: fillIn(fixtureTemplate) + "\n" + fixtureTemplate, changedFiles: [...alpha, ...beta] });
        const result = check({ body: fixtureTemplate + "\n" + fillIn(fixtureTemplate), changedFiles: [...alpha, ...beta] });
        assert.equal(result.status, 1);
        assert.ok(result.errors.length > 0);
    });

    test("lines in a repeated section don't spill into the previous section", () => {
        const body = fillIn(fixtureTemplate) + "\n#### for beta.json\nDownload link:\n";
        assertPasses({ body, changedFiles: beta });
    });

    test("the output lists the sections that were checked", () => {
        const result = check({ body: fillIn(fixtureTemplate), changedFiles: alpha });
        assert.match(result.stdout, /Checked sections: "Overall Checklist", "for alpha\.json"\./);
    });
});

describe("the real template", () => {
    const realTemplate = fs.readFileSync(realTemplatePath, "utf8");
    const sectionFiles = [...realTemplate.matchAll(/^#### for (.*?)\s*$/gm)].map(match => match[1]);
    const allQuirksFiles = sectionFiles.map(file => `quirks/${file}`);

    test("every section names a file that exists in quirks/", () => {
        assert.ok(sectionFiles.length > 0);
        for (const file of sectionFiles)
            assert.ok(fs.existsSync(path.join(repoRoot, "quirks", file)), `quirks/${file} doesn't exist`);
    });

    test("the filled-in template passes", () => {
        const body = realTemplate
            .replace(/^(\s*- )\[ \]/gm, "$1[x]")
            .replace(/^([A-Za-z][^:\[\]]*):$/gm, "$1: x");
        assertPasses({ template: realTemplate, body, changedFiles: allQuirksFiles });
    });

    test("the blank template fails in every section", () => {
        const result = check({ template: realTemplate, body: realTemplate, changedFiles: allQuirksFiles });
        assert.equal(result.status, 1);
        for (const heading of ["Overall Checklist", ...sectionFiles.map(file => `for ${file}`)])
            assert.ok(result.errors.some(error => error.startsWith(`"${heading}"`)), `No error for "${heading}"`);
    });
});
