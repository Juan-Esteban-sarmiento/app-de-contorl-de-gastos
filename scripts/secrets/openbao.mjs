#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv, readEnvFile, setEnvValues, valuesEqual, writeEnvFile, writeEnvText } from './env.mjs';
import { REQUIRED_IGNORE, isSensitivePath } from './policy.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const STATE_DIR = join(ROOT, '.openbao');
const INIT_FILE = join(STATE_DIR, 'init.json');
const TOKEN_FILE = join(STATE_DIR, 'token');
const ENV_FILE = join(ROOT, '.env.local');
const ADDR = (process.env.OPENBAO_ADDR || 'http://127.0.0.1:8200').replace(/\/+$/, '');
const KV_MOUNT = (process.env.OPENBAO_KV_MOUNT || 'secret').replace(/^\/+|\/+$/g, '');
const SECRET_PATH = (process.env.OPENBAO_SECRET_PATH || 'finsmart/app').replace(/^\/+|\/+$/g, '');
const GENERATED_HEADER = 'Generado desde OpenBao por scripts/secrets/openbao.mjs. No editar a mano.';

const command = process.argv[2] || 'help';
const { flags, positional } = parseArgs(process.argv.slice(3));

function parseArgs(argv) {
  const booleanFlags = new Set(['force', 'sync', 'volumes', 'stdin']);
  const parsedFlags = new Map();
  const parsedPositional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      parsedPositional.push(...argv.slice(index + 1));
      break;
    }
    if (!argument.startsWith('--')) {
      parsedPositional.push(argument);
      continue;
    }
    const equal = argument.indexOf('=');
    if (equal !== -1) {
      parsedFlags.set(argument.slice(2, equal), argument.slice(equal + 1));
      continue;
    }
    const name = argument.slice(2);
    if (booleanFlags.has(name)) {
      parsedFlags.set(name, true);
      continue;
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      parsedFlags.set(name, next);
      index += 1;
    } else {
      parsedFlags.set(name, true);
    }
  }
  return { flags: parsedFlags, positional: parsedPositional };
}

function rel(file) {
  const relativePath = relative(ROOT, file);
  if (!relativePath) return file;
  return relativePath.startsWith('..') ? file : relativePath;
}

function fail(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

function usage() {
  console.log(`Uso: node scripts/secrets/openbao.mjs <comando> [opciones]

Comandos:
  up                     Inicia OpenBao con Docker, lo inicializa y desbloquea
  down [--volumes]       Detiene OpenBao (conserva los datos por defecto)
  status                 Muestra el estado de OpenBao y del secreto
  init                   Inicializa o desbloquea OpenBao y habilita KV v2
  push [archivo]         Sube .env.local (o el archivo indicado) a OpenBao
  pull [archivo]         Escribe el secreto en .env.local (requiere --force si difiere)
  list                   Lista las claves sin mostrar sus valores
  diff                   Compara .env.local con OpenBao sin mostrar valores
  set CLAVE=valor...     Actualiza una o varias claves en OpenBao
  set --stdin CLAVE      Lee el valor de la entrada estándar
  doctor                 Revisa permisos, .gitignore, Git y OpenBao

Variables:
  OPENBAO_ADDR           URL de OpenBao (por defecto http://127.0.0.1:8200)
  OPENBAO_TOKEN          Token de OpenBao; también se usa .openbao/token
  OPENBAO_KV_MOUNT       Mount KV v2 (por defecto secret)
  OPENBAO_SECRET_PATH    Ruta del secreto (por defecto finsmart/app)`);
}

function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  try {
    chmodSync(STATE_DIR, 0o700);
  } catch {
    return;
  }
}

function readInit() {
  if (!existsSync(INIT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(INIT_FILE, 'utf8'));
  } catch {
    fail(`No se pudo leer ${rel(INIT_FILE)}. Restaura el archivo de inicialización.`);
  }
}

function writeSecure(file, content) {
  ensureStateDir();
  writeFileSync(file, content, { mode: 0o600 });
  try {
    chmodSync(file, 0o600);
  } catch {
    return;
  }
}

function resolveToken({ required = true } = {}) {
  const envToken = process.env.OPENBAO_TOKEN || process.env.BAO_TOKEN;
  if (envToken) return envToken;
  if (existsSync(TOKEN_FILE)) {
    const fileToken = readFileSync(TOKEN_FILE, 'utf8').trim();
    if (fileToken) return fileToken;
  }
  const init = readInit();
  if (init?.root_token) return init.root_token;
  if (required) fail('No hay token de OpenBao. Ejecuta `npm run secrets:up` o define OPENBAO_TOKEN.');
  return null;
}

