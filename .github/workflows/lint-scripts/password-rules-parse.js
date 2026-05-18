// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Validates every "password-rules" string in quirks/password-rules.json by
// loading tools/PasswordRulesParser.js and calling parsePasswordRules() on it.
// Any parse error (e.g. ",required" instead of "; required" as in #907, or
// '-'/']' in the wrong position inside a character class) causes CI to fail
// with a clear message identifying the offending domain.

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const parserPath = path.join(repoRoot, "tools", "PasswordRulesParser.js");
const rulesPath = path.join(repoRoot, "quirks", "password-rules.json");

const parserSource = fs.readFileSync(parserPath, "utf8");
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

const sandbox = {
    capturedErrors: [],
    console: {
        assert() {},
        warn() {},
        error(message) { sandbox.capturedErrors.push(String(message)); },
    },
};
vm.createContext(sandbox);
vm.runInContext(parserSource, sandbox, { filename: parserPath });

let failedDomains = 0;
for (const domain of Object.keys(rules)) {
    const ruleString = rules[domain]["password-rules"];
    sandbox.capturedErrors.length = 0;
    sandbox.__ruleString = ruleString;
    try {
        vm.runInContext("parsePasswordRules(__ruleString)", sandbox);
    } catch (e) {
        sandbox.capturedErrors.push(`threw ${e.message}`);
    }
    if (sandbox.capturedErrors.length > 0) {
        failedDomains++;
        console.error(`${domain}: ${ruleString}`);
        for (const message of sandbox.capturedErrors) {
            console.error(`  ${message}`);
        }
    }
}

if (failedDomains > 0) {
    console.error(`\n${failedDomains} domain(s) in password-rules.json failed to parse.`);
    process.exit(1);
}

console.log(`OK: ${Object.keys(rules).length} password-rules entries parsed cleanly.`);
