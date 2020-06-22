<!-- Thanks for contributing! Before you submit your pull request, please make sure to check the following boxes by putting an x in the [ ] (don't: [x ], [ x], do: [x]); you should remove sections for files you aren't changing -->

### Overall Checklist
- [ ] I agree to the project's [Developer Certificate of Origin](https://github.com/apple/password-manager-resources/blob/main/DEVELOPER_CERTIFICATE_OF_ORIGIN.md)
- [ ] The top-level JSON objects are sorted alphabetically
- [ ] There are no [open pull requests](https://github.com/apple/password-manager-resources/pulls) for the same update

#### for websites-with-shared-credential-backends.json
- [ ] There's evidence the domains are related (SSL certificates, DNS entries, valid links between sites, legal documents etc.)
- [ ] The new group serves login pages on each of the included domains, and those login page accept accounts from the others. (For example, we don't associate `google.co.il` to `google.com`, because `google.co.il` redirects to `accounts.google.com` for authentication.)

#### for change-password-URLs.json
- [ ] There is no Well-Known URL for Changing Passwords (`https://example.com/.well-known/change-password`)
- [ ] The PR isn't documenting something that would be a common practice among password managers (e.g. minimal length of 6)
- [ ] The URL either makes the experience better or no worse than being directed to just the domain in a non-logged-in state

#### for password-rules.json
- [ ] The given rule isn't particularly standard and obvious for password managers
- [ ] Generated passwords have been tested from this rule using the [Password Rules Validation Tool](https://developer.apple.com/password-rules/)
- [ ] Information has been included about the website's requirements (eg. screenshots, error messages, steps during experimentation, etc.)
