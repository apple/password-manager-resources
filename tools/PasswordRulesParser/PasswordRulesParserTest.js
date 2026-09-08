// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

"use strict";

// This file is concatenated with PasswordRulesParser.js before running (see
// run-tests.sh), so every parser function and class below is in scope.

// MARK: Comparison helpers
//
// The parser returns rich objects (Rule, NamedCharacterClass,
// CustomCharacterClass) and, for its internal functions, [value, position]
// pairs. To assert against readable literals we normalize everything into plain
// JSON-comparable values: a rule becomes { name, value }, and a character class
// becomes its canonical token ("upper", "ascii-printable", "[abc]", ...).

function describeCharacterClass(characterClass)
{
    if (characterClass instanceof NamedCharacterClass) {
        return characterClass.name;
    }
    if (characterClass instanceof CustomCharacterClass) {
        return `[${characterClass.characters.join("")}]`;
    }
    return characterClass;
}

function describeValue(value)
{
    if (Array.isArray(value)) {
        return value.map(describeCharacterClass);
    }
    return value;
}

function describeRule(rule)
{
    if (!rule) {
        return null;
    }
    return { name: rule.name, value: describeValue(rule.value) };
}

function describeRules(rules)
{
    if (!rules) {
        return null;
    }
    return rules.map(describeRule);
}

// MARK: Character-class construction helpers (for canonicalization tests)

function charactersInRange(first, last)
{
    let characters = [];
    for (let codePoint = first.codePointAt(0); codePoint <= last.codePointAt(0); ++codePoint) {
        characters.push(String.fromCodePoint(codePoint));
    }
    return characters;
}

const UPPERCASE = charactersInRange("A", "Z");
const LOWERCASE = charactersInRange("a", "z");
const DIGITS = charactersInRange("0", "9");
const SPECIAL = [].concat(charactersInRange(" ", "/"), charactersInRange(":", "@"), charactersInRange("[", "`"), charactersInRange("{", "~"));
const ASCII_PRINTABLE = charactersInRange(" ", "~");

function named(name) { return new NamedCharacterClass(name); }
function custom(characters) { return new CustomCharacterClass(characters); }

class PasswordRulesParserTest {
    constructor() {
        this.failures = 0;
        this.total = 0;
    }

    check(description, actual, expected) {
        this.total++;
        let actualJSON = JSON.stringify(actual);
        let expectedJSON = JSON.stringify(expected);
        let passed = actualJSON === expectedJSON;
        if (!passed) {
            this.failures++;
        }

        console.log(`Test: ${description}`);
        console.log(`Expected: ${expectedJSON}`);
        console.log(`Got:      ${actualJSON}`);
        console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    }

    runAll() {
        console.log("Running Password Rules Parser Tests\n");
        this.testSkippingWhitespace();
        this.testParsingInteger();
        this.testParsingCustomCharacterClass();
        this.testParsingRequiredOrAllowedValue();
        this.testParsingSingleRule();
        this.testParsingRulesInternal();
        this.testCanonicalizingCharacterClasses();
        this.testParsingPasswordRules();

        if (this.failures === 0) {
            console.log(`All ${this.total} tests passed.`);
        } else {
            console.log(`${this.failures} of ${this.total} tests FAILED.`);
        }

        return this.failures === 0;
    }

    // MARK: _indexOfNonWhitespaceCharacter

    testSkippingWhitespace() {
        console.log("=== Skipping Whitespace Tests ===\n");

        // Each case: the character the scan lands on ("" means end-of-input).
        const testCases = [
            { input: "", offset: 0, expected: "" },
            { input: " ", offset: 0, expected: "" },
            { input: "a", offset: 0, expected: "a" },
            { input: "  ", offset: 0, expected: "" },
            { input: "  a", offset: 0, expected: "a" },
            { input: "\t  \t", offset: 0, expected: "" },
            { input: "\n\n\ta", offset: 0, expected: "a" },
            { input: "\r\na", offset: 0, expected: "a" },
            { input: "\r\na", offset: 1, expected: "a" },
            { input: "\r\na", offset: 2, expected: "a" },
            { input: "\r\na", offset: 3, expected: "" }
        ];

        testCases.forEach(({ input, offset, expected }) => {
            let index = _indexOfNonWhitespaceCharacter(input, offset);
            let landedOn = index < input.length ? input[index] : "";
            this.check(`skip whitespace in ${JSON.stringify(input)} from ${offset}`, landedOn, expected);
        });
    }

