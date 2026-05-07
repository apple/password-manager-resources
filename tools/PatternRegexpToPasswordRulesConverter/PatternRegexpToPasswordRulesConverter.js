// Copyright (c) 2026 Apple Inc. Licensed under MIT License.

"use strict";

class PatternRegexpToPasswordRulesConverter {
    /**
     * Convert a regexp pattern to Password Rules format
     * @param {string} regexp - The regular expression pattern
     * @returns {string|null} Password Rules format string, or null if pattern is unsupported
     */
    static convert(regexp) {
        try {
            return this.#convertPatternToRules(regexp);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * Internal method to perform conversion
     * @private
     */
    static #convertPatternToRules(regexp) {
        const pattern = this.#normalizePattern(regexp);

        // Try to match simple patterns first (like \d*)
        const simpleResult = this.#trySimplePattern(pattern);
        if (simpleResult) {
            return simpleResult;
        }

        /*
         * Complex password regexp patterns follow a specific structure that maps to Password Rules:
         *
         * 1. REQUIRED characters (via positive lookaheads):
         *    (?=.*[0-9])  - requires at least one digit
         *    (?=.*[a-z])  - requires at least one lowercase letter
         *    (?=.*[A-Z])  - requires at least one uppercase letter
         *    (?=.*[!@#$]) - requires at least one character from the specified set
         *
         *    These lookaheads assert that certain character types must appear somewhere
         *    in the password without consuming any characters.
         *
         * 2. ALLOWED characters (via character class or .):
         *    [a-zA-Z0-9!@#$&+/_?-] - defines the complete set of characters that may appear
         *    .* - allows any characters
         *
         *    This character class specifies the alphabet of valid characters. The password
         *    can only contain characters from this set.
         *
         *    Note: Required characters are implicitly allowed, so we don't need to duplicate
         *    them in the allowed section. We only specify additional allowed characters.
         *
         * 3. LENGTH constraints (via quantifier):
         *    {12,128} - minimum 12 characters, maximum 128 characters
         *
         *    This quantifier on the character class defines the valid length range.
         *    Length constraints are optional; if not present, we still convert the
         *    required and allowed portions.
         *
         * Example breakdown of: ^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$]{12,128}$
         *
         * - Required: digit, lower, upper (from the three lookaheads)
         * - Allowed: [!@#$] (from the character class, excluding already-required digit/lower/upper)
         * - Length: minlength: 12, maxlength: 128 (from the quantifier)
         *
         * Converts to: required: digit; required: lower; required: upper; allowed: [!@#$]; minlength: 12; maxlength: 128;
         */

        let remaining = pattern;

        // Extract and consume lookaheads (these define REQUIRED character types)
        const lookaheads = this.#extractLookaheads(remaining);
        remaining = this.#extractMainPattern(remaining);

        // Validate that lookaheads match expected format
        if (!this.#validateLookaheads(lookaheads)) {
            console.warn("PatternRegexpToPasswordRulesConverter: Lookaheads contain unsupported patterns");
            console.warn("Pattern:", regexp);
            return null;
        }

        // Check if the main pattern is just . with quantifiers (allow everything)
        const dotMatch = remaining.match(/^\.[\*\+]?(?:\{(\d+),(\d+)\})?$/);

        if (dotMatch) {
            const required = this.#parseLookaheads(lookaheads);
            const { min: minLength, max: maxLength } = this.#extractLength(dotMatch, 1, 2);

            // For .*, .+, or ., we don't specify allowed (everything is allowed)
            return this.#buildRules(required, null, minLength, maxLength);
        }

        // Extract and consume the main character class with optional quantifier
        // This defines ALLOWED characters and optionally LENGTH constraints
        // Handle escaped ] in character class
        const charClassMatch = remaining.match(/^\[((?:[^\]\\]|\\.)*)\](?:\{(\d+),(\d+)\})?$/);

        if (!charClassMatch) {
            console.warn("PatternRegexpToPasswordRulesConverter: Unable to parse regexp pattern - main character class not found or has unexpected format");
            console.warn("Pattern:", regexp);
            console.warn("Remaining after lookahead extraction:", remaining);
            return null;
        }

        // Parse the validated components
        const required = this.#parseLookaheads(lookaheads);
        const allowed = this.#parseCharacterClassFromMatch(charClassMatch, required);
        const { min: minLength, max: maxLength } = this.#extractLength(charClassMatch, 2, 3);

        return this.#buildRules(required, allowed, minLength, maxLength);
    }

