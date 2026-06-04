const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123', 10);

  await prisma.user.create({
    data: {
      displayName: 'Krishna Lanka',
      email: 'krishnalanka004@gmail.com',
      passwordHash: hash,
      role: 'super_admin',
      mustChangePassword: false,
      isActive: true,
    },
  });

  console.log('Super Admin created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());