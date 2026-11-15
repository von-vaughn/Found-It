import { pool } from '../config/db';
import { env } from '../config/env';
import { createItem, updateOsaReceipt } from '../repositories/item.repository';
import {
  createClaim,
  createReturnRequest,
  updateClaimStatusById,
  updateReturnOsaReceipt,
  updateReturnStatusById,
} from '../repositories/request.repository';
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
    categoryName: 'wallets-purses',
    name: 'Black Leather Bi-fold Wallet',
    description: 'Slim black leather wallet misplaced while reviewing at the library.',
    color: 'Black',
    building: 'Library',
    location: 'Second floor study tables near the reference section',
    importantDetails: 'Has a small faded CCS sticker inside the ID slot.',
    daysAgo: 1,
    time: '14:20',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'found',
    categoryName: 'electronics',
    name: 'Anker Powerbank 10000mAh',
    description: 'Black portable powerbank left plugged in on a front-row lab desk.',
    color: 'Black',
    building: 'CCS - College of Computing Studies',
    location: 'Computer Lab 2, front row desk',
    importantDetails: 'Short braided USB-C cable attached; small scratch near the power button.',
    daysAgo: 1,
    time: '10:45',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'lost',
    categoryName: 'tumblers',
    name: 'Aquaflask 22oz Insulated Tumbler',
    description: 'Matte navy blue stainless bottle forgotten after PE class.',
    color: 'Navy Blue',
    building: 'Gymnasium',
    location: 'Bleachers near the main entrance',
    importantDetails: 'Has a teal silicone boot and a small dent on the cap.',
    daysAgo: 2,
    time: '16:10',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'found',
    categoryName: 'keys',
    name: 'Honda Motorcycle Key with Red Tag',
    description: 'Single motorcycle ignition key found on an outdoor dining table.',
    color: 'Silver',
    building: 'Cafeteria B - Beside CCS',
    location: 'Outdoor wooden benches facing the walkway',
    importantDetails: 'Attached to a woven red lanyard tag and a small brass bell.',
    daysAgo: 2,
    time: '12:15',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'lost',
    categoryName: 'eyewear',
    name: 'Round Metal-Frame Prescription Glasses',
    description: 'Thin gold-frame eyeglasses left inside a hard protective case after lecture.',
    color: 'Gold',
    building: 'COE - College of Engineering',
    location: 'Room 304 lecture hall desk',
    importantDetails: 'Inside a matte gray clamshell case with a blue cleaning cloth.',
    daysAgo: 3,
    time: '09:30',
  },
  {
    reporterEmail: 'user@foundit.local',
    reportType: 'found',
    categoryName: 'books-school-supplies',
    name: 'Casio Scientific Calculator fx-991ES',
    description: 'Silver and gray scientific calculator found with slide-on protective cover.',
    color: 'Gray',
    building: 'CSM - College of Science and Mathematics',
    location: 'Hallway bench outside Physics Lab',
    importantDetails: 'Initials "M.R." written lightly inside the slide cover.',
    daysAgo: 4,
    time: '15:05',
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

const DEMO_REQUESTS: Array<{
  requesterEmail: string;
  itemName: string;
  kind: 'claim' | 'return';
  targetStatus: 'pending' | 'claimed' | 'returned';
  markOsaReceived?: boolean;
  claimantTitle: string;
  color: string;
  building: string;
  location: string;
  details: string;
  importantDetails: string;
  daysAgo: number;
  timeLost: string;
}> = [
  {
    requesterEmail: 'user2@foundit.local',
    itemName: 'Anker Powerbank 10000mAh',
    kind: 'claim',
    targetStatus: 'pending',
    markOsaReceived: true,
    claimantTitle: 'My Anker 10000mAh Powerbank',
    color: 'Black',
    building: 'CCS - College of Computing Studies',
    location: 'Computer Lab 2, front row desk',
    details: 'I left my black Anker powerbank plugged in after our morning lab session.',
    importantDetails: 'Has a short braided black USB-C cable and small scratch beside the power button.',
    daysAgo: 1,
    timeLost: '10:30',
  },
  {
    requesterEmail: 'user2@foundit.local',
    itemName: 'Casio Scientific Calculator fx-991ES',
    kind: 'claim',
    targetStatus: 'claimed',
    markOsaReceived: true,
    claimantTitle: 'Casio fx-991ES Plus Calculator',
    color: 'Gray',
    building: 'CSM - College of Science and Mathematics',
    location: 'Hallway bench outside Physics Lab',
    details: 'Misplaced my scientific calculator on the bench while waiting for our Physics exam.',
    importantDetails: 'Initials "M.R." are written lightly on the inside of the slide cover.',
    daysAgo: 4,
    timeLost: '14:50',
  },
  {
    requesterEmail: 'user2@foundit.local',
    itemName: 'Aquaflask 22oz Insulated Tumbler',
    kind: 'return',
    targetStatus: 'pending',
    claimantTitle: 'Navy Blue Aquaflask 22oz Tumbler',
    color: 'Navy Blue',
    building: 'Gymnasium',
    location: 'Bleachers near the main entrance',
    details: 'Found this navy blue Aquaflask sitting on the lower bleachers right after intramurals practice.',
    importantDetails: 'Has a teal silicone boot at the bottom and a small dent near the cap.',
    daysAgo: 2,
    timeLost: '16:30',
  },
  {
    requesterEmail: 'user2@foundit.local',
    itemName: 'Round Metal-Frame Prescription Glasses',
    kind: 'return',
    targetStatus: 'returned',
    markOsaReceived: true,
    claimantTitle: 'Gold Frame Glasses in Gray Hard Case',
    color: 'Gold',
    building: 'COE - College of Engineering',
    location: 'Room 304 lecture hall desk',
    details: 'Picked up this gray glasses case left under a desk in Room 304 and turned it in to OSA.',
    importantDetails: 'Contains thin gold metal-frame glasses and a blue microfiber cleaning cloth.',
    daysAgo: 3,
    timeLost: '10:00',
  },
];

async function seedDemoRequests(): Promise<void> {
  const { rows: users } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM "user" WHERE email = ANY($1::text[])`,
    [['user@foundit.local', 'user2@foundit.local', 'admin@foundit.local']],
  );
  const userByEmail = new Map(users.map((u) => [u.email, u.id]));
  const ownerId = userByEmail.get('user@foundit.local');
  const adminId = userByEmail.get('admin@foundit.local') ?? ownerId;
  if (!ownerId || !adminId) return;

  let planted = 0;
  for (const demo of DEMO_REQUESTS) {
    const requesterId = userByEmail.get(demo.requesterEmail);
    if (!requesterId) continue;

    const { rows: itemRows } = await pool.query<{ id: string }>(
      `SELECT i.id
       FROM item i
       JOIN report r ON r.id = i.report_id
       WHERE i.name = $1 AND r.user_id = $2
       LIMIT 1`,
      [demo.itemName, ownerId],
    );
    const itemId = itemRows[0]?.id;
    if (!itemId) continue;

    const { rows: existing } = await pool.query<{ id: string }>(
      `SELECT id FROM request
       WHERE item_id = $1 AND user_id = $2 AND kind = $3
       LIMIT 1`,
      [itemId, requesterId, demo.kind],
    );
    if (existing[0]) continue;

    const payload = {
      userId: requesterId,
      itemId,
      claimantTitle: demo.claimantTitle,
      color: demo.color,
      building: demo.building,
      dateLost: new Date(Date.now() - demo.daysAgo * 86_400_000).toISOString().slice(0, 10),
      timeLost: demo.timeLost,
      location: demo.location,
      details: demo.details,
      importantDetails: demo.importantDetails,
    };

    const created =
      demo.kind === 'claim'
        ? await createClaim(payload)
        : await createReturnRequest(payload);
    if (!created) continue;

    if (demo.kind === 'claim' && demo.markOsaReceived) {
      await updateOsaReceipt(itemId, true, adminId);
    }
    if (demo.kind === 'return' && demo.markOsaReceived) {
      await updateReturnOsaReceipt(created.id, true);
    }

    if (demo.kind === 'claim' && demo.targetStatus === 'claimed') {
      await updateClaimStatusById(created.id, 'approved');
      await updateClaimStatusById(created.id, 'claimed');
    } else if (demo.kind === 'return' && demo.targetStatus === 'returned') {
      await updateReturnStatusById(created.id, 'approved');
      await updateReturnStatusById(created.id, 'returned');
    }
    planted += 1;
  }

  if (planted > 0) {
    console.log(`Seeded ${planted} demo claim/return requests.`);
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
    const demos: Array<{
      firstName: string;
      lastName: string;
      email: string;
      schoolId?: string;
      password: string;
      role: 'admin' | 'school_user';
    }> = [
      { firstName: 'Demo', lastName: 'Staff', email: 'admin@foundit.local', password: 'Admin123!', role: 'admin' },
      { firstName: 'Demo', lastName: 'User', email: 'user@foundit.local', password: 'User12345!', role: 'school_user' },
      { firstName: 'Demo', lastName: 'User 2', email: 'user2@foundit.local', schoolId: '2022-00412', password: 'User12345!', role: 'school_user' },
    ];
    for (const d of demos) {
      const existing = await findUserByEmail(d.email);
      if (!existing) {
        await createUser({
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          schoolId: d.schoolId,
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
    await seedDemoRequests();
  }

  // Sanity check: abort boot if zero active super_admins exist
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM "user" WHERE role = 'super_admin' AND is_active = TRUE`,
  );
  if (rows[0].count === 0) {
    throw new Error('No active super_admin in database after seeding. Aborting boot.');
  }
}
