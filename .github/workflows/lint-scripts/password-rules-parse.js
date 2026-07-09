// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Lints every "password-rules" string in quirks/password-rules.json:
//
//   1. Validates it parses cleanly by loading tools/PasswordRulesParser.js and
//      calling parsePasswordRules() on it. Any parse error (e.g. ",required"
//      instead of "; required" as in #907, or '-'/']' in the wrong position
//      inside a character class) causes CI to fail with a clear message
//      identifying the offending domain.
//
//   2. Flags entries whose "allowed" list redundantly names a class that is
//      already covered by a "required" rule. Required rules are implicitly
//      allowed, so writing e.g. `required: upper, lower; allowed: upper,
//      lower, [!@#];` is redundant and should be shortened to
//      `required: upper, lower; allowed: [!@#];`.

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

// These are semantic supersets used to say "allow everything"; they subsume required
// classes by design and are not redundant.
const ALWAYS_ALLOWED_SUPERSETS = new Set(["ascii-printable", "unicode"]);

function namedClassNames(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const names = [];
    for (const entry of value) {
        // NamedCharacterClass instances have a `name` getter and no `characters`.
        if (entry && typeof entry.name === "string" && !("characters" in entry)) {
            names.push(entry.name);
        }
    }
    return names;
}

function findRedundantAllowedClasses(parsedRules) {
    const requiredNames = new Set();
    let allowedRule = null;
    for (const rule of parsedRules) {
        if (rule.name === "required") {
            for (const name of namedClassNames(rule.value)) {
                requiredNames.add(name);
            }
        } else if (rule.name === "allowed") {
            allowedRule = rule;
        }
    }
    if (!allowedRule || requiredNames.size === 0) {
        return [];
    }
    return namedClassNames(allowedRule.value)
        .filter((name) => !ALWAYS_ALLOWED_SUPERSETS.has(name))
        .filter((name) => requiredNames.has(name));
}

let failedDomains = 0;
for (const domain of Object.keys(rules)) {
    const ruleString = rules[domain]["password-rules"];
    sandbox.capturedErrors.length = 0;
    sandbox.__ruleString = ruleString;
    let parsed = null;
    try {
        // Pass formatRulesForMinifiedVersion=true so required classes are not
        // silently copied into the allowed rule.
        parsed = vm.runInContext("parsePasswordRules(__ruleString, true)", sandbox);
    } catch (e) {
        sandbox.capturedErrors.push(`threw ${e.message}`);
    }

    // Log parse errors and warnings before required/allowed redundancy issues.
    const messages = sandbox.capturedErrors.slice();
    if (parsed) {
        const redundant = findRedundantAllowedClasses(parsed);
        if (redundant.length > 0) {
            const list = redundant.map((n) => `\`${n}\``).join(", ");
            messages.push(`Redundancy in \`allowed:\` (already covered by \`required:\`): ${redundant.join(", ")}`);
            messages.push(`Remove ${list} from the \`allowed:\` list — required classes are implicitly allowed.`);
        }
    }

    if (messages.length > 0) {
        failedDomains++;
        console.error(`${domain}: ${ruleString}`);
        for (const message of messages) {
            console.error(`  ${message}`);
        }
    }
}

if (failedDomains > 0) {
    console.error(`\n${failedDomains} domain(s) in password-rules.json failed linting.`);
    process.exit(1);
}

console.log(`OK: ${Object.keys(rules).length} password-rules entries parsed cleanly with no redundant required/allowed classes.`);