    // MARK: _parseInteger

    testParsingInteger() {
        console.log("=== Parsing Integer Tests ===\n");

        // Each case parses from `offset`; expected is the integer or null.
        const testCases = [
            { input: "a", offset: 0, expected: null },
            { input: "0", offset: 0, expected: 0 },
            { input: "12", offset: 0, expected: 12 },
            { input: "127", offset: 0, expected: 127 },
            { input: "1a", offset: 0, expected: null },
            { input: "12a", offset: 0, expected: null },
            { input: "1;", offset: 0, expected: 1 },
            { input: "12;", offset: 1, expected: 2 },
            { input: "abc1234;", offset: 3, expected: 1234 },
            { input: "9007199254740991", offset: 0, expected: 9007199254740991 }
        ];

        testCases.forEach(({ input, offset, expected }) => {
            let [value] = _parseInteger(input, offset);
            this.check(`parse integer in ${JSON.stringify(input)} from ${offset}`, value, expected);
        });
    }

    // MARK: _parseCustomCharacterClass

    testParsingCustomCharacterClass() {
        console.log("=== Parsing Custom Character Class Tests ===\n");

        // Expected is the array of characters, or null for malformed input.
        const testCases = [
            // simple cases
            { input: "[]", expected: [] },
            { input: "[ ]", expected: [" "] },
            { input: "[  ]", expected: [" ", " "] },
            { input: "[a]", expected: ["a"] },
            { input: "[ab]", expected: ["a", "b"] },
            { input: "[abc]", expected: ["a", "b", "c"] },
            { input: "[abc01A]", expected: ["a", "b", "c", "0", "1", "A"] },
            { input: "[12]", expected: ["1", "2"] },
            { input: "[bab]", expected: ["b", "a", "b"] },
            { input: "[abc];", expected: ["a", "b", "c"] },
            // dash cases: a dash is literal only as the first character
            { input: "[-]", expected: ["-"] },
            { input: "[a-]", expected: ["a"] },
            { input: "[a-b]", expected: ["a", "b"] },
            { input: "[-a]", expected: ["-", "a"] },
            { input: "[-ab]", expected: ["-", "a", "b"] },
            { input: "abcdefg[-ab];", offset: 7, expected: ["-", "a", "b"] },
            // right-bracket cases: "]]" encodes a literal trailing ']'
            { input: "[]]", expected: ["]"] },
            { input: "[a]]", expected: ["a", "]"] },
            { input: "[abc]]", expected: ["a", "b", "c", "]"] },
            { input: "[-a]]", expected: ["-", "a", "]"] },
            // malformed cases
            { input: "[", expected: null },
            { input: "[a", expected: null },
            { input: "[]a]", expected: [] },
            { input: "[a]b]", expected: ["a"] },
            // non-ASCII printable characters are skipped
            { input: "[☃]", expected: [] },
            { input: "[a☃]", expected: ["a"] },
            { input: "[☃a]", expected: ["a"] },
            { input: "[a☃b]", expected: ["a", "b"] }
        ];

        testCases.forEach(({ input, offset = 0, expected }) => {
            let [value] = _parseCustomCharacterClass(input, offset);
            this.check(`parse custom character class ${JSON.stringify(input)} from ${offset}`, value, expected);
        });
    }

    // MARK: _parsePasswordRequiredOrAllowedPropertyValue

