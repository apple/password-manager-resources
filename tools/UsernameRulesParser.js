"use strict";

if (!console) {
    console = {
        assert: function () { },
        error: function () { },
        warn: function () { },
    };
}

// Username-specific identifiers
const UsernameIdentifier = {
    ASCII_PRINTABLE: "ascii-printable",
    DIGIT: "digit",
    LOWER: "lower",
    SPECIAL: "special",
    UNICODE: "unicode",
    UPPER: "upper",
    EMAIL_SAFE: "email-safe",
    URL_SAFE: "url-safe",
};

const UsernameRuleName = {
    ALLOWED: "allowed",
    REQUIRED: "required",
    MIN_LENGTH: "minlength",
    MAX_LENGTH: "maxlength",
    START_WITH: "start-with",
    END_WITH: "end-with",
    NO_CONSECUTIVE_HYPHENS: "no-consecutive-hyphens",
    NO_LEADING_TRAILING_HYPHEN: "no-leading-trailing-hyphen",
};
// Reuse existing sentinel constants
const CHARACTER_CLASS_START_SENTINEL = "[";
const CHARACTER_CLASS_END_SENTINEL = "]";
const PROPERTY_VALUE_SEPARATOR = ",";
const PROPERTY_SEPARATOR = ";";
const PROPERTY_VALUE_START_SENTINEL = ":";
const SPACE_CODE_POINT = " ".codePointAt(0);
const SHOULD_NOT_BE_REACHED = "Should not be reached";

// Reuse Rule class
class UsernameRule {
    constructor(name, value) {
        this._name = name;
        this.value = value;
    }
    get name() { return this._name; }
    toString() { return JSON.stringify(this); }
}

// Reuse NamedCharacterClass with username-specific validation
class UsernameNamedCharacterClass {
    constructor(name) {
        console.assert(_isValidUsernameRequiredOrAllowedPropertyValueIdentifier(name));
        this._name = name;
    }
    get name() { return this._name.toLowerCase(); }
    toString() { return this._name; }
    toHTMLString() { return this._name; }
}

// Reuse CustomCharacterClass
class UsernameCustomCharacterClass {
    constructor(characters) {
        console.assert(characters instanceof Array);
        this._characters = characters;
    }
    get characters() { return this._characters; }
    toString() { return `[${this._characters.join("")}]`; }
    toHTMLString() { return `[${this._characters.join("").replace('"', "&quot;")}]`; }
}

// Reuse existing lexer functions
function _isIdentifierCharacter(c) {
    console.assert(c.length === 1);
    return c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "-";
}

function _isASCIIDigit(c) {
    console.assert(c.length === 1);
    return c >= "0" && c <= "9";
}

function _isASCIIPrintableCharacter(c) {
    console.assert(c.length === 1);
    return c >= " " && c <= "~";
}

function _isASCIIWhitespace(c) {
    console.assert(c.length === 1);
    return c === " " || c === "\f" || c === "\n" || c === "\r" || c === "\t";
}

function _bitSetIndexForCharacter(c) {
    console.assert(c.length == 1);
    return c.codePointAt(0) - SPACE_CODE_POINT;
}

function _characterAtBitSetIndex(index) {
    return String.fromCodePoint(index + SPACE_CODE_POINT);
}

function _parseCustomCharacterClass(input, position) {
    console.assert(position >= 0);
    console.assert(position < input.length);
    console.assert(input[position] === CHARACTER_CLASS_START_SENTINEL);

    let length = input.length;
    ++position;
    if (position >= length) {
        console.error("Found end-of-line instead of character class character");
        return [null, position];
    }

    let initialPosition = position;
    let result = [];
    do {
        let c = input[position];
        if (!_isASCIIPrintableCharacter(c)) {
            ++position;
            continue;
        }

        if (c === "-" && (position - initialPosition) > 0) {
            // FIXME: Should this be an error?
            console.warn("Ignoring '-'; a '-' may only appear as the first character in a character class");
            ++position;
            continue;
        }

        result.push(c);
        ++position;
        if (c === CHARACTER_CLASS_END_SENTINEL) {
            break;
        }
    } while (position < length);

    if (position < length && input[position] !== CHARACTER_CLASS_END_SENTINEL || position == length && input[position - 1] == CHARACTER_CLASS_END_SENTINEL) {
        // Fix up result; we over consumed.
        result.pop();
        return [result, position];
    }

    if (position < length && input[position] == CHARACTER_CLASS_END_SENTINEL) {
        return [result, position + 1];
    }

    console.error("Found end-of-line instead of end of character class");
    return [null, position];
}

