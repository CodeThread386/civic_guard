#!/usr/bin/env node
/**
 * Reset everything: clear DB, restart blockchain, start fresh.
 * Run: node scripts/reset-all.js
 * Or: npm run reset
 *
 * This will:
 * 1. Kill processes on port 3000 (Next.js) and 8545 (Hardhat)
 * 2. Delete data/ folder (user registry, verifiers, OTP, document requests, share sessions)
 * 3. Start fresh Hardhat node
 * 4. Deploy contract and seed issuer (setup-demo)
 * 5. Start Next.js dev server
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CWD = path.join(__dirname, '..');
const DATA_DIR = path.join(CWD, 'data');

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', cwd: CWD });
      const lines = result.trim().split('\n').filter((l) => l.includes('LISTENING'));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore', cwd: CWD });
          console.log(`  Killed process on port ${port} (PID ${pid})`);
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { cwd: CWD });
      console.log(`  Killed process on port ${port}`);
    }
  } catch {
    // No process found
  }
}

function waitForRpc(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      attempts++;
      const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8545,
          path: '/',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              JSON.parse(data);
              resolve();
            } catch {
              if (attempts >= maxAttempts) reject(new Error('Invalid RPC response'));
              else setTimeout(tryConnect, 1000);
            }
          });
        }
      );
      req.on('error', () => {
        if (attempts >= maxAttempts) reject(new Error('Hardhat node did not start in time'));
        else setTimeout(tryConnect, 1000);
      });
      req.setTimeout(3000, () => {
        req.destroy();
        if (attempts >= maxAttempts) reject(new Error('Timeout'));
        else setTimeout(tryConnect, 1000);
      });
      req.write(body);
      req.end();
    };
    tryConnect();
  });
}

async function main() {
  console.log('\n=== CivicGuard Full Reset ===\n');

  console.log('1. Stopping existing servers...');
  killPort(3000);
  killPort(8545);
  await new Promise((r) => setTimeout(r, 2000));

  console.log('\n2. Clearing database (data/ folder)...');
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true });
    console.log('  Deleted data/');
  } else {
    console.log('  data/ folder did not exist');
  }

  console.log('\n3. Starting Hardhat node (fresh blockchain)...');
  const hardhat = spawn('npx', ['hardhat', 'node'], {
    cwd: CWD,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  hardhat.stdout.on('data', (d) => process.stdout.write(d));
  hardhat.stderr.on('data', (d) => process.stderr.write(d));
  hardhat.on('error', (e) => {
    console.error('Failed to start Hardhat:', e.message);
    process.exit(1);
  });

  console.log('  Waiting for Hardhat node...');
  try {
    await waitForRpc();
    console.log('  Hardhat node ready.\n');
  } catch (e) {
    console.error('  Hardhat node failed to start:', e.message);
    hardhat.kill();
    process.exit(1);
  }

  console.log('4. Deploying contract and seeding issuer (setup-demo)...');
  const setup = spawn('npm', ['run', 'setup-demo'], {
    cwd: CWD,
    stdio: 'inherit',
    shell: true,
  });

  await new Promise((resolve, reject) => {
    setup.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`setup-demo exited with ${code}`));
    });
  });

  console.log('\n5. Starting Next.js dev server...\n');
  const next = spawn('npm', ['run', 'dev'], {
    cwd: CWD,
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = () => {
    next.kill();
    hardhat.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('Server running at http://localhost:3000');
  console.log('Blockchain at http://127.0.0.1:8545');
  console.log('\nClear browser localStorage (F12 > Application > Clear site data) for a fully fresh start.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
