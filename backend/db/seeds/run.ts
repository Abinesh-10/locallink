/**
 * Seeds roles (per doc §2 table) and a default admin user so /admin/*
 * routes are testable from day one. Also seeds a handful of service
 * categories so Phase 2's category dropdown has real data later —
 * harmless to seed now since service_categories has no FK dependents yet.
 *
 * Run with: npm run seed
 * Idempotent: uses ON CONFLICT DO NOTHING everywhere.
 */
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Per doc §2, roles are: customer, worker, item_owner, seller, trainer,
// admin. §5's "Nearby Volunteers tab" references a volunteer role that's
// never defined in §2's table — an inconsistency in the source spec. Since
// `roles` is a plain lookup table (not a Postgres ENUM), adding it here is
// a safe, additive fix rather than a schema migration.
const ROLES = ['customer', 'worker', 'item_owner', 'seller', 'trainer', 'volunteer', 'admin'];

const SERVICE_CATEGORIES = [
  { slug: 'electrician', name_en: 'Electrician', name_ta: 'மின்சாரம்', icon: 'zap' },
  { slug: 'plumber', name_en: 'Plumber', name_ta: 'குழாய் பணி', icon: 'wrench' },
  { slug: 'carpenter', name_en: 'Carpenter', name_ta: 'தச்சர்', icon: 'hammer' },
  { slug: 'painter', name_en: 'Painter', name_ta: 'பெயிண்டர்', icon: 'paintbrush' },
  { slug: 'cleaning', name_en: 'House Cleaning', name_ta: 'வீட்டு சுத்தம்', icon: 'sparkles' },
  { slug: 'gardening', name_en: 'Gardening', name_ta: 'தோட்டக்கலை', icon: 'leaf' },
];

// rental_categories.names is jsonb (per migration 0006), unlike
// service_categories' flat name_en/name_ta columns — shape accordingly.
const RENTAL_CATEGORIES = [
  { slug: 'power-tools', names: { en: 'Power Tools', ta: 'மின் கருவிகள்' }, icon: 'drill' },
  { slug: 'furniture', names: { en: 'Furniture', ta: 'மரச்சாமான்கள்' }, icon: 'armchair' },
  { slug: 'event-equipment', names: { en: 'Event Equipment', ta: 'நிகழ்வு உபகரணங்கள்' }, icon: 'party-popper' },
  { slug: 'vehicles', names: { en: 'Vehicles', ta: 'வாகனங்கள்' }, icon: 'car' },
  { slug: 'electronics', names: { en: 'Electronics', ta: 'மின்னணுவியல்' }, icon: 'tv' },
  { slug: 'sports-gear', names: { en: 'Sports Gear', ta: 'விளையாட்டு உபகரணங்கள்' }, icon: 'dumbbell' },
];

// product_categories.names is also jsonb, but unlike rental_categories this
// table has NO icon column at all (per migration 0007) — the frontend maps
// icons by slug locally instead of reading one from the API.
const PRODUCT_CATEGORIES = [
  { slug: 'furniture', names: { en: 'Furniture', ta: 'மரச்சாமான்கள்' } },
  { slug: 'electronics', names: { en: 'Electronics', ta: 'மின்னணுவியல்' } },
  { slug: 'clothing', names: { en: 'Clothing', ta: 'ஆடைகள்' } },
  { slug: 'farm-produce', names: { en: 'Farm Produce', ta: 'பண்ணை விளைபொருட்கள்' } },
  { slug: 'homemade-goods', names: { en: 'Homemade Goods', ta: 'வீட்டில் தயாரிக்கப்பட்ட பொருட்கள்' } },
  { slug: 'books', names: { en: 'Books', ta: 'புத்தகங்கள்' } },
];

async function run(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Seeding roles...');
    for (const name of ROLES) {
      await pool.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }

    console.log('Seeding service categories...');
    for (const cat of SERVICE_CATEGORIES) {
      await pool.query(
        `INSERT INTO service_categories (slug, name_en, name_ta, icon)
         VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO NOTHING`,
        [cat.slug, cat.name_en, cat.name_ta, cat.icon]
      );
    }

    console.log('Seeding rental categories...');
    for (const cat of RENTAL_CATEGORIES) {
      await pool.query(
        `INSERT INTO rental_categories (slug, names, icon)
         VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
        [cat.slug, JSON.stringify(cat.names), cat.icon]
      );
    }

    console.log('Seeding product categories...');
    for (const cat of PRODUCT_CATEGORIES) {
      await pool.query(
        `INSERT INTO product_categories (slug, names)
         VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
        [cat.slug, JSON.stringify(cat.names)]
      );
    }

    console.log('Seeding default admin user...');
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@locallink.app';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    let adminId: string;
    if (existing.rows.length > 0) {
      adminId = existing.rows[0].id;
      console.log(`Admin user already exists (${adminEmail})`);
    } else {
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, is_email_verified)
         VALUES ($1, $2, 'LocalLink Admin', true) RETURNING id`,
        [adminEmail, passwordHash]
      );
      adminId = res.rows[0].id;
      console.log(`Created admin user: ${adminEmail} / ${adminPassword} (CHANGE THIS PASSWORD)`);
    }

    const adminRole = await pool.query("SELECT id FROM roles WHERE name = 'admin'");
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [adminId, adminRole.rows[0].id]
    );

    console.log('Seed complete.');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
