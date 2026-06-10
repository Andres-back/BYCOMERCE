import { PrismaClient, RoleName, EstadoGeneral } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const roles: Array<{ nombre: RoleName; descripcion: string }> = [
    { nombre: RoleName.SUPER_ADMIN, descripcion: 'Administrador de plataforma' },
    { nombre: RoleName.ADMIN_NEGOCIO, descripcion: 'Administrador del comercio' },
    { nombre: RoleName.SUPERVISOR, descripcion: 'Supervisor operativo' },
    { nombre: RoleName.CAJERO, descripcion: 'Cajero POS' },
    { nombre: RoleName.DOMICILIARIO, descripcion: 'Repartidor' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { nombre: role.nombre },
      update: { descripcion: role.descripcion, estado: EstadoGeneral.ACTIVO },
      create: role,
    });
  }

  const emprendedor = await prisma.plan.upsert({
    where: { nombre: 'EMPRENDEDOR' },
    update: {},
    create: {
      nombre: 'EMPRENDEDOR',
      descripcion: 'Landing, catálogo, WhatsApp y marketplace',
      precio: 1490000,
      limiteUsuarios: 2,
      limiteProductos: 100,
      almacenamientoGb: 1,
      caracteristicas: {
        catalogo: true,
        marketplace: true,
        whatsapp: true,
      },
    },
  });

  await prisma.plan.upsert({
    where: { nombre: 'NEGOCIO' },
    update: {},
    create: {
      nombre: 'NEGOCIO',
      descripcion: 'Inventario, compras, proveedores y reportes básicos',
      precio: 2490000,
      limiteUsuarios: 5,
      limiteProductos: 500,
      almacenamientoGb: 5,
      caracteristicas: {
        inventario: true,
        compras: true,
        reportes: true,
      },
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'tienda-demo-mocoa' },
    update: {},
    create: {
      nombre: 'Tienda Demo Mocoa',
      slug: 'tienda-demo-mocoa',
      tipoNegocio: 'Tienda de barrio',
      planId: emprendedor.id,
      telefono: '573001112233',
      whatsapp: '573001112233',
      email: 'demo@mocoastore.alexsters.works',
      direccion: 'Centro, Mocoa',
      barrio: 'Centro',
      ciudad: 'Mocoa',
      latitud: 1.1492,
      longitud: -76.6466,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  await prisma.subscription.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: tenant.id,
      planId: emprendedor.id,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      montoMensual: emprendedor.precio,
    },
  });

  await prisma.businessSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      whatsapp: tenant.whatsapp,
      colorPrimario: '#0f766e',
      colorSecundario: '#f59e0b',
    },
  });

  await prisma.deliveryConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      activo: true,
      costoBase: 400000,
      radioKm: 3,
      horarioInicio: '08:00',
      horarioFin: '18:00',
    },
  });

  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@demo.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      nombre: 'Admin Demo',
      email: 'admin@demo.com',
      passwordHash,
      rol: RoleName.ADMIN_NEGOCIO,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  const category = await prisma.category.upsert({
    where: {
      tenantId_nombre: {
        tenantId: tenant.id,
        nombre: 'Bebidas',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      nombre: 'Bebidas',
      descripcion: 'Productos de consumo diario',
    },
  });

  await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: tenant.id,
        sku: 'DEMO-AGUA-600',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      sku: 'DEMO-AGUA-600',
      barcode: '770000000001',
      nombre: 'Agua 600ml',
      descripcion: 'Agua embotellada para catálogo demo',
      marca: 'Demo',
      costo: 100000,
      precio: 200000,
      stock: 24,
      stockMinimo: 6,
      destacado: true,
    },
  });

  const gastrobar = await prisma.tenant.upsert({
    where: { slug: 'lopbuk-gastrobar-mocoa' },
    update: {},
    create: {
      nombre: 'Lopbuk Gastrobar',
      slug: 'lopbuk-gastrobar-mocoa',
      tipoNegocio: 'Restaurante',
      planId: emprendedor.id,
      telefono: '573004445566',
      whatsapp: '573004445566',
      email: 'gastrobar@mocoastore.alexsters.works',
      direccion: 'Avenida principal, Mocoa',
      barrio: 'Avenida',
      ciudad: 'Mocoa',
      latitud: 1.1511,
      longitud: -76.6461,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  await prisma.businessSettings.upsert({
    where: { tenantId: gastrobar.id },
    update: {
      whatsapp: gastrobar.whatsapp,
      colorPrimario: '#7c2d12',
      colorSecundario: '#facc15',
      banner: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600&q=80',
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    },
    create: {
      tenantId: gastrobar.id,
      whatsapp: gastrobar.whatsapp,
      colorPrimario: '#7c2d12',
      colorSecundario: '#facc15',
      banner: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600&q=80',
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    },
  });

  await prisma.deliveryConfig.upsert({
    where: { tenantId: gastrobar.id },
    update: { activo: true, costoBase: 500000, radioKm: 4 },
    create: {
      tenantId: gastrobar.id,
      activo: true,
      costoBase: 500000,
      radioKm: 4,
      horarioInicio: '17:00',
      horarioFin: '23:00',
    },
  });

  await prisma.subscription.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      tenantId: gastrobar.id,
      planId: emprendedor.id,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      montoMensual: emprendedor.precio,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: gastrobar.id,
        email: 'admin@gastrobar.com',
      },
    },
    update: {},
    create: {
      tenantId: gastrobar.id,
      nombre: 'Admin Gastrobar',
      email: 'admin@gastrobar.com',
      passwordHash,
      rol: RoleName.ADMIN_NEGOCIO,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  const gastroCategory = await prisma.category.upsert({
    where: {
      tenantId_nombre: {
        tenantId: gastrobar.id,
        nombre: 'Platos fuertes',
      },
    },
    update: {},
    create: {
      tenantId: gastrobar.id,
      nombre: 'Platos fuertes',
      descripcion: 'Menu principal del gastrobar',
    },
  });

  await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: gastrobar.id,
        sku: 'GASTRO-BURGER-001',
      },
    },
    update: {},
    create: {
      tenantId: gastrobar.id,
      categoryId: gastroCategory.id,
      sku: 'GASTRO-BURGER-001',
      barcode: '770000000101',
      nombre: 'Burger Amazonica',
      descripcion: 'Hamburguesa artesanal con papas rusticas',
      marca: 'Lopbuk',
      costo: 1200000,
      precio: 2400000,
      stock: 18,
      stockMinimo: 4,
      imagenPrincipal: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80',
      destacado: true,
    },
  });

  await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: gastrobar.id,
        sku: 'GASTRO-MOJITO-001',
      },
    },
    update: {},
    create: {
      tenantId: gastrobar.id,
      categoryId: gastroCategory.id,
      sku: 'GASTRO-MOJITO-001',
      barcode: '770000000102',
      nombre: 'Mojito de la casa',
      descripcion: 'Coctel frio con hierbabuena y limon',
      marca: 'Lopbuk',
      costo: 700000,
      precio: 1600000,
      stock: 30,
      stockMinimo: 6,
      imagenPrincipal: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=900&q=80',
      destacado: true,
    },
  });

  const shoes = await prisma.tenant.upsert({
    where: { slug: 'calzado-selva-mocoa' },
    update: {},
    create: {
      nombre: 'Calzado Selva',
      slug: 'calzado-selva-mocoa',
      tipoNegocio: 'Zapateria',
      planId: emprendedor.id,
      telefono: '573007778899',
      whatsapp: '573007778899',
      email: 'calzado@mocoastore.alexsters.works',
      direccion: 'Barrio Jardin, Mocoa',
      barrio: 'Jardin',
      ciudad: 'Mocoa',
      latitud: 1.1467,
      longitud: -76.6502,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  await prisma.businessSettings.upsert({
    where: { tenantId: shoes.id },
    update: {
      whatsapp: shoes.whatsapp,
      colorPrimario: '#1d4ed8',
      colorSecundario: '#10b981',
      banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80',
      logo: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80',
    },
    create: {
      tenantId: shoes.id,
      whatsapp: shoes.whatsapp,
      colorPrimario: '#1d4ed8',
      colorSecundario: '#10b981',
      banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80',
      logo: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80',
    },
  });

  await prisma.deliveryConfig.upsert({
    where: { tenantId: shoes.id },
    update: { activo: true, costoBase: 400000, radioKm: 3 },
    create: {
      tenantId: shoes.id,
      activo: true,
      costoBase: 400000,
      radioKm: 3,
      horarioInicio: '09:00',
      horarioFin: '19:00',
    },
  });

  await prisma.subscription.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      tenantId: shoes.id,
      planId: emprendedor.id,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      montoMensual: emprendedor.precio,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: shoes.id,
        email: 'admin@calzado.com',
      },
    },
    update: {},
    create: {
      tenantId: shoes.id,
      nombre: 'Admin Calzado',
      email: 'admin@calzado.com',
      passwordHash,
      rol: RoleName.ADMIN_NEGOCIO,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  const shoesCategory = await prisma.category.upsert({
    where: {
      tenantId_nombre: {
        tenantId: shoes.id,
        nombre: 'Tenis',
      },
    },
    update: {},
    create: {
      tenantId: shoes.id,
      nombre: 'Tenis',
      descripcion: 'Calzado urbano y deportivo',
    },
  });

  await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: shoes.id,
        sku: 'SELVA-TENIS-NEGRO-40',
      },
    },
    update: {},
    create: {
      tenantId: shoes.id,
      categoryId: shoesCategory.id,
      sku: 'SELVA-TENIS-NEGRO-40',
      barcode: '770000000201',
      nombre: 'Tenis urbanos negros',
      descripcion: 'Tenis comodos para uso diario',
      marca: 'Selva',
      costo: 6500000,
      precio: 11990000,
      stock: 10,
      stockMinimo: 2,
      imagenPrincipal: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80',
      destacado: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      accion: 'SEED_EXECUTED',
      entidad: 'system',
      entidadId: tenant.id,
      metadata: { source: 'prisma/seed/seed.ts' },
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
