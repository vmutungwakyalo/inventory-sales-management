const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', 'inventory-sales-management');
const isDevelopment = process.argv.includes('--dev');
const children = [];
const appUserModelId = 'com.inventorysales.desktop';

app.setAppUserModelId(appUserModelId);

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function startProcess(args, cwd = projectRoot) {
  const child = spawn(npmCommand(), args, {
    cwd,
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  children.push(child);
  return child;
}

function startPackagedBackend(backendRoot) {
  const configPath = path.join(app.getPath('userData'), 'production.env');
  ensureProductionConfig(configPath);
  const config = readEnvFile(configPath);
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !config[key] || config[key].includes('YOUR_PASSWORD') || config[key].includes('replace-with-'));
  if (missing.length) {
    throw new Error(`Production configuration is missing. Create ${configPath} using production.env.example and set: ${missing.join(', ')}`);
  }

  const child = spawn(process.execPath, [path.join(backendRoot, 'src', 'server.js')], {
    cwd: backendRoot,
    env: {
      ...process.env,
      ...config,
      PORT: config.PORT || '5000',
      FRONTEND_URL: 'http://127.0.0.1:5174',
      ELECTRON_RUN_AS_NODE: '1'
    },
    stdio: 'inherit'
  });
  children.push(child);
  return child;
}

function ensureProductionConfig(configPath) {
  if (fs.existsSync(configPath)) return;
  const templatePath = path.join(__dirname, 'config', 'production.env.example');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.copyFileSync(templatePath, configPath);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const separator = line.indexOf('=');
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      return [key, value];
    }));
}

function waitForUrl(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    const check = remaining => {
      const request = http.get(url, response => {
        response.resume();
        resolve();
      });
      request.on('error', () => {
        if (remaining <= 0) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(() => check(remaining - 1), 500);
      });
    };
    check(attempts);
  });
}

async function createWindow() {
  const backendRoot = isDevelopment
    ? path.join(projectRoot, 'backend')
    : path.join(process.resourcesPath, 'backend');

  if (isDevelopment) startProcess(['run', 'start'], backendRoot);
  else startPackagedBackend(backendRoot);

  let pageUrl;
  if (isDevelopment) {
    const frontendRoot = path.join(projectRoot, 'frontend');
    startProcess(['run', 'dev', '--', '--host', '127.0.0.1'], frontendRoot);
    pageUrl = 'http://127.0.0.1:5174/';
  } else {
    pageUrl = `file://${path.join(process.resourcesPath, 'frontend', 'dist', 'index.html')}`;
  }

  if (isDevelopment) await waitForUrl(pageUrl);

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Inventory & Sales Management',
    backgroundColor: '#f4f6f8',
    icon: path.join(__dirname, 'assets', 'inventory-icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDevelopment) await window.loadURL(pageUrl);
  else await window.loadFile(path.join(process.resourcesPath, 'frontend', 'dist', 'index.html'));

  if (isDevelopment) await waitForUrl('http://127.0.0.1:5000/api/health');
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

app.whenReady().then(() => createWindow().catch(error => {
  console.error(error);
  dialog.showErrorBox('Inventory & Sales Management could not start', error.message);
  app.quit();
}));

app.on('window-all-closed', () => app.quit());
app.on('before-quit', stopChildren);
