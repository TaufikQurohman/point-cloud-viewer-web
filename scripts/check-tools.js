/**
 * Diagnostic script: verifies that the configured PDAL and PotreeConverter
 * executables are reachable on this machine. Run with:
 *
 *   node scripts/check-tools.js
 *
 * Useful on Windows where PATH issues are the most common source of
 * "PDAL conversion failed" / "Potree conversion failed" errors.
 */
const { spawn } = require('child_process');

const PDAL_BIN = process.env.PDAL_BIN || 'pdal';
const POTREE_CONVERTER_BIN = process.env.POTREE_CONVERTER_BIN || 'PotreeConverter';

function check(command, args, label) {
  return new Promise((resolve) => {
    let output = '';
    let child;

    try {
      child = spawn(command, args, { shell: false, windowsHide: true });
    } catch (err) {
      resolve({ label, ok: false, message: err.message });
      return;
    }

    child.stdout?.on('data', (d) => (output += d.toString()));
    child.stderr?.on('data', (d) => (output += d.toString()));

    child.on('error', (err) => {
      resolve({ label, ok: false, message: err.message });
    });

    child.on('close', (code) => {
      resolve({
        label,
        ok: code !== null,
        message: output.trim().split('\n')[0] || `exit code ${code}`
      });
    });
  });
}

async function main() {
  console.log('Checking required executables...\n');

  const pdalResult = await check(PDAL_BIN, ['--version'], `PDAL (${PDAL_BIN})`);
  const potreeResult = await check(
    POTREE_CONVERTER_BIN,
    ['--help'],
    `PotreeConverter (${POTREE_CONVERTER_BIN})`
  );

  for (const result of [pdalResult, potreeResult]) {
    const status = result.ok ? 'OK  ' : 'FAIL';
    console.log(`[${status}] ${result.label}`);
    console.log(`        ${result.message}\n`);
  }

  if (!pdalResult.ok || !potreeResult.ok) {
    console.log(
      'One or more tools could not be reached. Set PDAL_BIN / POTREE_CONVERTER_BIN\n' +
        'in .env.local to the full path of the executable, or add it to your PATH.\n' +
        'See README.md -> "Windows Setup" for installation instructions.'
    );
    process.exitCode = 1;
  } else {
    console.log('All required tools are reachable.');
  }
}

main();
