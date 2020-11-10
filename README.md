# Password Manager Resources

## Welcome!

The _Password Manager Resources_ project exists so creators of password managers can collaborate on resources to make password management better for users. Resources currently consist of data, or "quirks", as well as code.

"Quirk" is a term from web browser development that refers to a website-specific, hard-coded behavior to work around an issue with a website that can't be fixed in a principled, universal way. In this project, it has the same meaning. Although ideally, the industry will work to eliminate the need for all of the quirks in this project, there's value in customizing behaviors to ensure better user experience. The current quirks are:

* [**Password Rules**](#password-rules): Rules to generate compatible passwords with websites' particular requirements.
* [**Websites with Shared Credential Backends**](#websites-with-shared-credential-backends): Groups of websites known to use the same credential backend, which can be used to enhance suggested credentials to sign in to websites.
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

A third-party parser implementation is also available [here](https://github.com/1Password/password-rules-parser).

### Websites with Shared Credential Backends

The file [`quirks/websites-with-shared-credential-backends.json`](quirks/websites-with-shared-credential-backends.json) contains a list of groups of websites that share the same credential backend and serve pages where users can sign in, accepting accounts from the others. For example, adding first.website and second.website means that first.website and second.website each serve a page (e.g. first.website/login and second.website/login) where the same accounts are valid for signing in, despite the different domains. It wouldn’t be appropriate to associate google.com.il to google.com because google.com.il redirects to accounts.google.com for sign-in, and google.com.il never serves a login page.

This data can be used by password managers to offer contextually relevant accounts to users on first.website, even if credentials were previously saved for second.website.

This list should not be used as part of any user experience that releases user credentials to a website without the user's explicit review and consent. In general, saved credentials should only be suggested to users with site-bound scoping. This list is appropriate for allowing a credential saved for website A to appear on website B if the website the credential was saved for is clearly stated.

There are existing proposals to allow different domains to declare an affiliation with each other, which could be a way for websites to solve this problem themselves, given browser and password manager adoption of such a proposal. Until and perhaps beyond then, it is useful to have these groupings of websites to make password filling suggestions more useful.

### Change Password URLs

The file [`quirks/change-password-URLs.json`](quirks/change-password-URLs.json) contains a JSON object mapping domains to URLs where users can change their password. This is the quirks version of the [Well Known URL for Changing Passwords](https://github.com/w3c/webappsec-change-password-url). If a website adopts the Change Password URL, it should be removed from this list.

### Websites Where 2FA Code is Appended to Password

The file [`quirks/websites-that-append-2fa-to-password.json`](quirks/websites-that-append-2fa-to-password.json) contains a JSON array of domains which use a two-factor authentication scheme where the user must append a generated code to their password when signing in. This list of websites could be used to prevent auto-submission of signin forms, allowing the user to append the 2FA code without frustration. It can also be used to suppress prompting to update a saved password when the submitted password is prefixed by the already-stored password.

## Contributing

Please review [how to contribute](CONTRIBUTING.md) if you would like to submit a pull request.

## Questions?

If you have any questions you'd like to ask publicly, please [raise a GitHub issue](https://github.com/apple/password-manager-resources/issues). If you'd prefer to reach out to this project's maintainers at Apple, please [get in touch](mailto:password-manager-resources-maintainers@apple.com).

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
