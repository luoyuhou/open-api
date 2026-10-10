import * as crypto from 'crypto';
import Env from '../common/const/Env';

const ALGO = 'aes-256-gcm';

function secretKey() {
  return crypto.createHash('sha256').update(String(Env.APP_SECRET)).digest();
}

export function encryptSecret(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, secretKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  return {
    cipher: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(input: {
  cipher: string;
  iv: string;
  tag: string;
}) {
  const decipher = crypto.createDecipheriv(
    ALGO,
    secretKey(),
    Buffer.from(input.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(input.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(input.cipher, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskSecret(plain: string) {
  const value = (plain || '').trim();
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
