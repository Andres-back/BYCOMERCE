import { Injectable } from '@nestjs/common';

export interface BusinessTypePreset {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  categorias: string[];
  atributosProducto: string[];
  config: Record<string, unknown>;
  posConfig?: {
    mostrarMesas?: boolean;
    mostrarTiempoPreparacion?: boolean;
    metodosPago?: string[];
  };
  inventarioConfig?: {
    usarVariantes?: boolean;
    tipoVariantes?: string[];
    usarStockMinimo?: boolean;
  };
}

const PRESETS: Record<string, BusinessTypePreset> = {
  tienda: {
    id: 'tienda',
    nombre: 'Tienda',
    icono: 'tienda',
    descripcion: 'Tienda de barrio, abarrotes, miscelánea',
    categorias: ['Abarrotes', 'Lácteos', 'Bebidas', 'Aseo', 'Panadería', 'Confitería', 'Granos', 'Enlatados', 'Congelados', 'Otros'],
    atributosProducto: ['marca', 'sku'],
    config: { tipoVenta: 'unidad' },
    posConfig: { metodosPago: ['EFECTIVO', 'TRANSFERENCIA', 'MIXTO'] },
    inventarioConfig: { usarVariantes: false, usarStockMinimo: true, tipoVariantes: [] },
  },
  zapateria: {
    id: 'zapateria',
    nombre: 'Zapatería',
    icono: 'calzado',
    descripcion: 'Venta de calzado, tenis, zapatos',
    categorias: ['Zapatos Hombre', 'Zapatos Mujer', 'Tenis', 'Botas', 'Sandalias', 'Zapatillas', 'Accesorios', 'Infantil'],
    atributosProducto: ['marca', 'talla', 'color', 'material'],
    config: { tipoVenta: 'par' },
    posConfig: { metodosPago: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] },
    inventarioConfig: { usarVariantes: true, tipoVariantes: ['talla', 'color'], usarStockMinimo: true },
  },
  restaurante: {
    id: 'restaurante',
    nombre: 'Restaurante',
    icono: 'restaurantes',
    descripcion: 'Restaurante, cafetería, bar, comidas rápidas',
    categorias: ['Entradas', 'Platos Fuertes', 'Bebidas', 'Postres', 'Combos', 'Menú Infantil', 'Complementos', 'Salsas'],
    atributosProducto: ['ingredientes', 'tiempoPreparacion', 'porcion'],
    config: { tipoVenta: 'unidad' },
    posConfig: { mostrarMesas: true, mostrarTiempoPreparacion: true, metodosPago: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'] },
    inventarioConfig: { usarVariantes: false, usarStockMinimo: true, tipoVariantes: [] },
  },
  farmacia: {
    id: 'farmacia',
    nombre: 'Farmacia',
    icono: 'tienda',
    descripcion: 'Farmacia, droguería, productos de salud',
    categorias: ['Medicamentos', 'Cuidado Personal', 'Bebés', 'Vitaminas', 'Primeros Auxilios', 'Dermocosmética', 'Genéricos'],
    atributosProducto: ['laboratorio', 'principioActivo', 'presentacion', 'requiereReceta'],
    config: { tipoVenta: 'unidad' },
    posConfig: { metodosPago: ['EFECTIVO', 'TRANSFERENCIA'] },
    inventarioConfig: { usarVariantes: false, usarStockMinimo: true, tipoVariantes: [] },
  },
  ferreteria: {
    id: 'ferreteria',
    nombre: 'Ferretería',
    icono: 'tienda',
    descripcion: 'Ferretería, materiales de construcción, herramientas',
    categorias: ['Herramientas Manuales', 'Herramientas Eléctricas', 'Materiales Construcción', 'Tuberías', 'Electricidad', 'Pinturas', 'Ferretería General', 'Jardinería', 'Seguridad', 'Pegantes'],
    atributosProducto: ['marca', 'modelo', 'material', 'medida'],
    config: { tipoVenta: 'unidad' },
    posConfig: { metodosPago: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] },
    inventarioConfig: { usarVariantes: false, usarStockMinimo: true, tipoVariantes: [] },
  },
};

@Injectable()
export class BusinessTypesService {
  getPresets(): BusinessTypePreset[] {
    return Object.values(PRESETS);
  }

  getPreset(id: string): BusinessTypePreset | null {
    return PRESETS[id] ?? null;
  }

  getCategorias(tipo: string): string[] {
    return PRESETS[tipo]?.categorias ?? [];
  }

  getAtributos(tipo: string): string[] {
    return PRESETS[tipo]?.atributosProducto ?? [];
  }
}
