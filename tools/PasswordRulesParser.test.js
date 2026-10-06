// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Unit tests for PasswordRulesParser.js.
// Run with: node tools/PasswordRulesParser.test.js

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const parserPath = path.resolve(__dirname, "PasswordRulesParser.js");
const parserSource = fs.readFileSync(parserPath, "utf8");

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

function parse(input) {
    sandbox.capturedErrors.length = 0;
    sandbox.__input = input;
    let result;
    try {
        result = vm.runInContext("parsePasswordRules(__input)", sandbox);
    } catch (e) {
        sandbox.capturedErrors.push(`threw ${e.message}`);
        return null;
    }
    return result;
}

function rulesToJSON(input) {
    const rules = parse(input);
    if (rules === null) return null;
    return JSON.stringify(rules);
}

const DEFAULT_RULES = '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]}]';

let passed = 0;
let failed = 0;

function test(name, input, expectedJSON) {
    const result = rulesToJSON(input);
    if (result === expectedJSON) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${name}`);
        console.error(`  Input:    "${input}"`);
        console.error(`  Expected: ${expectedJSON}`);
        console.error(`  Got:      ${result}`);
        if (sandbox.capturedErrors.length > 0) {
            console.error(`  Errors:   ${sandbox.capturedErrors.join(", ")}`);
        }
    }
}

function testThrows(name, input) {
    sandbox.capturedErrors.length = 0;
    let threw = false;
    try {
        parse(input);
        if (sandbox.capturedErrors.length > 0) threw = true;
    } catch (e) {
        threw = true;
    }
    if (threw) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${name} - expected error but parsed successfully`);
        console.error(`  Input: "${input}"`);
    }
}

// =============================================================================
// Empty / whitespace-only input
// =============================================================================
test("empty string", "", DEFAULT_RULES);
test("whitespace only", "   ", DEFAULT_RULES);

