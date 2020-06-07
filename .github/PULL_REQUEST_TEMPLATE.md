<!-- Thanks for contributing! Before you submit your pull request, please make sure to check the following boxes by putting an x in the [ ] (don't: [x ], [ x], do: [x]) -->

### Checklist
- [ ] The PR isn't documenting something that would be a common practice among password managers (e.g. minimal length of 6)
- [ ] The top-level JSON objects are sorted alphabetically 
- [ ] There is no Well-Known URL for Changing Passwords (`https://example.com/.well-known/change-password`)
- [ ] There are no [open pull requests](https://github.com/apple/password-manager-resources/pulls) for the same update.

#### for websites-with-shared-credential-backends.json
- [ ] The new group has login pages on each of the included domains. For example, firstcompany-com/login and secondcompany-com/login share the same backend, despite the different base domains. 