    testParsingRequiredOrAllowedValue() {
        console.log("=== Parsing Required/Allowed Value Tests ===\n");

        // Expected is the array of character-class tokens, or null on failure.
        const testCases = [
            { input: "ascii-printable", expected: ["ascii-printable"] },
            { input: "digit", expected: ["digit"] },
            { input: "lower", expected: ["lower"] },
            { input: "upper", expected: ["upper"] },
            { input: "special", expected: ["special"] },
            { input: "unicode", expected: ["unicode"] },
            { input: "UPPER", expected: ["upper"] },
            { input: "UPpER", expected: ["upper"] },
            { input: "upper, lower", expected: ["upper", "lower"] },
            { input: "upper,  lower", expected: ["upper", "lower"] },
            { input: "upper,  \tlower", expected: ["upper", "lower"] },
            { input: "[a]", expected: ["[a]"] },
            { input: "[a], upper", expected: ["[a]", "upper"] },
            { input: "upper, [a]", expected: ["upper", "[a]"] },
            { input: "upper, [a], lower", expected: ["upper", "[a]", "lower"] },
            { input: "[a], [b]", expected: ["[a]", "[b]"] },
            // an empty custom class contributes nothing and is dropped
            { input: "[], [b]", expected: ["[b]"] },
            { input: "[a]], [b]", expected: ["[a]]", "[b]"] },
            { input: "[a], lower, [b]", expected: ["[a]", "lower", "[b]"] },
            { input: "lower;", expected: ["lower"] },
            { input: "lower ;", expected: ["lower"] },
            { input: "lower \t;", expected: ["lower"] },
            // malformed cases
            { input: " ", expected: null },
            { input: "☃", expected: null },
            { input: "dummy", expected: null },
            { input: "upper, dummy", expected: null },
            { input: "upper,", expected: null },
            { input: ";", expected: null },
            { input: "upper d", expected: null }
        ];

        testCases.forEach(({ input, expected }) => {
            let [value] = _parsePasswordRequiredOrAllowedPropertyValue(input, 0);
            this.check(`parse required/allowed value ${JSON.stringify(input)}`, describeValue(value), expected);
        });
    }

    // MARK: _parsePasswordRule

    testParsingSingleRule() {
        console.log("=== Parsing Single Rule Tests ===\n");

        // Expected is { name, value } or null (unrecognized / no colon).
        const testCases = [
            { input: "required:", expected: { name: "required", value: null } },
            { input: "required: ", expected: { name: "required", value: null } },
            { input: "required:;", expected: { name: "required", value: null } },
            { input: "required: ;", expected: { name: "required", value: null } },
            { input: "allowed:", expected: { name: "allowed", value: null } },
            { input: "allowed: ;", expected: { name: "allowed", value: null } },
            { input: "max-consecutive:", expected: { name: "max-consecutive", value: null } },
            { input: "max-consecutive: ;", expected: { name: "max-consecutive", value: null } },
            { input: "required: upper", expected: { name: "required", value: ["upper"] } },
            { input: "required: upper, lower", expected: { name: "required", value: ["upper", "lower"] } },
            { input: "required: upper, [*], lower", expected: { name: "required", value: ["upper", "[*]", "lower"] } },
            { input: "allowed: upper", expected: { name: "allowed", value: ["upper"] } },
            { input: "allowed: upper, [*], lower", expected: { name: "allowed", value: ["upper", "[*]", "lower"] } },
            { input: "max-consecutive:2", expected: { name: "max-consecutive", value: 2 } },
            { input: "minlength: 12;", expected: { name: "minlength", value: 12 } },
            { input: "maxlength: 73", expected: { name: "maxlength", value: 73 } },
            // unrecognized name / missing colon produce no rule
            { input: "dummy", expected: null },
            { input: "required", expected: null }
        ];

        testCases.forEach(({ input, expected }) => {
            let [rule] = _parsePasswordRule(input, 0);
            this.check(`parse single rule ${JSON.stringify(input)}`, describeRule(rule), expected);
        });
    }

    // MARK: _parsePasswordRulesInternal (pre-canonicalization, order preserved)

