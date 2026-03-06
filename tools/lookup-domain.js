#!/usr/bin/env node

/**
 * Copyright (c) 2026 Apple Inc. Licensed under MIT License.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const QUIRKS_DIR = path.join(__dirname, "..", "quirks");

function usage() {
    console.log("Usage: node tools/lookup-domain.js <domain>");
    process.exit(1);
}

const targetDomain = process.argv[2];
if (!targetDomain) {
    usage();
}

/**
 * Returns an array of parent domains for a given domain, including itself.
 * e.g., "mobile.apple.com" -> ["mobile.apple.com", "apple.com", "com"]
 */
function getParentDomains(domain) {
    const parts = domain.split(".");
    const domains = [];
    for (let i = 0; i < parts.length - 1; ++i) {
        domains.push(parts.slice(i).join("."));
    }
    return domains;
}

function loadJSON(filename) {
    try {
        const content = fs.readFileSync(path.join(QUIRKS_DIR, filename), "utf8");
        return JSON.parse(content);
    } catch (e) {
        console.error(`Error loading ${filename}: ${e.message}`);
        return null;
    }
}

function printSection(title) {
    console.log(`\n=== ${title} ===`);
}

function lookupPasswordRules(domain) {
    const data = loadJSON("password-rules.json");
    if (!data) return;

    printSection("Password Rules");
    const parents = getParentDomains(domain);
    let found = false;

    // We check from most specific to least specific
    for (const d of parents) {
        if (data[d]) {
            const rule = data[d];
            const isExactMatch = (d === domain);
            const forceExact = rule["exact-domain-match-only"] === true;

            if (isExactMatch || !forceExact) {
                console.log(`Domain: ${d}${isExactMatch ? " (Exact Match)" : " (Parent Match)"}`);
                console.log(`Rule:   ${rule["password-rules"]}`);
                found = true;
                // Continue to see if there are other applicable rules (though usually there should be one main one)
            }
        }
    }

    if (!found) {
        console.log("No password rules found.");
    }
}

function lookupSharedCredentials(domain, filename, title) {
    const data = loadJSON(filename);
    if (!data) return;

    printSection(title);
    let found = false;

    for (const group of data) {
        let involved = false;
        let details = "";

        if (group.shared && group.shared.includes(domain)) {
            involved = true;
            details = `Shared Group: ${group.shared.join(", ")}`;
        } else if (group.from && group.from.includes(domain)) {
            involved = true;
            details = `Redirection From: [${group.from.join(", ")}] To: [${group.to.join(", ")}]`;
        } else if (group.to && group.to.includes(domain)) {
            involved = true;
            details = `Redirection To: [${group.to.join(", ")}] From: [${group.from.join(", ")}]`;
        }

        if (involved) {
            console.log(details);
            if (group.fromDomainsAreObsoleted) {
                console.log("Note: From domains are obsoleted.");
            }
            found = true;
        }
    }

    if (!found) {
        console.log(`No entries found in ${filename}.`);
    }
}

function lookupChangePasswordURL(domain) {
    const data = loadJSON("change-password-URLs.json");
    if (!data) return;

    printSection("Change Password URLs");
    const parents = getParentDomains(domain);
    let found = false;

    for (const d of parents) {
        if (data[d]) {
            console.log(`Domain: ${d} -> ${data[d]}`);
            found = true;
        }
    }

    if (!found) {
        console.log("No change password URL found.");
    }
}

function lookupAppleAppIDs(domain) {
    const data = loadJSON("apple-appIDs-to-domains-shared-credentials.json");
    if (!data) return;

    printSection("Apple App IDs");
    let found = false;

    for (const appID in data) {
        if (data[appID].includes(domain)) {
            console.log(`App ID: ${appID}`);
            console.log(`Domains in group: ${data[appID].join(", ")}`);
            found = true;
        }
    }

    if (!found) {
        console.log("No Apple App ID associations found.");
    }
}

function lookupSimpleArray(domain, filename, title) {
    const data = loadJSON(filename);
    if (!data) return;

    printSection(title);
    if (data.includes(domain)) {
        console.log(`Domain is listed in ${filename}.`);
    } else {
        console.log("Not listed.");
    }
}

console.log(`Quirk Lookup for: ${targetDomain}`);

lookupPasswordRules(targetDomain);
lookupSharedCredentials(targetDomain, "shared-credentials.json", "Shared Credentials");
lookupSharedCredentials(targetDomain, "shared-credentials-historical.json", "Shared Credentials (Historical)");
lookupChangePasswordURL(targetDomain);
lookupAppleAppIDs(targetDomain);
lookupSimpleArray(targetDomain, "websites-that-append-2fa-to-password.json", "Websites that Append 2FA to Password");
lookupSimpleArray(targetDomain, "websites-that-ask-for-credentials-for-other-services-when-embedded-as-third-party.json", "Third-party Credential Requests");
