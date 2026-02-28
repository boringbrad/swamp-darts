/**
 * prebuild: copy sw-template.js → public/sw.js
 *
 * This creates public/sw.js (from the source template) before `next build`
 * runs. The postbuild script (generate-sw.js) then overwrites it with the
 * full precache asset list once the Next.js build output is available.
 *
 * The old "inject __BUILD_VERSION__" approach was replaced by a static
 * CACHE_NAME in the template. Cache busting now happens naturally because
 * Next.js content-hashes all /_next/static/ asset filenames on each build.
 */

const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, 'sw-template.js');
const dest = path.join(__dirname, '../public/sw.js');

fs.copyFileSync(src, dest);
console.log('✓ public/sw.js initialised from sw-template.js (postbuild will inject asset list)');
