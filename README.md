# Password Manager Resources

## Welcome!

The _Password Manager Resources_ project exists so creators of password managers can collaborate on resources to make password management better for users. Resources currently consist of data, or "quirks", as well as code.

"Quirk" is a term from web browser development that refers to a website-specific, hard-coded behavior to work around an issue with a website that can't be fixed in a principled, universal way. In this project, it has the same meaning. Although ideally, the industry will work to eliminate the need for all of the quirks in this project, there's value in customizing behaviors to ensure better user experience. The current quirks are:

* **Password Rules**: Rules to generate compatible passwords with websites' particular requirements.
* **Websites with Shared Credential Backends**: Groups of websites known to use the same credential backend, which can be used to enhance suggested credentials to sign in to websites.
* **Change Password URLs**: To drive the adoption of strong passwords, it's useful to be able to take users directly to websites' change password pages.
* **Websites Where 2FA Code is Appended to Password**: Some websites use a two-factor authentication scheme where the user must append a generated code to their password when signing in.

Having password managers collaborate on these resources has three high-level benefits:

1. By sharing resources, all password managers can improve their quality with less work than it'd take for any individual password manager to achieve the same effect.
1. By publicly documenting website-specific behaviors, password managers can offer an incentive for websites to use standards or emerging standards to improve their compatibility with password managers; it's no fun to be called out on a list!
1. By improving the quality of password managers, we improve user trust in them as a concept, which benefits everyone.

We encourage you to incorporate the data from this project into your password manager, but kindly ask that you please contribute any quirks you have back to the project so that all users of participating password managers can benefit from your discoveries and testing.

## The Resources, In Detail

### Password Rules

Many password managers generate strong, unique passwords for people so that they aren't tempted to create their passwords by hand, which leads to easily guessed and reused passwords. Every time a password manager generates a password that isn't compatible with a website, a person not only has a bad experience but a reason to be tempted to create their password. Compiling password rule quirks helps fewer people run into issues like these while also documenting that a service's password policy is too restrictive for people using password managers, which may incentivize the services to change.

