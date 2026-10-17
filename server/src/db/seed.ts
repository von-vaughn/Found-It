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

/**
 * Ensures the canonical categories and at least one super_admin exist, plus
 * optional demo accounts. Idempotent — safe to run on every boot.
 */
export async function seed(): Promise<void> {
  await pool.query(
    `INSERT INTO category (name)
     SELECT unnest($1::text[])
     ON CONFLICT (name) DO NOTHING`,
    [CATEGORIES],
  );

  const superAdmin = await findUserByEmail(env.SUPER_ADMIN_EMAIL);
  if (!superAdmin) {
    const [firstName, ...rest] = env.SUPER_ADMIN_NAME.trim().split(/\s+/);
    await createUser({
      firstName,
      lastName: rest.join(' '),
      email: env.SUPER_ADMIN_EMAIL,
      passwordHash: await hashPassword(env.SUPER_ADMIN_PASSWORD),
      role: 'super_admin',
    });
    console.log(`Seeded super_admin: ${env.SUPER_ADMIN_EMAIL}`);
  }

  if (env.SEED_DEMO_USERS) {
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
        });
        console.log(`Seeded ${d.role}: ${d.email}`);
      }
    }
  }

  // sanity check so a misconfigured DB never boots silently with zero admins
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "user" WHERE role = 'super_admin' AND is_active = TRUE`,
  );
  if (rows[0].count === 0) {
    throw new Error('No active super_admin in database after seeding. Aborting boot.');
  }
}
