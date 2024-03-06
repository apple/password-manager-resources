var assert = require('assert')

// Data files
var websitesThatAppend2FAData = require('../../quirks/websites-that-append-2fa-to-password.json')

// For URL validation
var validator = require('validator')

describe('websites-that-append-2fa-to-password.json data tests', function () {

    it('should verify that all entries are valid URLs', function() {
        var data = websitesThatAppend2FAData

        // This data is a simple array
        for (var site of data) {
            assert.equal(validator.isURL(site), true, `Invalid URL of ${site}`)
        }
    })
})