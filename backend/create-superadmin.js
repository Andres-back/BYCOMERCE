const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  const hash = await bcrypt.hash('SuperAdmin123!', 12);
  
  const user = await prisma.user.create({
    data: {
      nombre: 'Super Admin',
      email: 'superadmin@mocoamarket.com',
      passwordHash: hash,
      rol: 'SUPER_ADMIN',
      isSuperAdmin: true,
      estado: 'ACTIVO',
    },
  });
  
  console.log('Superadmin creado:', user.email);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
