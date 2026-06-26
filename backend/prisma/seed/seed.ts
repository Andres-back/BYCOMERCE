import { PrismaClient, RoleName, EstadoGeneral } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type DemoProduct = {
  sku: string;
  nombre: string;
  descripcion: string;
  marca: string;
  precio: number;
  costo: number;
  stock: number;
  imagen: string;
};

type DemoBusiness = {
  slug: string;
  nombre: string;
  tipoNegocio: string;
  categoria: string;
  telefono: string;
  barrio?: string;
  direccion: string;
  colorPrimario: string;
  colorSecundario: string;
  banner: string;
  logo: string;
  delivery: boolean;
  products: DemoProduct[];
};

const marketplaceDemoBusinesses: DemoBusiness[] = [
  {
    slug: 'alfa-mocoa',
    nombre: 'ALFA',
    tipoNegocio: 'Tienda Deportiva',
    categoria: 'Ropa deportiva',
    telefono: '573101001001',
    barrio: 'Centro',
    direccion: 'Centro comercial local, Mocoa',
    colorPrimario: '#0f172a',
    colorSecundario: '#22c55e',
    banner: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'ALFA-ENTERIZO-001',
        nombre: 'Enterizo deportivo negro',
        descripcion: 'Prenda deportiva para entrenamiento y uso diario.',
        marca: 'ALFA',
        precio: 9999000,
        costo: 5200000,
        stock: 14,
        imagen: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      },
      {
        sku: 'ALFA-TOP-002',
        nombre: 'Top deportivo compresion',
        descripcion: 'Top elastico de alto soporte para entrenamiento.',
        marca: 'ALFA',
        precio: 5990000,
        costo: 3000000,
        stock: 20,
        imagen: 'https://images.unsplash.com/photo-1506629905607-d9d297d2f7cf?w=900&q=80',
      },
    ],
  },
  {
    slug: 'anmarg-mocoa',
    nombre: 'anmarg',
    tipoNegocio: 'Tienda',
    categoria: 'Moda',
    telefono: '573101001002',
    barrio: 'Centro',
    direccion: 'Carrera principal, Mocoa',
    colorPrimario: '#111827',
    colorSecundario: '#f59e0b',
    banner: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'ANMARG-CAMISA-001',
        nombre: 'Camisa urbana premium',
        descripcion: 'Camisa casual para vitrina de moda local.',
        marca: 'anmarg',
        precio: 7990000,
        costo: 4100000,
        stock: 16,
        imagen: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
      },
      {
        sku: 'ANMARG-JEAN-002',
        nombre: 'Jean clasico stretch',
        descripcion: 'Jean comodo para uso diario.',
        marca: 'anmarg',
        precio: 11990000,
        costo: 6500000,
        stock: 11,
        imagen: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=80',
      },
    ],
  },
  {
    slug: 'distriluna-ltda-mocoa',
    nombre: 'DISTRILUNA LTDA',
    tipoNegocio: 'ferreteria',
    categoria: 'Ferreteria',
    telefono: '573101001003',
    barrio: 'Avenida',
    direccion: 'Avenida Colombia, Mocoa',
    colorPrimario: '#b45309',
    colorSecundario: '#0f766e',
    banner: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'DISTRILUNA-TALADRO-001',
        nombre: 'Taladro percutor 1/2',
        descripcion: 'Herramienta para obras, reparaciones y taller.',
        marca: 'DISTRILUNA',
        precio: 18990000,
        costo: 13000000,
        stock: 8,
        imagen: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=900&q=80',
      },
      {
        sku: 'DISTRILUNA-CEMENTO-002',
        nombre: 'Cemento gris 50 kg',
        descripcion: 'Material de construccion para obra local.',
        marca: 'DISTRILUNA',
        precio: 4250000,
        costo: 3400000,
        stock: 40,
        imagen: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=900&q=80',
      },
    ],
  },
  {
    slug: 'elian-nicolas-chef-mocoa',
    nombre: 'ELIAN NICOLAS',
    tipoNegocio: 'chef',
    categoria: 'Comida preparada',
    telefono: '573101001004',
    barrio: 'Centro',
    direccion: 'Zona centro, Mocoa',
    colorPrimario: '#7c2d12',
    colorSecundario: '#f97316',
    banner: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'ELIAN-MENU-001',
        nombre: 'Menu ejecutivo del dia',
        descripcion: 'Almuerzo casero con proteina, sopa y bebida.',
        marca: 'ELIAN NICOLAS',
        precio: 1800000,
        costo: 1050000,
        stock: 25,
        imagen: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
      },
      {
        sku: 'ELIAN-POSTRE-002',
        nombre: 'Postre artesanal',
        descripcion: 'Postre frio preparado por encargo.',
        marca: 'ELIAN NICOLAS',
        precio: 900000,
        costo: 420000,
        stock: 18,
        imagen: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=900&q=80',
      },
    ],
  },
  {
    slug: 'fast-food-mocoa',
    nombre: 'FAST FOOD',
    tipoNegocio: 'Restaurante',
    categoria: 'Comidas rapidas',
    telefono: '573101001005',
    barrio: 'San Agustin',
    direccion: 'Barrio San Agustin, Mocoa',
    colorPrimario: '#991b1b',
    colorSecundario: '#fbbf24',
    banner: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'FAST-BURGER-001',
        nombre: 'Hamburguesa doble queso',
        descripcion: 'Hamburguesa con doble carne, queso y papas.',
        marca: 'FAST FOOD',
        precio: 2400000,
        costo: 1350000,
        stock: 30,
        imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80',
      },
      {
        sku: 'FAST-PAPAS-002',
        nombre: 'Papas especiales',
        descripcion: 'Papas con salsa de la casa y topping.',
        marca: 'FAST FOOD',
        precio: 1400000,
        costo: 720000,
        stock: 32,
        imagen: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=900&q=80',
      },
    ],
  },
  {
    slug: 'happytuls-mocoa',
    nombre: 'HAPPYTULS',
    tipoNegocio: 'vapes',
    categoria: 'Vapes',
    telefono: '573101001006',
    barrio: 'Centro',
    direccion: 'Centro, Mocoa',
    colorPrimario: '#4338ca',
    colorSecundario: '#06b6d4',
    banner: 'https://images.unsplash.com/photo-1520975867597-0af37a22e31e?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1520975682031-a4b28f51f36f?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'HAPPY-KIT-001',
        nombre: 'Kit vape recargable',
        descripcion: 'Kit de vaporizador con bateria recargable.',
        marca: 'HAPPYTULS',
        precio: 15990000,
        costo: 9800000,
        stock: 9,
        imagen: 'https://images.unsplash.com/photo-1520975867597-0af37a22e31e?w=900&q=80',
      },
      {
        sku: 'HAPPY-LIQUIDO-002',
        nombre: 'Liquido sabor tropical',
        descripcion: 'Liquido saborizado para vape.',
        marca: 'HAPPYTULS',
        precio: 3900000,
        costo: 2100000,
        stock: 22,
        imagen: 'https://images.unsplash.com/photo-1520975682031-a4b28f51f36f?w=900&q=80',
      },
    ],
  },
  {
    slug: 'siriusgastropud-mocoa',
    nombre: 'SIRIUSGASTROPUD',
    tipoNegocio: 'Restaurante',
    categoria: 'Platos fuertes',
    telefono: '573101001007',
    barrio: 'Avenida',
    direccion: 'Avenida principal, Mocoa',
    colorPrimario: '#064e3b',
    colorSecundario: '#f97316',
    banner: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'SIRIUS-PARRILLA-001',
        nombre: 'Parrilla mixta Sirius',
        descripcion: 'Plato fuerte con carnes, guarnicion y bebida.',
        marca: 'SIRIUSGASTROPUD',
        precio: 3290000,
        costo: 1900000,
        stock: 16,
        imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=80',
      },
      {
        sku: 'SIRIUS-ENSALADA-002',
        nombre: 'Ensalada fresca de la casa',
        descripcion: 'Ensalada con vegetales, proteina y aderezo.',
        marca: 'SIRIUSGASTROPUD',
        precio: 1850000,
        costo: 960000,
        stock: 20,
        imagen: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&q=80',
      },
    ],
  },
  {
    slug: 'tienda-la-abuela-mocoa',
    nombre: 'TIENDA LA ABUELA',
    tipoNegocio: 'Tienda',
    categoria: 'Abarrotes',
    telefono: '573101001008',
    barrio: 'La Independencia',
    direccion: 'Barrio La Independencia, Mocoa',
    colorPrimario: '#0f766e',
    colorSecundario: '#f59e0b',
    banner: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'ABUELA-ARROZ-001',
        nombre: 'Arroz premium 1 kg',
        descripcion: 'Producto basico para mercado familiar.',
        marca: 'La Abuela',
        precio: 520000,
        costo: 390000,
        stock: 60,
        imagen: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=900&q=80',
      },
      {
        sku: 'ABUELA-ACEITE-002',
        nombre: 'Aceite vegetal 900 ml',
        descripcion: 'Aceite de cocina para consumo diario.',
        marca: 'La Abuela',
        precio: 980000,
        costo: 750000,
        stock: 36,
        imagen: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=80',
      },
    ],
  },
  {
    slug: 'tapiceria-gs-mocoa',
    nombre: 'TAPICERIA E INSTALACIONES G&S',
    tipoNegocio: 'tapiceria e instalaciones',
    categoria: 'Servicios',
    telefono: '573101001009',
    barrio: 'Jardin',
    direccion: 'Barrio Jardin, Mocoa',
    colorPrimario: '#1f2937',
    colorSecundario: '#14b8a6',
    banner: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80',
    delivery: false,
    products: [
      {
        sku: 'TAPICERIA-SILLA-001',
        nombre: 'Retapizado de silla',
        descripcion: 'Servicio de retapizado para silla de hogar u oficina.',
        marca: 'G&S',
        precio: 8500000,
        costo: 5000000,
        stock: 10,
        imagen: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80',
      },
      {
        sku: 'TAPICERIA-CORTINA-002',
        nombre: 'Instalacion de cortinas',
        descripcion: 'Instalacion residencial de cortinas y persianas.',
        marca: 'G&S',
        precio: 12000000,
        costo: 7600000,
        stock: 8,
        imagen: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=900&q=80',
      },
    ],
  },
  {
    slug: 'dev-content-mocoa',
    nombre: 'DEV CONTENT',
    tipoNegocio: 'Seguridad y Defensa Personal',
    categoria: 'Servicios',
    telefono: '573101001010',
    barrio: 'Centro',
    direccion: 'Centro, Mocoa',
    colorPrimario: '#111827',
    colorSecundario: '#38bdf8',
    banner: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&q=80',
    delivery: false,
    products: [
      {
        sku: 'DEV-CURSO-001',
        nombre: 'Clase de defensa personal',
        descripcion: 'Sesion de entrenamiento basico para defensa personal.',
        marca: 'DEV CONTENT',
        precio: 5000000,
        costo: 2500000,
        stock: 12,
        imagen: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=900&q=80',
      },
      {
        sku: 'DEV-ASESORIA-002',
        nombre: 'Asesoria de seguridad',
        descripcion: 'Revision basica de habitos y prevencion personal.',
        marca: 'DEV CONTENT',
        precio: 9000000,
        costo: 4500000,
        stock: 6,
        imagen: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&q=80',
      },
    ],
  },
  {
    slug: 'licograns-mocoa',
    nombre: 'LICOGRANS',
    tipoNegocio: 'Licorera',
    categoria: 'Bebidas',
    telefono: '573101001011',
    barrio: 'Centro',
    direccion: 'Centro, Mocoa',
    colorPrimario: '#7c2d12',
    colorSecundario: '#f59e0b',
    banner: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&q=80',
    delivery: true,
    products: [
      {
        sku: 'LICO-VINO-001',
        nombre: 'Vino tinto reserva',
        descripcion: 'Botella de vino para ocasiones especiales.',
        marca: 'LICOGRANS',
        precio: 4590000,
        costo: 3000000,
        stock: 18,
        imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&q=80',
      },
      {
        sku: 'LICO-CERVEZA-002',
        nombre: 'Six pack cerveza',
        descripcion: 'Paquete de seis unidades frias.',
        marca: 'LICOGRANS',
        precio: 2890000,
        costo: 1900000,
        stock: 24,
        imagen: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=900&q=80',
      },
    ],
  },
  {
    slug: 'lukygym-mocoa',
    nombre: 'LUKYGYM',
    tipoNegocio: 'gimnasio',
    categoria: 'Bienestar',
    telefono: '573101001012',
    barrio: 'Avenida',
    direccion: 'Avenida principal, Mocoa',
    colorPrimario: '#0f172a',
    colorSecundario: '#84cc16',
    banner: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80',
    logo: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80',
    delivery: false,
    products: [
      {
        sku: 'LUKY-MENSUAL-001',
        nombre: 'Plan mensual gimnasio',
        descripcion: 'Membresia mensual para entrenamiento libre.',
        marca: 'LUKYGYM',
        precio: 8000000,
        costo: 2500000,
        stock: 50,
        imagen: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
      },
      {
        sku: 'LUKY-CLASE-002',
        nombre: 'Clase funcional',
        descripcion: 'Sesion dirigida de entrenamiento funcional.',
        marca: 'LUKYGYM',
        precio: 1500000,
        costo: 500000,
        stock: 40,
        imagen: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80',
      },
    ],
  },
];

