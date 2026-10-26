import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { pool } from '../config/db';
import { checkEmail, register } from './auth.controller';
import { createUser } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';

function createMockRes() {
  const res: {
    statusCode: number;
    body: any;
    status: (code: number) => any;
    json: (data: any) => any;
  } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('Duplicate Email Prevention in Account Creation', () => {
  const EXISTING_EMAIL = 'dupeteststudent@wmsu.edu.ph';
  const NEW_EMAIL = 'newavailablestudent@wmsu.edu.ph';
  let createdUserId: string | null = null;

  before(async () => {
    // Clean up any leftovers
    await pool.query('DELETE FROM "user" WHERE email IN ($1, $2)', [EXISTING_EMAIL, NEW_EMAIL]);

    // Create an existing user
    const passwordHash = await hashPassword('ValidPassword123!');
    const user = await createUser({
      firstName: 'Existing',
      lastName: 'Student',
      email: EXISTING_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: true,
    });
    createdUserId = user.id;
  });

  after(async () => {
    if (createdUserId) {
      await pool.query('DELETE FROM "user" WHERE id = $1', [createdUserId]);
    }
    await pool.query('DELETE FROM "user" WHERE email IN ($1, $2)', [EXISTING_EMAIL, NEW_EMAIL]);
    await pool.end();
  });

  it('rejects check-email when the email already exists in the system', async () => {
    const req = {
      method: 'POST',
      body: { email: EXISTING_EMAIL },
      query: {},
    } as any;
    const res = createMockRes();

    await checkEmail(req, res as any);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.available, false);
    assert.equal(res.body.message, 'An account with this email already exists.');
  });

  it('allows check-email when the email does not exist in the system', async () => {
    const req = {
      method: 'POST',
      body: { email: NEW_EMAIL },
      query: {},
    } as any;
    const res = createMockRes();

    await checkEmail(req, res as any);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.available, true);
    assert.equal(res.body.message, 'Email is available.');
  });

  it('rejects account registration when email is a duplicate of an existing account', async () => {
    const req = {
      method: 'POST',
      body: {
        name: 'Another Student',
        email: EXISTING_EMAIL,
        password: 'Password987!',
      },
      query: {},
    } as any;
    const res = createMockRes();

    await register(req, res as any);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'An account with this email already exists.');
  });

  it('is case-insensitive when checking duplicate email', async () => {
    const req = {
      method: 'POST',
      body: { email: EXISTING_EMAIL.toUpperCase() },
      query: {},
    } as any;
    const res = createMockRes();

    await checkEmail(req, res as any);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.available, false);
    assert.equal(res.body.message, 'An account with this email already exists.');
  });
});
