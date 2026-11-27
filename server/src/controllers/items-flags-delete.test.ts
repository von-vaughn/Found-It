import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import app from '../index';
import { pool } from '../config/db';
import { env } from '../config/env';
import { migrate } from '../db/migrate';
import { createItem, deleteItem } from '../repositories/item.repository';
import { createUser } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';

interface HttpResponse<T = any> {
  status: number;
  data: T;
}

describe('Item Flagging & Admin Deletion Reason Workflow', () => {
  const RUN = Date.now();
  const SUPER_EMAIL = `flag.super.${RUN}@wmsu.edu.ph`;
  const OWNER_EMAIL = `flag.owner.${RUN}@wmsu.edu.ph`;
  const FLAGGER_EMAIL = `flag.user.${RUN}@wmsu.edu.ph`;
  const PASSWORD = 'TestPassword123!';

  let server: http.Server;
  let baseUrl = '';
  let categoryId = '';
  let superUserId = '';
  let ownerUserId = '';
  let flaggerUserId = '';
  const createdUserIds: string[] = [];
  const createdItemIds: string[] = [];

  async function api<T = any>(
    method: string,
    path: string,
    options: { token?: string; body?: unknown } = {},
  ): Promise<HttpResponse<T>> {
    const headers: Record<string, string> = {
      Origin: env.ALLOWED_ORIGINS[0] ?? 'http://localhost:5173',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data };
  }

  async function loginAs(email: string): Promise<string> {
    const res = await api<{ accessToken: string }>('POST', '/api/auth/login', {
      body: { email, password: PASSWORD },
    });
    assert.equal(res.status, 200, `Login failed for ${email}`);
    return res.data.accessToken;
  }

  before(async () => {
    await migrate();
    server = await new Promise<http.Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const addr = server.address();
    assert.ok(addr && typeof addr !== 'string');
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const catRow = await pool.query<{ id: string }>(
      `SELECT id FROM category WHERE is_active = TRUE LIMIT 1`,
    );
    assert.ok(catRow.rows[0], 'Expected an active seeded category');
    categoryId = catRow.rows[0].id;

    const passwordHash = await hashPassword(PASSWORD);
    const superUser = await createUser({
      firstName: 'Flag',
      lastName: 'Super',
      email: SUPER_EMAIL,
      passwordHash,
      role: 'admin',
      isVerified: true,
    });
    superUserId = superUser.id;
    createdUserIds.push(superUserId);

    const ownerUser = await createUser({
      firstName: 'Flag',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: true,
    });
    ownerUserId = ownerUser.id;
    createdUserIds.push(ownerUserId);

    const flaggerUser = await createUser({
      firstName: 'Flag',
      lastName: 'Reporter',
      email: FLAGGER_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: true,
    });
    flaggerUserId = flaggerUser.id;
    createdUserIds.push(flaggerUserId);
  });

  after(async () => {
    for (const itemId of createdItemIds) {
      await deleteItem(itemId);
    }
    if (createdUserIds.length > 0) {
      await pool.query(`DELETE FROM audit_log WHERE actor_id = ANY($1::uuid[])`, [createdUserIds]);
      await pool.query(`DELETE FROM notification WHERE user_id = ANY($1::uuid[])`, [createdUserIds]);
      await pool.query(`DELETE FROM "user" WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  });

  it('flags items, exposes flags only to admins, dismisses flags, and requires/records admin deletion reason', async () => {
    const item = await createItem({
      reporterId: ownerUserId,
      reportType: 'lost',
      name: `Flag Test Umbrella ${RUN}`,
      description: 'Lost umbrella left outside the library entrance.',
      itemDate: '2026-10-20',
      categoryId,
    });
    createdItemIds.push(item.id);

    const ownerToken = await loginAs(OWNER_EMAIL);
    const flaggerToken = await loginAs(FLAGGER_EMAIL);
    const superToken = await loginAs(SUPER_EMAIL);

    // Owner cannot flag their own post
    const selfFlag = await api('POST', `/api/items/${item.id}/flag`, {
      token: ownerToken,
      body: { reason: 'Trying to flag my own item' },
    });
    assert.equal(selfFlag.status, 400);

    // Non-owner school user can flag with a valid reason
    const flagRes = await api('POST', `/api/items/${item.id}/flag`, {
      token: flaggerToken,
      body: { reason: 'Duplicate report already exists' },
    });
    assert.equal(flagRes.status, 201);

    // Duplicate open flag from same user is rejected
    const dupFlagRes = await api('POST', `/api/items/${item.id}/flag`, {
      token: flaggerToken,
      body: { reason: 'Another duplicate reason' },
    });
    assert.equal(dupFlagRes.status, 409);

    // School user cannot see flag metadata, but sees their own hasReported flag
    const userItemRes = await api<{
      item: { flagCount?: number; flags?: unknown[]; hasReported?: boolean };
    }>(
      'GET',
      `/api/items/${item.id}`,
      { token: flaggerToken },
    );
    assert.equal(userItemRes.status, 200);
    assert.equal(userItemRes.data.item.flagCount, undefined);
    assert.equal(userItemRes.data.item.flags, undefined);
    assert.equal(userItemRes.data.item.hasReported, true);

    // Admin sees flagCount and flag details + received notification
    const adminItemRes = await api<{
      item: { flagCount?: number; flags?: Array<{ reason: string }> };
    }>('GET', `/api/items/${item.id}`, { token: superToken });
    assert.equal(adminItemRes.status, 200);
    assert.equal(adminItemRes.data.item.flagCount, 1);
    assert.equal(adminItemRes.data.item.flags?.[0]?.reason, 'Duplicate report already exists');

    const superNotifs = await api<{
      notifications: Array<{ kind: string; event: string; itemId: string | null }>;
    }>('GET', '/api/notifications', { token: superToken });
    assert.ok(
      superNotifs.data.notifications.some(
        (n) => n.kind === 'flag' && n.event === 'flagged' && n.itemId === item.id,
      ),
      'Expected admin notification for flagged item',
    );

    // School user cannot dismiss flags
    const userDismissRes = await api('PATCH', `/api/items/${item.id}/flags/dismiss`, {
      token: flaggerToken,
    });
    assert.equal(userDismissRes.status, 403);

    // Admin dismisses flags
    const adminDismissRes = await api<{
      dismissedCount: number;
      item: { flagCount?: number; flags?: unknown[] };
    }>('PATCH', `/api/items/${item.id}/flags/dismiss`, { token: superToken });
    assert.equal(adminDismissRes.status, 200);
    assert.equal(adminDismissRes.data.dismissedCount, 1);
    assert.equal(adminDismissRes.data.item.flagCount, 0);
    assert.deepEqual(adminDismissRes.data.item.flags, []);

    // Same user cannot report the same post again even after dismissal
    const reFlagRes = await api('POST', `/api/items/${item.id}/flag`, {
      token: flaggerToken,
      body: { reason: 'Trying to report a second time' },
    });
    assert.equal(reFlagRes.status, 409);

    // Admin deleting someone else's item without reason returns 400
    const deleteNoReason = await api('DELETE', `/api/items/${item.id}`, {
      token: superToken,
    });
    assert.equal(deleteNoReason.status, 400);

    // Admin deleting someone else's item with reason succeeds, audits reason, and notifies owner
    const deleteWithReason = await api('DELETE', `/api/items/${item.id}`, {
      token: superToken,
      body: { reason: 'Duplicate report' },
    });
    assert.equal(deleteWithReason.status, 200);

    const auditRes = await api<{ logs: Array<{ action: string; entityId: string; summary: string }> }>(
      'GET',
      '/api/audit-logs?limit=20',
      { token: superToken },
    );
    assert.ok(
      auditRes.data.logs.some(
        (log) =>
          log.action === 'deleted' &&
          log.entityId === item.id &&
          log.summary.includes('Reason: Duplicate report'),
      ),
      'Expected audit log entry with deletion reason',
    );

    const ownerNotifs = await api<{
      notifications: Array<{ kind: string; event: string; message: string }>;
    }>('GET', '/api/notifications', { token: ownerToken });
    assert.ok(
      ownerNotifs.data.notifications.some(
        (n) =>
          n.kind === 'item' &&
          n.event === 'deleted' &&
          n.message.includes('Duplicate report'),
      ),
      'Expected reporter notification containing admin deletion reason',
    );
  });
});
