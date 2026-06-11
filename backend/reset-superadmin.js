const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');
async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { email: 'superadmin@mocoamarket.com' } });
  if (user) {
    console.log('Superadmin found:', user.id);
    const hash = await bcrypt.hash('SuperAdmin123!', 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    console.log('Password reset');
  } else {
    console.log('Superadmin NOT found, creating...');
    const hash = await bcrypt.hash('SuperAdmin123!', 12);
    await prisma.user.create({
      data: { nombre: 'Super Admin', email: 'superadmin@mocoamarket.com', passwordHash: hash, rol: 'SUPER_ADMIN', isSuperAdmin: true, estado: 'ACTIVO' },
    });
    console.log('Superadmin created');
  }
  await prisma.\();
}
main();
