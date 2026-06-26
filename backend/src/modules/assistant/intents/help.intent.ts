import { IntentDefinition } from './intent.types';

interface HelpEntry {
  patterns: string[];
  topic: string;
  steps: string[];
  href?: string;
  label?: string;
}

const HELP_TOPICS: HelpEntry[] = [
  {
    patterns: ['crear producto', 'agregar producto', 'nuevo producto', 'cómo agrego', 'como agrego'],
    topic: 'Cómo crear un producto',
    steps: [
      '1. Ve a **Inventario** en el menú lateral',
      '2. Haz clic en el botón **"Nuevo Producto"** (arriba a la derecha)',
      '3. Completa: nombre, SKU, precio, costo, stock y categoría',
      '4. Opcional: sube una imagen, marca, código de barras, stock mínimo',
      '5. Haz clic en **"Guardar"**',
    ],
    href: '/admin/inventory',
    label: 'Ir a Inventario',
  },
  {
    patterns: ['cambiar logo', 'subir logo', 'cambiar imagen', 'logo del negocio', 'foto del negocio'],
    topic: 'Cómo cambiar el logo de tu negocio',
    steps: [
      '1. Ve a **Configuración** en el menú lateral',
      '2. Abre la pestaña **"Apariencia"**',
      '3. En la sección **"Logo del negocio"** haz clic en **"Subir"**',
      '4. Selecciona una imagen (PNG, JPG o WebP)',
      '5. No olvides hacer clic en **"Guardar apariencia"**',
    ],
    href: '/admin/settings',
    label: 'Ir a Configuración',
  },
  {
    patterns: ['cambiar colores', 'cambiar tema', 'color de la marca', 'paleta de colores', 'color primario'],
    topic: 'Cómo cambiar los colores de tu marca',
    steps: [
      '1. Ve a **Configuración** → pestaña **"Apariencia"**',
      '2. En la sección **"Paletas prediseñadas"** haz clic en una de las opciones',
      '3. O ajusta los colores manualmente con los selectores',
      '4. Haz clic en **"Guardar apariencia"**',
      'Los cambios se aplican a tu vitrina pública y panel admin.',
    ],
    href: '/admin/settings',
    label: 'Ir a Configuración',
  },
  {
    patterns: ['registrar venta', 'cómo vendo', 'como vendo', 'nueva venta', 'cobrar', 'punto de venta', 'usar pos', 'usar el pos'],
    topic: 'Cómo registrar una venta en el POS',
    steps: [
      '1. Ve a **Punto de Venta** en el menú lateral',
      '2. Haz clic en los productos para agregarlos al carrito (o búscalos por nombre)',
      '3. Opcional: agrega un cliente (crear nuevo o buscar existente)',
      '4. Selecciona el método de pago',
      '5. Si es efectivo, ingresa el monto recibido para calcular el cambio',
      '6. Haz clic en **"Cobrar"** para finalizar la venta',
    ],
    href: '/admin/pos',
    label: 'Ir al POS',
  },
  {
    patterns: ['agregar usuario', 'nuevo usuario', 'crear usuario', 'invitar usuario', 'invitar empleado'],
    topic: 'Cómo agregar un usuario a tu equipo',
    steps: [
      '1. Ve a **Usuarios** en el menú lateral',
      '2. Haz clic en **"Invitar Usuario"**',
      '3. Ingresa nombre, email y rol (Admin, Cajero, Domiciliario, etc.)',
      '4. El sistema generará una contraseña temporal que puedes compartir',
      '5. El usuario podrá cambiar su contraseña al iniciar sesión',
    ],
    href: '/admin/users',
    label: 'Ir a Usuarios',
  },
  {
    patterns: ['abrir caja', 'cerrar caja', 'estado de caja', 'movimiento de caja'],
    topic: 'Cómo abrir o cerrar la caja',
    steps: [
      '1. Ve a **Caja** en el menú lateral',
      '2. Si no tienes caja abierta, verás el botón **"Abrir caja"** — ingresa el saldo inicial',
      '3. Para cerrar, ve a la pestaña **"Movimientos"** y haz clic en **"Cerrar caja"**',
      '4. El sistema calculará el saldo final y los totales',
    ],
    href: '/admin/cash',
    label: 'Ir a Caja',
  },
  {
    patterns: ['subir imagen', 'cambiar foto', 'cargar imagen', 'subir foto producto'],
    topic: 'Cómo subir imágenes de productos',
    steps: [
      '1. Ve a **Inventario** y selecciona un producto (o crea uno nuevo)',
      '2. En el formulario verás un campo de imagen',
      '3. Haz clic en **"Subir"** y selecciona la imagen',
      '4. La imagen se sube a MinIO y queda asociada al producto',
    ],
    href: '/admin/inventory',
    label: 'Ir a Inventario',
  },
  {
    patterns: ['cancelar pedido', 'rechazar pedido'],
    topic: 'Cómo cancelar un pedido',
    steps: [
      '1. Ve a **Pedidos**',
      '2. Selecciona el pedido que quieres cancelar',
      '3. Haz clic en **"Cancelar"**',
      '4. Confirma e ingresa el motivo de la cancelación',
      '⚠️ Esta acción no se puede deshacer.',
    ],
    href: '/admin/orders',
    label: 'Ir a Pedidos',
  },
  {
    patterns: ['crear cliente', 'agregar cliente', 'nuevo cliente'],
    topic: 'Cómo crear un cliente',
    steps: [
      '1. Ve a **Clientes** en el menú lateral',
      '2. Haz clic en **"Nuevo Cliente"**',
      '3. Ingresa nombre (obligatorio), teléfono (obligatorio) y datos opcionales',
      '4. El segmento se calcula automáticamente según su historial',
    ],
    href: '/admin/customers',
    label: 'Ir a Clientes',
  },
  {
    patterns: ['categoría', 'categoria', 'crear categoría', 'nueva categoría'],
    topic: 'Cómo crear una categoría',
    steps: [
      '1. Ve a **Inventario** → pestaña **"Categorías"**',
      '2. Haz clic en **"Nueva Categoría"**',
      '3. Ingresa el nombre y una descripción opcional',
      '4. Haz clic en **"Guardar"**',
    ],
    href: '/admin/inventory',
    label: 'Ir a Inventario',
  },
  {
    patterns: ['reporte', 'informes', 'estadísticas', 'estadisticas', 'dashboard'],
    topic: 'Cómo ver reportes y estadísticas',
    steps: [
      '1. Ve a **Dashboard** (la página principal)',
      '2. Verás gráficos de ventas de los últimos días',
      '3. Usa los filtros de fecha para cambiar el periodo',
      '4. Para reportes detallados, ve a cada módulo (Ventas, Inventario, etc.)',
    ],
    href: '/admin',
    label: 'Ir al Dashboard',
  },
  {
    patterns: ['delivery', 'domicilio', 'activar entregas', 'configurar delivery'],
    topic: 'Cómo configurar el delivery',
    steps: [
      '1. Ve a **Configuración** → pestaña **"Delivery"**',
      '2. Activa el switch **"Delivery activo"**',
      '3. Configura el costo base, radio de cobertura y horarios',
      '4. Guarda los cambios',
    ],
    href: '/admin/settings',
    label: 'Ir a Configuración',
  },
];