The file [`quirks/password-rules.json`](quirks/password-rules.json) contains a JSON object mapping domains to known good password rules for generating compatible passwords for use on that website. The [Password Rules language](https://developer.apple.com/password-rules/) is a human- and machine-readable way to concisely write and read the rules to generate a compatible password on a website. [`quirks/password-rules.json`](quirks/password-rules.json) is the quirks version of the [`passwordRules` attribute](https://github.com/whatwg/html/issues/3518), which is currently an open WHATWG proposal and supported in Safari. The same language is part of [native iOS application development API](https://developer.apple.com/documentation/security/password_autofill/customizing_password_autofill_rules). If a website changes its password requirements to be general enough to not warrant quirks, or if it adopts the `passwordRules` attribute to accurately communicate its requirements to password managers and web browsers, it should be removed from this list.

When a domain is listed in [`quirks/password-rules.json`](quirks/password-rules.json), it means that that domain and all of its subdomains use the rule. A rule that should only be applied to the exact domain stated as a key should have the `exact-domain-match-only` key set to a value of `true`. The absence of the `exact-domain-match-only` key means that it is false.

### Password Rules Language Parser

An implementation of a parser for the Password Rules language that's written in JavaScript can be found in [`tools/PasswordRulesParser.js`](tools/PasswordRulesParser.js). It can be used as a reference implementation, interpreted in build systems to convert `data/password-rules.json` to an application-specific format, or interpreted at application runtime wherever it's possible to execute JavaScript (e.g. using the JavaScriptCore framework on Apple platforms).

### Websites with Shared Credential Backends

The file quirks/websites-with-shared-credential-backends.json contains a list of groups of websites that share the same credential backend and serve pages where users can sign in, accepting accounts from the others. For example, adding first.website and second.website means that first.website and second.website each serve a page (e.g. first.website/login and second.website/login) where the same accounts are valid for signing in, despite the different domains. It wouldn’t be appropriate to associate google.com.il to google.com because google.com.il redirects to accounts.google.com for sign-in, and google.com.il never serves a login page.

This data can be used by password managers to offer contextually relevant accounts to users on first.website, even if credentials were previously saved for second.website. 

This list should not be used as part of any user experience that releases user credentials to a website without the user's explicit review and consent. In general, saved credentials should only be suggested to users with site-bound scoping. This list is appropriate for allowing a credential saved for website A to appear on website B if the website the credential was saved for is clearly stated.

There are existing proposals to allow different domains to declare an affiliation with each other, which could be a way for websites to solve this problem themselves, given browser and password manager adoption of such a proposal. Until and perhaps beyond then, it is useful to have these groupings of websites to make password filling suggestions more useful.

### Change Password URLs

The file [`quirks/change-password-URLs.json`](quirks/change-password-URLs.json) contains a JSON object mapping domains to URLs where users can change their password. This is the quirks version of the [Well Known URL for Changing Passwords](https://wicg.github.io/change-password-url/index.html). If a website adopts the Change Password URL, it should be removed from this list.

### Websites Where 2FA Code is Appended to Password

The file [`quirks/websites-that-append-2fa-to-password.json`](quirks/websites-that-append-2fa-to-password.json) contains a JSON array of domains which use a two-factor authentication scheme where the user must append a generated code to their password when signing in. This list of websites could be used to prevent auto-submission of signin forms, allowing the user to append the 2FA code without frustration. It can also be used to suppress prompting to update a saved password when the submitted password is prefixed by the already-stored password.

## How to Contribute

Before contributing, please review the [Code of Conduct](CODE_OF_CONDUCT.md).

Contributing is easy! You can contribute either by raising compatibility issues with a website, researching and documenting what the right data for a quirk might be, and/or submitting a pull request to add a quirk. You can raise an issue at the repository's [issues page](https://github.com/apple/password-manager-resources/issues). If you've done some investigation into a service's behavior, you can document it on an existing issue for that problem. If you'd like to submit a pull request, there are some additional special considerations for each type of quirk, detailed below.

When adding a data item to a top-level JSON object, please keep keys alphabetized. This assists with scanning the lists and with merging them.

### Contributing Password Rules

Contributing a password rule is appropriate if a service doesn't accept a password generated by your password manager with its default settings or with a reasonable configuration. Contributing a rule involves writing a rule, testing it, documenting your investigation, and submitting a pull request.

#### Crafting a Rule

To create a password rule, you'll want to gather as much information as you can about what the website considers to be an acceptable password. You can learn this by reading any pre-stated requirements or error messages you see while experimenting with the website. Sometimes, websites don't do a great job of saying what their rules are, or their stated rules are inaccurate, and you have to determine their actual rules experimentally.

Once you understand the website's requirements, like minimum length, maximum length, sets of required characters, and allowed characters, you're ready to write a rule. The [Password Rules Validation Tool](https://developer.apple.com/password-rules/) is a great tool for writing and validating password rules.

#### Testing a Rule

The [Password Rules Validation Tool](https://developer.apple.com/password-rules/) will output example passwords generated with the current rule, as well as allow you to download large sets of example passwords. You can copy and paste or manually type these passwords into the website to see if your rule creates compatible passwords. You should try to test a few different generated passwords to better ensure that you got it right.

#### Contributing a Rule

Once you've tested passwords generated by your rule, you'll edit [`quirks/password-rules.json`](quirks/password-rules.json) and add a new website key mapping to a JSON object of information. The rule you'll want to copy out of the Password Rules Validation Tools is the "Rules formatted for UIKit", because it's a pure Rule without any HTML markup.

When you submit a pull request to add or update a Password Rule, you should include as much information about the website’s requirements as you were able to gather. Text printed on the website, or error messages, are great. If the rules were determined experimentally, information about what you tried is helpful, too. Adding screenshots of error messages can be useful.

### Contributing a Set of Websites Sharing a Credential Backend

When contributing or amending a set of websites sharing a credential backend, you should state why you believe the relevant domains do or do not share a credential backend, with evidence to support your claim. This may involve WHOIS information or content served from the domains themselves.

### Contributing a Change Password URL

Use the website in question until you find the standalone page for updating the user's password, or a high-level "Account Information" or "Security" page. The closer the URL takes the user to be able to change their password, the better. Before adding a URL, ensure that it works properly both when the user is logged in and when they are not. URLs added to [`quirks/change-password-URLs.json`](quirks/change-password-URLs.json) should have a scheme of https unless the website does not allow changing the password on an https page.

### Contributing to Websites Where 2FA Code is Appended to Password

When contributing or amending a set of websites that require that the user append a generated code to their password when signing in, you should state why you believe the relevant domains require such. This may involve citing a URL to the relevant support page for the website.

### Contributing a New Kind of Quirk or Other Resource

If you have a new type of quirk or another resource, that you feel that other password managers could use to improve users' experiences and make password management more attractive for people who aren't using a password manager, please [reach out](mailto:password-manager-resources-maintainers@apple.com) to this project's maintainers at Apple so we can discuss the details.

### Requesting Removal of a Quirk

If you are a representative from a website on the list, and you’ve incorporated the rule into your website or make it unnecessary, you can request a rule for your website to be removed. You can do this by [filing an issue with the repository's issue tracker](https://github.com/apple/password-manager-resources/issues), or by submitting a pull request with a change. You may be asked to prove your affiliation with the service in question.

## Questions?

If you have any questions you'd like to ask publicly, please [raise a GitHub issue](https://github.com/apple/password-manager-resources/issues). If you'd prefer to reach out to this project's maintainers at Apple, please [get in touch](mailto:password-manager-resources-maintainers@apple.com).

## Project Governance and Contact

At the moment, merging a pull request requires approval by a project owner. If you or your organization is interested in becoming a project co-owner, ideally after contributing, please do get in touch! You can reach the project maintainers at Apple by [emailing password-manager-resources-maintainers@apple.com](mailto:password-manager-resources-maintainers@apple.com).
