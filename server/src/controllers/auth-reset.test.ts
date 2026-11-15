import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../config/db';
import { migrate } from '../db/migrate';
import { forgotPassword, resetPassword, verifyEmail } from './auth.controller';
import { createUser, findUserWithHashByEmail } from '../repositories/user.repository';
import { otpExpiryDate, storeOtp } from '../repositories/email-otp.repository';
import { findRefreshTokenRecord, storeRefreshToken } from '../repositories/refresh-token.repository';
import { comparePassword, hashPassword } from '../utils/password';
import { refreshExpiryDate, signRefreshToken } from '../utils/jwt';

function createMockRes() {
  const res: {
    statusCode: number;
    body: unknown;
    clearedCookies: string[];
    status: (code: number) => typeof res;
    json: (data: unknown) => typeof res;
    clearCookie: (name: string) => typeof res;
  } = {
    statusCode: 200,
    body: null,
    clearedCookies: [],
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    clearCookie(name: string) {
      this.clearedCookies.push(name);
      return this;
    },
  };
  return res;
}

describe('Forgot & Reset Password Flow', () => {
  const TEST_RUN = Date.now();
  const VERIFIED_EMAIL = `reset.verified.${TEST_RUN}@wmsu.edu.ph`;
  const UNVERIFIED_EMAIL = `reset.unverified.${TEST_RUN}@wmsu.edu.ph`;
  const MISSING_EMAIL = `reset.missing.${TEST_RUN}@wmsu.edu.ph`;
  const OLD_PASSWORD = 'OldPassword123!';
  const NEW_PASSWORD = 'NewPassword456!';

  let verifiedUserId = '';
  let unverifiedUserId = '';

  before(async () => {
    await migrate();
    await pool.query('DELETE FROM "user" WHERE email IN ($1, $2)', [
      VERIFIED_EMAIL,
      UNVERIFIED_EMAIL,
    ]);

    const passwordHash = await hashPassword(OLD_PASSWORD);
    const verified = await createUser({
      firstName: 'Reset',
      lastName: 'User',
      email: VERIFIED_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: true,
    });
    verifiedUserId = verified.id;

    const unverified = await createUser({
      firstName: 'Unverified',
      lastName: 'User',
      email: UNVERIFIED_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: false,
    });
    unverifiedUserId = unverified.id;
  });

  after(async () => {
    await pool.query('DELETE FROM "user" WHERE id IN ($1, $2)', [
      verifiedUserId,
      unverifiedUserId,
    ]);
    await pool.end();
  });

  it('returns a generic 200 without creating OTP rows for unknown or unverified emails', async () => {
    for (const email of [MISSING_EMAIL, UNVERIFIED_EMAIL]) {
      const req = { body: { email } } as never;
      const res = createMockRes();
      await forgotPassword(req, res as never);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, {
        message: 'If an eligible account exists for this email, a password reset code has been sent.',
      });
    }

    const { rows } = await pool.query(
      `SELECT id FROM email_otp WHERE user_id = $1 AND purpose = 'reset_password'`,
      [unverifiedUserId],
    );
    assert.equal(rows.length, 0);
  });

  it('isolates OTP purposes so verify_email codes cannot reset passwords and vice versa', async () => {
    await storeOtp(unverifiedUserId, '111222', otpExpiryDate(), 'verify_email');
    await storeOtp(verifiedUserId, '333444', otpExpiryDate(), 'reset_password');

    // A verify_email OTP must not be accepted by resetPassword
    const resetWithVerifyCodeRes = createMockRes();
    await resetPassword(
      { body: { email: VERIFIED_EMAIL, otp: '111222', newPassword: NEW_PASSWORD } } as never,
      resetWithVerifyCodeRes as never,
    );
    assert.equal(resetWithVerifyCodeRes.statusCode, 400);

    // A reset_password OTP must not verify an unverified account
    const verifyWithResetCodeRes = createMockRes();
    await verifyEmail(
      { body: { email: UNVERIFIED_EMAIL, otp: '333444' } } as never,
      verifyWithResetCodeRes as never,
    );
    assert.equal(verifyWithResetCodeRes.statusCode, 400);
  });

  it('resets password with valid reset OTP, revokes active refresh tokens, and invalidates old code', async () => {
    const user = await findUserWithHashByEmail(VERIFIED_EMAIL);
    assert.ok(user);

    const refreshToken = signRefreshToken(user);
    await storeRefreshToken(verifiedUserId, refreshToken, refreshExpiryDate());
    await storeOtp(verifiedUserId, '987654', otpExpiryDate(), 'reset_password');

    // Wrong code fails
    const badRes = createMockRes();
    await resetPassword(
      { body: { email: VERIFIED_EMAIL, otp: '000000', newPassword: NEW_PASSWORD } } as never,
      badRes as never,
    );
    assert.equal(badRes.statusCode, 400);

    // Correct code succeeds
    const goodRes = createMockRes();
    await resetPassword(
      { body: { email: VERIFIED_EMAIL, otp: '987654', newPassword: NEW_PASSWORD } } as never,
      goodRes as never,
    );
    assert.equal(goodRes.statusCode, 200);
    assert.ok(goodRes.clearedCookies.includes('refreshToken'));

    // Password updated and old password no longer matches
    const updated = await findUserWithHashByEmail(VERIFIED_EMAIL);
    assert.ok(updated);
    assert.equal(await comparePassword(NEW_PASSWORD, updated.passwordHash), true);
    assert.equal(await comparePassword(OLD_PASSWORD, updated.passwordHash), false);

    // Refresh token was revoked
    const tokenRecord = await findRefreshTokenRecord(refreshToken);
    assert.equal(tokenRecord?.revoked, true);

    // Same OTP cannot be reused
    const reuseRes = createMockRes();
    await resetPassword(
      { body: { email: VERIFIED_EMAIL, otp: '987654', newPassword: 'AnotherPassword789!' } } as never,
      reuseRes as never,
    );
    assert.equal(reuseRes.statusCode, 400);
  });
});