async function api(path, options = {}) {
  const { method = 'GET', token, body, allow = [] } = options;
  const url = `${ADDR}/v1/${path.replace(/^\/+/, '')}`;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(token ? { 'X-Vault-Token': token } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`No se pudo conectar con OpenBao en ${ADDR}. Ejecuta \`npm run secrets:up\`.`);
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok && !allow.includes(response.status)) {
    const detail = data?.errors?.join('; ') || data?.error || data?.message || response.statusText;
    throw new Error(`OpenBao ${method} /v1/${path} respondió ${response.status}: ${detail}`);
  }
  return { status: response.status, data };
}

async function sealStatus() {
  const { data } = await api('sys/seal-status');
  return data;
}

async function waitForServer(timeoutMs = 30000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      await sealStatus();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
    }
  }
  throw lastError || new Error('OpenBao no respondió a tiempo.');
}

async function unsealFromInit() {
  const init = readInit();
  const keys = init?.keys_base64?.length ? init.keys_base64 : init?.keys ?? [];
  if (!keys.length) fail('OpenBao está sellado y no hay claves de unseal en .openbao/init.json.');
  for (const key of keys) {
    const { data } = await api('sys/unseal', { method: 'PUT', body: { key } });
    if (!data?.sealed) return;
  }
  fail('No se pudo desbloquear OpenBao con las claves guardadas.');
}

async function initVault() {
  const status = await sealStatus();
  if (status.initialized) {
    if (status.sealed) await unsealFromInit();
    return status;
  }
  const shares = Number(flags.get('shares') || 1);
  const threshold = Number(flags.get('threshold') || 1);
  if (!Number.isInteger(shares) || shares < 1 || shares > 255) fail('--shares debe ser un entero entre 1 y 255.');
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > shares) fail('--threshold debe ser un entero entre 1 y --shares.');
  const { data } = await api('sys/init', {
    method: 'PUT',
    body: { secret_shares: shares, secret_threshold: threshold },
  });
  if (!data?.root_token) throw new Error('OpenBao no devolvió un root token al inicializar.');
  writeSecure(INIT_FILE, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`OpenBao inicializado. Claves y root token guardados en ${rel(INIT_FILE)} (0600 en sistemas POSIX).`);
  console.log('Guarda una copia de las claves de unseal fuera del proyecto.');
  await unsealFromInit();
  return data;
}

async function ensureKv(token) {
  const { data } = await api('sys/mounts', { token });
  const mounts = data?.data ?? data;
  const entry = mounts?.[`${KV_MOUNT}/`];
  if (!entry) {
    await api(`sys/mounts/${KV_MOUNT}`, {
      method: 'POST',
      token,
      body: { type: 'kv', options: { version: '2' } },
    });
    return;
  }
  if (entry.type !== 'kv' || String(entry?.options?.version) !== '2') {
    fail(`El mount "${KV_MOUNT}/" existe pero no es KV v2. Define otro OPENBAO_KV_MOUNT.`);
  }
}

async function ensureReady({ setup = false, waitMs = 3000 } = {}) {
  await waitForServer(waitMs);
  let status = await sealStatus();
  if (!status.initialized) {
    if (!setup) fail('OpenBao no está inicializado. Ejecuta `npm run secrets:up`.');
    await initVault();
    status = await sealStatus();
  }
  if (status.sealed) await unsealFromInit();
  const token = resolveToken();
  if (setup) await ensureKv(token);
  return token;
}

function kvPath(type) {
  return `${KV_MOUNT}/${type}/${SECRET_PATH}`;
}

async function readSecret(token) {
  const { status, data } = await api(kvPath('data'), { token, allow: [404] });
  if (status === 404) return null;
  const payload = data?.data;
  return {
    values: payload?.data ?? {},
    metadata: payload?.metadata ?? {},
  };
}

async function writeSecret(token, values) {
  const { data } = await api(kvPath('data'), { method: 'PUT', token, body: { data: values } });
  return data?.data?.version;
}

async function up() {
  if (!dockerAvailable()) fail('Docker no está disponible. Instala Docker o define OPENBAO_ADDR y OPENBAO_TOKEN para un OpenBao externo.');
  compose(['up', '-d', 'openbao']);
  await waitForServer(30000);
  await ensureReady({ setup: true, waitMs: 30000 });
  console.log(`OpenBao listo en ${ADDR}.`);
}

async function down() {
  if (!dockerAvailable()) fail('Docker no está disponible.');
  const args = ['down'];
  if (flags.has('volumes')) args.push('--volumes');
  compose(args);
  console.log(flags.has('volumes') ? 'OpenBao detenido y volumen eliminado.' : 'OpenBao detenido. Los datos se conservan.');
}

