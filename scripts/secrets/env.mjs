import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = parseValue(match[2]);
  }
  return result;
}

function parseValue(input) {
  let value = input;
  if (value.startsWith('"')) {
    const end = findClosingQuote(value, '"');
    if (end !== -1) value = value.slice(0, end + 1);
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'")) {
    const end = value.indexOf("'", 1);
    if (end !== -1) value = value.slice(0, end + 1);
    return value.slice(1, -1);
  }
  const comment = value.search(/\s+#/);
  if (comment !== -1) value = value.slice(0, comment);
  return value.trim();
}

function findClosingQuote(value, quote) {
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1;
      continue;
    }
    if (value[index] === quote) return index;
  }
  return -1;
}

export function formatValue(value) {
  if (/^[A-Za-z0-9_./:@%+,-]*$/.test(value)) return value;
  return JSON.stringify(value);
}

export function formatEnv(values, header) {
  const lines = [];
  if (header) lines.push(`# ${header}`);
  for (const key of Object.keys(values)) lines.push(`${key}=${formatValue(values[key])}`);
  return `${lines.join('\n')}\n`;
}

export function setEnvValues(content, updates) {
  const pending = new Map(Object.entries(updates));
  const lines = content.split(/\r?\n/);
  const output = lines.map((line) => {
    const match = line.match(/^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/);
    if (!match) return line;
    const key = match[2];
    if (!pending.has(key)) return line;
    const value = pending.get(key);
    pending.delete(key);
    return `${match[1]}${key}${match[3]}${formatValue(value)}`;
  });
  if (output.length && output[output.length - 1] === '') output.pop();
  for (const [key, value] of pending) output.push(`${key}=${formatValue(value)}`);
  return `${output.join('\n')}\n`;
}

export function readEnvFile(file) {
  if (!existsSync(file)) return {};
  return parseEnv(readFileSync(file, 'utf8'));
}

export function writeEnvText(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, content, { mode: 0o600 });
  try {
    chmodSync(temp, 0o600);
  } catch {
    return '';
  }
  renameSync(temp, file);
  try {
    chmodSync(file, 0o600);
  } catch {
    return '';
  }
  return file;
}

export function writeEnvFile(file, values, header) {
  return writeEnvText(file, formatEnv(values, header));
}

export function valuesEqual(left, right) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}
