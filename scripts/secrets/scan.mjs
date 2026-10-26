#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_IGNORE, isSensitivePath } from './policy.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TOOLS_DIR = join(ROOT, '.tools');
const CONFIG_FILE = join(ROOT, '.gitleaks.toml');
const VERSION = process.env.GITLEAKS_VERSION || '8.30.1';
const mode = process.argv[2] || 'auto';

function fail(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

function isGitRepo() {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function hasCommits() {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
  return result.status === 0;
}

function auditIgnoreRules() {
  const file = join(ROOT, '.gitignore');
  if (!existsSync(file)) fail('Falta .gitignore. No se puede garantizar que .env y archivos sensibles no se suban.');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim());
  const missing = REQUIRED_IGNORE.filter((pattern) => !lines.includes(pattern));
  if (missing.length) fail(`.gitignore no protege estos patrones: ${missing.join(', ')}.`);
}

function auditTrackedSecrets() {
  if (!isGitRepo()) return;
  const result = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return;
  const sensitive = result.stdout.split('\n').filter(Boolean).filter(isSensitivePath);
  if (sensitive.length) {
    fail(`Git rastrea archivos sensibles: ${sensitive.join(', ')}. Quítalos del índice y rota esas credenciales.`);
  }
}

function findOnPath(name) {
  const result = spawnSync(name, ['version'], { stdio: 'ignore' });
  if (!result.error && result.status === 0) return name;
  return null;
}

function platformAsset() {
  const key = `${process.platform}-${process.arch}`;
  const assets = {
    'linux-x64': ['linux_x64', 'tar.gz'],
    'linux-arm64': ['linux_arm64', 'tar.gz'],
    'linux-ia32': ['linux_x32', 'tar.gz'],
    'linux-arm': ['linux_armv7', 'tar.gz'],
    'darwin-x64': ['darwin_x64', 'tar.gz'],
    'darwin-arm64': ['darwin_arm64', 'tar.gz'],
    'win32-x64': ['windows_x64', 'zip'],
    'win32-arm64': ['windows_arm64', 'zip'],
    'win32-ia32': ['windows_x32', 'zip'],
  };
  const entry = assets[key];
  if (!entry) fail(`Plataforma no soportada para gitleaks: ${key}. Instala gitleaks y define GITLEAKS_BIN.`);
  return {
    name: `gitleaks_${VERSION}_${entry[0]}.${entry[1]}`,
    binary: process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks',
  };
}

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) fail(`No se pudo descargar ${url} (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

async function verifyChecksum(name, buffer) {
  const checksumUrl = `https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_checksums.txt`;
  const response = await fetch(checksumUrl, { redirect: 'follow' });
  if (!response.ok) fail(`No se pudo descargar la lista de checksums (${response.status}).`);
  const text = await response.text();
  const line = text.split(/\r?\n/).find((entry) => entry.trim().endsWith(name));
  const expected = line?.trim().split(/\s+/)[0];
  if (!expected) fail(`No se encontró el checksum de ${name}.`);
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== expected) fail(`Checksum inválido para ${name}.`);
}

async function downloadGitleaks() {
  const { name, binary } = platformAsset();
  const base = `https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}`;
  console.log(`Descargando gitleaks v${VERSION} para ${process.platform}-${process.arch}...`);
  mkdirSync(TOOLS_DIR, { recursive: true });
  const buffer = await download(`${base}/${name}`);
  await verifyChecksum(name, buffer);
  const archive = join(TOOLS_DIR, name);
  writeFileSync(archive, buffer);
  const extractDir = join(TOOLS_DIR, `gitleaks-${VERSION}-${process.pid}`);
  mkdirSync(extractDir, { recursive: true });
  const extract = spawnSync('tar', ['-xf', archive], { cwd: extractDir, stdio: 'inherit' });
  if (extract.error || extract.status !== 0) {
    rmSync(extractDir, { recursive: true, force: true });
    rmSync(archive, { force: true });
    fail(`No se pudo extraer ${name}. Instala gitleaks y define GITLEAKS_BIN.`);
  }
  const extracted = join(extractDir, binary);
  if (!existsSync(extracted)) {
    rmSync(extractDir, { recursive: true, force: true });
    rmSync(archive, { force: true });
    fail(`El archivo ${name} no contiene ${binary}.`);
  }
  const target = join(TOOLS_DIR, binary);
  rmSync(target, { force: true });
  renameSync(extracted, target);
  try {
    chmodSync(target, 0o755);
  } catch {}
  rmSync(extractDir, { recursive: true, force: true });
  rmSync(archive, { force: true });
  console.log(`gitleaks listo en ${relative(ROOT, target)}.`);
  return target;
}

async function ensureGitleaks() {
  if (process.env.GITLEAKS_BIN) {
    if (!existsSync(process.env.GITLEAKS_BIN)) fail(`GITLEAKS_BIN no existe: ${process.env.GITLEAKS_BIN}`);
    return process.env.GITLEAKS_BIN;
  }
  const local = join(TOOLS_DIR, process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks');
  if (existsSync(local)) return local;
  const onPath = findOnPath('gitleaks');
  if (onPath) return onPath;
  return downloadGitleaks();
}

function buildArgs() {
  const common = ['--config', CONFIG_FILE, '--redact', '--no-banner', '--verbose'];
  if (mode === 'staged') return ['git', '--pre-commit', '--staged', ...common, '.'];
  if (mode === 'history') return ['git', ...common, '.'];
  if (mode === 'dir') return ['dir', ...common, '.'];
  return isGitRepo() && hasCommits() ? ['git', ...common, '.'] : ['dir', ...common, '.'];
}

async function main() {
  const validModes = new Set(['auto', 'dir', 'history', 'staged']);
  if (!validModes.has(mode)) fail(`Modo desconocido: ${mode}. Usa auto, dir, history o staged.`);
  auditIgnoreRules();
  auditTrackedSecrets();
  if ((mode === 'history' || mode === 'staged') && !isGitRepo()) {
    fail('Este directorio no es un repositorio Git. Ejecuta `git init` o usa `npm run secrets:scan:dir`.');
  }
  const binary = await ensureGitleaks();
  const result = spawnSync(binary, buildArgs(), { cwd: ROOT, stdio: 'inherit' });
  if (result.error) fail(result.error.message);
  process.exit(result.status ?? 1);
}

main().catch((error) => fail(error.message));
