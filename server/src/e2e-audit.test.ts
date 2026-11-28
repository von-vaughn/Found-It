import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import app from './index';
import { pool } from './config/db';
import { env } from './config/env';
import { migrate } from './db/migrate';
import { createUser } from './repositories/user.repository';
import {
  deleteExpiredUnsurrenderedFoundItems,
  warnExpiringUnsurrenderedFoundItems,
} from './repositories/item.repository';
import { storeRefreshToken } from './repositories/refresh-token.repository';
import { hashPassword } from './utils/password';
import { signRefreshToken } from './utils/jwt';

interface HttpResponse<T = any> {
  status: number;
  data: T;
  cookies: string[];
}

function extractCookies(headers: Headers): string[] {
  const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(headers).map((cookie) => cookie.split(';')[0]);
  }
  const single = headers.get('set-cookie');
  return single ? [single.split(';')[0]] : [];
}

describe('Complete System Workflow & Consistency E2E Audit', () => {
  const TEST_RUN = Date.now();
  const SUPER_EMAIL = `e2e.super.${TEST_RUN}@wmsu.edu.ph`;
  const ADMIN_EMAIL = `e2e.admin.${TEST_RUN}@wmsu.edu.ph`;
  const OWNER_EMAIL = `e2e.owner.${TEST_RUN}@wmsu.edu.ph`;
  const CLAIMANT_EMAIL = `e2e.claimant.${TEST_RUN}@wmsu.edu.ph`;
  const TARGET_EMAIL = `e2e.target.${TEST_RUN}@wmsu.edu.ph`;
  const UNVERIFIED_EMAIL = `e2e.unverified.${TEST_RUN}@wmsu.edu.ph`;
  const TEST_PASSWORD = 'AuditPassword123!';
  const TEST_CATEGORY = `Audit Cat ${TEST_RUN}`;
  const TEST_BUILDING = `Audit Building ${TEST_RUN}`;

  let server: http.Server;
  let baseUrl = '';

  let superUserId = '';
  let adminUserId = '';
  let ownerUserId = '';
  let claimantUserId = '';
  let unverifiedUserId = '';
  const createdUserIds: string[] = [];
  const createdItemIds: string[] = [];
  let createdCategoryId = '';
  let createdBuildingId = '';

  async function api<T = any>(
    method: string,
    path: string,
    options: {
      token?: string;
      cookies?: string[];
      body?: unknown;
    } = {},
  ): Promise<HttpResponse<T>> {
    const headers: Record<string, string> = {
      Origin: env.ALLOWED_ORIGINS[0] ?? 'http://localhost:5173',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }
    if (options.cookies && options.cookies.length > 0) {
      headers.Cookie = options.cookies.join('; ');
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
    return {
      status: response.status,
      data,
      cookies: extractCookies(response.headers),
    };
  }

  async function loginAs(email: string, password = TEST_PASSWORD) {
    const res = await api<{ accessToken: string; user: { id: string; role: string } }>(
      'POST',
      '/api/auth/login',
      { body: { email, password } },
    );
    assert.equal(res.status, 200, `Login failed for ${email}: ${JSON.stringify(res.data)}`);
    return { token: res.data.accessToken, cookies: res.cookies, user: res.data.user };
  }

  before(async () => {
    await migrate();

    server = await new Promise<http.Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind ephemeral E2E server port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;

    const catRow = await pool.query<{ id: string }>(
      `SELECT id FROM category WHERE is_active = TRUE ORDER BY name ASC LIMIT 1`,
    );
    assert.equal(catRow.rows[0]?.id !== undefined, true, 'Expected at least one active seeded category');
    baselineCategoryId = catRow.rows[0].id;

    const passwordHash = await hashPassword(TEST_PASSWORD);
    const superUser = await createUser({
      firstName: 'Audit',
      lastName: 'Admin',
      email: SUPER_EMAIL,
      passwordHash,
      role: 'admin',
      isVerified: true,
    });
    superUserId = superUser.id;

    const adminUser = await createUser({
      firstName: 'Audit',
      lastName: 'Staff',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'staff',
      isVerified: true,
    });
    adminUserId = adminUser.id;

    const ownerUser = await createUser({
      firstName: 'Audit',
      lastName: 'Owner',
      email: OWNER_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: true,
    });
    ownerUserId = ownerUser.id;

    const claimantUser = await createUser({
      firstName: 'Audit',
      lastName: 'Claimant',
      email: CLAIMANT_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: true,
    });
    claimantUserId = claimantUser.id;

    const unverifiedUser = await createUser({
      firstName: 'Audit',
      lastName: 'Unverified',
      email: UNVERIFIED_EMAIL,
      passwordHash,
      role: 'school_user',
      isVerified: false,
    });
    unverifiedUserId = unverifiedUser.id;

    createdUserIds.push(
      superUserId,
      adminUserId,
      ownerUserId,
      claimantUserId,
      unverifiedUserId,
    );
  });

  after(async () => {
    try {
      if (createdItemIds.length > 0) {
        await pool.query('DELETE FROM notification WHERE item_id = ANY($1::uuid[])', [createdItemIds]);
        await pool.query('DELETE FROM request WHERE item_id = ANY($1::uuid[])', [createdItemIds]);
        await pool.query('DELETE FROM item WHERE id = ANY($1::uuid[])', [createdItemIds]);
      }
      if (createdUserIds.length > 0) {
        await pool.query('DELETE FROM audit_log WHERE actor_id = ANY($1::uuid[])', [createdUserIds]);
        await pool.query(
          'DELETE FROM notification WHERE user_id = ANY($1::uuid[])',
          [createdUserIds],
        );
        await pool.query('DELETE FROM request WHERE user_id = ANY($1::uuid[])', [createdUserIds]);
        await pool.query(
          'DELETE FROM item WHERE report_id IN (SELECT id FROM report WHERE user_id = ANY($1::uuid[]))',
          [createdUserIds],
        );
        await pool.query('DELETE FROM report WHERE user_id = ANY($1::uuid[])', [createdUserIds]);
        await pool.query('DELETE FROM refresh_token WHERE user_id = ANY($1::uuid[])', [createdUserIds]);
        await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [createdUserIds]);
      }
      await pool.query(`DELETE FROM "user" WHERE email LIKE 'e2e.%@wmsu.edu.ph'`);
      await pool.query(`DELETE FROM category WHERE name LIKE 'Audit Cat %'`);
      await pool.query(`DELETE FROM building WHERE name LIKE 'Audit Building %'`);
      if (createdCategoryId) {
        await pool.query('DELETE FROM category WHERE id = $1', [createdCategoryId]);
      }
      if (createdBuildingId) {
        await pool.query('DELETE FROM building WHERE building_id = $1', [createdBuildingId]);
      }
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await pool.end();
    }
  });

  let baselineCategoryId = '';

  it('enforces refresh expiry and verification, plus admin password verification', async () => {
    const expiredToken = signRefreshToken({
      id: ownerUserId,
      email: OWNER_EMAIL,
      role: 'school_user',
    });
    await storeRefreshToken(ownerUserId, expiredToken, new Date(Date.now() - 60_000));
    const expiredRes = await api('POST', '/api/auth/refresh', {
      cookies: [`refreshToken=${expiredToken}`],
    });
    assert.equal(expiredRes.status, 401);

    const unverifiedToken = signRefreshToken({
      id: unverifiedUserId,
      email: UNVERIFIED_EMAIL,
      role: 'school_user',
    });
    await storeRefreshToken(unverifiedUserId, unverifiedToken, new Date(Date.now() + 60_000));
    const unverifiedRes = await api('POST', '/api/auth/refresh', {
      cookies: [`refreshToken=${unverifiedToken}`],
    });
    assert.equal(unverifiedRes.status, 401);

    const adminAuth = await loginAs(ADMIN_EMAIL);
    const rotated = await api<{ accessToken: string }>('POST', '/api/auth/refresh', {
      cookies: adminAuth.cookies,
    });
    assert.equal(rotated.status, 200);
    assert.ok(rotated.data.accessToken);
    const schoolAuth = await loginAs(OWNER_EMAIL);

    const beforeTutorialRes = await api<{ user: { hasSeenTutorial: boolean } }>('GET', '/api/auth/me', {
      token: schoolAuth.token,
    });
    assert.equal(beforeTutorialRes.status, 200);
    assert.equal(typeof beforeTutorialRes.data.user.hasSeenTutorial, 'boolean');

    const markSeenRes = await api<{ hasSeenTutorial: boolean }>('PATCH', '/api/auth/tutorial-seen', {
      token: schoolAuth.token,
    });
    assert.equal(markSeenRes.status, 200);
    assert.equal(markSeenRes.data.hasSeenTutorial, true);

    const afterTutorialRes = await api<{ user: { hasSeenTutorial: boolean } }>('GET', '/api/auth/me', {
      token: schoolAuth.token,
    });
    assert.equal(afterTutorialRes.status, 200);
    assert.equal(afterTutorialRes.data.user.hasSeenTutorial, true);

    const goodPw = await api('POST', '/api/auth/verify-password', {
      token: adminAuth.token,
      body: { password: TEST_PASSWORD },
    });
    assert.equal(goodPw.status, 200);
    assert.equal(goodPw.data.verified, true);

    const badPw = await api('POST', '/api/auth/verify-password', {
      token: adminAuth.token,
      body: { password: 'WrongPassword!' },
    });
    assert.equal(badPw.status, 403);

    const forbiddenPw = await api('POST', '/api/auth/verify-password', {
      token: schoolAuth.token,
      body: { password: TEST_PASSWORD },
    });
    assert.equal(forbiddenPw.status, 403);
  });

  it('logs both staff and admin actions in audit_log, revokes tokens on role change, and guards audit-log access', async () => {
    const adminAuth = await loginAs(ADMIN_EMAIL);
    const superAuth = await loginAs(SUPER_EMAIL);
    const schoolAuth = await loginAs(OWNER_EMAIL);

    const beforeTutorialRes = await api<{ user: { hasSeenTutorial: boolean } }>('GET', '/api/auth/me', {
      token: schoolAuth.token,
    });
    assert.equal(beforeTutorialRes.status, 200);
    assert.equal(typeof beforeTutorialRes.data.user.hasSeenTutorial, 'boolean');

    const markSeenRes = await api<{ hasSeenTutorial: boolean }>('PATCH', '/api/auth/tutorial-seen', {
      token: schoolAuth.token,
    });
    assert.equal(markSeenRes.status, 200);
    assert.equal(markSeenRes.data.hasSeenTutorial, true);

    const afterTutorialRes = await api<{ user: { hasSeenTutorial: boolean } }>('GET', '/api/auth/me', {
      token: schoolAuth.token,
    });
    assert.equal(afterTutorialRes.status, 200);
    assert.equal(afterTutorialRes.data.user.hasSeenTutorial, true);

    // Staff creates a category -> persists AND writes a staff audit_log row
    const catRes = await api<{ category: { id: string; name: string } }>('POST', '/api/categories', {
      token: adminAuth.token,
      body: { name: TEST_CATEGORY },
    });
    assert.equal(catRes.status, 201);
    createdCategoryId = catRes.data.category.id;
    assert.equal(catRes.data.category.name, TEST_CATEGORY);

    const staffAuditRows = await pool.query<{ actor_role: string }>(
      'SELECT actor_role FROM audit_log WHERE actor_id = $1',
      [adminUserId],
    );
    assert.ok((staffAuditRows.rowCount ?? 0) >= 1, 'Staff actions must write to audit_log');
    assert.equal(staffAuditRows.rows[0].actor_role, 'staff');

    // Admin creates a building -> persists AND writes audit_log row
    const bldgRes = await api<{ building: { id: string; name: string } }>('POST', '/api/buildings', {
      token: superAuth.token,
      body: { name: TEST_BUILDING },
    });
    assert.equal(bldgRes.status, 201);
    createdBuildingId = bldgRes.data.building.id;

    // Admin creates & changes role of a staff account -> revokes old refresh tokens & logs audit
    const createTarget = await api<{ user: { id: string } }>('POST', '/api/users', {
      token: superAuth.token,
      body: {
        name: 'Role Target',
        email: TARGET_EMAIL,
        password: TEST_PASSWORD,
        role: 'staff',
      },
    });
    assert.equal(createTarget.status, 201);
    const targetId = createTarget.data.user.id;
    createdUserIds.push(targetId);

    const targetRefresh = signRefreshToken({
      id: targetId,
      email: TARGET_EMAIL,
      role: 'staff',
    });
    await storeRefreshToken(targetId, targetRefresh, new Date(Date.now() + 300_000));

    const roleChange = await api('PATCH', `/api/users/${targetId}/role`, {
      token: superAuth.token,
      body: { role: 'school_user' },
    });
    assert.equal(roleChange.status, 200);

    const revokedRefresh = await api('POST', '/api/auth/refresh', {
      cookies: [`refreshToken=${targetRefresh}`],
    });
    assert.equal(revokedRefresh.status, 401, 'Role change must revoke existing refresh tokens');

    // Soft-delete then reactivate category via POST
    const delCat = await api('DELETE', `/api/categories/${createdCategoryId}`, {
      token: adminAuth.token,
    });
    assert.equal(delCat.status, 200);
    const reactivateCat = await api<{ category: { id: string } }>('POST', '/api/categories', {
      token: superAuth.token,
      body: { name: TEST_CATEGORY },
    });
    assert.equal(reactivateCat.data.category.id, createdCategoryId);

    // Audit-log endpoint restricted to admin
    const deniedAdmin = await api('GET', '/api/audit-logs', { token: adminAuth.token });
    assert.equal(deniedAdmin.status, 403);
    const deniedUser = await api('GET', '/api/audit-logs', { token: schoolAuth.token });
    assert.equal(deniedUser.status, 403);

    // User management is admin only: staff can read themselves but nothing else.
    const staffList = await api('GET', '/api/users', { token: adminAuth.token });
    assert.equal(staffList.status, 403, 'Staff must not list users');
    const staffReadOther = await api('GET', `/api/users/${ownerUserId}`, { token: adminAuth.token });
    assert.equal(staffReadOther.status, 403, 'Staff must not read other users');
    const staffReadSelf = await api('GET', `/api/users/${adminUserId}`, { token: adminAuth.token });
    assert.equal(staffReadSelf.status, 200, 'Staff may still read their own account');
    const staffStatus = await api('PATCH', `/api/users/${ownerUserId}/status`, {
      token: adminAuth.token,
      body: { isActive: false },
    });
    assert.equal(staffStatus.status, 403, 'Staff must not change user status');
    const staffDelete = await api('DELETE', `/api/users/${ownerUserId}`, { token: adminAuth.token });
    assert.equal(staffDelete.status, 403, 'Staff must not delete users');
    const superList = await api('GET', '/api/users', { token: superAuth.token });
    assert.equal(superList.status, 200, 'Admin still manages users');

    const allowedSuper = await api<{
      logs: Array<{ actorId: string; actorRole: string; entityType: string }>;
    }>(
      'GET',
      '/api/audit-logs?limit=50',
      { token: superAuth.token },
    );
    assert.equal(allowedSuper.status, 200);
    assert.ok(
      allowedSuper.data.logs.some(
        (log) => log.actorId === superUserId && log.actorRole === 'admin' && log.entityType === 'building',
      ),
    );
    assert.ok(
      allowedSuper.data.logs.some(
        (log) => log.actorId === superUserId && log.actorRole === 'admin' && log.entityType === 'user',
      ),
    );
    assert.ok(
      allowedSuper.data.logs.some(
        (log) => log.actorId === adminUserId && log.actorRole === 'staff' && log.entityType === 'category',
      ),
      'audit_log feed must include staff actions with actorRole=staff',
    );
  });

  it('validates item persistence (building without location, clearing fields, trusted image URLs)', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    // Untrusted external image URL must be rejected
    const badImage = await api('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Audit Wallet',
        description: 'Black leather wallet with ID slots',
        itemDate: today,
        categoryId: createdCategoryId || baselineCategoryId,
        building: TEST_BUILDING,
        image: 'https://untrusted.example.com/wallet.jpg',
      },
    });
    assert.equal(badImage.status, 400);

    // Building preserved even when location omitted
    const created = await api<{ item: { id: string; building: string | null; location: string | null } }>(
      'POST',
      '/api/items',
      {
        token: ownerAuth.token,
        body: {
          reportType: 'found',
          name: 'Audit Headphones',
          description: 'Silver over-ear headphones',
          itemDate: today,
          itemTime: '10:30',
          categoryId: createdCategoryId || baselineCategoryId,
          color: 'Silver',
          building: TEST_BUILDING,
          importantDetails: 'Sticker inside left cup',
        },
      },
    );
    assert.equal(created.status, 201);
    const itemId = created.data.item.id;
    createdItemIds.push(itemId);
    assert.equal(created.data.item.building, TEST_BUILDING);

    // Clear optional fields + update building without supplying location
    const patched = await api<{
      item: { color: string | null; itemTime: string | null; building: string | null };
    }>('PATCH', `/api/items/${itemId}`, {
      token: ownerAuth.token,
      body: {
        color: null,
        itemTime: null,
        importantDetails: '',
        building: 'Library',
      },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.data.item.color, null);
    assert.equal(patched.data.item.itemTime, null);
    assert.equal(patched.data.item.building, 'Library');
  });

  it('enforces end-to-end Claim lifecycle, OSA guard, resolved item locks, and dual notifications', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const claimantAuth = await loginAs(CLAIMANT_EMAIL);
    const adminAuth = await loginAs(ADMIN_EMAIL);
    const superAuth = await loginAs(SUPER_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    const foundItemRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Audit Laptop Charger',
        description: 'USB-C 65W charger found near study table',
        itemDate: today,
        categoryId: baselineCategoryId,
        building: TEST_BUILDING,
        location: 'Room 201',
        importantDetails: 'Small scratch near plug',
      },
    });
    assert.equal(foundItemRes.status, 201);
    const foundItemId = foundItemRes.data.item.id;
    createdItemIds.push(foundItemId);

    const firstClaimRes = await api<{ claim: { id: string; status: string } }>('POST', '/api/claims', {
      token: claimantAuth.token,
      body: {
        itemId: foundItemId,
        claimantTitle: 'My Laptop Charger',
        dateLost: today,
        timeLost: '09:00',
        location: 'Room 201',
        details: 'Left it after class',
        importantDetails: 'Has a small scratch near the prong',
      },
    });
    assert.equal(firstClaimRes.status, 201);
    const firstClaimId = firstClaimRes.data.claim.id;

    // Rejecting a claim requires a non-empty reason
    const rejectNoReason = await api('PATCH', `/api/claims/admin/${firstClaimId}/status`, {
      token: adminAuth.token,
      body: { status: 'rejected', reason: '   ' },
    });
    assert.equal(rejectNoReason.status, 400);

    const rejectWithReason = await api<{
      claim: { status: string; rejectionReason?: string | null };
    }>(
      'PATCH',
      `/api/claims/admin/${firstClaimId}/status`,
      {
        token: adminAuth.token,
        body: { status: 'rejected', reason: 'Proof photo did not match charger brand' },
      },
    );
    assert.equal(rejectWithReason.status, 200);
    assert.equal(rejectWithReason.data.claim.status, 'rejected');
    assert.equal(
      rejectWithReason.data.claim.rejectionReason,
      'Proof photo did not match charger brand',
    );

    const rejectedNotifs = await api<{ notifications: Array<{ requestId: string | null; message: string }> }>(
      'GET',
      '/api/notifications',
      { token: claimantAuth.token },
    );
    assert.ok(
      rejectedNotifs.data.notifications.some(
        (n) =>
          n.requestId === firstClaimId &&
          n.message.includes('Proof photo did not match charger brand'),
      ),
      'Expected claimant rejection notification to include rejection reason',
    );

    const claimRes = await api<{ claim: { id: string; status: string } }>('POST', '/api/claims', {
      token: claimantAuth.token,
      body: {
        itemId: foundItemId,
        claimantTitle: 'My Laptop Charger',
        dateLost: today,
        timeLost: '09:00',
        location: 'Room 201',
        details: 'Left it after class',
        importantDetails: 'Has a small scratch near the prong',
      },
    });
    assert.equal(claimRes.status, 201);
    const claimId = claimRes.data.claim.id;

    // Pending claim locks school-user owner edit/delete on item
    const editPendingLocked = await api('PATCH', `/api/items/${foundItemId}`, {
      token: ownerAuth.token,
      body: { name: 'Edited Charger Name' },
    });
    assert.equal(editPendingLocked.status, 409);

    const deletePendingLocked = await api('DELETE', `/api/items/${foundItemId}`, {
      token: ownerAuth.token,
    });
    assert.equal(deletePendingLocked.status, 409);

    // Approving without instructions must fail validation (400)
    const approveWithoutInstructions = await api('PATCH', `/api/claims/admin/${claimId}/status`, {
      token: adminAuth.token,
      body: { status: 'approved' },
    });
    assert.equal(approveWithoutInstructions.status, 400);

    // Cannot approve before OSA receipt
    const approveEarly = await api('PATCH', `/api/claims/admin/${claimId}/status`, {
      token: adminAuth.token,
      body: { status: 'approved', instructions: 'Bring school ID to OSA.' },
    });
    assert.equal(approveEarly.status, 409);

    // Mark OSA receipt -> approve -> cannot revoke OSA receipt while resolved
    const markOsa = await api('PATCH', `/api/items/${foundItemId}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: true },
    });
    assert.equal(markOsa.status, 200);

    const approveClaim = await api<{
      claim: { status: string; approvalInstructions?: string | null };
    }>(
      'PATCH',
      `/api/claims/admin/${claimId}/status`,
      {
        token: superAuth.token,
        body: {
          status: 'approved',
          instructions: 'Visit OSA Window 2 with your student ID.',
        },
      },
    );
    assert.equal(approveClaim.status, 200);
    assert.equal(approveClaim.data.claim.status, 'approved');
    assert.equal(
      approveClaim.data.claim.approvalInstructions,
      'Visit OSA Window 2 with your student ID.',
    );

    const revokeOsa = await api('PATCH', `/api/items/${foundItemId}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: false },
    });
    assert.equal(revokeOsa.status, 409);

    // Resolved claim locks owner edit/delete on item
    const editLocked = await api('PATCH', `/api/items/${foundItemId}`, {
      token: ownerAuth.token,
      body: { name: 'Edited Charger Name' },
    });
    assert.equal(editLocked.status, 409);

    const deleteLocked = await api('DELETE', `/api/items/${foundItemId}`, {
      token: ownerAuth.token,
    });
    assert.equal(deleteLocked.status, 409);

    // Mark returned -> item.is_returned = true AND both claimant & owner notified
    const returnedRes = await api<{ claim: { status: string } }>(
      'PATCH',
      `/api/claims/admin/${claimId}/status`,
      {
        token: superAuth.token,
        body: { status: 'returned' },
      },
    );
    assert.equal(returnedRes.status, 200);
    assert.equal(returnedRes.data.claim.status, 'returned');

    const itemRes = await api<{ item: { isReturned: boolean } }>(
      'GET',
      `/api/items/${foundItemId}`,
      { token: ownerAuth.token },
    );
    assert.equal(itemRes.status, 200);
    assert.equal(itemRes.data.item.isReturned, true);
    const reqRow = await pool.query<{ status: string }>(
      'SELECT status FROM request WHERE id = $1',
      [claimId],
    );
    assert.equal(reqRow.rows[0].status, 'returned');

    const claimantNotifs = await api<{ notifications: Array<{ itemId: string; event: string }> }>(
      'GET',
      '/api/notifications',
      { token: claimantAuth.token },
    );
    const ownerNotifs = await api<{ notifications: Array<{ itemId: string; event: string }> }>(
      'GET',
      '/api/notifications',
      { token: ownerAuth.token },
    );
    assert.ok(claimantNotifs.data.notifications.some((n) => n.itemId === foundItemId));
    assert.ok(ownerNotifs.data.notifications.some((n) => n.itemId === foundItemId));
  });

  it('enforces claim chronological guard and caps rejected claim retries', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const claimantAuth = await loginAs(CLAIMANT_EMAIL);
    const adminAuth = await loginAs(ADMIN_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    const foundItemRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Audit Guard Earbuds',
        description: 'White wireless earbuds found on library desk',
        itemDate: today,
        itemTime: '10:00',
        categoryId: baselineCategoryId,
        building: TEST_BUILDING,
        location: 'Room 202',
      },
    });
    assert.equal(foundItemRes.status, 201);
    const itemId = foundItemRes.data.item.id;
    createdItemIds.push(itemId);

    // Lost time after found time must be rejected (400)
    const afterFoundRes = await api('POST', '/api/claims', {
      token: claimantAuth.token,
      body: {
        itemId,
        claimantTitle: 'My Earbuds',
        dateLost: today,
        timeLost: '11:30',
        location: 'Room 202',
        details: 'Lost after class',
        importantDetails: 'Initials inside case',
      },
    });
    assert.equal(afterFoundRes.status, 400);

    // Submit and reject twice -> 3rd attempt must be blocked (409)
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const claimRes = await api<{ claim: { id: string } }>('POST', '/api/claims', {
        token: claimantAuth.token,
        body: {
          itemId,
          claimantTitle: `My Earbuds Attempt ${attempt}`,
          dateLost: today,
          timeLost: '09:30',
          location: 'Room 202',
          details: 'Lost before class',
          importantDetails: 'Initials inside case',
        },
      });
      assert.equal(claimRes.status, 201);
      const rejectRes = await api('PATCH', `/api/claims/admin/${claimRes.data.claim.id}/status`, {
        token: adminAuth.token,
        body: { status: 'rejected', reason: `Mismatch on attempt ${attempt}` },
      });
      assert.equal(rejectRes.status, 200);
    }

    const thirdAttemptRes = await api('POST', '/api/claims', {
      token: claimantAuth.token,
      body: {
        itemId,
        claimantTitle: 'My Earbuds Attempt 3',
        dateLost: today,
        timeLost: '09:30',
        location: 'Room 202',
        details: 'Trying again',
        importantDetails: 'Initials inside case',
      },
    });
    assert.equal(thirdAttemptRes.status, 409);
  });

  it('enforces Return lifecycle: reject+resubmit, OSA guard, and publishRejectedReturn', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const finderAuth = await loginAs(CLAIMANT_EMAIL);
    const adminAuth = await loginAs(ADMIN_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    const lostItemRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Audit Umbrella',
        description: 'Red folding umbrella lost outside',
        itemDate: today,
        categoryId: baselineCategoryId,
        building: TEST_BUILDING,
        location: 'Main Gate',
        importantDetails: 'Wooden curved handle',
      },
    });
    assert.equal(lostItemRes.status, 201);
    const lostItemId = lostItemRes.data.item.id;
    createdItemIds.push(lostItemId);

    const retPayload = {
      itemId: lostItemId,
      claimantTitle: 'Found Red Umbrella',
      dateLost: today,
      timeLost: '11:15',
      location: 'Main Gate',
      details: 'Picked it up near the bench',
      importantDetails: 'Wooden curved handle',
    };

    // Chronological guard: dateFound earlier than lost item's dateLost must fail (400)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const earlyReturn = await api('POST', '/api/returns', {
      token: finderAuth.token,
      body: { ...retPayload, dateLost: yesterday, timeLost: '08:00' },
    });
    assert.equal(earlyReturn.status, 400);

    // Finder submits -> Remind finder (200 + 3h cooldown 429) -> Admin rejects -> Admin publishes rejected return -> Finder resubmits!
    const firstReturn = await api<{ returnRequest: { id: string } }>('POST', '/api/returns', {
      token: finderAuth.token,
      body: retPayload,
    });
    assert.equal(firstReturn.status, 201);
    const firstReturnId = firstReturn.data.returnRequest.id;

    const remindFirst = await api<{ lastFinderReminderAt: string }>(
      'POST',
      `/api/returns/admin/${firstReturnId}/remind-finder`,
      { token: adminAuth.token },
    );
    assert.equal(remindFirst.status, 200);
    assert.ok(remindFirst.data.lastFinderReminderAt);

    const remindCooldown = await api(
      'POST',
      `/api/returns/admin/${firstReturnId}/remind-finder`,
      { token: adminAuth.token },
    );
    assert.equal(remindCooldown.status, 429);

    const rejectRes = await api('PATCH', `/api/returns/admin/${firstReturnId}/status`, {
      token: adminAuth.token,
      body: { status: 'rejected' },
    });
    assert.equal(rejectRes.status, 200);

    // Cannot publish rejected return before OSA marks physical item received
    const publishEarly = await api(
      'POST',
      `/api/returns/admin/${firstReturnId}/publish`,
      { token: adminAuth.token },
    );
    assert.equal(publishEarly.status, 409);

    const markRejectedOsa = await api(
      'PATCH',
      `/api/returns/admin/${firstReturnId}/osa-receipt`,
      {
        token: adminAuth.token,
        body: { receivedByOsa: true },
      },
    );
    assert.equal(markRejectedOsa.status, 200);

    const publishRes = await api<{ itemId: string; alreadyPublished: boolean }>(
      'POST',
      `/api/returns/admin/${firstReturnId}/publish`,
      { token: adminAuth.token },
    );
    assert.equal(publishRes.status, 201);
    assert.equal(publishRes.data.alreadyPublished, false);
    createdItemIds.push(publishRes.data.itemId);

    // Published found item must carry receivedByOsa = true and credit the original finder
    const publishedDetail = await api<{
      item: { receivedByOsa?: boolean; user: { id: string } };
    }>('GET', `/api/items/${publishRes.data.itemId}`, { token: adminAuth.token });
    assert.equal(publishedDetail.status, 200);
    assert.equal(publishedDetail.data.item.receivedByOsa, true);
    assert.equal(publishedDetail.data.item.user.id, finderAuth.user.id);

    const finderPubNotifs = await api<{
      notifications: Array<{ itemId: string | null; requestId: string | null; title: string }>;
    }>('GET', '/api/notifications', { token: finderAuth.token });
    assert.equal(finderPubNotifs.status, 200);
    assert.ok(
      finderPubNotifs.data.notifications.some(
        (n) =>
          n.itemId === publishRes.data.itemId &&
          n.requestId === firstReturnId &&
          n.title === 'Found item posted publicly',
      ),
      'Expected finder to be notified when OSA publishes their rejected return',
    );

    const secondPublish = await api<{ itemId: string; alreadyPublished: boolean }>(
      'POST',
      `/api/returns/admin/${firstReturnId}/publish`,
      { token: adminAuth.token },
    );
    assert.equal(secondPublish.status, 200);
    assert.equal(secondPublish.data.alreadyPublished, true);
    assert.equal(secondPublish.data.itemId, publishRes.data.itemId);

    // Partial unique index must allow resubmission after rejection
    const resubmitted = await api<{ returnRequest: { id: string } }>('POST', '/api/returns', {
      token: finderAuth.token,
      body: { ...retPayload, details: 'Second verified attempt' },
    });
    assert.equal(resubmitted.status, 201);
    const secondReturnId = resubmitted.data.returnRequest.id;

    // Verify 2-rejection retry cap on a separate lost item
    const capLostRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Lost Cap Item',
        description: 'Testing return retry cap after two rejections.',
        itemDate: today,
        itemTime: '08:00',
        categoryId: baselineCategoryId,
        importantDetails: 'Blue tag',
      },
    });
    assert.equal(capLostRes.status, 201);
    const capLostId = capLostRes.data.item.id;
    createdItemIds.push(capLostId);

    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptRes = await api<{ returnRequest: { id: string } }>('POST', '/api/returns', {
        token: finderAuth.token,
        body: { ...retPayload, itemId: capLostId, details: `Attempt ${attempt + 1}` },
      });
      assert.equal(attemptRes.status, 201);
      const rejectAttempt = await api(
        'PATCH',
        `/api/returns/admin/${attemptRes.data.returnRequest.id}/status`,
        { token: adminAuth.token, body: { status: 'rejected' } },
      );
      assert.equal(rejectAttempt.status, 200);
    }
    const thirdAttempt = await api('POST', '/api/returns', {
      token: finderAuth.token,
      body: { ...retPayload, itemId: capLostId, details: 'Third blocked attempt' },
    });
    assert.equal(thirdAttempt.status, 409);

    // Mark OSA receipt -> approving without instructions must fail (400)
    const osaTrue = await api('PATCH', `/api/returns/admin/${secondReturnId}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: true },
    });
    assert.equal(osaTrue.status, 200);

    const approveRetMissingMessage = await api(
      'PATCH',
      `/api/returns/admin/${secondReturnId}/status`,
      {
        token: adminAuth.token,
        body: { status: 'approved' },
      },
    );
    assert.equal(approveRetMissingMessage.status, 400);

    const ownerMessage = 'Visit OSA Window 1 with your student ID to claim your lost item.';
    const approveRet = await api<{
      returnRequest: { status: string; approvalInstructions?: string | null };
    }>('PATCH', `/api/returns/admin/${secondReturnId}/status`, {
      token: adminAuth.token,
      body: { status: 'approved', instructions: ownerMessage },
    });
    assert.equal(approveRet.status, 200);
    assert.equal(approveRet.data.returnRequest.approvalInstructions, ownerMessage);

    // Owner receives the approval message in their notification; finder does NOT.
    const ownerNotifs = await api<{
      notifications: Array<{ requestId: string | null; event: string; message: string }>;
    }>('GET', '/api/notifications', { token: ownerAuth.token });
    assert.equal(ownerNotifs.status, 200);
    const ownerApprovalNotif = ownerNotifs.data.notifications.find(
      (n) => n.requestId === secondReturnId && n.event === 'approved',
    );
    assert.ok(ownerApprovalNotif, 'Expected owner approval notification');
    assert.ok(
      ownerApprovalNotif.message.includes(ownerMessage),
      'Expected owner notification to include admin approval message',
    );

    const finderNotifs = await api<{
      notifications: Array<{ requestId: string | null; event: string; message: string }>;
    }>('GET', '/api/notifications', { token: finderAuth.token });
    assert.equal(finderNotifs.status, 200);
    const finderApprovalNotif = finderNotifs.data.notifications.find(
      (n) => n.requestId === secondReturnId && n.event === 'approved',
    );
    assert.ok(finderApprovalNotif, 'Expected finder approval notification');
    assert.equal(
      finderApprovalNotif.message.includes(ownerMessage),
      false,
      'Finder notification must not contain the lost-item owner message',
    );

    // Finder's own returns list must not expose the lost-item owner's approval message
    const finderReturns = await api<{
      returns: Array<{ id: string; approvalInstructions?: string | null }>;
    }>('GET', '/api/returns', { token: finderAuth.token });
    assert.equal(finderReturns.status, 200);
    const finderReturnRow = finderReturns.data.returns.find((r) => r.id === secondReturnId);
    assert.equal(finderReturnRow?.approvalInstructions ?? null, null);

    const osaRevoke = await api('PATCH', `/api/returns/admin/${secondReturnId}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: false },
    });
    assert.equal(osaRevoke.status, 409);

    // A second finder submits a competing pending return request on the same lost item
    const competingFinderAuth = await loginAs(ADMIN_EMAIL);
    const competingReturnRes = await api<{ returnRequest: { id: string } }>('POST', '/api/returns', {
      token: competingFinderAuth.token,
      body: {
        ...retPayload,
        claimantTitle: 'Another Red Umbrella',
        details: 'Found a similar red umbrella near the library entrance.',
      },
    });
    assert.equal(competingReturnRes.status, 201);
    const competingReturnId = competingReturnRes.data.returnRequest.id;

    const returned = await api<{ returnRequest: { status: string } }>(
      'PATCH',
      `/api/returns/admin/${secondReturnId}/status`,
      {
        token: adminAuth.token,
        body: { status: 'returned' },
      },
    );
    assert.equal(returned.status, 200);
    assert.equal(returned.data.returnRequest.status, 'returned');

    // Competing pending return must be auto-rejected and auto-published as a public found item
    const competingRow = await pool.query<{
      status: string;
      published_item_id: string | null;
    }>('SELECT status, published_item_id FROM request WHERE id = $1', [competingReturnId]);
    assert.equal(competingRow.rows[0]?.status, 'rejected');
    const autoPublishedId = competingRow.rows[0]?.published_item_id;
    assert.ok(autoPublishedId, 'Expected competing pending return to be auto-published');
    createdItemIds.push(autoPublishedId);

    const autoPublishedDetail = await api<{
      item: {
        reportType: string;
        name: string;
        receivedByOsa?: boolean;
        user: { id: string };
      };
    }>('GET', `/api/items/${autoPublishedId}`, { token: adminAuth.token });
    assert.equal(autoPublishedDetail.status, 200);
    assert.equal(autoPublishedDetail.data.item.reportType, 'found');
    assert.equal(autoPublishedDetail.data.item.name, 'Another Red Umbrella');
    assert.equal(autoPublishedDetail.data.item.receivedByOsa, false);
    assert.equal(autoPublishedDetail.data.item.user.id, competingFinderAuth.user.id);

    const lostRes = await api<{ item: { isReturned: boolean; resolvedBy?: unknown } }>(
      'GET',
      `/api/items/${lostItemId}`,
      { token: ownerAuth.token },
    );
    assert.equal(lostRes.status, 200);
    assert.equal(lostRes.data.item.isReturned, true);
    assert.equal(lostRes.data.item.resolvedBy, undefined);

    const adminLostRes = await api<{
      item: { isReturned: boolean; resolvedBy?: { id: string; name: string } | null };
    }>('GET', `/api/items/${lostItemId}`, { token: adminAuth.token });
    assert.equal(adminLostRes.status, 200);
    assert.equal(adminLostRes.data.item.resolvedBy?.id, finderAuth.user.id);
    const retRow = await pool.query<{ status: string }>(
      'SELECT status FROM request WHERE id = $1',
      [secondReturnId],
    );
    assert.equal(retRow.rows[0].status, 'returned');

    // Rejecting an approved return must auto-publish it as a public found item and notify owner + finder
    const lostForRejectRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Green Water Bottle',
        description: 'Insulated green bottle left in the auditorium.',
        itemDate: today,
        categoryId: baselineCategoryId,
        location: 'Auditorium Row B',
        importantDetails: 'Has a small scratch near the lid.',
      },
    });
    assert.equal(lostForRejectRes.status, 201);
    const lostForRejectId = lostForRejectRes.data.item.id;
    createdItemIds.push(lostForRejectId);

    const approvedRejectReturnRes = await api<{ returnRequest: { id: string } }>(
      'POST',
      '/api/returns',
      {
        token: finderAuth.token,
        body: {
          ...retPayload,
          itemId: lostForRejectId,
          claimantTitle: 'Found Green Bottle',
          details: 'Found a green bottle near the auditorium entrance.',
        },
      },
    );
    assert.equal(approvedRejectReturnRes.status, 201);
    const approvedRejectReturnId = approvedRejectReturnRes.data.returnRequest.id;

    // Even admins cannot delete a report while it has a pending return/claim request
    const adminDeleteWithPending = await api('DELETE', `/api/items/${lostForRejectId}`, {
      token: adminAuth.token,
      body: { reason: 'Duplicate listing test' },
    });
    assert.equal(adminDeleteWithPending.status, 409);

    const markOsaForReject = await api(
      'PATCH',
      `/api/returns/admin/${approvedRejectReturnId}/osa-receipt`,
      { token: adminAuth.token, body: { receivedByOsa: true } },
    );
    assert.equal(markOsaForReject.status, 200);

    // Once OSA receives the physical item, the finder cannot edit or delete the pending return request
    const editAfterOsa = await api('PATCH', `/api/returns/${approvedRejectReturnId}`, {
      token: finderAuth.token,
      body: {
        claimantTitle: 'Edited Bottle Title',
        dateLost: today,
        timeLost: '11:30',
        location: 'Auditorium',
        details: 'Attempted edit after OSA receipt.',
        importantDetails: 'Green cap.',
        evidence: ['https://lh3.googleusercontent.com/d/sample-evidence-id'],
      },
    });
    assert.equal(editAfterOsa.status, 409);

    const deleteAfterOsa = await api('DELETE', `/api/returns/${approvedRejectReturnId}`, {
      token: finderAuth.token,
    });
    assert.equal(deleteAfterOsa.status, 409);

    const approveForReject = await api(
      'PATCH',
      `/api/returns/admin/${approvedRejectReturnId}/status`,
      {
        token: adminAuth.token,
        body: { status: 'approved', instructions: 'Come to OSA Desk 2 with ID.' },
      },
    );
    assert.equal(approveForReject.status, 200);

    // Reverting an approved return back to pending is no longer allowed
    const cancelToPending = await api(
      'PATCH',
      `/api/returns/admin/${approvedRejectReturnId}/status`,
      { token: adminAuth.token, body: { status: 'pending' } },
    );
    assert.equal(cancelToPending.status, 400);

    // Rejecting an approved return (without reason) succeeds and auto-publishes it
    const rejectApproved = await api<{
      returnRequest: {
        status: string;
        publishedItemId: string | null;
        approvalInstructions: string | null;
      };
    }>('PATCH', `/api/returns/admin/${approvedRejectReturnId}/status`, {
      token: adminAuth.token,
      body: { status: 'rejected' },
    });
    assert.equal(rejectApproved.status, 200);
    assert.equal(rejectApproved.data.returnRequest.status, 'rejected');
    assert.equal(rejectApproved.data.returnRequest.approvalInstructions, null);
    const rejectedAutoPubId = rejectApproved.data.returnRequest.publishedItemId;
    assert.ok(rejectedAutoPubId, 'Expected rejecting an approved return to auto-publish a found item');
    createdItemIds.push(rejectedAutoPubId);

    const rejectedAutoPubDetail = await api<{
      item: {
        reportType: string;
        name: string;
        receivedByOsa?: boolean;
        user: { id: string };
      };
    }>('GET', `/api/items/${rejectedAutoPubId}`, { token: adminAuth.token });
    assert.equal(rejectedAutoPubDetail.status, 200);
    assert.equal(rejectedAutoPubDetail.data.item.reportType, 'found');
    assert.equal(rejectedAutoPubDetail.data.item.name, 'Found Green Bottle');
    assert.equal(rejectedAutoPubDetail.data.item.receivedByOsa, true);
    assert.equal(rejectedAutoPubDetail.data.item.user.id, finderAuth.user.id);

    const ownerNotifsAfterReject = await api<{
      notifications: Array<{ requestId: string | null; event: string; title: string }>;
    }>('GET', '/api/notifications', { token: ownerAuth.token });
    assert.equal(ownerNotifsAfterReject.status, 200);
    assert.ok(
      ownerNotifsAfterReject.data.notifications.some(
        (n) =>
          n.requestId === approvedRejectReturnId &&
          n.event === 'rejected' &&
          n.title === 'Approved return cancelled',
      ),
      'Expected lost-item owner to be notified when approved return is rejected',
    );
  });

  it('6. Other category requires, persists, searches, and clears customCategory', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const otherCatRow = await pool.query<{ id: string }>(
      `SELECT id FROM category WHERE LOWER(name) IN ('other', 'others') AND is_active = TRUE LIMIT 1`,
    );
    const otherCategoryId = otherCatRow.rows[0]?.id;
    assert.ok(otherCategoryId, 'Expected seeded active other category');
    assert.notEqual(otherCategoryId, baselineCategoryId);

    const today = new Date().toISOString().slice(0, 10);
    const missingCustom = await api('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Mystery Helmet',
        description: 'Black full-face motorcycle helmet lost in parking area.',
        itemDate: today,
        categoryId: otherCategoryId,
        importantDetails: 'Small sticker on visor',
      },
    });
    assert.equal(missingCustom.status, 400);

    const tooShortCustom = await api('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Mystery Helmet',
        description: 'Black full-face motorcycle helmet lost in parking area.',
        itemDate: today,
        categoryId: otherCategoryId,
        customCategory: ' a ',
        importantDetails: 'Small sticker on visor',
      },
    });
    assert.equal(tooShortCustom.status, 400);

    const createdOther = await api<{
      item: { id: string; category: string; customCategory: string | null };
    }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Mystery Item',
        description: 'Lost near the engineering annex gate earlier today.',
        itemDate: today,
        categoryId: otherCategoryId,
        customCategory: '  Helmet  ',
        importantDetails: 'Matte visor',
      },
    });
    assert.equal(createdOther.status, 201);
    assert.equal(createdOther.data.item.category, 'other');
    assert.equal(createdOther.data.item.customCategory, 'Helmet');
    const otherItemId = createdOther.data.item.id;
    createdItemIds.push(otherItemId);

    const searchByCustom = await api<{ items: Array<{ id: string; customCategory?: string | null }> }>(
      'GET',
      `/api/items?categoryId=${otherCategoryId}&search=Helmet`,
      { token: ownerAuth.token },
    );
    assert.equal(searchByCustom.status, 200);
    assert.equal(
      searchByCustom.data.items.some(
        (entry) => entry.id === otherItemId && entry.customCategory === 'Helmet',
      ),
      true,
    );

    const switchedToStandard = await api<{
      item: { categoryId: string; customCategory: string | null };
    }>('PATCH', `/api/items/${otherItemId}`, {
      token: ownerAuth.token,
      body: { categoryId: baselineCategoryId },
    });
    assert.equal(switchedToStandard.status, 200);
    assert.equal(switchedToStandard.data.item.categoryId, baselineCategoryId);
    assert.equal(switchedToStandard.data.item.customCategory, null);

    const switchBackWithoutCustom = await api('PATCH', `/api/items/${otherItemId}`, {
      token: ownerAuth.token,
      body: { categoryId: otherCategoryId },
    });
    assert.equal(switchBackWithoutCustom.status, 400);

    const switchBackWithCustom = await api<{
      item: { categoryId: string; customCategory: string | null };
    }>('PATCH', `/api/items/${otherItemId}`, {
      token: ownerAuth.token,
      body: { categoryId: otherCategoryId, customCategory: 'Bike Lock' },
    });
    assert.equal(switchBackWithCustom.status, 200);
    assert.equal(switchBackWithCustom.data.item.categoryId, otherCategoryId);
    assert.equal(switchBackWithCustom.data.item.customCategory, 'Bike Lock');
  });

  it('7. Supports Walk-in Claims for both registered School Users and unregistered guests, with OSA guard, auto-reject, releasedBy, and audit logging', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const claimantAuth = await loginAs(CLAIMANT_EMAIL);
    const staffAuth = await loginAs(ADMIN_EMAIL);
    const adminAuth = await loginAs(SUPER_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    // School user cannot call the staff school-user search endpoint
    const deniedSearch = await api('GET', '/api/claims/admin/school-users?search=Audit', {
      token: ownerAuth.token,
    });
    assert.equal(deniedSearch.status, 403);

    // Staff CAN search active school users for walk-in claims
    const staffSearch = await api<{ users: Array<{ id: string; email: string }> }>(
      'GET',
      `/api/claims/admin/school-users?search=${encodeURIComponent(CLAIMANT_EMAIL)}`,
      { token: staffAuth.token },
    );
    assert.equal(staffSearch.status, 200);
    assert.ok(staffSearch.data.users.some((u) => u.id === claimantUserId));

    // Create Found Item #1 (for registered account walk-in)
    const foundRes1 = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'WalkIn Umbrella',
        description: 'Black folding umbrella left at gate',
        itemDate: today,
        itemTime: '08:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(foundRes1.status, 201);
    const foundItem1 = foundRes1.data.item.id;
    createdItemIds.push(foundItem1);

    // Blocked before OSA receipt
    const beforeOsa = await api('POST', '/api/claims/admin/walk-in', {
      token: staffAuth.token,
      body: { itemId: foundItem1, mode: 'account', userId: claimantUserId },
    });
    assert.equal(beforeOsa.status, 409);

    // Mark received by OSA
    const markOsa1 = await api('PATCH', `/api/items/${foundItem1}/osa-receipt`, {
      token: staffAuth.token,
      body: { receivedByOsa: true },
    });
    assert.equal(markOsa1.status, 200);

    // Submit a competing pending online claim from claimantAuth before walk-in
    const onlineClaim = await api<{ claim: { id: string } }>('POST', '/api/claims', {
      token: claimantAuth.token,
      body: {
        itemId: foundItem1,
        claimantTitle: 'My umbrella',
        dateLost: today,
        timeLost: '07:30',
        location: 'Library',
        details: 'Lost this morning',
        importantDetails: 'Has red handle',
      },
    });
    assert.equal(onlineClaim.status, 201);

    // Staff completes walk-in claim for registered School User (claimantUserId)
    const walkInAccount = await api<{
      claim: {
        id: string;
        status: string;
        isWalkIn?: boolean;
        releasedBy?: { id: string; role?: string } | null;
        releasedAt?: string | null;
      };
    }>('POST', '/api/claims/admin/walk-in', {
      token: staffAuth.token,
      body: {
        itemId: foundItem1,
        mode: 'account',
        userId: claimantUserId,
        notes: 'Verified student ID at OSA Window 1',
      },
    });
    assert.equal(walkInAccount.status, 201);
    assert.equal(walkInAccount.data.claim.status, 'claimed');
    assert.equal(walkInAccount.data.claim.isWalkIn, true);
    assert.equal(walkInAccount.data.claim.releasedBy?.id, adminUserId);
    assert.equal(walkInAccount.data.claim.releasedBy?.role, 'staff');
    assert.ok(walkInAccount.data.claim.releasedAt);

    // Competing pending online claim was auto-rejected
    const { rows: rejectedOnline } = await pool.query<{ status: string }>(
      'SELECT status FROM request WHERE id = $1',
      [onlineClaim.data.claim.id],
    );
    assert.equal(rejectedOnline[0]?.status, 'rejected');

    // Create Found Item #2 (for unregistered guest walk-in)
    const foundRes2 = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'WalkIn Tumbler',
        description: 'Blue insulated tumbler',
        itemDate: today,
        itemTime: '09:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(foundRes2.status, 201);
    const foundItem2 = foundRes2.data.item.id;
    createdItemIds.push(foundItem2);

    await api('PATCH', `/api/items/${foundItem2}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: true },
    });

    // Admin completes walk-in claim for unregistered guest
    const walkInGuest = await api<{
      claim: {
        id: string;
        claimant: string;
        schoolId?: string;
        isWalkIn?: boolean;
        releasedBy?: { id: string; role?: string } | null;
      };
    }>('POST', '/api/claims/admin/walk-in', {
      token: adminAuth.token,
      body: {
        itemId: foundItem2,
        mode: 'guest',
        fullName: 'Juan Dela Cruz',
        schoolId: '2024-99001',
        contact: '09171234567',
        notes: 'Verified physical school ID',
      },
    });
    assert.equal(walkInGuest.status, 201);
    assert.equal(walkInGuest.data.claim.claimant, 'Juan Dela Cruz');
    assert.equal(walkInGuest.data.claim.schoolId, '2024-99001');
    assert.equal(walkInGuest.data.claim.isWalkIn, true);
    assert.equal(walkInGuest.data.claim.releasedBy?.id, superUserId);
    assert.equal(walkInGuest.data.claim.releasedBy?.role, 'admin');

    // Item detail for Staff/Admin exposes resolvedBy (with isWalkIn) and releasedBy
    const adminItemView = await api<{
      item: {
        isClaimed: boolean;
        resolvedBy?: { name: string; schoolId?: string; isWalkIn?: boolean } | null;
        releasedBy?: { id: string; role?: string } | null;
      };
    }>('GET', `/api/items/${foundItem2}`, { token: staffAuth.token });
    assert.equal(adminItemView.status, 200);
    assert.equal(adminItemView.data.item.isClaimed, true);
    assert.equal(adminItemView.data.item.resolvedBy?.name, 'Juan Dela Cruz');
    assert.equal(adminItemView.data.item.resolvedBy?.schoolId, '2024-99001');
    assert.equal(adminItemView.data.item.resolvedBy?.isWalkIn, true);
    assert.equal(adminItemView.data.item.releasedBy?.id, superUserId);

    // School user view does NOT expose resolvedBy or releasedBy
    const schoolItemView = await api<{
      item: { resolvedBy?: unknown; releasedBy?: unknown };
    }>('GET', `/api/items/${foundItem2}`, { token: ownerAuth.token });
    assert.equal(schoolItemView.status, 200);
    assert.equal(schoolItemView.data.item.resolvedBy, undefined);
    assert.equal(schoolItemView.data.item.releasedBy, undefined);
  });

  it('8. Auto-deletes un-surrendered Found item posts older than 14 days while keeping received, recent, and Lost posts', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const claimantAuth = await loginAs(CLAIMANT_EMAIL);
    const staffAuth = await loginAs(ADMIN_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    // 1. Expired un-surrendered Found item (15 days old, received_by_osa = false) -> MUST be deleted
    const expiredFoundRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Expired Unsurrendered Keys',
        description: 'Keychain never turned over to OSA',
        itemDate: today,
        itemTime: '08:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(expiredFoundRes.status, 201);
    const expiredFoundId = expiredFoundRes.data.item.id;
    createdItemIds.push(expiredFoundId);

    // Add a pending claim so we verify claimant also gets notified
    const pendingClaim = await api('POST', '/api/claims', {
      token: claimantAuth.token,
      body: {
        itemId: expiredFoundId,
        claimantTitle: 'My keys',
        dateLost: today,
        timeLost: '07:00',
        location: 'Library',
        details: 'Lost keychain',
        importantDetails: 'Silver keyring',
      },
    });
    assert.equal(pendingClaim.status, 201);

    // 2. Old Found item WITH received_by_osa = true (15 days old) -> MUST NOT be deleted
    const receivedFoundRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Old Received Wallet',
        description: 'Already turned over to OSA',
        itemDate: today,
        itemTime: '08:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(receivedFoundRes.status, 201);
    const receivedFoundId = receivedFoundRes.data.item.id;
    createdItemIds.push(receivedFoundId);
    await api('PATCH', `/api/items/${receivedFoundId}/osa-receipt`, {
      token: staffAuth.token,
      body: { receivedByOsa: true },
    });

    // 3. Old Lost item (15 days old) -> MUST NOT be deleted
    const oldLostRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Old Lost Notebook',
        description: 'Lost 2 weeks ago',
        itemDate: today,
        itemTime: '08:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(oldLostRes.status, 201);
    const oldLostId = oldLostRes.data.item.id;
    createdItemIds.push(oldLostId);

    // 4. Recent un-surrendered Found item (5 days old) -> MUST NOT be deleted
    const recentFoundRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Recent Found Pen',
        description: 'Found 5 days ago',
        itemDate: today,
        itemTime: '08:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(recentFoundRes.status, 201);
    const recentFoundId = recentFoundRes.data.item.id;
    createdItemIds.push(recentFoundId);

    // Backdate items in PostgreSQL
    await pool.query(
      `UPDATE item SET created_at = NOW() - INTERVAL '15 days' WHERE id = ANY($1::uuid[])`,
      [[expiredFoundId, receivedFoundId, oldLostId]],
    );
    await pool.query(
      `UPDATE item SET created_at = NOW() - INTERVAL '5 days' WHERE id = $1`,
      [recentFoundId],
    );

    const cleanup = await deleteExpiredUnsurrenderedFoundItems(14);
    assert.ok(cleanup.deletedItemIds.includes(expiredFoundId));
    assert.equal(cleanup.deletedItemIds.includes(receivedFoundId), false);
    assert.equal(cleanup.deletedItemIds.includes(oldLostId), false);
    assert.equal(cleanup.deletedItemIds.includes(recentFoundId), false);

    // Verify expired Found item is gone and the other 3 remain
    const goneRes = await api('GET', `/api/items/${expiredFoundId}`, { token: staffAuth.token });
    assert.equal(goneRes.status, 404);
    const stillReceived = await api('GET', `/api/items/${receivedFoundId}`, { token: staffAuth.token });
    assert.equal(stillReceived.status, 200);
    const stillLost = await api('GET', `/api/items/${oldLostId}`, { token: staffAuth.token });
    assert.equal(stillLost.status, 200);
    const stillRecent = await api('GET', `/api/items/${recentFoundId}`, { token: staffAuth.token });
    assert.equal(stillRecent.status, 200);

    // Verify both finder and pending claimant received notifications
    const ownerNotifs = await api<{ notifications: Array<{ title: string; message: string }> }>(
      'GET',
      '/api/notifications',
      { token: ownerAuth.token },
    );
    assert.ok(
      ownerNotifs.data.notifications.some(
        (n) => n.title === 'Found post expired' && n.message.includes('Expired Unsurrendered Keys'),
      ),
    );
    const claimantNotifs = await api<{ notifications: Array<{ title: string; message: string }> }>(
      'GET',
      '/api/notifications',
      { token: claimantAuth.token },
    );
    assert.ok(
      claimantNotifs.data.notifications.some(
        (n) => n.title === 'Claim cancelled' && n.message.includes('Expired Unsurrendered Keys'),
      ),
    );
  });

  it('9. sends a one-time pre-deletion warning for un-surrendered Found items between day 11 and day 14', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const staffAuth = await loginAs(ADMIN_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    // 1) Un-surrendered Found item aged 12 days -> MUST receive warning once
    const expiringRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Expiring Warning Watch',
        description: 'Not surrendered yet, 12 days old',
        itemDate: today,
        itemTime: '10:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(expiringRes.status, 201);
    const expiringId = expiringRes.data.item.id;
    createdItemIds.push(expiringId);

    // 2) Surrendered Found item aged 12 days -> MUST NOT be warned
    const receivedRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Surrendered Safe Watch',
        description: 'Already turned over to OSA',
        itemDate: today,
        itemTime: '10:15',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(receivedRes.status, 201);
    const receivedId = receivedRes.data.item.id;
    createdItemIds.push(receivedId);
    const markReceived = await api('PATCH', `/api/items/${receivedId}/osa-receipt`, {
      token: staffAuth.token,
      body: { receivedByOsa: true },
    });
    assert.equal(markReceived.status, 200);

    // 3) Lost item aged 12 days -> MUST NOT be warned
    const lostRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Lost Twelve Day Cap',
        description: 'Lost item should never receive surrender warning',
        itemDate: today,
        itemTime: '10:30',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(lostRes.status, 201);
    const lostId = lostRes.data.item.id;
    createdItemIds.push(lostId);

    // 4) Recent Found item aged 5 days -> MUST NOT be warned yet
    const freshRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Fresh Five Day Charger',
        description: 'Still well within window',
        itemDate: today,
        itemTime: '10:45',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(freshRes.status, 201);
    const freshId = freshRes.data.item.id;
    createdItemIds.push(freshId);

    await pool.query(
      `UPDATE item SET created_at = NOW() - INTERVAL '12 days' WHERE id = ANY($1::uuid[])`,
      [[expiringId, receivedId, lostId]],
    );
    await pool.query(
      `UPDATE item SET created_at = NOW() - INTERVAL '5 days' WHERE id = $1`,
      [freshId],
    );

    const firstRun = await warnExpiringUnsurrenderedFoundItems(11, 14);
    assert.ok(firstRun.warnedItemIds.includes(expiringId));
    assert.equal(firstRun.warnedItemIds.includes(receivedId), false);
    assert.equal(firstRun.warnedItemIds.includes(lostId), false);
    assert.equal(firstRun.warnedItemIds.includes(freshId), false);

    // Second run must be idempotent — no duplicate warning for the same item
    const secondRun = await warnExpiringUnsurrenderedFoundItems(11, 14);
    assert.equal(secondRun.warnedItemIds.includes(expiringId), false);

    // Verify finder received exactly one warning notification pointing to the item
    const ownerNotifs = await api<{
      notifications: Array<{ itemId: string | null; title: string; message: string }>;
    }>('GET', '/api/notifications', { token: ownerAuth.token });
    const matches = ownerNotifs.data.notifications.filter(
      (n) =>
        n.itemId === expiringId &&
        n.title === 'Found post expiring soon' &&
        n.message.includes('Expiring Warning Watch'),
    );
    assert.equal(matches.length, 1);
  });

  it('10. supports Walk-In Return Requests for registered users and guests with guards, approval, handover, and audit logging', async () => {
    const ownerAuth = await loginAs(OWNER_EMAIL);
    const finderAuth = await loginAs(CLAIMANT_EMAIL);
    const staffAuth = await loginAs(ADMIN_EMAIL);
    const superAuth = await loginAs(SUPER_EMAIL);
    const today = new Date().toISOString().slice(0, 10);

    // A) Found item -> walk-in return MUST be rejected (409)
    const foundRes = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'found',
        name: 'Found Item Not Returnable',
        description: 'Should reject walk-in return',
        itemDate: today,
        itemTime: '09:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(foundRes.status, 201);
    const foundItemId = foundRes.data.item.id;
    createdItemIds.push(foundItemId);

    const baseReturnFields = {
      claimantTitle: 'Black Casio Scientific Calculator',
      color: 'Black',
      building: 'Library',
      dateLost: today,
      timeLost: '11:00',
      location: 'Library 2nd floor',
      details: 'Found near study cubicles',
      importantDetails: 'Initials J.D. scratched on back cover',
      approvalInstructions: 'Claim at OSA Window 1.',
    };

    const wrongTypeRes = await api('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        itemId: foundItemId,
        mode: 'guest',
        fullName: 'Walk In Finder',
        schoolId: '2024-10001',
      },
    });
    assert.equal(wrongTypeRes.status, 409);

    // B) Lost item #1 -> registered school user walk-in return
    const lost1Res = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Lost Scientific Calculator',
        description: 'Black Casio calculator lost in Library',
        itemDate: today,
        itemTime: '09:30',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(lost1Res.status, 201);
    const lost1Id = lost1Res.data.item.id;
    createdItemIds.push(lost1Id);

    // Self-return (owner == finder) MUST be rejected (400)
    const selfReturnRes = await api('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        itemId: lost1Id,
        mode: 'account',
        userId: ownerAuth.user.id,
      },
    });
    assert.equal(selfReturnRes.status, 400);

    // Found time earlier than lost time MUST be rejected (400)
    const earlierTimeRes = await api('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        itemId: lost1Id,
        mode: 'account',
        userId: finderAuth.user.id,
        timeLost: '08:00',
      },
    });
    assert.equal(earlierTimeRes.status, 400);

    // Missing pickup instructions MUST be rejected (400)
    const missingInstructionsRes = await api('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        approvalInstructions: '',
        itemId: lost1Id,
        mode: 'account',
        userId: finderAuth.user.id,
      },
    });
    assert.equal(missingInstructionsRes.status, 400);

    // Missing guest School ID MUST be rejected (400)
    const missingGuestSchoolIdRes = await api('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        itemId: lost1Id,
        mode: 'guest',
        fullName: 'No ID Guest',
      },
    });
    assert.equal(missingGuestSchoolIdRes.status, 400);

    // Registered school user walk-in return -> 201 approved + receivedByOsa + isWalkIn
    const accountReturnRes = await api<{
      returnRequest: {
        id: string;
        status: string;
        isWalkIn?: boolean;
        receivedByOsa?: boolean;
        claimantTitle?: string | null;
        color?: string | null;
        building?: string | null;
        importantDetails?: string | null;
        approvalInstructions?: string | null;
      };
    }>('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        itemId: lost1Id,
        mode: 'account',
        userId: finderAuth.user.id,
        approvalInstructions: 'Bring School ID to OSA desk.',
      },
    });
    assert.equal(accountReturnRes.status, 201);
    assert.equal(accountReturnRes.data.returnRequest.status, 'approved');
    assert.equal(accountReturnRes.data.returnRequest.isWalkIn, true);
    assert.equal(accountReturnRes.data.returnRequest.receivedByOsa, true);
    assert.equal(
      accountReturnRes.data.returnRequest.claimantTitle,
      'Black Casio Scientific Calculator',
    );
    assert.equal(accountReturnRes.data.returnRequest.color, 'Black');
    assert.equal(accountReturnRes.data.returnRequest.building, 'Library');
    assert.equal(
      accountReturnRes.data.returnRequest.importantDetails,
      'Initials J.D. scratched on back cover',
    );
    assert.equal(
      accountReturnRes.data.returnRequest.approvalInstructions,
      'Bring School ID to OSA desk.',
    );

    // Second walk-in return while one is already approved -> 409
    const duplicateReturnRes = await api('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        itemId: lost1Id,
        mode: 'guest',
        fullName: 'Second Finder',
        schoolId: '2024-10002',
      },
    });
    assert.equal(duplicateReturnRes.status, 409);

    // Verify Lost item owner received approval notification
    const ownerNotifs = await api<{
      notifications: Array<{ itemId: string | null; event: string; message: string }>;
    }>('GET', '/api/notifications', { token: ownerAuth.token });
    assert.ok(
      ownerNotifs.data.notifications.some(
        (n) =>
          n.itemId === lost1Id &&
          n.event === 'approved' &&
          n.message.includes('Lost Scientific Calculator'),
      ),
    );

    // C) Lost item #2 -> guest walk-in return + QR handover completion
    const lost2Res = await api<{ item: { id: string } }>('POST', '/api/items', {
      token: ownerAuth.token,
      body: {
        reportType: 'lost',
        name: 'Lost Blue Tumbler',
        description: 'Insulated blue water bottle',
        itemDate: today,
        itemTime: '10:00',
        categoryId: baselineCategoryId,
        building: 'Library',
      },
    });
    assert.equal(lost2Res.status, 201);
    const lost2Id = lost2Res.data.item.id;
    createdItemIds.push(lost2Id);

    const guestReturnRes = await api<{
      returnRequest: {
        id: string;
        claimant: string;
        schoolId?: string;
        status: string;
        isWalkIn?: boolean;
        receivedByOsa?: boolean;
      };
    }>('POST', '/api/returns/admin/walk-in', {
      token: staffAuth.token,
      body: {
        ...baseReturnFields,
        claimantTitle: 'Blue Insulated Tumbler',
        color: 'Blue',
        location: 'Canteen table 4',
        importantDetails: 'Small dent near the cap',
        itemId: lost2Id,
        mode: 'guest',
        fullName: 'Maria Santos',
        schoolId: '2024-88991',
        email: 'maria.santos@wmsu.edu.ph',
        approvalInstructions: 'Claim at OSA desk between 8 AM and 5 PM.',
      },
    });
    assert.equal(guestReturnRes.status, 201);
    const guestReturnId = guestReturnRes.data.returnRequest.id;
    assert.equal(guestReturnRes.data.returnRequest.claimant, 'Maria Santos');
    assert.equal(guestReturnRes.data.returnRequest.schoolId, '2024-88991');
    assert.equal(guestReturnRes.data.returnRequest.status, 'approved');
    assert.equal(guestReturnRes.data.returnRequest.isWalkIn, true);
    assert.equal(guestReturnRes.data.returnRequest.receivedByOsa, true);

    // Complete handover via status -> returned (simulating owner QR scan at OSA)
    const handoverRes = await api<{
      returnRequest: {
        status: string;
        releasedBy?: { id: string } | null;
      };
    }>('PATCH', `/api/returns/admin/${guestReturnId}/status`, {
      token: staffAuth.token,
      body: { status: 'returned' },
    });
    assert.equal(handoverRes.status, 200);
    assert.equal(handoverRes.data.returnRequest.status, 'returned');
    assert.equal(handoverRes.data.returnRequest.releasedBy?.id, staffAuth.user.id);

    // Verify audit log recorded the walk-in return
    const auditRes = await api<{
      logs: Array<{ entityType: string; entityId: string; summary: string }>;
    }>('GET', '/api/audit-logs?limit=50', { token: superAuth.token });
    assert.equal(auditRes.status, 200);
    assert.ok(
      auditRes.data.logs.some(
        (log) =>
          log.entityType === 'return' &&
          log.entityId === guestReturnId &&
          log.summary.includes('walk-in return'),
      ),
    );
  });

  it('11. allows Admin to suspend and lift suspension on School User and Staff accounts with auth blocking, auto-expiry, and audit logging', async () => {
    const adminAuth = await loginAs(SUPER_EMAIL);
    const staffAuth = await loginAs(ADMIN_EMAIL);
    const schoolAuth = await loginAs(OWNER_EMAIL);

    // 1) Staff cannot suspend anyone (403)
    const staffAttempt = await api('PATCH', `/api/users/${schoolAuth.user.id}/suspend`, {
      token: staffAuth.token,
      body: { suspended: true, durationDays: 3, reason: 'Unauthorized attempt' },
    });
    assert.equal(staffAttempt.status, 403);

    // 2) Admin cannot suspend self (403)
    const selfAttempt = await api('PATCH', `/api/users/${adminAuth.user.id}/suspend`, {
      token: adminAuth.token,
      body: { suspended: true, durationDays: 3, reason: 'Self suspension test' },
    });
    assert.equal(selfAttempt.status, 403);

    // 3) Admin suspends School User for 7 days
    const suspendSchoolRes = await api<{
      user: { suspendedUntil: string | null; suspensionReason: string | null };
    }>('PATCH', `/api/users/${schoolAuth.user.id}/suspend`, {
      token: adminAuth.token,
      body: { suspended: true, durationDays: 7, reason: 'Repeated fake reports' },
    });
    assert.equal(suspendSchoolRes.status, 200);
    assert.ok(suspendSchoolRes.data.user.suspendedUntil);
    assert.equal(suspendSchoolRes.data.user.suspensionReason, 'Repeated fake reports');

    // Existing access token is blocked immediately (403)
    const blockedMeRes = await api<{ message: string }>('GET', '/api/auth/me', {
      token: schoolAuth.token,
    });
    assert.equal(blockedMeRes.status, 403);
    assert.ok(blockedMeRes.data.message.includes('Repeated fake reports'));

    // Login is blocked with 403 and reason
    const blockedLoginRes = await api<{ message: string }>('POST', '/api/auth/login', {
      body: { email: OWNER_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(blockedLoginRes.status, 403);
    assert.ok(blockedLoginRes.data.message.includes('Repeated fake reports'));

    // 4) Admin lifts suspension -> School User can log in again
    const liftRes = await api<{
      user: { suspendedUntil: string | null; suspensionReason: string | null };
    }>('PATCH', `/api/users/${schoolAuth.user.id}/suspend`, {
      token: adminAuth.token,
      body: { suspended: false },
    });
    assert.equal(liftRes.status, 200);
    assert.equal(liftRes.data.user.suspendedUntil, null);
    assert.equal(liftRes.data.user.suspensionReason, null);

    const restoredLogin = await api('POST', '/api/auth/login', {
      body: { email: OWNER_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(restoredLogin.status, 200);

    // 5) Admin suspends Staff user, then verify auto-expiry when suspended_until is in the past
    const suspendStaffRes = await api('PATCH', `/api/users/${staffAuth.user.id}/suspend`, {
      token: adminAuth.token,
      body: { suspended: true, durationDays: 3, reason: 'Policy review' },
    });
    assert.equal(suspendStaffRes.status, 200);

    const blockedStaffLogin = await api('POST', '/api/auth/login', {
      body: { email: ADMIN_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(blockedStaffLogin.status, 403);

    // Backdate suspended_until to the past -> auto-expires without manual lift
    await pool.query(
      `UPDATE "user" SET suspended_until = NOW() - INTERVAL '1 hour' WHERE id = $1`,
      [staffAuth.user.id],
    );
    const expiredStaffLogin = await api('POST', '/api/auth/login', {
      body: { email: ADMIN_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(expiredStaffLogin.status, 200);

    // Clean up expired fields
    await pool.query(
      `UPDATE "user" SET suspended_until = NULL, suspension_reason = NULL WHERE id = $1`,
      [staffAuth.user.id],
    );

    // 6) Verify audit log recorded suspend & lift events
    const auditRes = await api<{
      logs: Array<{ entityType: string; entityId: string; summary: string }>;
    }>('GET', '/api/audit-logs?limit=50', { token: adminAuth.token });
    assert.equal(auditRes.status, 200);
    assert.ok(
      auditRes.data.logs.some(
        (log) =>
          log.entityType === 'user' &&
          log.entityId === schoolAuth.user.id &&
          log.summary.includes('Suspended school user'),
      ),
    );
    assert.ok(
      auditRes.data.logs.some(
        (log) =>
          log.entityType === 'user' &&
          log.entityId === schoolAuth.user.id &&
          log.summary.includes('Lifted suspension'),
      ),
    );
  });
});
