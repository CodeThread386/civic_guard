#!/usr/bin/env node
/**
 * Full clean reinstall - fixes 500 errors from mixed Next.js versions.
 * Close all terminals and browser tabs first, then run: node scripts/full-reinstall.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

console.log('1. Removing .next...');
const nextDir = path.join(root, '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true });
}

console.log('2. Removing node_modules...');
const nodeDir = path.join(root, 'node_modules');
if (fs.existsSync(nodeDir)) {
  fs.rmSync(nodeDir, { recursive: true, maxRetries: 3 });
}

console.log('3. Running npm install...');
execSync('npm install', { stdio: 'inherit', cwd: root });

console.log('4. Done. Run: npm run dev');
