#!/bin/sh
dir="$(dirname "$0")"
cat "$dir/PasswordRulesParser.js" "$dir/PasswordRulesParserTest.js" | node