    testParsingRulesInternal() {
        console.log("=== Parsing Rules (internal) Tests ===\n");

        // Expected is the raw list of parsed rules (no canonicalization,
        // duplicates kept), or null when the input is malformed.
        const testCases = [
            { input: "required: upper", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper;", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper; ", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper;;", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper; ;", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper;;;", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper ", expected: [{ name: "required", value: ["upper"] }] },
            { input: "required: upper ; ", expected: [{ name: "required", value: ["upper"] }] },
            {
                input: "required: upper; required: lower",
                expected: [{ name: "required", value: ["upper"] }, { name: "required", value: ["lower"] }]
            },
            {
                input: "required: upper; allowed: [ab]",
                expected: [{ name: "required", value: ["upper"] }, { name: "allowed", value: ["[ab]"] }]
            },
            {
                input: "allowed: upper; allowed: lower",
                expected: [{ name: "allowed", value: ["upper"] }, { name: "allowed", value: ["lower"] }]
            },
            { input: "minlength: 12", expected: [{ name: "minlength", value: 12 }] },
            { input: "minlength:        12", expected: [{ name: "minlength", value: 12 }] },
            {
                input: "minlength: 12; maxlength: 73",
                expected: [{ name: "minlength", value: 12 }, { name: "maxlength", value: 73 }]
            },
            // an empty (value-less) rule is dropped
            { input: "required: ;", expected: [] },
            // a lone non-identifier is not an error, just yields nothing
            { input: "☃", expected: [] },
            // a stray trailing token is malformed -> null
            { input: "required: upper d", expected: null }
        ];

        testCases.forEach(({ input, expected }) => {
            let rules = _parsePasswordRulesInternal(input);
            this.check(`parse rules internal ${JSON.stringify(input)}`, describeRules(rules), expected);
        });
    }

    // MARK: _canonicalizedPropertyValues

    testCanonicalizingCharacterClasses() {
        console.log("=== Canonicalizing Character Classes Tests ===\n");

        const scatteredUppercase = "WABCXYZDEFGHIJKLMNOPQRSTUV".split("");

        const testCases = [
            { name: "single named class", input: [named("upper")], expected: ["upper"] },
            { name: "duplicate named class", input: [named("upper"), named("upper")], expected: ["upper"] },
            { name: "named + custom", input: [named("upper"), custom(["a", "b", "c"])], expected: ["upper", "[abc]"] },
            { name: "custom spanning all uppercase collapses to named", input: [named("upper"), custom(UPPERCASE)], expected: ["upper"] },
            { name: "custom-then-named uppercase", input: [custom(UPPERCASE), named("upper")], expected: ["upper"] },
            { name: "scattered full uppercase collapses", input: [custom(scatteredUppercase)], expected: ["upper"] },
            { name: "custom upper + custom lower", input: [custom(UPPERCASE), custom(LOWERCASE)], expected: ["upper", "lower"] },
            { name: "custom special + named special", input: [custom(SPECIAL), named("special")], expected: ["special"] },
            { name: "custom ascii-printable + named", input: [custom(ASCII_PRINTABLE), named("ascii-printable")], expected: ["ascii-printable"] },
            { name: "custom digits + named digit", input: [custom(DIGITS), named("digit")], expected: ["digit"] },
            {
                name: "all four ranges collapse to ascii-printable",
                input: [custom(UPPERCASE), custom(DIGITS), custom(LOWERCASE), custom(SPECIAL)],
                expected: ["ascii-printable"]
            },
            { name: "unicode passes through", input: [named("unicode")], expected: ["unicode"] }
        ];

        testCases.forEach(({ name, input, expected }) => {
            let result = _canonicalizedPropertyValues(input, false);
            this.check(`canonicalize ${name}`, describeValue(result), expected);
        });
    }

    // MARK: parsePasswordRules (public API, canonicalized)

