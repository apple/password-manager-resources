var assert = require('assert')
var rewire = require('rewire')

var parser = rewire('../../tools/PasswordRulesParser.js')

// Get the parse function we need from the PasswordRulesParser.js code. That code
// is not a module so we need to introspect it in this case.
parsePasswordRules   = parser.__get__('parsePasswordRules')

// A few global rules since they are expected in a lot of cases
let DEFAULT_RULE    = [{'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]}]

// --------------------------------------------------------------------------------------------- //
describe('test password rule values that should return a default rule', function() {

    var tests = [
        { arg: "",                         expected: DEFAULT_RULE },
        { arg: "allowed: upper,,",         expected: DEFAULT_RULE },
        { arg: "allowed: upper,;",         expected: DEFAULT_RULE },
        { arg: "allowed: upper [a]",       expected: DEFAULT_RULE },
        { arg: "dummy: upper",             expected: DEFAULT_RULE },
        { arg: "upper: lower",             expected: DEFAULT_RULE },
        { arg: "max-consecutive: [ABC]",   expected: DEFAULT_RULE },
        { arg: "max-consecutive: upper",   expected: DEFAULT_RULE },
        { arg: "max-consecutive: 1+1",     expected: DEFAULT_RULE },
        { arg: "required: 1",              expected: DEFAULT_RULE },
        { arg: "required: 1+1",            expected: DEFAULT_RULE },
        { arg: "required: A",              expected: DEFAULT_RULE },
        { arg: "required: required: upper",expected: DEFAULT_RULE },
        { arg: "allowed: 1",               expected: DEFAULT_RULE },
        { arg: "allowed: 1+1",             expected: DEFAULT_RULE },
        { arg: "allowed: A",               expected: DEFAULT_RULE },
        { arg: "allowed: allowed: upper",  expected: DEFAULT_RULE }
    ]

    tests.forEach(function (test) {
        it(`should return default rule for '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, 1, `Failed to return only one rule for input of '${test.arg}'`)
            assert.equal(prettify(rules), prettify(test.expected), `Failed to return a default rule of '${DEFAULT_RULE}'`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test UPPER rules', function() {

    var tests = [
        { arg: "    required: upper",               expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "    required: upper;",              expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "    required: upper             ",  expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "required: uPPeR",                   expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "required:upper",                    expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "required:     upper",               expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "required: ; required: upper",       expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },

        { arg: "allowed:upper",             expected: [{'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "allowed:     upper",        expected: [{'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },
        { arg: "required: upper, [AZ];",    expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}]}] },

        { arg: "required: upper; allowed: upper; allowed: lower", 
          expected: [{'_name': 'required', 'value': [{'_name': 'upper'}]}, {'_name': 'allowed', 'value': [{'_name': 'upper'}, {'_name': 'lower'}]}]
        },
    ]

    tests.forEach(function (test) {
        it(`should return required/allowed UPPER rules for '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.equal(prettify(rules), prettify(test.expected), `Failed to return required/allowed rules of '${DEFAULT_RULE}'`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test that the lower number for two max-consecutive rules wins', function() {

    var tests = [
        { 
            arg: "max-consecutive: 3; max-consecutive: 5",
            expected: [
                {'_name': 'allowed', 'value': [{ '_name': 'ascii-printable'}]},
                {'_name': 'max-consecutive', 'value': 3}
            ]
        },

        {
            arg: "max-consecutive: 3; max-consecutive: 1; max-consecutive: 5",
            expected: [
                {'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]}, 
                {'_name': 'max-consecutive', 'value': 1}
            ]
        },

        {
            arg: "required: ascii-printable; max-consecutive: 5; max-consecutive: 3",
            expected: [
                {'_name': 'required', 'value': [{'_name': 'ascii-printable'}]}, 
                {'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]}, 
                {'_name': 'max-consecutive', 'value': 3}
            ]
        }
    ]

    tests.forEach(function (test) {
        it(`should return the smaller of the two max-consecutive rules in '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.equal(prettify(rules), prettify(test.expected), `Failed to return smaller of two max-consecutive rules`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test max-consecutive rules', function() {

    var tests = [
        {   
            arg: "max-consecutive:      5",
            expected: [
                {'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]},
                {'_name': 'max-consecutive', 'value': 5}
            ]
        },
        {   
            arg: "max-consecutive:5",
            expected: [
                {'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]},
                {'_name': 'max-consecutive', 'value': 5}
            ]
        },
        {   
            arg: "max-consecutive:      5;",
            expected: [
                {'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]},
                {'_name': 'max-consecutive', 'value': 5}
            ]
        },
        {   
            arg: "max-consecutive: 5; max-consecutive: 3",
            expected: [
                {'_name': 'allowed', 'value': [{'_name': 'ascii-printable'}]},
                {'_name': 'max-consecutive', 'value': 3}
            ]
        }
    ]

    tests.forEach(function (test) {
        it(`should return a valid max-consecutive rule from '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.equal(prettify(rules), prettify(test.expected), `Failed to return a valid max-consecutive rule`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test different characters in rules', function() {

/*

##  ["required: [*&^]; allowed: upper",                                   '[{"_name"=>"required", "value"=>[{"_characters"=>["&", "*", "^"]}]}, {"_name"=>"allowed", "value"=>[{"_name"=>"upper"}, {"_characters"=>["&", "*", "^"]}]}]'],
##  ["required: [*&^ABC]; allowed: upper",                                '[{"_name"=>"required", "value"=>[{"_characters"=>["A", "B", "C", "&", "*", "^"]}]}, {"_name"=>"allowed", "value"=>[{"_name"=>"upper"}, {"_characters"=>["&", "*", "^"]}]}]'],
##  ["required: unicode; required: digit",                                '[{"_name"=>"required", "value"=>[{"_name"=>"unicode"}]}, {"_name"=>"required", "value"=>[{"_name"=>"digit"}]}, {"_name"=>"allowed", "value"=>[{"_name"=>"unicode"}]}]'],
*/

    var tests = [
        { 
            arg: "required: [*&^]; allowed: upper", 
            expected: [
                {'_name': 'required', 'value': [{'_characters': ['&', '*', '^']}]},
                {'_name': 'allowed', 'value': [{'_name': 'upper'}, {'_characters': ['&', '*', '^']}]}
            ]
        },
        { 
            arg: "required: [*&^ABC]; allowed: upper",
            expected: [
                {'_name': 'required', 'value': [{'_characters': ['A', 'B', 'C', '&', '*', '^']}]},
                {'_name': 'allowed', 'value': [{'_name': 'upper'}, {'_characters': ['&', '*', '^']}]}
            ]
        },
        { 
            arg: "required: unicode; required: digit",
            expected: [
                {'_name': 'required', 'value': [{'_name': 'unicode'}]},
                {'_name': 'required', 'value': [{'_name': 'digit'}]},
                {'_name': 'allowed', 'value': [{'_name': 'unicode'}]}
            ]
        },
    ]

    tests.forEach(function (test) {
        it(`should return a valid rule with various characters from '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.deepEqual(rules, test.expected, `Failed to return a valid rule based on characters`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test that unicode characters are dropped/ignored', function() {

    var tests = [
        { arg: "allowed: [供应商责任进展]",    expected: DEFAULT_RULE },
        { arg: "max-consecutive: 供",        expected: DEFAULT_RULE },
        { arg: "required: 供",               expected: DEFAULT_RULE },
        { arg: "allowed: 供",                expected: DEFAULT_RULE },
        { arg: "allowed: [供应A商B责任C进展]", expected: [{'_name': 'allowed', 'value': [{'_characters': ['A', 'B', 'C']}]}] }
    ]

    tests.forEach(function (test) {
        it(`should ingore the unicode characters in '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.equal(prettify(rules), prettify(test.expected), `Failed to ignore unicode characters in '${test.arg}'`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test canonicalization', function() {

    var tests = [
        { 
            arg: "required: [abcdefghijklmnopqrstuvwxyz]", 
            expected: [
                {'_name': 'required', 'value': [{'_name': 'lower'}]},
                {'_name': 'allowed', 'value': [{'_name': 'lower'}]}
            ]
        },

        { 
            arg: "required: [abcdefghijklmnopqrstuvwxy]",
            expected: [
                {'_name': 'required', 'value': [{'_characters': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y']}]},
                {'_name': 'allowed', 'value': [{'_characters': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y']}]}
            ]
        }
    ]

    tests.forEach(function (test) {
        it(`should XXX in '${test.arg}'`, function() {
            var rules = parsePasswordRules(test.arg)
            assert.equal(rules.length, test.expected.length, `Failed to return ${test.expected.length} rule/s for input of '${test.arg}'`)
            assert.deepEqual(rules, test.expected, `Failed to XXX in '${test.arg}'`)
        })
    })
})

// --------------------------------------------------------------------------------------------- //
describe('test for extra whitespace (•) in password rules', function() {

    var tests = [
        { 
            arg: "required:         digit           ;                        required: [a-];",
            expected: [
                {'_name': 'required', 'value': [{'_name': 'digit'}]}, 
                {'_name': 'required', 'value': [{'_characters': ['a']}]}, 
                {'_name': 'allowed', 'value': [{'_name': 'digit'}, {'_characters': ['a']}]}
            ]
        },

        { 
            arg: 'required:         digit           ;                        required: []-];',
            expected: DEFAULT_RULE
        },

        { 
            arg: "required:         digit           ;                        required: [--];",
            expected: [
                {'_name': 'required', 'value': [{'_name': 'digit'}]},
                {'_name': 'required', 'value': [{'_characters': ['-']}]},
                {'_name': 'allowed', 'value': [{'_name': 'digit'}, {'_characters': ['-']}]}
            ]
        },

        { 
            arg: "required:         digit           ;                        required: [-]];",
            expected: [
                {'_name': 'required', 'value': [{'_name': 'digit'}]},
                {'_name': 'required', 'value': [{'_characters': ['-', ']']}]},
                {'_name': 'allowed', 'value': [{'_name': 'digit'}, {'_characters': ['-', ']']}]}
            ]
        },

        { 
            arg: "required:         digit           ;                        required: [-a--------];",
            expected: [ 
                {'_name': 'required', 'value': [{'_name': 'digit'}]},
                {'_name': 'required', 'value': [{'_characters': ['a', '-']}]},
                {'_name': 'allowed', 'value': [{'_name': 'digit'}, {'_characters': ['a', '-']}]}
            ]
        },

        { 
            arg: "required:         digit           ;                        required: [-a--------] ];",
            expected: DEFAULT_RULE
        }
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

// --------------------------------------------------------------------------------------------- //
function prettify(input) {
    return JSON.stringify(input, null, '  ')
}