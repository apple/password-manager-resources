var assert = require('assert')

// Data files
var passwordRulesData = require('../../quirks/password-rules.json')

// For URL validation
var validator = require('validator')

describe('password-rules.json data tests', function () {

    it('should verify that all entries are valid site names', function() {
        var data = passwordRulesData

        for (var line in data) {
            assert.equal(validator.isURL(line), true, `key of ${line} is not a valid URL`)
        }
    })

    it('should verify that all entries have a password-rules value', function() {
        var data = passwordRulesData

        for (var line in data) {
            var rules = data[line]['password-rules']
            assert.equal(rules !== undefined && rules !== "", true, `${line} has no password rules defined`)
        }
    })

    it('should verify that all password rules are in the pattern of X:Y; ...', function() {
        var data = passwordRulesData

        // Note that this is only the most basic validation of the format "X:Y ; A:B"
        // for the password-rules attribute. Tests that run code from the main password
        // rules parser will actually validate the password-rules contents per the WHATWG spec.
        var rulePattern = /([^;]+):([^;]+)/gi

        for (var line in data) {
            var ruleData = data[line]['password-rules']

            var match = ruleData.match(rulePattern)
            assert.equal(match && match.length > 0, true, `Invalid rule data of '${ruleData}' for rule ${data[line]}`)
        }

        // Check known property
        var specific = data['163.com']['password-rules'] // should have 2 rules defined
        assert.equal(specific.match(rulePattern).length, 2, `Should be 2 password rules for 163.com`)
    })
})