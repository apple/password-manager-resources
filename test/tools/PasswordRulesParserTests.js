var assert = require('assert')
var rewire = require('rewire')

var parser = rewire('../../tools/PasswordRulesParser.js')

// Get the functions/objects we need from the PasswordRulesParser.js code
parsePasswordRules  = parser.__get__('parsePasswordRules')
Identifier          = parser.__get__('Identifier')
RuleName            = parser.__get__('RuleName')
Rule                = parser.__get__('Rule')
NamedCharacterClass = parser.__get__('NamedCharacterClass')

// Global since this is returned in a lot of cases
let DEFAULT_RULE 
    = new Rule(
        RuleName.ALLOWED,
        [new NamedCharacterClass(Identifier.ASCII_PRINTABLE)])

describe('test password rule values that should return a default rule', function() {

    var tests = [
        { arg: "",                         expected: [DEFAULT_RULE] },
        { arg: "allowed: [供应商责任进展]", expected: [DEFAULT_RULE] },
        { arg: "allowed: upper,,",         expected: [DEFAULT_RULE] },
        { arg: "allowed: upper,;",         expected: [DEFAULT_RULE] },
        { arg: "allowed: upper [a]",       expected: [DEFAULT_RULE] },
        { arg: "dummy: upper",             expected: [DEFAULT_RULE] },
        { arg: "upper: lower",             expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: [ABC]",   expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: upper",   expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: 1+1",     expected: [DEFAULT_RULE] },
        { arg: "max-consecutive: 供",      expected: [DEFAULT_RULE] },
        { arg: "required: 1",              expected: [DEFAULT_RULE] },
        { arg: "required: 1+1",            expected: [DEFAULT_RULE] },
        { arg: "required: 供",             expected: [DEFAULT_RULE] },
        { arg: "required: A",              expected: [DEFAULT_RULE] },
        { arg: "required: required: upper",expected: [DEFAULT_RULE] },
        { arg: "allowed: 1",               expected: [DEFAULT_RULE] },
        { arg: "allowed: 1+1",             expected: [DEFAULT_RULE] },
        { arg: "allowed: 供",              expected: [DEFAULT_RULE] },
        { arg: "allowed: A",               expected: [DEFAULT_RULE] },
        { arg: "allowed: allowed: upper",  expected: [DEFAULT_RULE] }
    ]

    tests.forEach(function (test) {
        it(`should return default rule for '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, 1, `Failed to return only one rule for input of '${test.arg}'`)
            assert.deepEqual(rules[0], test.expected[0], `Failed to return a default rule of '${DEFAULT_RULE}'`)
        })
    })
})