import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const SEED_EMAILS = [
  'archivist@ocwmit.example.com',
  'sarah.chen@example.com',
  'alex.kumar@example.com',
  'emma.rodriguez@example.com',
  'james.okafor@example.com',
  'priya.patel@example.com',
  'david.mueller@example.com',
  'yuki.tanaka@example.com',
  'fatima.rashid@example.com',
  'chen.wei@example.com',
  'sofia.petrov@example.com',
];

const users = await prisma.user.findMany({
  where: { email: { in: SEED_EMAILS } },
  select: { id: true },
});

const ids = users.map((u) => u.id);

if (ids.length === 0) {
  console.log('No seed users found — nothing to clear.');
} else {
  const { count } = await prisma.post.updateMany({
    where: { authorId: { in: ids }, thumbnailUrl: { not: null } },
    data: { thumbnailUrl: null },
  });
  console.log(`Cleared thumbnailUrl on ${count} seeded posts.`);
}

await prisma.$disconnect();
