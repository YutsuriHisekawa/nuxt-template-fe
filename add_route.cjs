#!/usr/bin/env node

/**
 * Nuxt Route & Module Generator
 *
 * Mode 1 (Dashboard):
 *   node add_route.cjs
 *   → Opens Builder Dashboard at /builder
 *   → Create drafts, resume, configure, generate — all from the UI
 *
 * Mode 2 (Direct — backward compatible):
 *   node add_route.cjs <module_path> [api_endpoint]
 *   → Creates a draft config and opens builder directly
 *
 * Examples:
 *   node add_route.cjs                          # Dashboard mode
 *   node add_route.cjs setup/m_supplier          # Direct mode
 *   node add_route.cjs purchasing/master/m_vendor m_vendor
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const projectRoot = __dirname;

function getReadableName(text) {
  const isTransaction = text.startsWith('t_');
  const clean = text.replace(/^[mt]_/, '').split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return isTransaction ? 'Transaksi ' + clean : 'Master ' + clean;
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`, { shell: 'cmd.exe' });
  } else if (process.platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

const args = process.argv.slice(2);

// ─── Mode 1: Dashboard (no arguments) ───────────────────────────────────
if (!args[0]) {
  // Activate builder gate with secret key
  const builderKey = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(path.join(projectRoot, '.builder_active'), builderKey);
  const dashboardUrl = `http://localhost:9999/builder?key=${builderKey}`;
  console.log('\x1b[36m---------------------------------------\x1b[0m');
  console.log('\x1b[1m  Builder Dashboard\x1b[0m');
  console.log('\x1b[36m---------------------------------------\x1b[0m');
  console.log('\x1b[32m+ Builder activated\x1b[0m');
  console.log('\x1b[32m+ Opening Builder Dashboard...\x1b[0m');
  console.log('\x1b[90m  (pastikan Nuxt dev server sudah jalan di port 9999)\x1b[0m');
  console.log('\x1b[36m---------------------------------------\x1b[0m');
  openBrowser(dashboardUrl);
  return setTimeout(() => process.exit(0), 2000);
}

// ─── Mode 2: Direct (with module_path argument) ────────────────────────
const modulePath = args[0].replace(/\\/g, '/').replace(/^\/|\/$/g, '');
const segments = modulePath.split('/');
const moduleName = segments[segments.length - 1];
const apiEndpoint = args[1] || moduleName;
const routePath = '/' + modulePath;
const readableName = getReadableName(moduleName);

const token = crypto.randomUUID();
const configDir = path.join(projectRoot, '.builder_configs');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
// Activate builder gate with secret key
const builderKey = crypto.randomBytes(16).toString('hex');
fs.writeFileSync(path.join(projectRoot, '.builder_active'), builderKey);
const configPath = path.join(configDir, `${token}.json`);
const config = { modulePath, moduleName, apiEndpoint, routePath, readableName, token, createdAt: new Date().toISOString() };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('\x1b[36m---------------------------------------\x1b[0m');
console.log('\x1b[1m  Route Builder\x1b[0m');
console.log('\x1b[36m---------------------------------------\x1b[0m');
console.log('  Module : \x1b[33m' + modulePath + '\x1b[0m');
console.log('  API    : \x1b[33m' + apiEndpoint + '\x1b[0m');
console.log('  Route  : \x1b[33m' + routePath + '\x1b[0m');
console.log('  Title  : \x1b[33m' + readableName + '\x1b[0m');
console.log('  Token  : \x1b[33m' + token + '\x1b[0m');
console.log('\x1b[36m---------------------------------------\x1b[0m');
console.log('\x1b[32m+ Config written to .builder_configs/' + token + '.json\x1b[0m');
const directUrl = `http://localhost:9999/builder_file/${token}?key=${builderKey}`;
console.log('\x1b[32m+ Opening browser -> ' + directUrl + '\x1b[0m');
console.log('\x1b[90m  (pastikan Nuxt dev server sudah jalan)\x1b[0m');

openBrowser(directUrl);
