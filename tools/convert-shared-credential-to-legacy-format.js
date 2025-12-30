const fs = require('fs');
const path = require('path');

const SCRIPT_NAME = path.basename(process.argv[1]);
const BANNER = `Usage: ${SCRIPT_NAME} [options] <output file path>`;
const USAGE_MESSAGE = `
This script converts shared-credentials.json and shared-credentials-historical.json into the legacy
format (previously contained in websites-with-shared-credential-backends.json).
`;

let options = {};
for (let i = 2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if (arg === '--verify') {
        options.verify = true;
    } else if (arg === '-h' || arg === '--help') {
        console.log(`${BANNER}\n\n${USAGE_MESSAGE}`);
        process.exit(0);
    } else if (!arg.startsWith('-')) {
        options.outputPath = arg;
    }
}

if (!options.outputPath) {
    console.error(BANNER);
    process.exit(1);
}

const toolsDir = __dirname;
const rootDir = path.dirname(toolsDir);
const quirksDir = path.join(rootDir, 'quirks');

const sharedCredentialsFilePath = path.join(quirksDir, 'shared-credentials.json');
const sharedCredentialsHistoricalFilePath = path.join(quirksDir, 'shared-credentials-historical.json');

let legacyOutputArray = [];

function addEntriesToLegacyOutputArray(filePath, outputArray) {
    try {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const contentsAsObject = JSON.parse(fileContents);

        contentsAsObject.forEach(dictionary => {
            let entryToPush = {};
            if (dictionary.shared) {
                entryToPush.domains = dictionary.shared;
            } else if (dictionary.from && dictionary.to) {
                entryToPush.domains = dictionary.from.concat(dictionary.to);
                if (typeof dictionary.fromDomainsAreObsoleted !== 'undefined') {
                    entryToPush.fromDomainsAreObsoleted = dictionary.fromDomainsAreObsoleted;
                }
            } else {
                console.error(`ERROR: There was an entry in ${filePath} that couldn't be put into the legacy format.`);
                return; // Skip this entry
            }
            
            if (entryToPush.domains && entryToPush.domains.length > 0) {
                outputArray.push(entryToPush);
            }
        });
    } catch (error) {
        console.error(`ERROR: Failed to process ${filePath}: ${error.message}`);
        process.exit(1);
    }
}

addEntriesToLegacyOutputArray(sharedCredentialsFilePath, legacyOutputArray);
addEntriesToLegacyOutputArray(sharedCredentialsHistoricalFilePath, legacyOutputArray);

// Sort by the first domain in the 'domains' array
legacyOutputArray.sort((a, b) => {
    const domainA = a.domains && a.domains.length > 0 ? a.domains[0] : '';
    const domainB = b.domains && b.domains.length > 0 ? b.domains[0] : '';
    return domainA.localeCompare(domainB);
});

const jsonToOutput = JSON.stringify(legacyOutputArray, null, 4) + '\n';

if (options.verify) {
    try {
        const currentFileContents = fs.readFileSync(options.outputPath, 'utf8');
        if (currentFileContents !== jsonToOutput) {
            console.error(`ERROR: ${path.basename(options.outputPath)} is not up-to-date.`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`ERROR: Failed to read or verify ${options.outputPath}: ${error.message}`);
        process.exit(1);
    }
} else {
    try {
        fs.writeFileSync(options.outputPath, jsonToOutput, 'utf8');
    } catch (error) {
        console.error(`ERROR: Failed to write to ${options.outputPath}: ${error.message}`);
        process.exit(1);
    }
}