export function createHelpIntents(): IntentDefinition[] {
  return [
    {
      name: 'help.how_to',
      description: 'Cómo hacer algo en el sistema',
      examples: [
        'cómo creo un producto',
        'cómo cambio el logo',
        'cómo registro una venta',
        'cómo agrego un usuario',
      ],
      keywords: ['como', 'cómo', 'hacer', 'configurar', 'cambiar', 'agregar', 'crear', 'subir', 'abrir', 'cerrar', 'registrar', 'cancelo', 'rechazar', 'reporte', 'informes'],
      async handle(q) {
        await Promise.resolve();
        const lower = q.toLowerCase();
        for (const entry of HELP_TOPICS) {
          if (entry.patterns.some((p) => lower.includes(p))) {
            return {
              answer: `📘 **${entry.topic}**\n\n${entry.steps.join('\n')}`,
              navigate: entry.href && entry.label ? [{ label: entry.label, href: entry.href }] : undefined,
              suggestions: ['¿Qué puedes hacer?', '¿Cuánto vendí hoy?'],
            };
          }
        }
        return {
          answer: '¿Sobre qué necesitas ayuda? Por ejemplo: "cómo creo un producto", "cómo cambio el logo", "cómo registro una venta".',
          suggestions: ['Cómo crear un producto', 'Cómo registrar una venta', 'Cómo cambiar el logo', 'Qué puedes hacer'],
        };
      },
    },
  ];
}
