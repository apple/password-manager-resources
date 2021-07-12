var assert = require('assert')

// Data files
var websitesWithSharedCredentialsBackendsData = require('../../quirks/websites-with-shared-credential-backends.json')

// For URL validation
var validator = require('validator')

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