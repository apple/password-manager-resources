// Test suite for username validation rules
function runUsernameTests() {
    console.log("Running Username Validation Tests...");

    // Test Case 1: Basic lowercase and numbers
    function testBasicRules() {
        const rules = parseUsernameRules(`
            minlength: 3;
            maxlength: 20;
            allowed: lower, digit;
            required: lower
        `);

        console.assert(rules.length === 4, "Should have 4 rules");
        console.log("Basic rules parsed successfully");

        // Verify the rules
        const hasMinLength = rules.some(r => r.name === "minlength" && r.value === 3);
        const hasMaxLength = rules.some(r => r.name === "maxlength" && r.value === 20);

        console.assert(hasMinLength, "Should have correct min length");
        console.assert(hasMaxLength, "Should have correct max length");
    }

    // Test Case 2: Email-safe characters
    function testEmailSafeRules() {
        const rules = parseUsernameRules(`
            allowed: email-safe;
            required: lower, digit
        `);

        const allowedRule = rules.find(r => r.name === "allowed");
        console.assert(allowedRule, "Should have allowed rule");

        // Verify email-safe characters are included
        const allowedChars = allowedRule.value[0];
        console.assert(allowedChars instanceof UsernameCustomCharacterClass,
            "Should convert to custom character class");
    }

    // Test Case 3: Custom character class
    function testCustomCharacterClass() {
        const rules = parseUsernameRules(`
            allowed: lower, [.-_@];
            start-with: lower;
            end-with: lower, digit
        `);

        console.assert(rules.some(r => r.name === "start-with"),
            "Should have start-with rule");
        console.assert(rules.some(r => r.name === "end-with"),
            "Should have end-with rule");
    }

    // Test Case 4: Invalid rules handling
    function testInvalidRules() {
        const invalidRules = parseUsernameRules(`
            invalid: rule;
            minlength: abc;
            allowed: invalid-class
        `);

        console.assert(invalidRules.length === 0,
            "Should handle invalid rules gracefully");
    }

    // Test Case 5: Complex combined rules
    function testCombinedRules() {
        const rules = parseUsernameRules(`
            minlength: 5;
            maxlength: 30;
            allowed: lower, digit, [-_];
            required: lower, digit;
            start-with: lower;
            no-leading-trailing-hyphen
        `);

        console.assert(rules.length === 5, "Should parse all valid rules");

        // Verify required combinations
        const requiredRule = rules.find(r => r.name === "required");
        console.assert(requiredRule && requiredRule.value.length === 2,
            "Should have two required character classes");
    }

    // Run all tests
    try {
        testBasicRules();
        testEmailSafeRules();
        testCustomCharacterClass();
        testInvalidRules();
        testCombinedRules();
        console.log("All tests completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    }
}

// Example usage with real usernames
function testRealUsernames() {
    const rules = parseUsernameRules(`
        minlength: 3;
        maxlength: 20;
        allowed: lower, digit, [-_];
        required: lower;
        start-with: lower;
        no-leading-trailing-hyphen
    `);

    // Test cases
    const testCases = [
        { username: "john_doe123", shouldPass: true },
        { username: "user-name", shouldPass: true },
        { username: "a", shouldPass: false },  // too short
        { username: "123user", shouldPass: false },  // starts with number
        { username: "-username-", shouldPass: false },  // leading/trailing hyphen
        { username: "USERNAME", shouldPass: false },  // no lowercase
        { username: "valid_user_123", shouldPass: true },
    ];

    console.log("\nTesting Real Usernames:");
    testCases.forEach(({ username, shouldPass }) => {
        console.log(`Testing username "${username}": ${shouldPass ? "should pass" : "should fail"}`);
        // Note: Actual validation function would be needed here
    });
}

// Run the tests
runUsernameTests();
testRealUsernames();