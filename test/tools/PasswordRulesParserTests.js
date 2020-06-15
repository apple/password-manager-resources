var assert = require('assert')
var rewire = require('rewire')

var parser = rewire('../../tools/PasswordRulesParser.js')

// Get the functions/objects we need from the PasswordRulesParser.js code. That code
// is not a module so we need to introspect it for the stuff we need.
parsePasswordRules   = parser.__get__('parsePasswordRules')
Identifier           = parser.__get__('Identifier')
RuleName             = parser.__get__('RuleName')
Rule                 = parser.__get__('Rule')
NamedCharacterClass  = parser.__get__('NamedCharacterClass')
CustomCharacterClass = parser.__get__('CustomCharacterClass')

// Global since this is returned in a lot of cases
let DEFAULT_RULE = new Rule(RuleName.ALLOWED, [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)])

describe('test password rule values that should return a default rule', function() {

    var tests = [
        { arg: "",                         expected: [DEFAULT_RULE] },
        { arg: "allowed: upper,,",         expected: [DEFAULT_RULE] },
        { arg: "allowed: upper,;",         expected: [DEFAULT_RULE] },
        { arg: "allowed: upper [a]",       expected: [DEFAULT_RULE] },
        { arg: "dummy: upper",             expected: [DEFAULT_RULE] },
        { arg: "upper: lower",             expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: [ABC]",   expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: upper",   expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: 1+1",     expected: [DEFAULT_RULE] },
        { arg: "required: 1",              expected: [DEFAULT_RULE] },
        { arg: "required: 1+1",            expected: [DEFAULT_RULE] },
        { arg: "required: A",              expected: [DEFAULT_RULE] },
        { arg: "required: required: upper",expected: [DEFAULT_RULE] },
        { arg: "allowed: 1",               expected: [DEFAULT_RULE] },
        { arg: "allowed: 1+1",             expected: [DEFAULT_RULE] },
        { arg: "allowed: A",               expected: [DEFAULT_RULE] },
        { arg: "allowed: allowed: upper",  expected: [DEFAULT_RULE] }
    ]

    tests.forEach(function (test) {
        it(`should return default rule for '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, 1, `Failed to return only one rule for input of '${test.arg}'`)
            assert.deepEqual(rules, test.expected, `Failed to return a default rule of '${DEFAULT_RULE}'`)
        })
    })
})

describe('test that the lower number for max-consecutive wins', function() {

    var tests = [
        { 
            arg: "max-consecutive: 3; max-consecutive: 5",
            expected: [DEFAULT_RULE, new Rule(RuleName.MAX_CONSECUTIVE, 3)]
        },

        {
            arg: "max-consecutive: 3; max-consecutive: 1; max-consecutive: 5",
            expected: [DEFAULT_RULE, new Rule(RuleName.MAX_CONSECUTIVE, 1)]
        },

        {
            arg: "required: ascii-printable; max-consecutive: 5; max-consecutive: 3",
            expected: [ new Rule(RuleName.REQUIRED, [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)]),
                        new Rule(RuleName.ALLOWED,  [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)]),
                        new Rule(RuleName.MAX_CONSECUTIVE, 3)]
        }
    ]

    tests.forEach(function (test) {
        it(`should return the smaller of the two max-consecutive rules in '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.deepEqual(rules, test.expected, `Failed to return smaller of two max-consecutive rules`)
        })
    })
})

describe('test that unicode characters are dropped/ignored', function() {

    var tests = [
        { arg: "allowed: [供应商责任进展]",    expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: 供",        expected: [DEFAULT_RULE] },
        { arg: "required: 供",               expected: [DEFAULT_RULE] },
        { arg: "allowed: 供",                expected: [DEFAULT_RULE] },
        { 
            arg: "allowed: [供应A商B责任C进展]",
            expected: [ new Rule(RuleName.ALLOWED, [new CustomCharacterClass(["A", "B", "C"])]) ]
        }
    ]

    tests.forEach(function (test) {
        it(`should ingore the unicode characters in '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.deepEqual(rules, test.expected, `Failed to ignore unicode characters in '${test.arg}'`)
        })
    })
})

describe('test canonicalization', function() {

    var tests = [
        { 
            arg: "required: [abcdefghijklmnopqrstuvwxyz]", 
            expected: [
                new Rule(RuleName.REQUIRED, [new NamedCharacterClass(Identifier.LOWER)]),
                new Rule(RuleName.ALLOWED, [new NamedCharacterClass(Identifier.LOWER)])
            ]
        },

        { 
            arg: "required: [abcdefghijklmnopqrstuvwxy]",
            expected: [
                new Rule(RuleName.REQUIRED, [new CustomCharacterClass(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y'])]),
                new Rule(RuleName.ALLOWED,  [new CustomCharacterClass(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y'])]),
            ]
        },
    ]

    tests.forEach(function (test) {
        it(`should XXX in '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.deepEqual(rules, test.expected, `Failed to XXX in '${test.arg}'`)
        })
    })
})

describe('test for extra whitespace (•) in password rules', function() {

    var tests = [
        { 
            arg: "required:         digit           ;                        required: [a-];",
            expected: [
                new Rule(RuleName.REQUIRED, [new NamedCharacterClass(Identifier.DIGIT)]),
                new Rule(RuleName.REQUIRED, [new CustomCharacterClass(['a'])]),
                new Rule(RuleName.ALLOWED, [new NamedCharacterClass(Identifier.DIGIT), new CustomCharacterClass(['a'])])
            ]
        },

        { 
            arg: "required:         digit           ;                        required: []-];",
            expected: [DEFAULT_RULE]
        },

        { 
            arg: "required:         digit           ;                        required: [--];",
            expected: [
                new Rule(RuleName.REQUIRED, [new NamedCharacterClass(Identifier.DIGIT)]),
                new Rule(RuleName.REQUIRED, [new CustomCharacterClass(['-'])]),
                new Rule(RuleName.ALLOWED, [new NamedCharacterClass(Identifier.DIGIT), new CustomCharacterClass(['-'])])
            ]
        },

        { 
            arg: "required:         digit           ;                        required: [-]];",
            expected: [
                new Rule(RuleName.REQUIRED, [new NamedCharacterClass(Identifier.DIGIT)]),
                new Rule(RuleName.REQUIRED, [new CustomCharacterClass(['-',']'])]),
                new Rule(RuleName.ALLOWED, [new NamedCharacterClass(Identifier.DIGIT), new CustomCharacterClass(['-',']'])])
            ]
        },

        { 
            arg: "required:         digit           ;                        required: [-a--------];",
            expected: [ 
                new Rule(RuleName.REQUIRED, [new NamedCharacterClass(Identifier.DIGIT)]),
                new Rule(RuleName.REQUIRED, [new CustomCharacterClass(['a','-'])]),
                new Rule(RuleName.ALLOWED, [new NamedCharacterClass(Identifier.DIGIT), new CustomCharacterClass(['a','-'])])
            ]
        },

        { 
            arg: "required:         digit           ;                        required: [-a--------] ];",
            expected: [DEFAULT_RULE] 
        },
    ]

    tests.forEach(function (test) {
        var display = test.arg.replace(/\s/g, '•') // show the whitespace as bullets
        it(`should ingore the whitespace in '${display}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${display}'`)
            assert.deepEqual(rules, test.expected, `Failed to ignore whitespace in '${display}'`)
        })
    })
})