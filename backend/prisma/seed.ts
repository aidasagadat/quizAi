import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const teacherHash = await bcrypt.hash('Teacher#1234', 10);
  const studentHash = await bcrypt.hash('Student#1234', 10);

  await prisma.user.upsert({
    where: { email: 'teacher@demo.com' },
    update: {},
    create: {
      email: 'teacher@demo.com',
      displayName: 'Demo Teacher',
      role: 'TEACHER',
      passwordHash: teacherHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: {},
    create: {
      email: 'student@demo.com',
      displayName: 'Demo Student',
      role: 'STUDENT',
      passwordHash: studentHash,
    },
  });

  console.log('Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
