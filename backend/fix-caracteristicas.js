const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({ where: { estado: 'ACTIVO' } });
  for (const plan of plans) {
    console.log('Plan:', plan.nombre);
    console.log('  caracteristicas type:', typeof plan.caracteristicas);
    console.log('  caracteristicas value:', JSON.stringify(plan.caracteristicas));
    console.log('  isArray:', Array.isArray(plan.caracteristicas));
    if (plan.caracteristicas && !Array.isArray(plan.caracteristicas)) {
      console.log('  FIXING...');
      // If it's a JSON string, fix it
      const fixed = ['Plan ' + plan.nombre];
      await prisma.plan.update({ where: { id: plan.id }, data: { caracteristicas: fixed } });
      console.log('  Fixed!');
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
