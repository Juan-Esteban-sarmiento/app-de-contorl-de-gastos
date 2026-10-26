import { basename } from 'node:path';

export const REQUIRED_IGNORE = ['.env', '.env.*', '!.env.example', '.openbao/', '.tools/'];

export function isSensitivePath(file) {
  const name = basename(file);
  if (name === '.env' || name === '.envrc' || name === '.netrc') return true;
  if (name.startsWith('.env.') && name !== '.env.example') return true;
  if (file.startsWith('.openbao/') || file.startsWith('.tools/') || file.startsWith('.direnv/')) return true;
  if (file === '.aws/credentials' || file.endsWith('/.aws/credentials')) return true;
  if (/\.(pem|key|p12|pfx|jks|keystore|p8)$/i.test(name)) return true;
  if (/^id_(rsa|dsa|ecdsa|ed25519)$/i.test(name)) return true;
  if (/^service-account.*\.json$/i.test(name)) return true;
  if (/^credentials\.json$/i.test(name)) return true;
  if (/\.tfstate(\.|$)/i.test(name) || /\.tfvars$/i.test(name)) return true;
  return false;
}
