import dotenv from 'dotenv';
import { prisma } from '../lib/prisma.js';

dotenv.config();

async function main() {
  const [action, userId] = process.argv.slice(2);

  if ((action !== 'add' && action !== 'remove') || !userId) {
    console.error('Usage: pnpm admin add|remove <userId> (dev) or pnpm admin:prod add|remove <userId> (deployed)');
    process.exit(1);
  }

  const role = action === 'add' ? 'admin' : 'user';
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  console.log(`${user.id} (${user.email ?? 'no email'}) is now ${user.role}.`);
}

main()
  .catch(error => {
    if (typeof error === 'object' && error != null && 'code' in error && error.code === 'P2025') {
      console.error('User not found.');
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
