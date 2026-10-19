// Resolve the executable and packaged app from the same selected installation.
const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const version = require('../package.json').version;
const versioned = path.join(projectRoot, 'release', `ModernFrontHD-${version}`, 'ModernFrontHD.exe');
const legacy = path.join(projectRoot, 'release', 'ModernFrontHD', 'ModernFrontHD.exe');
const executable = process.env.MODERN_FRONT_EXE
  ? path.resolve(process.env.MODERN_FRONT_EXE)
  : fs.existsSync(versioned) ? versioned : legacy;
const appRoot = path.join(path.dirname(executable), 'resources', 'app');
module.exports = { executable, appRoot };
