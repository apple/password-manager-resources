<!-- Thanks for contributing! Before you submit your pull request, please make sure to check the following boxes by putting an x in the [ ] (don't: [x ], [ x], do: [x]); you should remove sections for files you aren't changing -->

### Overall Checklist
- [ ] I agree to the project's [Developer Certificate of Origin](https://github.com/apple/password-manager-resources/blob/main/DEVELOPER_CERTIFICATE_OF_ORIGIN.md)
- [ ] There are no [open pull requests](https://github.com/apple/password-manager-resources/pulls) for the same update

#### for password-rules.json
- [ ] The given rule isn't particularly standard and obvious for password managers
- [ ] Generated passwords have been tested from this rule using the [Password Rules Validation Tool](https://developer.apple.com/password-rules/)
- [ ] Information has been included about the website's requirements (eg. screenshots, error messages, steps during experimentation, etc.)
- [ ] The PR isn't documenting something that would be a common practice among password managers (e.g. minimal length of 6)

#### for change-password-URLs.json
- [ ] There is no Well-Known URL for Changing Passwords (`https://example.com/.well-known/change-password`)
- [ ] The URL either makes the experience better or no worse than being directed to just the domain in a non-logged-in state

#### for shared-credentials.json
- [ ] There's evidence the domains are currently related (SSL certificates, DNS entries, valid links between sites, legal documents etc.)
- One or more of the following:
  - [ ] If using `shared`, the new group serves login pages on each of the included domains, and those login pages accept accounts from the others. (For example, we wouldn't use a `shared` association from `google.co.il` to `google.com`, because `google.co.il` redirects to `accounts.google.com` for sign in.)
  - [ ] If using `from` and `to`, the `from` domain(s) redirect to the `to` domain to log in, and previously served their own sign-in forms, so users are likely to have accounts saved for them in password managers. (If a `from` domain never served a sign-in form, there are no saved accounts for it to share, and it shouldn't be included. It is not our goal to document every redirect on the web; we only document redirects where users of password managers would find value.)

#### for shared-credentials-historical.json
- [ ] You believe that the domains were associated at some point in the past and can explain that relationship

#### for apple-appIDs-to-domains-shared-credentials.json
- [ ] The App ID was found as described in the [contributing guide](https://github.com/apple/password-manager-resources/blob/main/CONTRIBUTING.md#contributing-to-apple-application-ids-to-domains-that-share-credentials) (e.g. from the output of `codesign -d --entitlements - --xml path/to/Example.app`), and that output has been included in the description
- [ ] The app doesn't already declare an [associated domain](https://developer.apple.com/documentation/xcode/supporting-associated-domains) for the domain(s)
- [ ] Evidence has been included that the app and the domains share a credential backend (e.g. the app's sign-in screen links to the website, or the same account signs in to both)
- [ ] The domains are ordered from most prominent to least prominent

#### for web-browser-extension-distribution-information.json
- [ ] The app meets the definition of a web browser given in the [README](https://github.com/apple/password-manager-resources/blob/main/README.md#web-browser-extension-distribution-information)
- [ ] Information about the web browser has been included below, including a link to its official website and a link to download it
- [ ] The platform-specific information (e.g. bundle identifier, code signing identifier, and code signing team identifier) was verified from a copy of the browser downloaded from that link (e.g. by including the output of `codesign -d -vvvv /path/to/Browser.app`)
- [ ] The browser supports installing extensions from each of the listed storefronts

Web browser name:
Official website:
Download link:

#### for websites-that-append-2fa-to-password.json
- [ ] Evidence has been included that signing in to the website requires appending a generated code to the password (e.g. a link to the website's support page)

#### for websites-that-ask-for-credentials-for-other-services-when-embedded-as-third-party.json
- [ ] Evidence has been included that the website, when embedded as a third party (e.g. in an `<iframe>`), asks for credentials for other services (e.g. screenshots, or steps to navigate to a website that embeds it)
- [ ] The website asks for those credentials directly, rather than sending the user to the other service to sign in (e.g. with OAuth)
