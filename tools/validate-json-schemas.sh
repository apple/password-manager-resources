#!/bin/bash

set -e

if ! command -v ajv &> /dev/null
then
    echo "The 'ajv' command is required for validating JSON schemas.
Please follow the readme at https://github.com/ajv-validator/ajv-cli to install the 'ajv-cli' package."
    exit 1
fi

# Finds all JSON files in the quirks directory and validates them against the corresponding schema.
find quirks -name '*.json' -print0 -maxdepth 1 | while IFS= read -r -d '' filename; do
    schema="quirks/schemas/$(basename "$filename" .json)-schema.json"
    echo "Validating $filename against $schema"
    ajv -s "$schema" -d "$filename" --spec=draft2020
done
