# Password Manager Resources

[![Contributor Guide](https://img.shields.io/badge/Contributor%20-Guide-2ea44f)](CONTRIBUTING.md)
[![Slack Discussions](https://img.shields.io/badge/Join%20Slack-%23passwords-blueviolet)](mailto:password-manager-resources-maintainers@apple.com)

A collaborative project to improve compatibility between password managers and websites by documenting "quirks" — workarounds for site-specific behaviors.

---

## Table of Contents
- [Key Resources](#key-resources)
  - [Password Rules](#password-rules)
  - [Shared Credentials](#shared-credentials)
  - [Change Password URLs](#change-password-urls)
  - [2FA Code Appended to Password](#websites-where-2fa-code-is-appended-to-password)
- [Contributing](#contributing)
- [Discussion & Support](#asking-questions-and-discussing-ideas)
- [Project Governance](#project-governance)

---

## Key Resources

### Password Rules
**File:** [`quirks/password-rules.json`](quirks/password-rules.json)  
**Purpose:** Generate passwords compatible with websites' requirements.  

#### How It Works:
- Domains map to [Password Rules](https://developer.apple.com/password-rules/) (e.g., `minlength: 8; required: lower, upper;`).
- Rules apply to subdomains by default. Use `"exact-domain-match-only": true` to restrict to exact domains.  

**Example Entry:**
```json
"example.com": {
  "password-rules": "minlength: 12; required: upper, numeric; allowed: ascii-printable;"
},
// example.com (2024-01-01): https://example.com/password-policy
Shared Credentials
Files:

Active: quirks/shared-credentials.json

Historical: quirks/shared-credentials-historical.json

Purpose:

Active: Suggest credentials across affiliated sites (e.g., first.website and second.website).

Historical: Suppress reuse warnings for formerly linked sites.

Change Password URLs
File: quirks/change-password-URLs.json
Purpose: Direct users to a site’s password change page.

Example Entry:

json
"example.com": "https://example.com/account/change-password"
Websites Where 2FA Code is Appended to Password
File: quirks/websites-that-append-2fa-to-password.json
Purpose: Prevent auto-submission of forms requiring 2FA codes appended to passwords.

Contributing
We welcome contributions! Please review:

Contribution Guidelines for formatting rules and examples.

Verification Requirements: Ensure quirks are backed by publicly accessible evidence (e.g., a site’s help page).

Testing: Validate password rules with the Password Rules Parser.

Common Contribution Types:

🛠 Add/update a password rule for a domain.

🔗 Add a shared credential relationship.

🔄 Update a change password URL.

Asking Questions and Discussing Ideas
GitHub Issues: Open a discussion.

Slack: Join via email (include your GitHub username).

Project Maintenance
Maintainers review PRs and ensure adherence to guidelines. To apply as a maintainer, email us with:

Your GitHub username

Professional affiliations (if any)

Links to 5-8 contributions (PRs/issues reviewed)

Project Governance
Apple retains authority over data formats and project scope. Changes will be communicated transparently.