async function status() {
  try {
    const state = await sealStatus();
    console.log(`OpenBao: ${ADDR}`);
    console.log(`Inicializado: ${state.initialized ? 'sí' : 'no'}`);
    console.log(`Sellado: ${state.sealed ? 'sí' : 'no'}`);
    if (state.version) console.log(`Versión: ${state.version}`);
    const token = resolveToken({ required: false });
    if (token && !state.sealed) {
      try {
        const secret = await readSecret(token);
        if (secret) {
          console.log(`Secreto: ${SECRET_PATH} (${Object.keys(secret.values).length} variables, versión ${secret.metadata.version ?? '?'})`);
        } else {
          console.log(`Secreto: ${SECRET_PATH} (no existe)`);
        }
      } catch {
        console.log(`Secreto: ${SECRET_PATH} (no se pudo leer con el token actual)`);
      }
    }
  } catch (error) {
    fail(error.message);
  }
}

async function init() {
  await ensureReady({ setup: true, waitMs: 5000 });
  console.log(`OpenBao listo. KV v2 en ${KV_MOUNT}/ y secreto ${SECRET_PATH}.`);
}

async function push() {
  const file = resolve(positional[0] || ENV_FILE);
  if (!existsSync(file)) fail(`No existe ${rel(file)}. Crea el archivo o indica otra ruta.`);
  const values = parseEnv(readFileSync(file, 'utf8'));
  const keys = Object.keys(values);
  if (!keys.length) fail(`${rel(file)} no contiene variables válidas.`);
  const token = await ensureReady();
  const version = await writeSecret(token, values);
  console.log(`Subidas ${keys.length} variables a ${SECRET_PATH} (versión ${version ?? '?'}).`);
}

async function pull() {
  const file = resolve(positional[0] || ENV_FILE);
  const token = await ensureReady();
  const secret = await readSecret(token);
  if (!secret) fail(`No existe el secreto ${SECRET_PATH} en OpenBao. Ejecuta \`npm run secrets:push\`.`);
  if (existsSync(file)) {
    const local = readEnvFile(file);
    if (valuesEqual(local, secret.values)) {
      console.log(`${rel(file)} ya está sincronizado con OpenBao.`);
      return;
    }
    if (!flags.has('force')) fail(`${rel(file)} existe y difiere de OpenBao. Usa --force para sobrescribirlo.`);
  }
  writeEnvFile(file, secret.values, GENERATED_HEADER);
  console.log(`Escritas ${Object.keys(secret.values).length} variables en ${rel(file)} (0600 en sistemas POSIX).`);
}

async function list() {
  const token = await ensureReady();
  const secret = await readSecret(token);
  if (!secret) fail(`No existe el secreto ${SECRET_PATH} en OpenBao.`);
  const keys = Object.keys(secret.values).sort();
  if (!keys.length) {
    console.log('El secreto está vacío.');
    return;
  }
  console.log(`Secreto ${SECRET_PATH} (versión ${secret.metadata.version ?? '?'}): ${keys.length} variables.`);
  for (const key of keys) {
    console.log(`  ${key}=<oculto, ${String(secret.values[key]).length} caracteres>`);
  }
}

async function diff() {
  const token = await ensureReady();
  const secret = await readSecret(token);
  const local = readEnvFile(ENV_FILE);
  const remote = secret?.values ?? {};
  const allKeys = [...new Set([...Object.keys(local), ...Object.keys(remote)])].sort();
  if (!allKeys.length) {
    console.log('No hay variables para comparar.');
    return;
  }
  let differences = 0;
  for (const key of allKeys) {
    const inLocal = Object.hasOwn(local, key);
    const inRemote = Object.hasOwn(remote, key);
    let label;
    if (inLocal && inRemote) label = local[key] === remote[key] ? 'igual' : 'valor distinto';
    else if (inLocal) label = 'solo en .env.local';
    else label = 'solo en OpenBao';
    if (label !== 'igual') differences += 1;
    console.log(`${key.padEnd(32)} ${label}`);
  }
  console.log(differences === 0 ? 'Sin diferencias.' : `${differences} diferencia(s). No se muestran valores.`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

async function set() {
  const updates = {};
  if (flags.has('stdin')) {
    if (positional.length !== 1 || positional[0].includes('=')) {
      fail('Uso: npm run secrets:set -- --stdin CLAVE < archivo_con_el_valor');
    }
    const key = positional[0];
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) fail(`Nombre de variable inválido: ${key}`);
    updates[key] = await readStdin();
  } else {
    const pairs = positional.filter((argument) => argument.includes('='));
    if (!pairs.length) fail('Uso: npm run secrets:set -- CLAVE=valor [OTRA=valor]');
    for (const pair of pairs) {
      const equal = pair.indexOf('=');
      const key = pair.slice(0, equal);
      const value = pair.slice(equal + 1);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) fail(`Nombre de variable inválido: ${key}`);
      updates[key] = value;
    }
  }
  const token = await ensureReady();
  const secret = await readSecret(token);
  const values = { ...(secret?.values ?? {}), ...updates };
  const version = await writeSecret(token, values);
  console.log(`Actualizadas ${Object.keys(updates).length} variable(s) en ${SECRET_PATH} (versión ${version ?? '?'}).`);
  if (flags.has('sync')) {
    if (existsSync(ENV_FILE)) {
      const content = readFileSync(ENV_FILE, 'utf8');
      writeEnvText(ENV_FILE, setEnvValues(content, updates));
    } else {
      writeEnvFile(ENV_FILE, values, GENERATED_HEADER);
    }
    console.log(`Sincronizado ${rel(ENV_FILE)}.`);
  }
}

