export const EventCatalog = {
  INVENTORY: {
    PRODUCTO_CREADO: 'inventario.producto.creado',
    PRODUCTO_EDITADO: 'inventario.producto.editado',
    PRODUCTO_ELIMINADO: 'inventario.producto.eliminado',
    STOCK_AJUSTADO: 'inventario.stock.ajustado',
    STOCK_BAJO: 'inventario.stock.bajo',
    COMPRA_REGISTRADA: 'inventario.compra.registrada',
  },
  POS: {
    VENTA_REALIZADA: 'pos.venta.realizada',
    VENTA_ANULADA: 'pos.venta.anulada',
    DEVOLUCION_REALIZADA: 'pos.devolucion.realizada',
    CAJA_ABIERTA: 'pos.caja.abierta',
    CAJA_CERRADA: 'pos.caja.cerrada',
    GASTO_REGISTRADO: 'pos.gasto.registrado',
  },
  ORDERS: {
    PEDIDO_CREADO: 'orders.pedido.creado',
    PEDIDO_CONFIRMADO: 'orders.pedido.confirmado',
    PEDIDO_RECHAZADO: 'orders.pedido.rechazado',
    PEDIDO_ENTREGADO: 'orders.pedido.entregado',
    PEDIDO_CANCELADO: 'orders.pedido.cancelado',
    DOMICILIARIO_ASIGNADO: 'orders.domiciliario.asignado',
  },
  CRM: {
    CLIENTE_CREADO: 'crm.cliente.creado',
    CLIENTE_ACTUALIZADO: 'crm.cliente.actualizado',
    COMPRA_REALIZADA: 'crm.compra.realizada',
  },
  SUBSCRIPTION: {
    SUSCRIPCION_CREADA: 'subscription.creada',
    SUSCRIPCION_RENOVADA: 'subscription.renovada',
    SUSCRIPCION_CANCELADA: 'subscription.cancelada',
    PAGO_RECIBIDO: 'subscription.pago.recibido',
    PAGO_FALLIDO: 'subscription.pago.fallido',
  },
  SYSTEM: {
    USUARIO_INVITADO: 'system.usuario.invitado',
    USUARIO_ACTIVO: 'system.usuario.activo',
    TENANT_ACTIVO: 'system.tenant.activo',
    TENANT_SUSPENDIDO: 'system.tenant.suspendido',
    ALERTA_STOCK: 'system.alerta.stock',
  },
} as const;

type CatalogType = typeof EventCatalog;
export type EventName =
  | CatalogType['INVENTORY'][keyof CatalogType['INVENTORY']]
  | CatalogType['POS'][keyof CatalogType['POS']]
  | CatalogType['ORDERS'][keyof CatalogType['ORDERS']]
  | CatalogType['CRM'][keyof CatalogType['CRM']]
  | CatalogType['SUBSCRIPTION'][keyof CatalogType['SUBSCRIPTION']]
  | CatalogType['SYSTEM'][keyof CatalogType['SYSTEM']];
