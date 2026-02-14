#!/usr/bin/env node
/**
 * Kill process on port 3000, clean build cache, restart dev server.
 * Run: node scripts/clean-dev.js
 * Fixes 404 errors for layout.css, page.js, main-app.js etc.
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Kill process on port 3000 (Windows)
function killPort3000() {
  try {
    const result = execSync('netstat -ano | findstr :3000', { encoding: 'utf8', cwd: root });
    const lines = result.trim().split('\n').filter(l => l.includes('LISTENING'));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        console.log('Killing process on port 3000 (PID:', pid, ')');
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit', cwd: root });
      }
    }
  } catch (e) {
    // No process found or netstat failed - ignore
  }
}

killPort3000();

const nextDir = path.join(root, '.next');
if (fs.existsSync(nextDir)) {
  console.log('Removing .next cache...');
  fs.rmSync(nextDir, { recursive: true });
  console.log('Cache cleared.');
}

console.log('Starting dev server...');
execSync('npm run dev', { stdio: 'inherit', cwd: root });
