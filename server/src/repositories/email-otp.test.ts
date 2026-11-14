import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../config/db';
import { login } from '../controllers/auth.controller';
import { createUser } from './user.repository';
import {
  checkOtp,
  checkResendEligibility,
  otpExpiryDate,
  storeOtp,
} from './email-otp.repository';
import { hashPassword } from '../utils/password';

function createMockRes() {
  const res: {
    statusCode: number;
    body: unknown;
    status: (code: number) => typeof res;
    json: (data: unknown) => typeof res;
  } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('Email OTP repository & login verification flow', () => {
  const TEST_EMAIL = 'otpteststudent@wmsu.edu.ph';
  const TEST_PASSWORD = 'ValidPassword123!';
  let userId = '';

  before(async () => {
    await pool.query('DELETE FROM "user" WHERE email = $1', [TEST_EMAIL]);
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const user = await createUser({
      firstName: 'Otp',
      lastName: 'Tester',
      email: TEST_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: false,
    });
    userId = user.id;
  });

  after(async () => {
    await pool.query('DELETE FROM "user" WHERE email = $1', [TEST_EMAIL]);
    await pool.end();
  });

  it('anchors 60s resend cooldown on storeOtp so immediate login does not overwrite the active OTP', async () => {
    await storeOtp(userId, '123456', otpExpiryDate());

    const eligibility = await checkResendEligibility(userId);
    assert.equal(eligibility.allowed, false);

    const req = {
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
    } as never;
    const res = createMockRes();
    await login(req, res as never);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
      message:
        'Email not verified. Enter your recent 6-digit code, or wait before requesting a new one.',
    });

    // Original OTP must still be valid (unclobbered)
    const verifyRes = await checkOtp(userId, '123456');
    assert.equal(verifyRes.ok, true);
  });

  it('allows only one concurrent checkOtp call with the same valid code', async () => {
    await storeOtp(userId, '654321', otpExpiryDate());

    const [a, b] = await Promise.all([
      checkOtp(userId, '654321'),
      checkOtp(userId, '654321'),
    ]);

    const okCount = [a, b].filter((r) => r.ok).length;
    assert.equal(okCount, 1);
  });

  it('returns expired at 5 wrong attempts on one code, and locked only at 15 cumulative attempts', async () => {
    await pool.query(
      `UPDATE "user" SET verification_failed_attempts = 0, verification_locked_until = NULL WHERE id = $1`,
      [userId],
    );

    // Code 1: 4 wrong -> 'invalid', 5th wrong -> 'expired' (not 'locked')
    await storeOtp(userId, '111111', otpExpiryDate());
    for (let i = 0; i < 4; i += 1) {
      const r = await checkOtp(userId, '000000');
      assert.deepEqual(r, { ok: false, reason: 'invalid' });
    }
    const fifth = await checkOtp(userId, '000000');
    assert.deepEqual(fifth, { ok: false, reason: 'expired' });

    // Code 2: another 5 wrong attempts (cumulative 10) -> still 'expired', not 1h locked
    await storeOtp(userId, '222222', otpExpiryDate());
    for (let i = 0; i < 4; i += 1) {
      const r = await checkOtp(userId, '000000');
      assert.deepEqual(r, { ok: false, reason: 'invalid' });
    }
    const tenth = await checkOtp(userId, '000000');
    assert.deepEqual(tenth, { ok: false, reason: 'expired' });

    // Code 3: 5 more wrong attempts -> hits cumulative 15 -> 'locked'
    await storeOtp(userId, '333333', otpExpiryDate());
    for (let i = 0; i < 4; i += 1) {
      const r = await checkOtp(userId, '000000');
      assert.deepEqual(r, { ok: false, reason: 'invalid' });
    }
    const fifteenth = await checkOtp(userId, '000000');
    assert.deepEqual(fifteenth, { ok: false, reason: 'locked' });
  });
});
