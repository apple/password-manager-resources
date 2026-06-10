# Password Manager Resources

## Welcome!

The _Password Manager Resources_ project exists so creators of password managers can collaborate on resources to make password management better for users. Resources currently consist of data, or "quirks", as well as code.

"Quirk" is a term from web browser development that refers to a website-specific, hard-coded behavior to work around an issue with a website that can't be fixed in a principled, universal way. In this project, it has the same meaning. Although ideally, the industry will work to eliminate the need for all of the quirks in this project, there's value in customizing behaviors to ensure better user experience. The current quirks are:

* [**Password Rules**](#password-rules): Rules to generate compatible passwords with websites' particular requirements.
* [**Shared Credentials**](#shared-credentials): Groups of websites known to use the same credential backend, which can be used to enhance suggested credentials to sign in to websites.
* [**Change Password URLs**](#change-password-urls): To drive the adoption of strong passwords, it's useful to be able to take users directly to websites' change password pages.
* [**Websites Where 2FA Code is Appended to Password**](#websites-where-2fa-code-is-appended-to-password): Some websites use a two-factor authentication scheme where the user must append a generated code to their password when signing in.

Having password managers collaborate on these resources has three high-level benefits:

1. By sharing resources, all password managers can improve their quality with less work than it'd take for any individual password manager to achieve the same effect.
1. By publicly documenting website-specific behaviors, password managers can offer an incentive for websites to use standards or emerging standards to improve their compatibility with password managers; it's no fun to be called out on a list!
1. By improving the quality of password managers, we improve user trust in them as a concept, which benefits everyone.

We encourage you to incorporate the data from this project into your password manager, but kindly ask that you please contribute any quirks you have back to the project so that all users of participating password managers can benefit from your discoveries and testing.

## The Resources, In Detail

### Password Rules

Many password managers generate strong, unique passwords for people so that they aren't tempted to create their passwords by hand, which leads to easily guessed and reused passwords. Every time a password manager generates a password that isn't compatible with a website, a person not only has a bad experience but a reason to be tempted to create their password. Compiling password rule quirks helps fewer people run into issues like these while also documenting that a service's password policy is too restrictive for people using password managers, which may incentivize the services to change.

The file [`quirks/password-rules.json`](quirks/password-rules.json) contains a JSON object mapping domains to known good password rules for generating compatible passwords for use on that website. The [Password Rules language](https://developer.apple.com/password-rules/) is a human- and machine-readable way to concisely write and read the rules to generate a compatible password on a website. [`quirks/password-rules.json`](quirks/password-rules.json) is the quirks version of the [`passwordRules` attribute](https://github.com/whatwg/html/issues/3518), which is currently an open WHATWG proposal and supported in Safari. The same language is part of [native iOS application development API](https://developer.apple.com/documentation/security/password_autofill/customizing_password_autofill_rules). If a website changes its password requirements to be general enough to not warrant quirks, or if it adopts the `passwordRules` attribute to accurately communicate its requirements to password managers and web browsers, it should be removed from this list.

When a domain is listed in [`quirks/password-rules.json`](quirks/password-rules.json), it means that that domain and all of its subdomains use the rule. For example, a rule for `example.com` will match URLs on `example.com` as well as `*.example.com`. A rule for `a.example.com` will match URLs on `a.example.com` as well as `*.a.example.com`, but will not match other subdomains of `example.com` such as `b.example.com`.

A rule that should only be applied to the exact domain stated as a key should have the `exact-domain-match-only` key set to a value of `true`. The absence of the `exact-domain-match-only` key means that it is false.

### Password Rules Language Parser

An implementation of a parser for the Password Rules language that's written in JavaScript can be found in [`tools/PasswordRulesParser.js`](tools/PasswordRulesParser.js). It can be used as a reference implementation, interpreted in build systems to convert `data/password-rules.json` to an application-specific format, or interpreted at application runtime wherever it's possible to execute JavaScript (e.g. using the JavaScriptCore framework on Apple platforms).

A [third-party parser implementation](https://github.com/1Password/password-rules-parser) that's written in Rust is also available.

### Shared Credentials

The files [`quirks/shared-credentials.json`](quirks/shared-credentials.json) and [`quirks/shared-credentials-historical.json`](quirks/shared-credentials-historical.json) express relationships between groups of websites that share credentials. The `-historical` file describes such relationships that were valid in the past but either are not valid today or we don't have a high degree of confidence are valid today.

Information in [`quirks/shared-credentials.json`](quirks/shared-credentials.json) can be used by password managers to offer contextually relevant accounts to users on `first.website`, even if credentials were previously saved for `second.website`. This list should not be used as part of any user experience that releases user credentials to a website without the user's explicit review and consent. In general, saved credentials should only be suggested to users with site-bound scoping. This list is appropriate for allowing a credential saved for website A to appear on website B if the website the credential was saved for is clearly stated.

There are existing proposals to allow different domains to declare an affiliation with each other, which could be a way for websites to solve this problem themselves, given browser and password manager adoption of such a proposal. Until and perhaps beyond then, it is useful to have these groupings of websites to make password filling suggestions more useful.

Information in [`quirks/shared-credentials-historical.json`](quirks/shared-credentials-historical.json) can be used by password managers to suppress password reuse warnings across websites, given that website A and website B once were known to share credentials in the past.

The [Contributing](CONTRIBUTING.md) document goes into detail on the format of these files.

### Change Password URLs

The file [`quirks/change-password-URLs.json`](quirks/change-password-URLs.json) contains a JSON object mapping domains to URLs where users can change their password. This is the quirks version of the [Well Known URL for Changing Passwords](https://github.com/w3c/webappsec-change-password-url). If a website adopts the Change Password URL, it should be removed from this list.

### Apple App IDs to Domains that Share Credentials

The file [`apple-appIDs-to-domains-shared-credentials.json`](quirks/apple-appIDs-to-domains-shared-credentials.json) expresses relationships between apps running on macOS, iOS, and iPadOS, and domains that use the same credentials. Information in this file is used by iOS and iPadOS (since version 17.4) and macOS (since version 14.4) for suggesting credentials in apps that do not have an [association with domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains). The system AutoFill capability makes use of this information to improve the user experience of signing into these apps by giving users inline suggestions of the appropriate credentials when signing in. This works for all password managers that make use of the [Credential Provider Extension](https://support.apple.com/guide/security/credential-provider-extensions-sec6319ac7b9/web) mechanism.

The JSON file is a map from [App Identifier](https://developer.apple.com/help/account/manage-identifiers/register-an-app-id/) to an array of domains. Domains should be ordered by prominence from most prominent to least. The apps do not need to be distributed on Apple's App Store.

### Web Browser Extension Distribution Information

The file [`web-browser-extension-distribution-information.json`](quirks/web-browser-extension-distribution-information.json) expresses relationships between web browsers and web browser extension storefronts. This information may be useful to a password manager with a companion web browser extension to discover installed web browsers where a user may want to install the extension.

For the purpose of this data:

- a web browser is an app that can open URLs with the HTTP and HTTPS schemes (e.g. on macOS, specifies these schemes in its Info.plist file), and on launch, provides a text field for entering a URL, search tools for finding relevant links on the internet, or a curated list of bookmarks
- a web browser extension storefront is a destination where it is possible to install extensions in or for one or more web browsers

#### How Apple Uses Web Browser Extension Distribution Information

As of macOS Sequoia version 15.5 and above, information in this file is periodically ingested and re-packaged by Apple to limit the [Native Messaging Host](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging) of the iCloud Passwords extension to only communicate with known web browsers. If you would like a web browser included in the list Apple uses for this purpose, please [raise a GitHub issue](https://github.com/apple/password-manager-resources/issues) or submit a pull request. These communication restrictions are implemented by using [launch environment constraints](https://developer.apple.com/documentation/security/applying-launch-environment-and-library-constraints), which are signed into a helper binary distributed with macOS. This means that an operating system update is required for additional web browsers to be able to support the iCloud Passwords extension. You can check if a particular web browser has been added to the relevant binary’s launch environment constraints by running the following command and viewing the Launch Constraints section of the output:

```
codesign -d -vvvv /System/Cryptexes/App/System/Library/CoreServices/PasswordManagerBrowserExtensionHelper.app/Contents/MacOS/PasswordManagerBrowserExtensionHelper
```

### Websites Where 2FA Code is Appended to Password

The file [`quirks/websites-that-append-2fa-to-password.json`](quirks/websites-that-append-2fa-to-password.json) contains a JSON array of domains which use a two-factor authentication scheme where the user must append a generated code to their password when signing in. This list of websites could be used to prevent auto-submission of sign-in forms, allowing the user to append the 2FA code without frustration. It can also be used to suppress prompting to update a saved password when the submitted password is prefixed by the already-stored password.

### Websites That Ask for Credentials for Other Services When Embedded as Third-party

The file [`quirks/websites-that-ask-for-credentials-for-other-services-when-embedded-as-third-party.json`](quirks/websites-that-ask-for-credentials-for-other-services-when-embedded-as-third-party.json) contains a JSON array of domains that, when embedded as a third party, are known to ask for credentials for other services. For example, some payment processors conduct transactions by being embedded in an `<iframe>` on a website. These payment processors may ask for banking credentials directly, without using OAuth.

A password manager may wish to not offer to save a new password submitted in such an `<iframe>`, because the credentials are likely to not be for the service itself.

## Contributing

Please review [how to contribute](CONTRIBUTING.md) if you would like to submit a pull request.

## Asking Questions and Discussing Ideas

If you have any questions you'd like to ask publicly, or ideas you'd like to discuss, please [raise a GitHub issue](https://github.com/apple/password-manager-resources/issues) or send a message in the project's [Slack instance](https://pw-manager-resources.slack.com). Anyone participating in the project is welcome to join the Slack instance by [emailing the project's maintainers at Apple](mailto:password-manager-resources-maintainers@apple.com) and asking for an invitation. Please include your GitHub user name when you do this.

## Project Maintenance

Project maintenance involves, but is not limited to, adding clarity to incoming [issues](https://github.com/apple/password-manager-resources/issues) and reviewing pull requests. Project maintainers can approve and merge pull requests. Reviewing a pull request involves judging that a proposed contribution follows the project's guidelines, as described by the [guide to contributing](CONTRIBUTING.md). If you are interested in becoming a project maintainer, please [email the project maintainers at Apple](mailto:password-manager-resources-maintainers@apple.com) with the following information:

* Your name
* Your GitHub user name
* Any organizations you're affiliated with that are related to password management, including professionally
* Links to examples of pull requests submitted, review feedback given, and comments on issues that demonstrate why you'd be a good project maintainer

Ideally, you'd provide somewhere between five and eight examples. The purpose of this note is to remind the Apple maintainers of who you are; ideally, before sending this message, we already know you from your great contributions!

Project maintainers are expected to always follow the project's [Code of Conduct](CODE_OF_CONDUCT.md), and help to model it for others.

## Project Governance

Although we expect this to happen very infrequently, Apple reserves the right to make changes, including changes to data format and scope, to the project at any time.
