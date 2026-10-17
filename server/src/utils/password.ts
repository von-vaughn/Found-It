import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Precomputed cost-12 hash to run constant-time comparisons for unknown accounts
const DUMMY_HASH = '$2b$12$zzZNzxasmk289SqA9uOaY.wZoZ2U6bAe3upeW34uAVpqZitVejCKi';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function dummyComparePassword(password: string): Promise<boolean> {
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
}