async function upsertMarketplaceDemoBusiness(
  business: DemoBusiness,
  options: { planId: string; planPrice: number; passwordHash: string; index: number },
) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: business.slug },
    update: {
      nombre: business.nombre,
      tipoNegocio: business.tipoNegocio,
      planId: options.planId,
      telefono: business.telefono,
      whatsapp: business.telefono,
      email: `${business.slug}@mocoastore.alexsters.works`,
      direccion: business.direccion,
      barrio: business.barrio,
      ciudad: 'Mocoa',
      estado: EstadoGeneral.ACTIVO,
    },
    create: {
      nombre: business.nombre,
      slug: business.slug,
      tipoNegocio: business.tipoNegocio,
      planId: options.planId,
      telefono: business.telefono,
      whatsapp: business.telefono,
      email: `${business.slug}@mocoastore.alexsters.works`,
      direccion: business.direccion,
      barrio: business.barrio,
      ciudad: 'Mocoa',
      estado: EstadoGeneral.ACTIVO,
    },
  });

  await prisma.businessSettings.upsert({
    where: { tenantId: tenant.id },
    update: {
      whatsapp: business.telefono,
      colorPrimario: business.colorPrimario,
      colorSecundario: business.colorSecundario,
      colorAcento: business.colorSecundario,
      banner: business.banner,
      logo: business.logo,
      eslogan: `Catalogo online de ${business.nombre} en Mocoa`,
      textoBienvenida: `Compra productos de ${business.nombre} y coordina por WhatsApp.`,
    },
    create: {
      tenantId: tenant.id,
      whatsapp: business.telefono,
      colorPrimario: business.colorPrimario,
      colorSecundario: business.colorSecundario,
      colorAcento: business.colorSecundario,
      banner: business.banner,
      logo: business.logo,
      eslogan: `Catalogo online de ${business.nombre} en Mocoa`,
      textoBienvenida: `Compra productos de ${business.nombre} y coordina por WhatsApp.`,
    },
  });

  await prisma.deliveryConfig.upsert({
    where: { tenantId: tenant.id },
    update: { activo: business.delivery, costoBase: 450000, radioKm: business.delivery ? 4 : 0 },
    create: {
      tenantId: tenant.id,
      activo: business.delivery,
      costoBase: 450000,
      radioKm: business.delivery ? 4 : 0,
      horarioInicio: '08:00',
      horarioFin: '20:00',
    },
  });

  await prisma.subscription.upsert({
    where: { id: `00000000-0000-4000-8000-${String(100 + options.index).padStart(12, '0')}` },
    update: { planId: options.planId, montoMensual: options.planPrice },
    create: {
      id: `00000000-0000-4000-8000-${String(100 + options.index).padStart(12, '0')}`,
      tenantId: tenant.id,
      planId: options.planId,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      montoMensual: options.planPrice,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: `admin@${business.slug}.com`,
      },
    },
    update: { nombre: `Admin ${business.nombre}`, estado: EstadoGeneral.ACTIVO },
    create: {
      tenantId: tenant.id,
      nombre: `Admin ${business.nombre}`,
      email: `admin@${business.slug}.com`,
      passwordHash: options.passwordHash,
      rol: RoleName.ADMIN_NEGOCIO,
      estado: EstadoGeneral.ACTIVO,
    },
  });

  const category = await prisma.category.upsert({
    where: {
      tenantId_nombre: {
        tenantId: tenant.id,
        nombre: business.categoria,
      },
    },
    update: { estado: EstadoGeneral.ACTIVO },
    create: {
      tenantId: tenant.id,
      nombre: business.categoria,
      descripcion: `Categoria principal de ${business.nombre}`,
    },
  });

  for (const product of business.products) {
    await prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: product.sku,
        },
      },
      update: {
        categoryId: category.id,
        nombre: product.nombre,
        descripcion: product.descripcion,
        marca: product.marca,
        costo: product.costo,
        precio: product.precio,
        stock: product.stock,
        stockMinimo: 2,
        imagenPrincipal: product.imagen,
        destacado: true,
        estado: EstadoGeneral.ACTIVO,
      },
      create: {
        tenantId: tenant.id,
        categoryId: category.id,
        sku: product.sku,
        nombre: product.nombre,
        descripcion: product.descripcion,
        marca: product.marca,
        costo: product.costo,
        precio: product.precio,
        stock: product.stock,
        stockMinimo: 2,
        imagenPrincipal: product.imagen,
        destacado: true,
        estado: EstadoGeneral.ACTIVO,
      },
    });
  }
}

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

  for (const [index, business] of marketplaceDemoBusinesses.entries()) {
    await upsertMarketplaceDemoBusiness(business, {
      planId: emprendedor.id,
      planPrice: emprendedor.precio,
      passwordHash,
      index: index + 4,
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      accion: 'SEED_EXECUTED',
      entidad: 'system',
      entidadId: tenant.id,
      metadata: {
        source: 'prisma/seed/seed.ts',
        marketplaceDemoBusinesses: marketplaceDemoBusinesses.length,
      },
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
