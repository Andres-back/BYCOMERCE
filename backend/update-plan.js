const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { id: 'dd404191-5749-4947-9b86-47c164ff52b0' },
    include: { plan: true }
  });
  console.log('Plan:', tenant.plan?.nombre, 'User limit:', tenant.plan?.limiteUsuarios);
  
  const updated = await prisma.plan.update({
    where: { id: tenant.planId },
    data: { limiteUsuarios: 10 }
  });
  console.log('Updated plan:', updated.nombre, 'new limit:', updated.limiteUsuarios);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
