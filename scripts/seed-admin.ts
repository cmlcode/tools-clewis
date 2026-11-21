// scripts/seed-admin.ts
// Prints an INSERT statement for the admin account (the password is hashed here; only the hash is printed).
//
// Usage:
//   npx tsx scripts/seed-admin.ts <email> <password>
//   ADMIN_PASSWORD='...' npx tsx scripts/seed-admin.ts <email>
import { hashPassword } from '../src/worker/password';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;

  if (!email || !/^[^\s'"]+@[^\s'"]+$/.test(email) || !password || password.length < 12) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password, 12+ characters>');
    process.exit(1);
  }

  const hash = await hashPassword(password);
  console.log(`INSERT INTO users (email, password_hash, role) VALUES ('${email}', '${hash}', 'admin');`);
}

void main();