function _markBitsForCustomCharacterClass(bitSet, customCharacterClass) {
    for (let character of customCharacterClass.characters) {
        bitSet[_bitSetIndexForCharacter(character)] = true;
    }
}

// Username-specific character class handling
function _markBitsForUsernameNamedCharacterClass(bitSet, namedCharacterClass) {
    console.assert(bitSet instanceof Array);
    console.assert(namedCharacterClass.name !== UsernameIdentifier.UNICODE);
    console.assert(namedCharacterClass.name !== UsernameIdentifier.ASCII_PRINTABLE);

    if (namedCharacterClass.name === UsernameIdentifier.UPPER) {
        bitSet.fill(true, _bitSetIndexForCharacter("A"), _bitSetIndexForCharacter("Z") + 1);
    }
    else if (namedCharacterClass.name === UsernameIdentifier.LOWER) {
        bitSet.fill(true, _bitSetIndexForCharacter("a"), _bitSetIndexForCharacter("z") + 1);
    }
    else if (namedCharacterClass.name === UsernameIdentifier.DIGIT) {
        bitSet.fill(true, _bitSetIndexForCharacter("0"), _bitSetIndexForCharacter("9") + 1);
    }
    else if (namedCharacterClass.name === UsernameIdentifier.EMAIL_SAFE) {
        // Allow email-safe special characters
        for (let c of ["@", ".", "_", "-"]) {
            bitSet[_bitSetIndexForCharacter(c)] = true;
        }
    }
    else if (namedCharacterClass.name === UsernameIdentifier.URL_SAFE) {
        // Allow URL-safe special characters
        for (let c of ["-", "_", ".", "~"]) {
            bitSet[_bitSetIndexForCharacter(c)] = true;
        }
    }
    else if (namedCharacterClass.name === UsernameIdentifier.SPECIAL) {
        // More restrictive special characters for usernames
        for (let c of [".", "-", "_", "@"]) {
            bitSet[_bitSetIndexForCharacter(c)] = true;
        }
    }
}

// Username-specific validation
function _isValidUsernameRequiredOrAllowedPropertyValueIdentifier(identifier) {
    return identifier && Object.values(UsernameIdentifier).includes(identifier.toLowerCase());
}

// Main parsing function for username rules
function parseUsernameRules(input, formatRulesForMinifiedVersion) {
    let usernameRules = _parseUsernameRulesInternal(input) || [];
    let suppressCopyingRequiredToAllowed = formatRulesForMinifiedVersion;

    let newUsernameRules = [];
    let newAllowedValues = [];
    let maximumMinLength = 0;
    let minimumMaxLength = null;
    let startWithValues = [];
    let endWithValues = [];

    for (let rule of usernameRules) {
        switch (rule.name) {
            case UsernameRuleName.MIN_LENGTH:
                maximumMinLength = Math.max(rule.value, maximumMinLength);
                break;

            case UsernameRuleName.MAX_LENGTH:
                minimumMaxLength = minimumMaxLength ? Math.min(rule.value, minimumMaxLength) : rule.value;
                break;

            case UsernameRuleName.REQUIRED:
                rule.value = _canonicalizedUsernamePropertyValues(rule.value, formatRulesForMinifiedVersion);
                newUsernameRules.push(rule);
                if (!suppressCopyingRequiredToAllowed) {
                    newAllowedValues = newAllowedValues.concat(rule.value);
                }
                break;

            case UsernameRuleName.ALLOWED:
                newAllowedValues = newAllowedValues.concat(rule.value);
                break;

            case UsernameRuleName.START_WITH:
                startWithValues = startWithValues.concat(rule.value);
                break;

            case UsernameRuleName.END_WITH:
                endWithValues = endWithValues.concat(rule.value);
                break;
        }
    }

    // Set default allowed values if none specified
    newAllowedValues = _canonicalizedUsernamePropertyValues(newAllowedValues, suppressCopyingRequiredToAllowed);
    if (!suppressCopyingRequiredToAllowed && !newAllowedValues.length) {
        newAllowedValues = [new UsernameNamedCharacterClass(UsernameIdentifier.LOWER),
        new UsernameNamedCharacterClass(UsernameIdentifier.DIGIT),
        new UsernameCustomCharacterClass(["-", "_", "."])];
    }

    // Add all processed rules
    if (newAllowedValues.length) {
        newUsernameRules.push(new UsernameRule(UsernameRuleName.ALLOWED, newAllowedValues));
    }

    if (startWithValues.length) {
        newUsernameRules.push(new UsernameRule(UsernameRuleName.START_WITH, startWithValues));
    }

    if (endWithValues.length) {
        newUsernameRules.push(new UsernameRule(UsernameRuleName.END_WITH, endWithValues));
    }

    if (maximumMinLength > 0) {
        newUsernameRules.push(new UsernameRule(UsernameRuleName.MIN_LENGTH, maximumMinLength));
    }

    if (minimumMaxLength !== null) {
        newUsernameRules.push(new UsernameRule(UsernameRuleName.MAX_LENGTH, minimumMaxLength));
    }

    return newUsernameRules;
}