    /**
     * Normalize pattern by removing anchors
     * @private
     */
    static #normalizePattern(regexp) {
        let pattern = regexp.trim();
        if (pattern.startsWith("^")) {
            pattern = pattern.substring(1);
        }

        if (pattern.endsWith("$") && !pattern.endsWith("\\$")) {
            pattern = pattern.substring(0, pattern.length - 1);
        }

        return pattern;
    }

    /**
     * Try to match simple patterns like \d*, \w+, etc.
     * @private
     */
    static #trySimplePattern(pattern) {
        if (pattern === "\\d*" || pattern === "\\d+" || pattern === "[0-9]*" || pattern === "[0-9]+") {
            return "required: digit;";
        }

        if (pattern === "[a-z]*" || pattern === "[a-z]+") {
            return "required: lower;";
        }

        if (pattern === "[A-Z]*" || pattern === "[A-Z]+") {
            return "required: upper;";
        }

        return null;
    }

    /**
     * Extract positive lookaheads from the pattern
     * Handles escaped ] (\]) in character classes
     * @private
     */
    static #extractLookaheads(pattern) {
        const lookaheads = [];
        const combinedPattern = /\(\?=\.\*(?:\[((?:[^\]\\]|\\.)*)\]|(\\[dDwWsS]))\)/g;
        let match;

        while ((match = combinedPattern.exec(pattern))) {
            if (match[1] !== undefined) {
                lookaheads.push(match[1]); // bracket-class
            } else {
                lookaheads.push(this.#expandShorthand(match[2]));
            }
        }

        return lookaheads;
    }

    /**
     * Validate that lookaheads are in supported format
     * @private
     */
    static #validateLookaheads(lookaheads) {
        // Each lookahead should be a simple character class
        for (const lookahead of lookaheads) {
            // Check for unsupported regexp features (nested groups, alternation, "not" sets, whitespace)
            for (const string of ["(?", "|", "\\D", "\\W", "\\S", "\\s"]) {
                if (lookahead.includes(string)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Convert lookaheads to required character classes
     * @private
     */
    static #parseLookaheads(lookaheads) {
        const required = [];

        for (let lookahead of lookaheads) {
            // Expand shorthand classes to range equivalents
            lookahead = lookahead.replace(/\\d/g, "0-9");
            lookahead = lookahead.replace(/\\w/g, "a-zA-Z0-9_");

            const types = [];
            let remaining = lookahead;

            // Detect standard ranges
            if (remaining.includes("0-9")) {
                types.push("digit");
                remaining = remaining.replace(/0-9/g, "");
            }
            if (remaining.includes("A-Z")) {
                types.push("upper");
                remaining = remaining.replace(/A-Z/g, "");
            }
            if (remaining.includes("a-z")) {
                types.push("lower");
                remaining = remaining.replace(/a-z/g, "");
            }

            // Remove stray single letters/digits left from range edges
            remaining = remaining.replace(/[a-zA-Z0-9]/g, "");

            if (types.length > 0 && remaining.length === 0) {
                // Pure range-based, possibly combined (e.g., 'upper, lower')
                required.push(types.join(", "));
            } else if (types.length === 0 && remaining.length > 0) {
                // No standard ranges, just special characters
                required.push(this.#normalizeCharacterClass(remaining));
            } else if (types.length > 0 && remaining.length > 0) {
                // Mix of ranges and special chars
                types.push(this.#normalizeCharacterClass(remaining));
                required.push(types.join(", "));
            } else {
                console.warn("We shouldn't get here, in #parseLookaheads.");
            }
        }

        return required;
    }

    /**
     * Expand a regexp shorthand class escape to its bracket-class equivalent
     * @private
     */
    static #expandShorthand(shorthand) {
        const map = {
            "\\d": "0-9",
            "\\w": "a-zA-Z0-9_",
        };
        return map[shorthand] || shorthand;
    }

    /**
     * Remove lookaheads to get the main pattern
     * @private
     */
    static #extractMainPattern(pattern) {
        // Remove bracket-class lookaheads, handling escaped characters
        let result = pattern.replace(/\(\?=\.\*\[((?:[^\]\\]|\\.)*)\]\)/g, "");
        // Remove shorthand-class lookaheads like (?=.*\d)
        result = result.replace(/\(\?=\.\*(\\[dDwWsS])\)/g, "");
        return result;
    }

    /**
     * Normalize a character class for Password Rules format
     * In Password Rules:
     * - If ']' is part of the class, it must be the LAST character
     * - If '-' is part of the class, it must be the FIRST character
     * @private
     */
    static #normalizeCharacterClass(charClass) {
        // First, unescape \] to just ]
        const unescaped = charClass.replace(/\\\]/g, "]");

        let chars = unescaped.split("");
        let hasHyphen = false;
        let hasCloseBracket = false;
        let otherChars = [];

        // Separate special characters from others
        for (const char of chars) {
            if (char === "-") {
                hasHyphen = true;
            } else if (char === "]") {
                hasCloseBracket = true;
            } else {
                otherChars.push(char);
            }
        }

        let normalized = "";
        if (hasHyphen) {
            normalized += "-";
        }

        normalized += otherChars.join("");
        if (hasCloseBracket) {
            normalized += "]";
        }

        return `[${normalized}]`;
    }

    /**
     * Extract allowed characters from character class match
     * Excludes character types that are already required (since required chars are implicitly allowed)
     * @private
     */
    static #parseCharacterClassFromMatch(charClassMatch, requiredClasses) {
        let charClass = charClassMatch[1];
        const allowed = [];

        // Expand shorthand classes to range equivalents
        charClass = charClass.replace(/\\d/g, "0-9");
        charClass = charClass.replace(/\\w/g, "a-zA-Z0-9_");

        // Check if a type is covered by any required class (handles combined types like 'upper, lower')
        const isRequired = (type) => requiredClasses.some(req =>
            req === type || req.split(", ").includes(type)
        );

        // Check for standard ranges (only add if not already required)
        if (charClass.includes("a-z") && !isRequired("lower")) {
            allowed.push("lower");
        }

        if (charClass.includes("A-Z") && !isRequired("upper")) {
            allowed.push("upper");
        }

        if (charClass.includes("0-9") && !isRequired("digit")) {
            allowed.push("digit");
        }

        // Extract special characters
        let special = charClass;

        // Remove the range patterns (but preserve standalone hyphens and escaped close brackets)
        special = special.replace(/a-z/g, "");
        special = special.replace(/A-Z/g, "");
        special = special.replace(/0-9/g, "");

        // Remove any remaining letters and digits (but not hyphens or escaped brackets)
        special = special.replace(/[a-zA-Z0-9]/g, "");

        // Unescape regexp escape sequences to literal characters
        // \[ -> [, \] -> ], \{ -> {, \} -> }, \( -> (, \) -> ), \| -> |, \/ -> /, \\ -> \
        special = special.replace(/\\(.)/g, "$1");

        if (special) {
            const normalizedSpecial = this.#normalizeCharacterClass(special);

            // Check if this character class is already in required (order-insensitive)
            const sortCharacterClass = (characterClass) => {
                const match = characterClass.match(/^\[(.*)\]$/);
                return match ? "[" + [...match[1]].sort().join("") + "]" : characterClass;
            };
            const isAlreadyRequired = requiredClasses.some(req =>
                sortCharacterClass(req) === sortCharacterClass(normalizedSpecial)
            );

            if (!isAlreadyRequired) {
                allowed.push(normalizedSpecial);
            }
        }

        return allowed.length ? allowed.join(", ") : null;
    }

    /**
     * Extract min/max length from match
     * @private
     */
    static #extractLength(match, minGroup, maxGroup) {
        if (match[minGroup] && match[maxGroup]) {
            const min = parseInt(match[minGroup], 10);
            const max = parseInt(match[maxGroup], 10);
            if (!isNaN(min) && !isNaN(max)) {
                return { min: min, max: max };
            }
        }

        return { min: null, max: null };
    }

    /**
     * Build the final password rules string
     * @private
     */
    static #buildRules(required, allowed, minLength, maxLength) {
        const rules = [];

        for (const requirement of required) {
            rules.push(`required: ${requirement}`);
        }

        if (allowed) {
            rules.push(`allowed: ${allowed}`);
        }

        // Length constraints are optional
        if (minLength !== null) {
            rules.push(`minlength: ${minLength}`);
        }
        if (maxLength !== null) {
            rules.push(`maxlength: ${maxLength}`);
        }

        return rules.join("; ") + ";";
    }
}
