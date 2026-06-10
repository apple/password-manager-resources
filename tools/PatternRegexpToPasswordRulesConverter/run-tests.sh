#!/bin/sh
dir="$(dirname "$0")"
cat "$dir/PatternRegexpToPasswordRulesConverter.js" "$dir/PatternRegexpToPasswordRulesConverterTest.js" | node
