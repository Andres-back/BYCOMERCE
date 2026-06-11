const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // Delete old soft-deleted plan
  await prisma.plan.deleteMany({ where: { nombre: 'Basico', estado: 'INACTIVO' } });
  
  // Create new active plan
  const plan = await prisma.plan.create({
    data: {
      nombre: 'Basico',
      descripcion: 'Vitrina web + inventario + dashboard. Ideal para escaparate digital.',
      precio: 500000,
      limiteUsuarios: 1,
      limiteProductos: 30,
      almacenamientoGb: 1,
      caracteristicas: ['Vitrina web publica', 'Inventario hasta 30 productos', 'Dashboard', '1 usuario', 'Soporte email'],
      estado: 'ACTIVO',
    },
  });
  
  console.log('Plan creado:', plan.nombre, 'Precio:', plan.precio / 100);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
