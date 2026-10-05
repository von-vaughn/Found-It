import { pool } from '../config/db';
import { env } from '../config/env';
import { findUserByEmail, createUser } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';

/**
 * Ensures at least one super_admin exists, plus optional demo accounts.
 * Idempotent — safe to run on every boot.
 */
export async function seed(): Promise<void> {
  const superAdmin = await findUserByEmail(env.SUPER_ADMIN_EMAIL);
  if (!superAdmin) {
    await createUser({
      name: env.SUPER_ADMIN_NAME,
      email: env.SUPER_ADMIN_EMAIL,
      passwordHash: await hashPassword(env.SUPER_ADMIN_PASSWORD),
      role: 'super_admin',
    });
    console.log(`Seeded super_admin: ${env.SUPER_ADMIN_EMAIL}`);
  }

  if (env.SEED_DEMO_USERS) {
    const demos = [
      { name: 'Demo Admin', email: 'admin@foundit.local', password: 'Admin123!', role: 'admin' as const },
      { name: 'Demo User', email: 'user@foundit.local', password: 'User12345!', role: 'school_user' as const },
    ];
    for (const d of demos) {
      const existing = await findUserByEmail(d.email);
      if (!existing) {
        await createUser({
          name: d.name,
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
    `SELECT COUNT(*)::int AS count FROM users WHERE role = 'super_admin' AND is_active = TRUE`,
  );
  if (rows[0].count === 0) {
    throw new Error('No active super_admin in database after seeding. Aborting boot.');
  }
}
