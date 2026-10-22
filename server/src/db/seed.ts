import { pool } from '../config/db';
import { env } from '../config/env';
import { createItem } from '../repositories/item.repository';
import { findUserByEmail, createUser } from '../repositories/user.repository';
import type { ReportType } from '../types/items';
import { hashPassword } from '../utils/password';

// Canonical category list for report forms. Add/rename here; boot re-seeds new names.
const CATEGORIES = [
  'electronics',
  'id',
  'cards',
  'bags',
  'wallets-purses',
  'keys',
  'clothing-accessories',
  'books-school-supplies',
  'jewelry',
  'eyewear',
  'tumblers',
  'umbrellas',
  'sports-gym-equipment',
  'documents-papers',
  'other',
];

// Canonical building list for report forms. Add/rename here; boot re-seeds new names.
const BUILDINGS = [
  'Cafeteria B - Beside CCS',
  'Integrated Laboratory Building/High School Building',
  'CCS - College of Computing Studies',
  'Old High School Building',
  'CCJE - College of Criminal Justice Education',
  'COM - College of Medicine',
  'CSM - College of Science and Mathematics',
  'CAIS - College of Asian & Islamic Studies',
  'CSWD - College of Social Works & Development',
  'Canteen A - Near COL',
  'Cafeteria A - Near gate 3',
  'COL - College of Law',
  'COE - College of Engineering',
  'CTE - College of Teacher Education',
  'CHE - College of Home Economics',
  'Grade School Building',
  'Cover Court',
  'CLA - College of Liberal Arts',
  'Library',
  'Gymnasium',
  'CSSPE - College of Sports Science and Physical Education',
  'WMSU Administration Building',
  'Registrar',
  'MISTO Office',
  'Open Stage',
];

/**
 * Dev-only sample posts, filed under the demo school_user accounts so the browse
 * pages, "my reports", and admin views have something to show.
 * Building names must match BUILDINGS above; category names must match CATEGORIES.
 */
const DEMO_ITEMS: Array<{
  reporterEmail: string;
  reportType: ReportType;
  categoryName: string;
  name: string;
  description: string;
  color?: string;
  building?: string;
  location?: string;
  importantDetails?: string;
  daysAgo: number;
  time: string;
}> = [
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'lost',
    categoryName: 'electronics',
    name: 'Black JBL Tune 510BT Headphones',
    description: 'Black wireless headphones with a folded earcup. The left hinge is a little loose.',
    color: 'Black',
    building: 'CCS - College of Computing Studies',
    location: 'Room 204, third floor',
    importantDetails: 'Left earcup has a scratch near the hinge.',
    daysAgo: 1,
    time: '14:30',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'found',
    categoryName: 'id',
    name: 'WMSU Student ID - A. Dela Cruz',
    description: 'Student ID card turned over by the front desk. Name is partially worn off.',
    color: 'White',
    building: 'Library',
    location: 'Ground floor study area',
    daysAgo: 2,
    time: '09:15',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'lost',
    categoryName: 'wallets-purses',
    name: 'Brown Bifold Leather Wallet',
    description: 'Brown bifold wallet with a coin pocket. Holds my library card and fare money.',
    color: 'Brown',
    building: 'Canteen A - Near COL',
    location: 'Table near the counter',
    importantDetails: 'Initials J.M. embossed on the bottom corner.',
    daysAgo: 3,
    time: '12:05',
  },

  // ── Maria Santos ────────────────────────────────────────────────────────
  {
    reporterEmail: 'maria.santos@foundit.local',
    reportType: 'lost',
    categoryName: 'jewelry',
    name: 'Gold Ring with a Small Stone',
    description: 'Thin gold ring with a single clear stone. Slipped off while I was reading.',
    color: 'Gold',
    building: 'CLA - College of Liberal Arts',
    location: 'Reading room, second floor',
    importantDetails: 'Engraved with the initials M.S. inside the band.',
    daysAgo: 3,
    time: '15:10',
  },

  // ── Jose Reyes ──────────────────────────────────────────────────────────
  {
    reporterEmail: 'jose.reyes@foundit.local',
    reportType: 'found',
    categoryName: 'cards',
    name: 'BPI ATM Card',
    description: 'Bank ATM card found on the floor near the vending machine, name still legible.',
    color: 'Green',
    building: 'CAIS - College of Asian & Islamic Studies',
    location: 'Near the vending machine',
    daysAgo: 4,
    time: '16:20',
  },

  // ── Ana Lim ─────────────────────────────────────────────────────────────
  {
    reporterEmail: 'ana.lim@foundit.local',
    reportType: 'found',
    categoryName: 'other',
    name: 'Brown Stuffed Toy Bear',
    description: 'Small brown stuffed bear, well worn. Sitting on the bench outside the lobby.',
    color: 'Brown',
    building: 'WMSU Administration Building',
    location: 'Bench outside the lobby',
    daysAgo: 13,
    time: '17:55',
  },
];

