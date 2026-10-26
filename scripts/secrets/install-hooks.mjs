#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const HOOK = join(ROOT, '.githooks', 'pre-commit');

function fail(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

const repo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8' });
if (repo.status !== 0 || repo.stdout.trim() !== 'true') {
  fail('Este directorio no es un repositorio Git. Ejecuta `git init` y vuelve a intentarlo.');
}

if (!existsSync(HOOK)) fail(`No existe ${HOOK}.`);

try {
  chmodSync(HOOK, 0o755);
} catch {
  console.warn('[aviso] No se pudo marcar el hook como ejecutable; Git puede fallar al ejecutarlo.');
}

const config = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: ROOT, stdio: 'inherit' });
if (config.status !== 0) fail('No se pudo configurar core.hooksPath.');

console.log('Hook pre-commit instalado. Gitleaks revisará los cambios staged antes de cada commit.');
