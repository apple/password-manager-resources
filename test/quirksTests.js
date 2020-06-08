var assert = require('assert')

// Data files
var changePasswordURLsData = require('../quirks/change-password-URLs.json')
var passwordRulesData = require('../quirks/password-rules.json')
var websitesWithSharedCredentialsBackendsData = require('../quirks/websites-with-shared-credential-backends.json')

// For URL validation
var validator = require('validator')

describe('change-password-URLs.json data tests', function() {

    it('should make sure each entry has valid / well-formed URLs', function() {

        var data = changePasswordURLsData

        for (var line in data) {
            assert.equal(validator.isURL(line), true, `key of ${line} is not a valid URL`)
            assert.equal(validator.isURL(data[line]), true, `value of ${data[line]} for key ${line} is not a valid URL`)
        }
    })

    it('should verify all URLs use HTTPS', function() {

        var data = changePasswordURLsData

        for (var line in data) {
            assert.equal(validator.isURL(data[line], {protocols:['https']}), true, 
                    `${data[line]} for key ${line} does NOT use HTTPS`)
        }
    })
})

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

describe('websites-with-shared-credential-backends.json data tests', function () {

    it('should verify that all entries are valid URLs', function() {
        var data = websitesWithSharedCredentialsBackendsData

        // This data is an array of arrays, all being URLs
        for (var i in data) {
            for (var j in data[i]) {
                var site = data[i][j]
                assert.equal(validator.isURL(site), true, `Invalid URL of ${site}`)
            }
        }
    })
})