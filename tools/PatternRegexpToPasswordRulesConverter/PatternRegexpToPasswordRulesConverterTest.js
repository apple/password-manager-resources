// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

"use strict";

class PatternRegexpToPasswordRulesConverterTest {
    constructor() {
        this.failures = 0;
        this.total = 0;
    }

    recordResult(passed) {
        this.total++;
        if (!passed) {
            this.failures++;
        }
    }

    runAll() {
        console.log("Running Pattern Regexp to Password Rules Converter Tests\n");
        this.testSimplePatterns();
        this.testBasicConversion();
        this.testOptionalLength();
        this.testHyphenHandling();
        this.testSpecialCharacterHandling();
        this.testCharacterClassNormalization();
        this.testImplicitlyAllowedCharacters();
        this.testDotStarPattern();
        this.testShorthandAndCombinedPatterns();
        this.testUnsupportedPatterns();

        if (this.failures === 0) {
            console.log(`All ${this.total} tests passed.`);
        } else {
            console.log(`${this.failures} of ${this.total} tests FAILED.`);
        }

        return this.failures === 0;
    }

    testSimplePatterns() {
        console.log("=== Simple Pattern Tests ===\n");

        const testCases = [
            {
                name: "Simple \\d*",
                regexp: "\\d*",
                expected: "required: digit;"
            },
            {
                name: "Simple \\d+ with anchors",
                regexp: "^\\d+$",
                expected: "required: digit;"
            },
            {
                name: "Simple [0-9]*",
                regexp: "[0-9]*",
                expected: "required: digit;"
            },
            {
                name: "Simple [a-z]+",
                regexp: "^[a-z]+$",
                expected: "required: lower;"
            },
            {
                name: "Simple [A-Z]*",
                regexp: "[A-Z]*",
                expected: "required: upper;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testBasicConversion() {
        console.log("=== Basic Conversion Tests ===\n");

        const testCases = [
            {
                name: "Standard password with special chars",
                regexp: "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$&+/_?-]{12,128}$",
                expected: "required: digit; required: lower; required: upper; allowed: [-!@#$&+/_?]; minlength: 12; maxlength: 128;"
            },
            {
                name: "Simple alphanumeric",
                regexp: "^(?=.*[0-9])(?=.*[a-z])[a-z0-9]{8,20}$",
                expected: "required: digit; required: lower; minlength: 8; maxlength: 20;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testOptionalLength() {
        console.log("=== Optional Length Tests ===\n");

        const testCases = [
            {
                name: "Pattern without length constraint",
                regexp: "^(?=.*[0-9])(?=.*[a-z])[a-z0-9]$",
                expected: "required: digit; required: lower;"
            },
            {
                name: "Pattern with only allowed chars, no length",
                regexp: "^[a-zA-Z0-9]$",
                expected: "allowed: lower, upper, digit;"
            },
            {
                name: "Pattern with lookaheads but no length",
                regexp: "^(?=.*[A-Z])[A-Z!@#]$",
                expected: "required: upper; allowed: [!@#];"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testHyphenHandling() {
        console.log("=== Hyphen Handling Tests ===\n");

        const testCases = [
            {
                name: "Hyphen at end (should move to front)",
                regexp: "^(?=.*[0-9])[a-zA-Z0-9!@#$-]{8,20}$",
                expected: "required: digit; allowed: lower, upper, [-!@#$]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Hyphen in middle (should move to front)",
                regexp: "^(?=.*[0-9])[a-zA-Z0-9!-?]{8,20}$",
                expected: "required: digit; allowed: lower, upper, [-!?]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Original example with hyphen at end",
                regexp: "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$&+/_?-]{12,128}$",
                expected: "required: digit; required: lower; required: upper; allowed: [-!@#$&+/_?]; minlength: 12; maxlength: 128;"
            },
            {
                name: "Hyphen at beginning (should stay at front)",
                regexp: "^(?=.*[0-9])[a-zA-Z0-9-!@#$]{8,20}$",
                expected: "required: digit; allowed: lower, upper, [-!@#$]; minlength: 8; maxlength: 20;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testSpecialCharacterHandling() {
        console.log("=== Special Character Handling Tests ===\n");

        const testCases = [
            {
                name: "Explicit special chars in lookahead",
                regexp: "^(?=.*[!@#$])(?=.*[0-9])[a-zA-Z0-9!@#$]{8,20}$",
                shouldContain: "required: [!@#$]",
                shouldNotContain: "special"
            },
            {
                name: "Different special chars in lookahead",
                regexp: "^(?=.*[!@])(?=.*[0-9])[a-zA-Z0-9!@]{8,20}$",
                shouldContain: "required: [!@]",
                shouldNotContain: "special"
            }
        ];

        testCases.forEach(({ name, regexp, shouldContain, shouldNotContain }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const containsPass = result !== null && result.includes(shouldContain);
            const notContainsPass = result !== null && !result.includes(shouldNotContain);
            const passed = containsPass && notContainsPass;

            console.log(`Test: ${name}`);
            console.log(`Result:   ${result}`);
            console.log(`Contains "${shouldContain}": ${containsPass ? '✅' : '❌'}`);
            console.log(`Does not contain "${shouldNotContain}": ${notContainsPass ? '✅' : '❌'}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testCharacterClassNormalization() {
        console.log("=== Character Class Normalization Tests ===\n");

        const testCases = [
            {
                name: "Close bracket (escaped) in character class",
                regexp: "^(?=.*[0-9])[a-zA-Z0-9\\]!@#]{8,20}$",
                expected: "required: digit; allowed: lower, upper, [!@#]]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Both hyphen and close bracket (escaped)",
                regexp: "^(?=.*[0-9])[a-zA-Z0-9\\]-!@#]{8,20}$",
                expected: "required: digit; allowed: lower, upper, [-!@#]]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Close bracket (escaped) in lookahead",
                regexp: "^(?=.*[\\]!@])(?=.*[0-9])[a-zA-Z0-9\\]!@]{8,20}$",
                expected: "required: [!@]]; required: digit; allowed: lower, upper; minlength: 8; maxlength: 20;"
            },
            {
                name: "Hyphen at end in lookahead (should move to front)",
                regexp: "^(?=.*[!@-])(?=.*[0-9])[a-zA-Z0-9!@-]{8,20}$",
                expected: "required: [-!@]; required: digit; allowed: lower, upper; minlength: 8; maxlength: 20;"
            },
            {
                name: "Hyphen at beginning in character class",
                regexp: "^(?=.*[0-9])[a-zA-Z0-9-!@#$]{8,20}$",
                expected: "required: digit; allowed: lower, upper, [-!@#$]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Both hyphen and bracket (escaped) in lookahead",
                regexp: "^(?=.*[\\]-!@])(?=.*[0-9])[a-zA-Z0-9\\]-!@]{8,20}$",
                expected: "required: [-!@]]; required: digit; allowed: lower, upper; minlength: 8; maxlength: 20;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testImplicitlyAllowedCharacters() {
        console.log("=== Implicitly Allowed Characters Tests ===\n");

        const testCases = [
            {
                name: "Required chars are implicitly allowed (no allowed section needed)",
                regexp: "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{12,128}$",
                expected: "required: digit; required: lower; required: upper; minlength: 12; maxlength: 128;"
            },
            {
                name: "Only special chars in allowed (required chars excluded)",
                regexp: "^(?=.*[0-9])(?=.*[a-z])[a-z0-9!@#]{8,20}$",
                expected: "required: digit; required: lower; allowed: [!@#]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Required digit and lower, allowed adds upper",
                regexp: "^(?=.*[0-9])(?=.*[a-z])[a-zA-Z0-9]{8,20}$",
                expected: "required: digit; required: lower; allowed: upper; minlength: 8; maxlength: 20;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testDotStarPattern() {
        console.log("=== Dot Star Pattern Tests ===\n");

        const testCases = [
            {
                name: "Lookaheads with .* (allow everything)",
                regexp: "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*{12,128}$",
                expected: "required: digit; required: lower; required: upper; minlength: 12; maxlength: 128;"
            },
            {
                name: "Lookaheads with .+ (allow everything, one or more)",
                regexp: "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).+{12,128}$",
                expected: "required: digit; required: lower; required: upper; minlength: 12; maxlength: 128;"
            },
            {
                name: "Lookaheads with . and length (allow everything)",
                regexp: "^(?=.*[0-9])(?=.*[a-z]).{12,128}$",
                expected: "required: digit; required: lower; minlength: 12; maxlength: 128;"
            },
            {
                name: "Lookaheads with .* no length",
                regexp: "^(?=.*[0-9])(?=.*[a-z]).*$",
                expected: "required: digit; required: lower;"
            },
            {
                name: "Lookaheads with .+ no length",
                regexp: "^(?=.*[0-9])(?=.*[a-z]).+$",
                expected: "required: digit; required: lower;"
            },
            {
                name: "Single lookahead with .*",
                regexp: "^(?=.*[!@#]).*{8,20}$",
                expected: "required: [!@#]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Single lookahead with .+",
                regexp: "^(?=.*[!@#]).+{8,20}$",
                expected: "required: [!@#]; minlength: 8; maxlength: 20;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testShorthandAndCombinedPatterns() {
        console.log("=== Shorthand and Combined Range Tests ===\n");

        const testCases = [
            {
                name: "Combined range lookahead with shorthand digit (full failing case)",
                regexp: "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&^'_+=;:,.~\\/`\\|\\{\\}\\[\\]\\)\\(\\\\]{8,64}$",
                expected: "required: upper, lower; required: digit; allowed: [@$!%*#?&^'_+=;:,.~/`|{}[)(\\]]; minlength: 8; maxlength: 64;"
            },
            {
                name: "Shorthand \\d lookahead only",
                regexp: "^(?=.*\\d)[a-z0-9]{8,20}$",
                expected: "required: digit; allowed: lower; minlength: 8; maxlength: 20;"
            },
            {
                name: "Shorthand before bracket preserves order",
                regexp: "^(?=.*\\d)(?=.*[a-z])[a-z0-9]{8,20}$",
                expected: "required: digit; required: lower; minlength: 8; maxlength: 20;"
            },
            {
                name: "Combined A-Za-z lookahead",
                regexp: "^(?=.*[A-Za-z])[A-Za-z0-9]{8,20}$",
                expected: "required: upper, lower; allowed: digit; minlength: 8; maxlength: 20;"
            },
            {
                name: "\\d in main character class (not in lookahead)",
                regexp: "^(?=.*[0-9])[a-z\\d]{8,20}$",
                expected: "required: digit; allowed: lower; minlength: 8; maxlength: 20;"
            },
            {
                name: "Escaped brackets in main character class",
                regexp: "^(?=.*[0-9])[a-z0-9\\[\\]]{8,20}$",
                expected: "required: digit; allowed: lower, [[]]; minlength: 8; maxlength: 20;"
            },
            {
                name: "Escaped backslash in main character class",
                regexp: "^(?=.*[0-9])[a-z0-9\\\\]{8,20}$",
                expected: "required: digit; allowed: lower, [\\]; minlength: 8; maxlength: 20;"
            }
        ];

        testCases.forEach(({ name, regexp, expected }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = result === expected;

            console.log(`Test: ${name}`);
            console.log(`Expected: ${expected}`);
            console.log(`Got:      ${result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }

    testUnsupportedPatterns() {
        console.log("=== Unsupported Pattern Tests ===\n");

        const testCases = [
            {
                name: "Regex with alternation",
                regexp: "^(?=.*[0-9])(abc|def)[a-z0-9]{8,20}$",
                shouldBeNull: true
            },
            {
                name: "Regex with backreference",
                regexp: "^(?=.*[0-9])([a-z])\\1[a-z0-9]{8,20}$",
                shouldBeNull: true
            },
            {
                name: "Regex with word boundary",
                regexp: "^(?=.*[0-9])\\b[a-z0-9]{8,20}\\b$",
                shouldBeNull: true
            },
            {
                name: "Regex without character class",
                regexp: "^(?=.*[0-9])(?=.*[a-z])abc{8,20}$",
                shouldBeNull: true
            },
            {
                name: "Regex with extra content after",
                regexp: "^(?=.*[0-9])[a-z0-9]{8,20}$extra",
                shouldBeNull: true
            },
            {
                name: "Regex with nested groups",
                regexp: "^(?=.*[0-9])(?:(?=.*[a-z]))[a-z0-9]{8,20}$",
                shouldBeNull: true
            },
            {
                name: "Regex with quantifier on lookahead",
                regexp: "^(?=.*[0-9]){2}[a-z0-9]{8,20}$",
                shouldBeNull: true
            }
        ];

        testCases.forEach(({ name, regexp, shouldBeNull }) => {
            const result = PatternRegexpToPasswordRulesConverter.convert(regexp);
            const passed = (result === null) === shouldBeNull;

            console.log(`Test: ${name}`);
            console.log(`Regex:    ${regexp}`);
            console.log(`Result:   ${result === null ? 'null (rejected)' : result}`);
            console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
            this.recordResult(passed);
        });
    }
}

const tester = new PatternRegexpToPasswordRulesConverterTest();
const passed = tester.runAll();
process.exit(passed ? 0 : 1);
