import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import app from './index';
import { pool } from './config/db';
import { env } from './config/env';
import { migrate } from './db/migrate';
import { createUser } from './repositories/user.repository';
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
      lastName: 'Super',
      email: SUPER_EMAIL,
      passwordHash,
      role: 'super_admin',
      isVerified: true,
    });
    superUserId = superUser.id;

    const adminUser = await createUser({
      firstName: 'Audit',
      lastName: 'Admin',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
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

  it('logs ONLY super_admin actions in audit_log, revokes tokens on role change, and guards audit-log access', async () => {
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

    // Admin creates a category -> should persist, NOT create audit_log row
    const catRes = await api<{ category: { id: string; name: string } }>('POST', '/api/categories', {
      token: adminAuth.token,
      body: { name: TEST_CATEGORY },
    });
    assert.equal(catRes.status, 201);
    createdCategoryId = catRes.data.category.id;
    assert.equal(catRes.data.category.name, TEST_CATEGORY);

    const adminAuditRows = await pool.query(
      'SELECT id FROM audit_log WHERE actor_id = $1',
      [adminUserId],
    );
    assert.equal(adminAuditRows.rowCount, 0, 'Regular admin actions must never write to audit_log');

    // Super admin creates a building -> persists AND writes audit_log row
    const bldgRes = await api<{ building: { id: string; name: string } }>('POST', '/api/buildings', {
      token: superAuth.token,
      body: { name: TEST_BUILDING },
    });
    assert.equal(bldgRes.status, 201);
    createdBuildingId = bldgRes.data.building.id;

    // Super admin creates & changes role of a staff account -> revokes old refresh tokens & logs audit
    const createTarget = await api<{ user: { id: string } }>('POST', '/api/users', {
      token: superAuth.token,
      body: {
        name: 'Role Target',
        email: TARGET_EMAIL,
        password: TEST_PASSWORD,
        role: 'admin',
      },
    });
    assert.equal(createTarget.status, 201);
    const targetId = createTarget.data.user.id;
    createdUserIds.push(targetId);

    const targetRefresh = signRefreshToken({
      id: targetId,
      email: TARGET_EMAIL,
      role: 'admin',
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

    // Audit-log endpoint restricted to super_admin
    const deniedAdmin = await api('GET', '/api/audit-logs', { token: adminAuth.token });
    assert.equal(deniedAdmin.status, 403);
    const deniedUser = await api('GET', '/api/audit-logs', { token: schoolAuth.token });
    assert.equal(deniedUser.status, 403);

    // User management is super_admin only: staff can read themselves but nothing else.
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
    assert.equal(superList.status, 200, 'Super admin still manages users');

    const allowedSuper = await api<{ logs: Array<{ actorId: string; entityType: string }> }>(
      'GET',
      '/api/audit-logs?limit=50',
      { token: superAuth.token },
    );
    assert.equal(allowedSuper.status, 200);
    assert.ok(allowedSuper.data.logs.some((log) => log.actorId === superUserId && log.entityType === 'building'));
    assert.ok(allowedSuper.data.logs.some((log) => log.actorId === superUserId && log.entityType === 'user'));
    assert.equal(
      allowedSuper.data.logs.some((log) => log.actorId === adminUserId),
      false,
      'audit_log feed must exclude plain admin actions',
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

    // Finder submits -> Admin rejects -> Admin publishes rejected return -> Finder resubmits!
    const firstReturn = await api<{ returnRequest: { id: string } }>('POST', '/api/returns', {
      token: finderAuth.token,
      body: retPayload,
    });
    assert.equal(firstReturn.status, 201);
    const firstReturnId = firstReturn.data.returnRequest.id;

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

    // Published found item must carry receivedByOsa = true
    const publishedDetail = await api<{ item: { receivedByOsa?: boolean } }>(
      'GET',
      `/api/items/${publishRes.data.itemId}`,
      { token: adminAuth.token },
    );
    assert.equal(publishedDetail.status, 200);
    assert.equal(publishedDetail.data.item.receivedByOsa, true);

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

    // Mark OSA receipt -> approve -> cannot revoke OSA receipt while approved
    const osaTrue = await api('PATCH', `/api/returns/admin/${secondReturnId}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: true },
    });
    assert.equal(osaTrue.status, 200);

    const approveRet = await api('PATCH', `/api/returns/admin/${secondReturnId}/status`, {
      token: adminAuth.token,
      body: { status: 'approved' },
    });
    assert.equal(approveRet.status, 200);

    const osaRevoke = await api('PATCH', `/api/returns/admin/${secondReturnId}/osa-receipt`, {
      token: adminAuth.token,
      body: { receivedByOsa: false },
    });
    assert.equal(osaRevoke.status, 409);

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

    const lostRes = await api<{ item: { isReturned: boolean } }>(
      'GET',
      `/api/items/${lostItemId}`,
      { token: ownerAuth.token },
    );
    assert.equal(lostRes.status, 200);
    assert.equal(lostRes.data.item.isReturned, true);
    const retRow = await pool.query<{ status: string }>(
      'SELECT status FROM request WHERE id = $1',
      [secondReturnId],
    );
    assert.equal(retRow.rows[0].status, 'returned');
  });
});
