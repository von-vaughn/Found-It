import { pool } from '../config/db';
import { env } from '../config/env';
import { findUserByEmail, createUser } from '../repositories/user.repository';
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
      mustChangePassword: env.NODE_ENV === 'production',
    });
    console.log(`Seeded super_admin: ${env.SUPER_ADMIN_EMAIL}`);
  }

  // Demo accounts are strictly prohibited in production environments
  if (env.NODE_ENV !== 'production' && env.SEED_DEMO_USERS) {
    const demos = [
      { firstName: 'Demo', lastName: 'Admin', email: 'admin@foundit.local', password: 'Admin123!', role: 'admin' as const },
      { firstName: 'Demo', lastName: 'User', email: 'user@foundit.local', password: 'User12345!', role: 'school_user' as const },
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
    await pool.query(
      `UPDATE "user" SET is_verified = TRUE WHERE email IN ($1, $2, $3)`,
      [env.SUPER_ADMIN_EMAIL, 'admin@foundit.local', 'user@foundit.local'],
    );
  }

  // Sanity check: abort boot if zero active super_admins exist
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM "user" WHERE role = 'super_admin' AND is_active = TRUE`,
  );
  if (rows[0].count === 0) {
    throw new Error('No active super_admin in database after seeding. Aborting boot.');
  }
}
