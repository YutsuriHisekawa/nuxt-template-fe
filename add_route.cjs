#!/usr/bin/env node

/**
 * Nuxt Route & Module Generator
 *
 * Tulis config -> buka browser ke /builder_file
 * Wizard Nuxt page yang pakai komponen asli akan handle sisanya.
 *
 * Usage:
 *   node add_route.cjs <module_path> [api_endpoint]
 *
 * Examples:
 *   node add_route.cjs setup/m_supplier
 *   node add_route.cjs purchasing/master/m_vendor m_vendor
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const projectRoot = __dirname;
const configPath = path.join(projectRoot, '.builder_config.json');

function getReadableName(text) {
  const isTransaction = text.startsWith('t_');
  const clean = text.replace(/^[mt]_/, '').split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return isTransaction ? 'Transaksi ' + clean : 'Master ' + clean;
}

const args = process.argv.slice(2);
if (!args[0]) {
  console.log('\x1b[31mUsage: node add_route.cjs <module_path> [api_endpoint]\x1b[0m');
  console.log('  Example: node add_route.cjs setup/m_supplier');
  process.exit(1);
}

const modulePath = args[0].replace(/\\/g, '/').replace(/^\/|\/$/g, '');
const segments = modulePath.split('/');
const moduleName = segments[segments.length - 1];
const apiEndpoint = args[1] || moduleName;
const routePath = '/' + modulePath;
const readableName = getReadableName(moduleName);

const token = crypto.randomUUID();
const config = { modulePath, moduleName, apiEndpoint, routePath, readableName, token, createdAt: new Date().toISOString() };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('\x1b[36m---------------------------------------\x1b[0m');
console.log('\x1b[1m  MVG Route Builder\x1b[0m');
console.log('\x1b[36m---------------------------------------\x1b[0m');
console.log('  Module : \x1b[33m' + modulePath + '\x1b[0m');
console.log('  API    : \x1b[33m' + apiEndpoint + '\x1b[0m');
console.log('  Route  : \x1b[33m' + routePath + '\x1b[0m');
console.log('  Title  : \x1b[33m' + readableName + '\x1b[0m');
console.log('  Token  : \x1b[33m' + token + '\x1b[0m');
console.log('\x1b[36m---------------------------------------\x1b[0m');
console.log('\x1b[32m+ Config written to .builder_config.json\x1b[0m');
console.log('\x1b[32m+ Opening browser -> http://localhost:5731/builder_file/' + token + '\x1b[0m');
console.log('\x1b[90m  (pastikan Nuxt dev server sudah jalan)\x1b[0m');

const url = 'http://localhost:5731/builder_file/' + token;
const cmd = process.platform === 'win32' ? 'start "" "' + url + '"' : process.platform === 'darwin' ? 'open "' + url + '"' : 'xdg-open "' + url + '"';
exec(cmd);