/** Demo posts are planted only once: any that already exist by name are left alone. */
async function seedDemoItems(): Promise<void> {
  const { rows: existing } = await pool.query<{ name: string }>(`SELECT name FROM item`);
  const takenNames = new Set(existing.map((row) => row.name));
  const pending = DEMO_ITEMS.filter((demo) => !takenNames.has(demo.name));
  if (pending.length === 0) return;

  const { rows: categories } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM category`,
  );
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

  const { rows: users } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM "user"`,
  );
  const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));

  let planted = 0;
  for (const demo of pending) {
    const categoryId = categoryIdByName.get(demo.categoryName);
    const reporterId = userIdByEmail.get(demo.reporterEmail);
    // Category renamed or demo account missing — skip rather than fail boot.
    if (!categoryId || !reporterId) continue;
    await createItem({
      reporterId,
      reportType: demo.reportType,
      name: demo.name,
      description: demo.description,
      itemDate: new Date(Date.now() - demo.daysAgo * 86_400_000).toISOString().slice(0, 10),
      itemTime: demo.time,
      categoryId,
      color: demo.color,
      building: demo.building,
      location: demo.location,
      importantDetails: demo.importantDetails,
    });
    planted += 1;
  }
  console.log(`Seeded ${planted} demo item reports.`);
}

/**
 * Dev-only sample claim so the school-user claim status views have a returned
 * example to show. Inserts once; the NOT EXISTS guard keeps it idempotent.
 */
async function seedDemoReturnedClaim(): Promise<void> {
  const { rows: users } = await pool.query<{ id: string }>(
    `SELECT id FROM "user" WHERE email = 'user@foundit.local' LIMIT 1`,
  );
  const userId = users[0]?.id;
  if (!userId) return;

  const { rows: items } = await pool.query<{ id: string }>(
    `SELECT i.id
     FROM item i
     JOIN report r ON r.id = i.report_id
     WHERE i.name = 'BPI ATM Card'
       AND r.report_type = 'found'
       AND r.user_id <> $1
     LIMIT 1`,
    [userId],
  );
  const itemId = items[0]?.id;
  if (!itemId) return;

  const { rowCount } = await pool.query(
    `INSERT INTO request (
       item_id, user_id, kind, status, evidence, claimant_title,
       primary_color, building, date_lost, time_lost, location_lost,
       details, important_details, created_at
     )
     SELECT $1, $2, 'claim', 'returned', '[]', $3, $4, $5,
            CURRENT_DATE - 4, '15:40', $6, $7, $8, NOW() - INTERVAL '2 days'
     WHERE NOT EXISTS (
       SELECT 1 FROM request
       WHERE item_id = $1 AND user_id = $2 AND kind = 'claim'
     )`,
    [
      itemId,
      userId,
      'BPI ATM Card',
      'Green',
      'CAIS - College of Asian & Islamic Studies',
      'CAIS lobby',
      'Green BPI ATM card with my name on it. I last used it at the vending machine near CAIS.',
      'Card number ends in 4821; the signature panel is slightly worn.',
    ],
  );
  if (rowCount === 1) {
    console.log('Seeded demo returned claim for user@foundit.local.');
  }
}

/**
 * Ensures the canonical categories and at least one super_admin exist, plus
 * optional demo accounts (dev only). Idempotent — safe to run on every boot.
 */
export async function seed(): Promise<void> {
  await pool.query(
    `INSERT INTO category (name)
     SELECT unnest($1::text[])
     ON CONFLICT (name) DO NOTHING`,
    [CATEGORIES],
  );

  await pool.query(
    `INSERT INTO building (name)
     SELECT unnest($1::text[])
     ON CONFLICT (name) DO NOTHING`,
    [BUILDINGS],
  );

  const superAdmin = await findUserByEmail(env.SUPER_ADMIN_EMAIL);
  if (!superAdmin) {
    const [firstName, ...rest] = env.SUPER_ADMIN_NAME.trim().split(/\s+/);
    await createUser({
      firstName,
      lastName: rest.join(' ') || 'Admin',
      email: env.SUPER_ADMIN_EMAIL,
      passwordHash: await hashPassword(env.SUPER_ADMIN_PASSWORD),
      role: 'super_admin',
      isVerified: true,
    });
    console.log(`Seeded super_admin: ${env.SUPER_ADMIN_EMAIL}`);
  }

  // Demo accounts are strictly prohibited in production environments
  if (env.NODE_ENV !== 'production' && env.SEED_DEMO_USERS) {
    const demos = [
      { firstName: 'Demo', lastName: 'Admin', email: 'admin@foundit.local', password: 'Admin123!', role: 'admin' as const },
      { firstName: 'Demo', lastName: 'User', email: 'user@foundit.local', password: 'User12345!', role: 'school_user' as const },
      { firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@foundit.local', password: 'User12345!', role: 'school_user' as const },
      { firstName: 'Jose', lastName: 'Reyes', email: 'jose.reyes@foundit.local', password: 'User12345!', role: 'school_user' as const },
      { firstName: 'Ana', lastName: 'Lim', email: 'ana.lim@foundit.local', password: 'User12345!', role: 'school_user' as const },
    ];
    for (const d of demos) {
      const existing = await findUserByEmail(d.email);
      if (!existing) {
        await createUser({
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          passwordHash: await hashPassword(d.password),
          role: d.role,
          isVerified: true,
        });
        console.log(`Seeded ${d.role}: ${d.email}`);
      }
    }

    // Dev convenience: ensure all seeded demo and superadmin accounts in dev are verified
    await pool.query(`UPDATE "user" SET is_verified = TRUE WHERE email = ANY($1::text[])`, [
      [env.SUPER_ADMIN_EMAIL.trim().toLowerCase(), ...demos.map((d) => d.email)],
    ]);

    await seedDemoItems();
    await seedDemoReturnedClaim();
  }

  // Sanity check: abort boot if zero active super_admins exist
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM "user" WHERE role = 'super_admin' AND is_active = TRUE`,
  );
  if (rows[0].count === 0) {
    throw new Error('No active super_admin in database after seeding. Aborting boot.');
  }
}