// Helper function to canonicalize username property values
function _canonicalizedUsernamePropertyValues(propertyValues, keepCustomCharacterClassFormatCompliant) {
    // Similar to the password version but with username-specific handling
    let asciiPrintableBitSet = new Array("~".codePointAt(0) - " ".codePointAt(0) + 1);

    for (let propertyValue of propertyValues) {
        if (propertyValue instanceof UsernameNamedCharacterClass) {
            if (propertyValue.name === UsernameIdentifier.UNICODE) {
                return [new UsernameNamedCharacterClass(UsernameIdentifier.UNICODE)];
            }

            if (propertyValue.name === UsernameIdentifier.ASCII_PRINTABLE) {
                return [new UsernameNamedCharacterClass(UsernameIdentifier.ASCII_PRINTABLE)];
            }

            _markBitsForUsernameNamedCharacterClass(asciiPrintableBitSet, propertyValue);
        }
        else if (propertyValue instanceof UsernameCustomCharacterClass) {
            _markBitsForCustomCharacterClass(asciiPrintableBitSet, propertyValue);
        }
    }

    // Process and return canonicalized values
    let result = [];
    let charactersSeen = [];

    for (let i = 0; i < asciiPrintableBitSet.length; i++) {
        if (asciiPrintableBitSet[i]) {
            charactersSeen.push(_characterAtBitSetIndex(i));
        }
    }

    if (charactersSeen.length) {
        result.push(new UsernameCustomCharacterClass(charactersSeen));
    }

    return result;
}

function _parseIdentifier(input, position) {
    console.assert(position >= 0);
    console.assert(position < input.length);
    console.assert(_isIdentifierCharacter(input[position]));

    let length = input.length;
    let seenIdentifiers = [];
    do {
        let c = input[position];
        if (!_isIdentifierCharacter(c)) {
            break;
        }

        seenIdentifiers.push(c);
        ++position;
    } while (position < length);

    return [seenIdentifiers.join(""), position];
}

function _parseInteger(input, position) {
    console.assert(position >= 0);
    console.assert(position < input.length);

    if (!_isASCIIDigit(input[position])) {
        console.error("Failed to parse value of type integer; not a number: " + input.substr(position));
        return [null, position];
    }

    let length = input.length;
    let initialPosition = position;
    let result = 0;
    do {
        result = 10 * result + parseInt(input[position], 10);
        ++position;
    } while (position < length && input[position] !== PROPERTY_SEPARATOR && _isASCIIDigit(input[position]));

    if (position >= length || input[position] === PROPERTY_SEPARATOR) {
        return [result, position];
    }

    console.error("Failed to parse value of type integer; not a number: " + input.substr(initialPosition));
    return [null, position];
}