async function doctor() {
  const errors = [];
  const warnings = [];
  const ignoreFile = join(ROOT, '.gitignore');
  if (!existsSync(ignoreFile)) {
    errors.push('Falta .gitignore.');
  } else {
    const lines = readFileSync(ignoreFile, 'utf8').split(/\r?\n/).map((line) => line.trim());
    for (const pattern of REQUIRED_IGNORE) {
      if (!lines.includes(pattern)) errors.push(`.gitignore no contiene la regla exacta "${pattern}".`);
    }
  }
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 20) errors.push(`Node.js ${process.versions.node} es antiguo; se requiere Node 20 o superior.`);
  if (!isGitRepo()) {
    warnings.push('El directorio no es un repositorio Git. Ejecuta `git init` y luego `npm run secrets:install-hooks`.');
  } else {
    const sensitive = gitTrackedFiles().filter(isSensitivePath);
    if (sensitive.length) errors.push(`Archivos sensibles rastreados por Git: ${sensitive.join(', ')}.`);
    for (const path of ['.env.local', '.openbao/init.json', '.openbao/token', '.tools/gitleaks']) {
      const result = spawnSync('git', ['check-ignore', '--quiet', '--', path], { cwd: ROOT });
      if (result.status !== 0) errors.push(`${path} no está ignorado por Git.`);
    }
  }
  if (existsSync(ENV_FILE)) {
    const local = readEnvFile(ENV_FILE);
    if (Object.hasOwn(local, 'OPENBAO_TOKEN') || Object.hasOwn(local, 'BAO_TOKEN')) {
      errors.push('No guardes OPENBAO_TOKEN ni BAO_TOKEN dentro de .env.local.');
    }
    if (process.platform !== 'win32') {
      const mode = statSync(ENV_FILE).mode & 0o777;
      if (mode & 0o077) warnings.push(`${rel(ENV_FILE)} tiene permisos ${mode.toString(8)}; se recomienda 600.`);
    }
  } else {
    warnings.push('No existe .env.local. Créalo desde .env.example o con `npm run secrets:pull`.');
  }
  if (!dockerAvailable()) warnings.push('Docker no está disponible; OpenBao local no podrá iniciarse con `npm run secrets:up`.');
  try {
    const state = await sealStatus();
    console.log(`OpenBao: inicializado=${state.initialized ? 'sí' : 'no'}, sellado=${state.sealed ? 'sí' : 'no'}${state.version ? `, versión=${state.version}` : ''}.`);
  } catch {
    warnings.push(`OpenBao no responde en ${ADDR}.`);
  }
  for (const warning of warnings) console.log(`[aviso] ${warning}`);
  for (const error of errors) console.error(`[error] ${error}`);
  if (errors.length) process.exit(1);
  console.log('Revisión completada sin errores.');
}

function dockerAvailable() {
  const result = spawnSync('docker', ['--version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function compose(args) {
  const result = spawnSync('docker', ['compose', ...args], { cwd: ROOT, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker compose ${args.join(' ')} falló con código ${result.status}.`);
}

function isGitRepo() {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function gitTrackedFiles() {
  const result = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return result.stdout.split('\n').filter(Boolean);
}

const handlers = { up, down, status, init, push, pull, list, diff, set, doctor };

if (command === 'help' || command === '--help' || command === '-h') {
  usage();
  process.exit(0);
}

const handler = handlers[command];
if (!handler) {
  console.error(`Comando desconocido: ${command}`);
  usage();
  process.exit(1);
}

handler().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});
