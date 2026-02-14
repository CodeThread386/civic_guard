/**
 * One-command start: Hardhat node + setup-demo + Next.js dev.
 * Run: node scripts/start-all.js
 * Or: npm run start-all (if added to package.json)
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const RPC_URL = 'http://127.0.0.1:8545';
const CWD = path.join(__dirname, '..');

function waitForRpc(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      attempts++;
      const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
      const req = http.request({
        hostname: '127.0.0.1',
        port: 8545,
        path: '/',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
      }, (res) => {
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
      });
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
  console.log('Starting CivicGuard...\n');

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

  console.log('Waiting for Hardhat node...');
  try {
    await waitForRpc();
    console.log('Hardhat node ready.\n');
  } catch (e) {
    console.error('Hardhat node failed to start:', e.message);
    hardhat.kill();
    process.exit(1);
  }

  console.log('Running setup-demo...');
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

  console.log('\nStarting Next.js dev server...\n');
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
