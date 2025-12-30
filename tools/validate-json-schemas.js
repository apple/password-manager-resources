const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const quirksDir = path.join(__dirname, '..', 'quirks');
const schemasDir = path.join(quirksDir, 'schemas');

// Ensure ajv-cli is installed
try {
    execSync('npm list ajv-cli --depth=0', { stdio: 'ignore' });
} catch (error) {
    console.error('The 'ajv-cli' package is required for validating JSON schemas.');
    console.error('Please install it: npm install -g ajv-cli');
    process.exit(1);
}

const jsonFiles = fs.readdirSync(quirksDir).filter(file => file.endsWith('.json') && file !== 'schemas');

let allValid = true;

for (const filename of jsonFiles) {
    const schemaFilename = `${path.basename(filename, '.json')}-schema.json`;
    const schemaPath = path.join(schemasDir, schemaFilename);
    const dataPath = path.join(quirksDir, filename);

    if (!fs.existsSync(schemaPath)) {
        console.warn(`WARNING: No schema found for ${filename} at ${schemaPath}. Skipping validation.`);
        continue;
    }

    console.log(`Validating ${filename} against ${schemaFilename}`);
    try {
        execSync(`ajv -s "${schemaPath}" -d "${dataPath}" --spec=draft2020`, { stdio: 'inherit' });
        console.log(`${filename} valid`);
    } catch (error) {
        console.error(`${filename} validation FAILED:`);
        allValid = false;
    }
}

if (!allValid) {
    console.error('One or more JSON files failed schema validation.');
    process.exit(1);
}

console.log('All JSON files successfully validated against their schemas.');

