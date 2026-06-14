'use client';

import { Minus, Plus, Search, Send, ShoppingCart, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { availabilityLabel, availabilityVariant, formatCopCentavos } from '@/lib/format';
import { createOrder } from '@/services/orders/orders.service';
import { Business, Product } from '@/types/api';

interface CatalogClientProps {
  business: Business;
  products: Product[];
  primaryColor?: string;
  accentColor?: string;
  font?: string;
  showPrices?: boolean;
  showStock?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Ingresa tu nombre'),
  customerPhone: z.string().min(6, 'Ingresa tu telefono'),
  direccion: z.string().min(5, 'Ingresa tu direccion'),
  observaciones: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CatalogClient({
  business,
  products,
  primaryColor = '#0d9488',
  accentColor = '#f59e0b',
  font = 'Inter',
  showPrices = true,
  showStock = true,
}: CatalogClientProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      direccion: '',
      observaciones: '',
    },
  });

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.product.precio * item.quantity, 0),
    [items],
  );
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const categories = useMemo(
    () => [
      'Todas',
      ...Array.from(
        new Set(
          products
            .map((p) => p.category?.nombre)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
    ],
    [products],
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todas: products.length };
    for (const product of products) {
      const name = product.category?.nombre;
      if (name) counts[name] = (counts[name] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'Todas' || product.category?.nombre === category;
      const matchesQuery =
        !normalized ||
        [product.nombre, product.category?.nombre, product.marca, product.descripcion]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  function addProduct(product: Product) {
    if (product.stock <= 0) return;
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing) return [...current, { product, quantity: 1 }];
      if (existing.quantity >= product.stock) return current;
      return current.map((item) =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    setItems((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) return item;
          return { ...item, quantity: Math.min(Math.max(nextQuantity, 0), item.product.stock) };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  async function onSubmit(data: CheckoutFormValues) {
    if (items.length === 0) {
      toast.error('Agrega al menos un producto al carrito.');
      return;
    }
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        tenantSlug: business.slug,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        direccion: data.direccion,
        observaciones: data.observaciones || undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          cantidad: item.quantity,
        })),
      });
      setItems([]);
      form.reset();
      setCartOpen(false);
      toast.success(`Pedido recibido. Codigo: ${order.id.slice(0, 8).toUpperCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible crear el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: font }}>Catalogo</h2>
                <p className="text-muted-foreground">
                  Productos conectados al inventario de {business.nombre}
                </p>
              </div>
              {showStock && <Badge variant="secondary">Inventario en vivo</Badge>}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar productos"
                  className="pl-8"
                  placeholder="Buscar producto, marca o categoria"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={category === item ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategory(item)}
                    style={category === item ? { background: primaryColor, color: 'white', borderColor: primaryColor } : undefined}
                  >
                    {item}{' '}
                    <span className="ml-1 rounded-full bg-background/20 px-1.5 text-[10px]">
                      {categoryCounts[item] ?? 0}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-muted-foreground">No hay productos para este filtro.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((product) => (
                  <Card key={product.id} size="sm" className="group overflow-hidden border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative h-44 w-full bg-muted">
                      {product.imagenPrincipal ? (
                        <Image
                          src={product.imagenPrincipal}
                          alt={product.nombre}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 text-sm text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
                      {product.destacado && (
                        <Badge className="absolute top-2 left-2 bg-amber-500 text-white hover:bg-amber-500">
                          Destacado
                        </Badge>
                      )}
                      <Badge className="absolute right-2 top-2 border-0 text-white" style={{ background: primaryColor }}>
                        {product.stock > 0 ? 'Disponible' : 'Agotado'}
                      </Badge>
                    </div>
                    <CardContent className="space-y-2 pt-4">
                      <div className="flex items-center justify-between">
                        <Badge variant={availabilityVariant(product)}>{availabilityLabel(product)}</Badge>
                        {product.category && (
                          <span className="text-xs text-muted-foreground">{product.category.nombre}</span>
                        )}
                      </div>
                      <h3 className="cursor-pointer font-semibold hover:text-primary transition-colors" style={{ fontFamily: font }}>{product.nombre}</h3>
                      {showPrices ? (
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>{formatCopCentavos(product.precio)}</p>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">Consultar precio</p>
                      )}
                      {showStock && product.stock > 0 && product.stock <= 5 && (
                        <p className="text-xs font-medium" style={{ color: accentColor }}>
                          ¡Solo {product.stock} disponibles!
                        </p>
                      )}
                      {product.variants && product.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.variants.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [product.id]: v.id }))}
                              className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                                selectedVariants[product.id] === v.id
                                  ? 'border-primary bg-primary/10 text-primary font-medium'
                                  : 'border-border text-muted-foreground hover:border-primary/50'
                              }`}
                            >
                              {v.valor}
                            </button>
                          ))}
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full text-white"
                        onClick={() => addProduct(product)}
                        disabled={product.stock <= 0}
                        style={{ background: product.stock > 0 ? primaryColor : undefined }}
                      >
                        <Plus className="size-4" /> Agregar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <Card>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">Carrito</h2>
                    <Badge variant="secondary">
                      <ShoppingCart className="size-3" /> {totalItems}
                    </Badge>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Selecciona productos para iniciar un pedido.
                    </p>
                  ) : (
                    <div className="space-y-3 border-b pb-4">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.product.nombre}</p>
                            <p className="text-xs text-muted-foreground">{formatCopCentavos(item.product.precio)}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              title="Restar"
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                              title="Sumar"
                            >
                              <Plus className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeItem(item.product.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="size-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {items.length > 0 && showPrices && (
                    <div className="flex items-center justify-between border-b pb-4">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>{formatCopCentavos(subtotal)}</span>
                    </div>
                  )}

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="customerName">Nombre</Label>
                      <Input id="customerName" {...form.register('customerName')} />
                      {form.formState.errors.customerName && (
                        <p className="text-xs text-destructive">{form.formState.errors.customerName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="customerPhone">Telefono</Label>
                      <Input id="customerPhone" {...form.register('customerPhone')} />
                      {form.formState.errors.customerPhone && (
                        <p className="text-xs text-destructive">{form.formState.errors.customerPhone.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="direccion">Direccion</Label>
                      <Input id="direccion" {...form.register('direccion')} />
                      {form.formState.errors.direccion && (
                        <p className="text-xs text-destructive">{form.formState.errors.direccion.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="observaciones">Observaciones</Label>
                      <Input id="observaciones" {...form.register('observaciones')} />
                    </div>
                    <Button
                      type="submit"
                      className="w-full text-white"
                      disabled={isSubmitting || items.length === 0}
                      style={{ background: primaryColor }}
                    >
                      <Send className="size-4" />
                      {isSubmitting ? 'Enviando...' : 'Enviar pedido'}
                    </Button>
                  </form>

                  {items.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="w-full" onClick={clearCart}>
                      Vaciar carrito
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </section>

      {totalItems > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full px-5 text-sm font-medium text-white shadow-lg hover:opacity-90 lg:hidden"
          style={{ background: primaryColor }}
        >
          <ShoppingCart className="size-5" />
          {totalItems}
        </button>
      )}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Carrito ({totalItems})</SheetTitle>
            <SheetDescription>Revisa tus productos y envia tu pedido</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Tu carrito esta vacio</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.product.nombre}</p>
                      <p className="text-xs text-muted-foreground">{formatCopCentavos(item.product.precio)} c/u</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Separator />
                {showPrices && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subtotal</span>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>{formatCopCentavos(subtotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t p-4">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="mobile-customerName" className="text-sm">Nombre</Label>
                  <Input
                    id="mobile-customerName"
                    {...form.register('customerName')}
                    placeholder="Tu nombre"
                  />
                  {form.formState.errors.customerName && (
                    <p className="text-xs text-destructive">{form.formState.errors.customerName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mobile-customerPhone" className="text-sm">Telefono</Label>
                  <Input
                    id="mobile-customerPhone"
                    {...form.register('customerPhone')}
                    placeholder="Tu telefono"
                  />
                  {form.formState.errors.customerPhone && (
                    <p className="text-xs text-destructive">{form.formState.errors.customerPhone.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mobile-direccion" className="text-sm">Direccion</Label>
                  <Input
                    id="mobile-direccion"
                    {...form.register('direccion')}
                    placeholder="Tu direccion"
                  />
                  {form.formState.errors.direccion && (
                    <p className="text-xs text-destructive">{form.formState.errors.direccion.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mobile-observaciones" className="text-sm">Observaciones</Label>
                  <Input
                    id="mobile-observaciones"
                    {...form.register('observaciones')}
                    placeholder="Instrucciones especiales (opcional)"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full text-white"
                  disabled={isSubmitting}
                  style={{ background: primaryColor }}
                >
                  <Send className="size-4" />
                  {isSubmitting
                    ? 'Enviando...'
                    : showPrices
                      ? `Enviar pedido · ${formatCopCentavos(subtotal)}`
                      : 'Enviar pedido'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearCart}
                >
                  Vaciar carrito
                </Button>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
