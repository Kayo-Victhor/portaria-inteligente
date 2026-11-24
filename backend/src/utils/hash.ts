import argon2 from 'argon2';

export async function hashSecret(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifySecret(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}