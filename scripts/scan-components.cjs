const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const OUTPUT_FILE = path.join(SRC_DIR, 'data/component-docs.json');

// Helper to recursively find files
function findFiles(dir, extension) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findFiles(filePath, extension));
        } else {
            if (file.endsWith(extension)) {
                results.push(filePath);
            }
        }
    });
    return results;
}

// Extract description from file content (looking for JSDoc before component definition)
function extractDescription(content) {
    // Look for JSDoc style comments /** ... */
    // Simple regex to catch the last JSDoc block before a function or const export
    const jsDocRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?(?:const|function|class|default)/g;
    let match;
    let lastDescription = "No description provided.";

    // We want the one closest to the top or directly associated with the main component.
    // For simplicity, we'll take the first one that looks significant, or try to be smarter if needed.
    // A better heuristic might be looking for @description or just taking the first block.

    if ((match = jsDocRegex.exec(content)) !== null) {
        // Clean up the comment
        lastDescription = match[1]
            .split('\n')
            .map(line => line.replace(/^\s*\*\s?/, '').trim())
            .filter(line => line !== '' && !line.startsWith('@')) // Filter out empty lines and tags for summary
            .join(' ');
    }
    return lastDescription;
}

// Find usages of a component name in all files
function findUsages(componentName, allFiles) {
    const usages = [];
    const relativeImportRegex = new RegExp(`import.*${componentName}.*from`, 'i'); // Simple check

    // A more robust check would be to read the file and check for exact import
    // import { Component } from ... or import Component from ...

    allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(componentName)) {
            // Check if it's actually imported or used in JSX
            if (content.includes(`<${componentName}`) || content.includes(componentName)) {
                // Exclude the file itself
                if (!file.includes(componentName)) { // This is a weak check for self, relying on filename matching
                    usages.push(path.relative(SRC_DIR, file));
                }
            }
        }
    });
    return usages;
}

function scan() {
    console.log('Scanning components...');
    const componentFiles = findFiles(COMPONENTS_DIR, '.tsx');
    const allSrcFiles = findFiles(SRC_DIR, '.tsx').concat(findFiles(SRC_DIR, '.ts'));

    const docs = componentFiles.map(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath, '.tsx');
        // Try to infer component name if it's different from filename (simple assumption: filename is component name)
        const componentName = fileName;

        // Attempt to be smarter about the main component name if possible, but filename is standard convention in React

        const description = extractDescription(content);
        const usages = findUsages(componentName, allSrcFiles);

        return {
            name: componentName,
            path: path.relative(SRC_DIR, filePath),
            description: description || 'No description found.',
            usages: usages
        };
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(docs, null, 2));
    console.log(`Documentation generated for ${docs.length} components at ${OUTPUT_FILE}`);
}

scan();
