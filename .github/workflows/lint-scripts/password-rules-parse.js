// Copyright (c) 2026 Apple Inc. Licensed under MIT License.
//
// Validates every "password-rules" string in quirks/password-rules.json by
// loading tools/PasswordRulesParser.js and calling parsePasswordRules() on it.
// Any parse error (e.g. ",required" instead of "; required" as in #907, or
// '-'/']' in the wrong position inside a character class) causes CI to fail
// with a clear message identifying the offending domain.

"use strict";

const fs = require("fs");
const path = require("path");
const 
