const { spawnSync } = require('node:child_process');
const path = require('node:path');

const target = process.argv[2] || 'nsis';
const executable = process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder';
const result = spawnSync(
  path.join(__dirname, 'node_modules', '.bin', executable),
  ['--projectDir', __dirname, '--win', target, '--config', path.join(__dirname, 'electron-builder.yml')],
  { cwd: __dirname, stdio: 'inherit', shell: process.platform === 'win32' }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);