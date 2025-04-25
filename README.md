# Password Manager Resources

[![Contributor Guide](https://img.shields.io/badge/Contributor%20-Guide-2ea44f)](CONTRIBUTING.md)
[![Discuss on Slack](https://img.shields.io/badge/Slack-Discussions-blueviolet)](mailto:password-manager-resources-maintainers@apple.com)

A collaborative repository to help password managers handle website-specific quirks, improving both user experience and security.

---

## 📚 Table of Contents

1. [Key Resources](#key-resources)  
   ├─ [Password Rules](#password-rules)  
   ├─ [Shared Credentials](#shared-credentials)  
   ├─ [Change Password URLs](#change-password-urls)  
   └─ [2FA Code Appended to Password](#2fa-code-appended-to-password)  
2. [Contributing](#contributing)  
3. [Support & Discussion](#support--discussion)  
4. [Project Governance](#project-governance)  

---

## 🔐 Key Resources

### 📏 Password Rules

**File:** [`quirks/password-rules.json`](quirks/password-rules.json)  
**Purpose:** Define site-specific password requirements to ensure successful password generation and autofill behavior.

#### Key Notes:

- Rules automatically apply to all subdomains.
- Use `"exact-domain-match-only": true` to target only the main domain.
- Syntax follows Apple’s [Password Rules specification](https://developer.apple.com/password-rules/).

#### Example:
```json
"example.com": {
  "password-rules": "minlength: 12; required: upper, numeric; allowed: [-~];"
},
// example.com (2024-03-01): https://example.com/security/password-policy
```

---

### 🔁 Shared Credentials

**Files:**

- Active Sites: [`quirks/shared-credentials.json`](quirks/shared-credentials.json)  
- Historical Sites: [`quirks/shared-credentials-historical.json`](quirks/shared-credentials-historical.json)  

**Purpose:**

- Suggest credentials across affiliated domains (e.g., `site-a.com` and `site-b.com`).  
- Prevent password reuse warnings for historical or legacy domain relationships.

---

### 🔑 Change Password URLs

**File:** [`quirks/change-password-URLs.json`](quirks/change-password-URLs.json)  
**Purpose:** Redirect users to the appropriate password change page for each website.

#### Example:
```json
"example.com": "https://example.com/account/security/password/change"
```

---

### 🔐 2FA Code Appended to Password

**File:** [`quirks/websites-that-append-2fa-to-password.json`](quirks/websites-that-append-2fa-to-password.json)  
**Purpose:** Identify websites where users must manually append their 2FA code to the end of their password. This helps prevent auto-submission failures in password managers.

---

## ✨ Contributing

We welcome your contributions! Here's how to get started:

### ✅ 3-Step Contribution Process

1. **Review Requirements**  
   Confirm site-specific quirks using publicly available documentation or verifiable sources.

2. **Follow Formatting**  
   Adhere to the structure and rules outlined in [CONTRIBUTING.md](CONTRIBUTING.md).

3. **Test Changes**  
   Use the [Password Rules Parser](https://github.com/apple/password-rule-parser) to validate updates.

### 🔧 Common Contribution Types

- 🆕 Add new password rules for a domain  
- 🔄 Update or add shared credential relationships  
- 🔗 Fix outdated or broken password change URLs  
- 📘 Improve documentation or metadata  

---

## 💬 Support & Discussion

- **GitHub Issues:** Use the [Issues](../../issues) tab to raise questions, propose ideas, or start a discussion.  
- **Slack Access:** Email maintainers to request access:

```
Subject: Slack Invite Request  
Body: GitHub username: [your_username]
```

---

## 🧭 Project Governance

### 👥 Maintainers

Maintainers review contributions, enforce quality standards, and support community engagement.  
Interested in becoming a maintainer? Email the current maintainers with:

- GitHub username  
- Professional affiliations (if applicable)  
- Links to 5–8 meaningful contributions (PRs/issues reviewed or submitted)

### ⚖ Governance Model

- Apple retains final authority over project scope, structure, and data formats.  
- All significant changes are communicated transparently via GitHub Announcements.

### 📜 Code of Conduct

This project adheres to a strict [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming and respectful environment for all contributors.

---

> Thank you for contributing to a more secure and user-friendly web. 🌐🔐
```
