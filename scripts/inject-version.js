/**
 * Inject build version into service worker
 * This runs before build to ensure each deployment has a unique cache version
 */

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

// Use current timestamp as version
const buildVersion = Date.now().toString();

// Replace the placeholder with actual version
const updatedContent = swContent.replace(/__BUILD_VERSION__/g, buildVersion);

fs.writeFileSync(swPath, updatedContent, 'utf8');

console.log(`✓ Service worker updated with version: ${buildVersion}`);