// =============================================================================
// Single required rule
// =============================================================================
test("required: upper", "required: upper",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("required: upper with semicolon", "required: upper;",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("required: upper with trailing whitespace", "required: upper             ",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("required uPPeR (case insensitive)", "required: uPPeR",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("required:upper (no space after colon)", "required:upper",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("required with leading whitespace before value", "required:     upper",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');

// =============================================================================
// Single allowed rule
// =============================================================================
test("allowed:upper", "allowed:upper",
    '[{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("allowed with leading whitespace", "allowed:     upper",
    '[{"_name":"allowed","value":[{"_name":"upper"}]}]');

// =============================================================================
// Mixed required and allowed
// =============================================================================
test("required upper with redundant ASCII printable", "required: upper, [AZ];",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');
test("multiple allowed merged", "required: upper; allowed: upper; allowed: lower",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"},{"_name":"lower"}]}]');

// =============================================================================
// max-consecutive
// =============================================================================
test("max-consecutive: 5 with spaces", "max-consecutive:      5",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"max-consecutive","value":5}]');
test("max-consecutive:5 (no space)", "max-consecutive:5",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"max-consecutive","value":5}]');
test("lower max-consecutive wins", "max-consecutive: 5; max-consecutive: 3",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"max-consecutive","value":3}]');
test("lower max-consecutive wins (reversed order)", "max-consecutive: 3; max-consecutive: 5",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"max-consecutive","value":3}]');
test("three max-consecutive, lowest wins", "max-consecutive: 3; max-consecutive: 1; max-consecutive: 5",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"max-consecutive","value":1}]');

// =============================================================================
// Mixed required and max-consecutive
// =============================================================================
test("required ascii-printable + max-consecutive",
    "required: ascii-printable; max-consecutive: 5; max-consecutive: 3",
    '[{"_name":"required","value":[{"_name":"ascii-printable"}]},{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"max-consecutive","value":3}]');

// =============================================================================
// Custom character classes
// =============================================================================
test("required custom chars + allowed upper", "required: [*&^]; allowed: upper",
    '[{"_name":"required","value":[{"_characters":["&","*","^"]}]},{"_name":"allowed","value":[{"_name":"upper"},{"_characters":["&","*","^"]}]}]');
test("required custom chars with mixed letters", "required: [*&^ABC]; allowed: upper",
    '[{"_name":"required","value":[{"_characters":["A","B","C","&","*","^"]}]},{"_name":"allowed","value":[{"_name":"upper"},{"_characters":["&","*","^"]}]}]');

// =============================================================================
// Unicode handling
// =============================================================================
test("required unicode + digit", "required: unicode; required: digit",
    '[{"_name":"required","value":[{"_name":"unicode"}]},{"_name":"required","value":[{"_name":"digit"}]},{"_name":"allowed","value":[{"_name":"unicode"}]}]');

// =============================================================================
// Empty value handling
// =============================================================================
test("required with empty value", "required: ; required: upper",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"}]}]');

// =============================================================================
// Non-ASCII characters in custom classes (should be dropped)
// =============================================================================
test("non-ASCII characters dropped", "allowed: [供应商责任进展]", DEFAULT_RULES);
test("mixed ASCII and non-ASCII, only ASCII kept",
    "allowed: [供应A商B责任C进展]",
    '[{"_name":"allowed","value":[{"_characters":["A","B","C"]}]}]');

// =============================================================================
// Comprehensive rules
// =============================================================================
test("required upper + allowed upper+lower + minlength + maxlength",
    "required: upper; allowed: upper; allowed: lower; minlength: 12; maxlength: 73;",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"},{"_name":"lower"}]},{"_name":"minlength","value":12},{"_name":"maxlength","value":73}]');
test("same but maxlength before minlength",
    "required: upper; allowed: upper; allowed: lower; maxlength: 73; minlength: 12;",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"},{"_name":"lower"}]},{"_name":"minlength","value":12},{"_name":"maxlength","value":73}]');
test("only maxlength, no minlength",
    "required: upper; allowed: upper; allowed: lower; maxlength: 73",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"},{"_name":"lower"}]},{"_name":"maxlength","value":73}]');
test("only minlength, no maxlength",
    "required: upper; allowed: upper; allowed: lower; minlength: 12;",
    '[{"_name":"required","value":[{"_name":"upper"}]},{"_name":"allowed","value":[{"_name":"upper"},{"_name":"lower"}]},{"_name":"minlength","value":12}]');

// =============================================================================
// minlength: highest wins
// =============================================================================
test("multiple minlength, highest wins", "minlength: 12; minlength: 7; minlength: 23",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"minlength","value":23}]');

// =============================================================================
// minlength + maxlength interaction
// =============================================================================
test("minlength+maxlength with extra minlength",
    "minlength: 12; maxlength: 17; minlength: 10",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"minlength","value":12},{"_name":"maxlength","value":17}]');

// =============================================================================
// Invalid inputs (malformed)
// =============================================================================
testThrows("allowed with trailing comma", "allowed: upper,,");
testThrows("allowed with comma-semicolon", "allowed: upper,;");
testThrows("no separator between values", "allowed: upper [a]");
testThrows("unknown rule name", "dummy: upper");
testThrows("wrong rule order (value before name)", "upper: lower");
testThrows("max-consecutive with character class", "max-consecutive: [ABC]");
testThrows("max-consecutive with identifier", "max-consecutive: upper");
testThrows("max-consecutive with expression", "max-consecutive: 1+1");
testThrows("max-consecutive with unicode", "max-consecutive: 供");
testThrows("required with digit identifier", "required: 1");
testThrows("required with expression", "required: 1+1");
testThrows("required with unicode identifier", "required: 供");
testThrows("required with single letter", "required: A");
testThrows("required with repeated keyword", "required: required: upper");
testThrows("allowed with digit identifier", "allowed: 1");
testThrows("allowed with expression", "allowed: 1+1");
testThrows("allowed with unicode identifier", "allowed: 供");
testThrows("allowed with single letter", "allowed: A");
testThrows("allowed with repeated keyword", "allowed: allowed: upper");

// =============================================================================
// Whitespace handling with character classes
// =============================================================================
test("multiple required with whitespace and custom class [a-]",
    "required:         digit           ;                        required: [a-];",
    '[{"_name":"required","value":[{"_name":"digit"}]},{"_name":"required","value":[{"_characters":["a"]}]},{"_name":"allowed","value":[{"_name":"digit"},{"_characters":["a"]}]}]');
test("empty custom class []-]", "required:         digit           ;                        required: []-];",
    DEFAULT_RULES);
test("custom class with dash [--]",
    "required:         digit           ;                        required: [--];",
    '[{"_name":"required","value":[{"_name":"digit"}]},{"_name":"required","value":[{"_characters":["-"]}]},{"_name":"allowed","value":[{"_name":"digit"},{"_characters":["-"]}]}]');
test("custom class with dash and bracket [-]]",
    "required:         digit           ;                        required: [-]];",
    '[{"_name":"required","value":[{"_name":"digit"}]},{"_name":"required","value":[{"_characters":["-","]"]}]},{"_name":"allowed","value":[{"_name":"digit"},{"_characters":["-","]"]}]}]');
test("custom class with dash and letters",
    "required:         digit           ;                        required: [-a--------];",
    '[{"_name":"required","value":[{"_name":"digit"}]},{"_name":"required","value":[{"_characters":["a","-"]}]},{"_name":"allowed","value":[{"_name":"digit"},{"_characters":["a","-"]}]}]');
test("extra bracket after custom class",
    "required:         digit           ;                        required: [-a--------] ];",
    DEFAULT_RULES);

// =============================================================================
// Canonicalization
// =============================================================================
test("full lowercase alphabet canonicalizes to lower",
    "required: [abcdefghijklmnopqrstuvwxyz]",
    '[{"_name":"required","value":[{"_name":"lower"}]},{"_name":"allowed","value":[{"_name":"lower"}]}]');
test("partial lowercase alphabet stays custom",
    "required: [abcdefghijklmnopqrstuvwxy]",
    '[{"_name":"required","value":[{"_characters":["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y"]}]},{"_name":"allowed","value":[{"_characters":["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y"]}]}]');

// =============================================================================
// All named character classes
// =============================================================================
test("required lower", "required: lower",
    '[{"_name":"required","value":[{"_name":"lower"}]},{"_name":"allowed","value":[{"_name":"lower"}]}]');
test("required digit", "required: digit",
    '[{"_name":"required","value":[{"_name":"digit"}]},{"_name":"allowed","value":[{"_name":"digit"}]}]');
test("required special", "required: special",
    '[{"_name":"required","value":[{"_name":"special"}]},{"_name":"allowed","value":[{"_name":"special"}]}]');
test("required ascii-printable", "required: ascii-printable",
    '[{"_name":"required","value":[{"_name":"ascii-printable"}]},{"_name":"allowed","value":[{"_name":"ascii-printable"}]}]');

// =============================================================================
// Multiple required from different sets
// =============================================================================
test("required lower + upper + digit", "required: lower, upper, digit;",
    '[{"_name":"required","value":[{"_name":"upper"},{"_name":"lower"},{"_name":"digit"}]},{"_name":"allowed","value":[{"_name":"upper"},{"_name":"lower"},{"_name":"digit"}]}]');
test("required lower + custom chars", "required: lower, [@#$];",
    '[{"_name":"required","value":[{"_name":"lower"},{"_characters":["#","$","@"]}]},{"_name":"allowed","value":[{"_name":"lower"},{"_characters":["#","$","@"]}]}]');

// =============================================================================
// Min/max length edge cases
// =============================================================================
test("minlength 0 is dropped (no-op)", "minlength: 0", DEFAULT_RULES);
test("minlength 999", "minlength: 999",
    '[{"_name":"allowed","value":[{"_name":"ascii-printable"}]},{"_name":"minlength","value":999}]');

// =============================================================================
// Report
// =============================================================================
const total = passed + failed;
console.log(`\n${passed} of ${total} tests passed.`);
if (failed > 0) {
    console.error(`${failed} test(s) failed.`);
    process.exit(1);
}