    testParsingPasswordRules() {
        console.log("=== Parsing Password Rules (public) Tests ===\n");

        const testCases = [
            {
                name: "empty input yields default allowed",
                input: "",
                expected: [{ name: "allowed", value: ["ascii-printable"] }]
            },
            {
                name: "leading whitespace and single required",
                input: "    required: upper",
                expected: [{ name: "required", value: ["upper"] }, { name: "allowed", value: ["upper"] }]
            },
            {
                name: "property values are case-insensitive",
                input: "required: uPPeR",
                expected: [{ name: "required", value: ["upper"] }, { name: "allowed", value: ["upper"] }]
            },
            {
                name: "rule names are case-sensitive; a mixed-case name is unrecognized",
                input: "maxLENGTH: 7",
                expected: [{ name: "allowed", value: ["ascii-printable"] }]
            },
            {
                name: "allowed without required does not synthesize required",
                input: "allowed:upper",
                expected: [{ name: "allowed", value: ["upper"] }]
            },
            {
                name: "required plus allowed classes merge into one allowed",
                input: "required: upper; allowed: upper; allowed: lower",
                expected: [{ name: "required", value: ["upper"] }, { name: "allowed", value: ["upper", "lower"] }]
            },
            {
                name: "duplicate max-consecutive keeps the minimum",
                input: "max-consecutive: 5; max-consecutive: 3",
                expected: [{ name: "allowed", value: ["ascii-printable"] }, { name: "max-consecutive", value: 3 }]
            },
            {
                name: "three max-consecutive keep the minimum",
                input: "max-consecutive: 3; max-consecutive: 1; max-consecutive: 5",
                expected: [{ name: "allowed", value: ["ascii-printable"] }, { name: "max-consecutive", value: 1 }]
            },
            {
                name: "required ascii-printable plus deduped max-consecutive",
                input: "required: ascii-printable; max-consecutive: 5; max-consecutive: 3",
                expected: [
                    { name: "required", value: ["ascii-printable"] },
                    { name: "allowed", value: ["ascii-printable"] },
                    { name: "max-consecutive", value: 3 }
                ]
            },
            {
                name: "custom class is canonicalized (special characters sorted)",
                input: "required: [*&^]; allowed: upper",
                expected: [
                    { name: "required", value: ["[&*^]"] },
                    { name: "allowed", value: ["upper", "[&*^]"] }
                ]
            },
            {
                name: "unicode required short-circuits allowed",
                input: "required: unicode; required: digit",
                expected: [
                    { name: "required", value: ["unicode"] },
                    { name: "required", value: ["digit"] },
                    { name: "allowed", value: ["unicode"] }
                ]
            },
            {
                name: "empty required is dropped",
                input: "required: ; required: upper",
                expected: [{ name: "required", value: ["upper"] }, { name: "allowed", value: ["upper"] }]
            },
            {
                name: "custom class of only non-ASCII becomes default allowed",
                input: "allowed: [供应商责任进展]",
                expected: [{ name: "allowed", value: ["ascii-printable"] }]
            },
            {
                name: "ASCII characters survive among non-ASCII in a custom class",
                input: "allowed: [供应A商B责任C进展]",
                expected: [{ name: "allowed", value: ["[ABC]"] }]
            },
            {
                name: "minlength keeps the maximum",
                input: "minlength: 12; minlength: 7; minlength: 23",
                expected: [{ name: "allowed", value: ["ascii-printable"] }, { name: "minlength", value: 23 }]
            },
            {
                name: "maxlength keeps the minimum",
                input: "maxlength: 10; maxlength: 7; maxlength: 12",
                expected: [{ name: "allowed", value: ["ascii-printable"] }, { name: "maxlength", value: 7 }]
            },
            {
                name: "full rule string with min and max length",
                input: "required: upper; allowed: upper; allowed: lower; minlength: 12; maxlength: 73;",
                expected: [
                    { name: "required", value: ["upper"] },
                    { name: "allowed", value: ["upper", "lower"] },
                    { name: "minlength", value: 12 },
                    { name: "maxlength", value: 73 }
                ]
            }
        ];

        testCases.forEach(({ name, input, expected }) => {
            this.check(`parse password rules: ${name}`, describeRules(parsePasswordRules(input)), expected);
        });

        // Malformed input: this parser has no error channel, so it degrades to
        // the default "allowed: ascii-printable" rather than reporting failure.
        const malformedInputs = [
            "allowed: upper,,",
            "allowed: upper,;",
            "allowed: upper [a]",
            "dummy: upper",
            "upper: lower",
            "max-consecutive: [ABC]",
            "max-consecutive: upper",
            "max-consecutive: 1+1",
            "required: 1",
            "required: A",
            "allowed: 1+1"
        ];

        malformedInputs.forEach((input) => {
            this.check(`malformed input degrades to default allowed: ${JSON.stringify(input)}`,
                describeRules(parsePasswordRules(input)),
                [{ name: "allowed", value: ["ascii-printable"] }]);
        });
    }
}

const tester = new PasswordRulesParserTest();
const passed = tester.runAll();
process.exit(passed ? 0 : 1);
