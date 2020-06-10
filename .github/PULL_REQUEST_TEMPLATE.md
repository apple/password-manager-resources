<!-- Thanks for contributing! Before you submit your pull request, please make sure to check the following boxes by putting an x in the [ ] (don't: [x ], [ x], do: [x]) -->

### Checklist
- [ ] The PR isn't documenting something that would be a common practice among password managers (e.g. minimal length of 6)
- [ ] The top-level JSON objects are sorted alphabetically
- [ ] There are no [open pull requests](https://github.com/apple/password-manager-resources/pulls) for the same update.

#### for websites-with-shared-credential-backends.json
- [ ] There's evidence the domains are related (SSL certificates, DNS entries, valid links between sites, legal documents etc.)
- [ ] The new group serves login pages on each of the included domains, and those login page accept accounts from the others. (For example, we don't associate `google.co.il` to `google.com`, because `google.co.il` redirects to `accounts.google.com` for authentication.)

#### for change-password-URLs.json
- [ ] There is no Well-Known URL for Changing Passwords (`https://example.com/.well-known/change-password`)
- [ ] The URL either makes the experience better or no worse than being directed to just the domain in a non-logged-in state
