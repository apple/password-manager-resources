var assert = require('assert')

// Data files
var changePasswordURLsData = require('../../quirks/change-password-URLs.json')

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