function _indexOfNonWhitespaceCharacter(input, position = 0) {
    console.assert(position >= 0);
    console.assert(position <= input.length);

    let length = input.length;
    while (position < length && _isASCIIWhitespace(input[position]))
        ++position;

    return position;
}

// Internal parsing function for username rules
function _parseUsernameRulesInternal(input) {
    let parsedProperties = [];
    let length = input.length;

    var position = _indexOfNonWhitespaceCharacter(input);
    while (position < length) {
        if (!_isIdentifierCharacter(input[position])) {
            console.warn("Failed to find start of property: " + input.substr(position));
            return parsedProperties;
        }

        var [parsedProperty, position] = _parseUsernameRule(input, position)
        if (parsedProperty && parsedProperty.value) {
            parsedProperties.push(parsedProperty);
        }

        position = _indexOfNonWhitespaceCharacter(input, position);
        if (position >= length) {
            break;
        }

        if (input[position] === PROPERTY_SEPARATOR) {
            position = _indexOfNonWhitespaceCharacter(input, position + 1);
            if (position >= length) {
                return parsedProperties;
            }
            continue;
        }

        console.error("Failed to find start of next property: " + input.substr(position));
        return null;
    }

    return parsedProperties;
}

// Parse individual username rule
function _parseUsernameRule(input, position) {
    // Similar to _parsePasswordRule but for username rules
    let [identifier, newPosition] = _parseIdentifier(input, position);
    if (!Object.values(UsernameRuleName).includes(identifier)) {
        console.error("Unrecognized property name: " + identifier);
        return [null, position];
    }

    position = newPosition;
    if (position >= input.length || input[position] !== PROPERTY_VALUE_START_SENTINEL) {
        console.error("Failed to find start of property value");
        return [null, position];
    }

    position = _indexOfNonWhitespaceCharacter(input, position + 1);
    if (position >= input.length) {
        return [new UsernameRule(identifier, null), position];
    }

    let propertyValue; // Declare propertyValue outside of switch

    switch (identifier) {
        case UsernameRuleName.ALLOWED:
        case UsernameRuleName.REQUIRED:
        case UsernameRuleName.START_WITH:
        case UsernameRuleName.END_WITH:
            [propertyValue, newPosition] = _parseUsernameRequiredOrAllowedPropertyValue(input, position);
            return [new UsernameRule(identifier, propertyValue), newPosition];

        case UsernameRuleName.MIN_LENGTH:
        case UsernameRuleName.MAX_LENGTH:
            [propertyValue, newPosition] = _parseInteger(input, position);
            return [new UsernameRule(identifier, propertyValue), newPosition];
    }

    return [null, position];
}


// Parse username property values
function _parseUsernameRequiredOrAllowedPropertyValue(input, position) {
    let length = input.length;
    let propertyValues = [];

    while (position < length) {
        if (_isIdentifierCharacter(input[position])) {
            let [propertyValue, newPosition] = _parseIdentifier(input, position);
            if (!_isValidUsernameRequiredOrAllowedPropertyValueIdentifier(propertyValue)) {
                console.error("Unrecognized property value identifier: " + propertyValue);
                return [null, position];
            }
            propertyValues.push(new UsernameNamedCharacterClass(propertyValue));
            position = newPosition;
        }
        else if (input[position] === CHARACTER_CLASS_START_SENTINEL) {
            let [propertyValue, newPosition] = _parseCustomCharacterClass(input, position);
            if (propertyValue && propertyValue.length) {
                propertyValues.push(new UsernameCustomCharacterClass(propertyValue));
            }
            position = newPosition;
        }
        else {
            console.error("Failed to find start of property value");
            return [null, position];
        }

        position = _indexOfNonWhitespaceCharacter(input, position);
        if (position >= length || input[position] === PROPERTY_SEPARATOR) {
            break;
        }

        if (input[position] === PROPERTY_VALUE_SEPARATOR) {
            position = _indexOfNonWhitespaceCharacter(input, position + 1);
            continue;
        }

        console.error("Failed to find start of next property or property value");
        return [null, position];
    }

    return [propertyValues, position];
}

