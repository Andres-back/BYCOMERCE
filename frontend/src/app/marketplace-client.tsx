'use client';

import {
  ArrowRight, Building2, CheckCircle2, Coffee, Heart, MapPin, Package, Search,
  ShoppingBag, Store, Tag, Truck, UtensilsCrossed, X, Menu, Filter,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useGsapAnimation, useGsapStagger } from '@/hooks/use-gsap';
import { formatCopCentavos } from '@/lib/format';
import { Business, Product } from '@/types/api';

interface MarketplaceClientProps {
  businesses: Business[];
  featuredProducts: Product[];
}

const CATEGORIES = [
  { id: 'restaurantes', label: 'Restaurantes', icon: UtensilsCrossed },
  { id: 'calzado', label: 'Calzado', icon: ShoppingBag },
  { id: 'tiendas', label: 'Tiendas', icon: Store },
  { id: 'bebidas', label: 'Bebidas', icon: Coffee },
  { id: 'accesorios', label: 'Accesorios', icon: Tag },
  { id: 'servicios', label: 'Servicios', icon: Building2 },
] as const;

const BUSINESS_IMAGES: Record<string, string> = {
  'Calzado Selva': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'Lopbuk Gastrobar': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  'Tienda Demo Mocoa': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
};

const PRODUCT_IMAGES: Record<string, string> = {
  'Hamburguesa Clásica': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Zapatilla Urbana Café': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80',
  'Limonada Natural': 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600&q=80',
  'Arroz Premium 1kg': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',
};

function businessMatchesCategory(business: Business, categoryId: string) {
  if (categoryId === 'Todos') return true;
  if (categoryId === 'destacados') return (business._count?.products ?? 0) > 0;
  if (categoryId === 'domicilio') return Boolean(business.deliveryConfig?.activo);
  const type = business.tipoNegocio.toLowerCase();
  const matchers: Record<string, RegExp> = {
    restaurantes: /(restaurante|comida|cafe|cafeter|bar|gastro|panader|menu)/,
    calzado: /(calzado|zapato|tenis|sneaker)/,
    tiendas: /(tienda|mercado|super|abarrote|miscelanea|farmacia)/,
    bebidas: /(bebida|licor|bar|cafe|jugos)/,
    accesorios: /(accesorio|joya|reloj|bisuteria)/,
    servicios: /(servicio|belleza|spa|taller|asesoria)/,
  };
  return matchers[categoryId]?.test(type) ?? type.includes(categoryId.toLowerCase());
}

function businessVisual(business: Business) {
  return business.businessSettings?.banner || business.businessImages?.[0]?.url || BUSINESS_IMAGES[business.nombre] || null;
}

export function MarketplaceClient({ businesses, featuredProducts }: MarketplaceClientProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [location, setLocation] = useState('Todas');
  const [category, setCategory] = useState('Todas');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const businessTypes = useMemo(
    () => ['Todos', ...Array.from(new Set(businesses.map((b) => b.tipoNegocio))).sort()],
    [businesses],
  );
  const neighborhoods = useMemo(
    () => ['Todas', ...Array.from(new Set(businesses.map((b) => b.barrio ?? b.ciudad).filter(Boolean))).sort()],
    [businesses],
  );

  const filteredBusinesses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return businesses.filter((business) => {
      const matchesQuery = !normalized || [business.nombre, business.tipoNegocio, business.barrio, business.ciudad].filter(Boolean).some((value) => value?.toLowerCase().includes(normalized));
      const matchesCategory = businessMatchesCategory(business, activeCategory);
      const matchesLocation = location === 'Todas' || (business.barrio ?? business.ciudad) === location;
      const matchesCategoryFilter = category === 'Todas' || business.tipoNegocio.toLowerCase().includes(category.toLowerCase());
      return matchesQuery && matchesCategory && matchesLocation && matchesCategoryFilter;
    });
  }, [activeCategory, businesses, category, location, query]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return featuredProducts.filter((product) => {
      if (!normalized) return true;
      return [product.nombre, product.category?.nombre, product.tenant?.nombre, product.tenant?.tipoNegocio].filter(Boolean).some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [featuredProducts, query]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = businesses.filter((business) => businessMatchesCategory(business, cat.id)).length;
    }
    return counts;
  }, [businesses]);

  function clearFilters() { setQuery(''); setActiveCategory('Todos'); setLocation('Todas'); setCategory('Todas'); }

  const heroRef = useGsapAnimation<HTMLDivElement>({ preset: 'fadeIn', duration: 0.8 });
  const statsRef = useGsapStagger<HTMLDivElement>(3, { stagger: 0.12 });
  const businessRef = useGsapStagger<HTMLDivElement>(filteredBusinesses.length, { stagger: 0.06 });
  const productRef = useGsapStagger<HTMLDivElement>(filteredProducts.length, { stagger: 0.05 });

  const renderSidebarContent = () => (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 font-bold text-foreground">Explorar</h3>
          <nav className="space-y-1.5">
            {[
              { id: 'Todos', label: 'Todos los comercios', icon: Store },
              { id: 'destacados', label: 'Productos destacados', icon: Heart },
              { id: 'domicilio', label: 'Con domicilio', icon: Truck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveCategory(item.id); setSidebarOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  activeCategory === item.id ? 'bg-teal-50 text-teal-700' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className={cn('size-4', activeCategory === item.id ? 'text-teal-600' : 'text-muted-foreground')} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="my-5 border-t border-border" />

          <h3 className="mb-4 font-bold text-foreground">Categorías</h3>
          <nav className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(activeCategory === cat.id ? 'Todos' : cat.id); setSidebarOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    activeCategory === cat.id ? 'bg-teal-50 text-teal-700' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={cn('size-4', activeCategory === cat.id ? 'text-teal-600' : 'text-muted-foreground')} />
                    {cat.label}
                  </span>
                  {count > 0 && <Badge variant="secondary" className="ml-2 rounded-full text-xs px-2">{count}</Badge>}
                </button>
              );
            })}
          </nav>

          <Button variant="outline" className="mt-5 w-full border-border text-muted-foreground hover:text-foreground" onClick={clearFilters}>
            <X className="mr-2 size-3.5" />
            Limpiar filtros
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 px-4 py-10 md:py-16 lg:py-20">
        <div className="absolute inset-0 opacity-20">
          <Image src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80" alt="" fill className="object-cover" unoptimized priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        <div className="relative mx-auto max-w-7xl" ref={heroRef}>
          <div className="mb-6 max-w-2xl space-y-3 md:space-y-4">
            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl xl:text-6xl">
              Mocoa Market
            </h1>
            <p className="text-base text-teal-100 md:text-lg lg:text-xl">
              Descubre y apoya los mejores comercios locales en Mocoa, Putumayo.
            </p>
          </div>

          {/* Search */}
          <Card className="border-0 bg-card shadow-xl">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 pl-10 border-border" placeholder="Buscar comercio, producto o barrio..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Select value={location} onValueChange={(v) => setLocation(v ?? 'Todas')}>
                    <SelectTrigger className="h-11 w-full md:w-[160px] border-border">
                      <MapPin className="mr-2 size-4 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {neighborhoods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={category} onValueChange={(v) => setCategory(v ?? 'Todas')}>
                    <SelectTrigger className="h-11 w-full md:w-[160px] border-border">
                      <Tag className="mr-2 size-4 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="h-11 bg-teal-700 hover:bg-teal-800 shrink-0">
                  <Search className="mr-2 size-4" />
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Category Chips - scrollable on mobile */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? 'Todos' : cat.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                    activeCategory === cat.id ? 'bg-card text-teal-800 shadow-md' : 'bg-white/20 text-white hover:bg-white/30',
                  )}
                >
                  <Icon className="size-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto -mt-6 max-w-7xl px-4 md:-mt-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4" ref={statsRef}>
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center gap-4 p-5 md:p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-100 md:size-14">
                <Store className="size-6 text-teal-700 md:size-7" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold md:text-3xl">{businesses.length}</p>
                <p className="text-sm font-medium">Comercios activos</p>
                <p className="text-xs text-muted-foreground truncate">Negocios locales en Mocoa</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center gap-4 p-5 md:p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 md:size-14">
                <Package className="size-6 text-emerald-700 md:size-7" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold md:text-3xl">{featuredProducts.length}</p>
                <p className="text-sm font-medium">Productos destacados</p>
                <p className="text-xs text-muted-foreground truncate">Productos más populares</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center gap-4 p-5 md:p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 md:size-14">
                <Truck className="size-6 text-blue-700 md:size-7" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold md:text-3xl">{businesses.filter((b) => b.deliveryConfig?.activo).length}</p>
                <p className="text-sm font-medium">Con domicilio</p>
                <p className="text-xs text-muted-foreground truncate">Entregas a tu puerta</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="flex gap-8">
          {/* Sidebar - desktop */}
          <aside className="hidden w-64 shrink-0 lg:block">
            {renderSidebarContent()}
          </aside>

          {/* Mobile filter button */}
          <div className="fixed bottom-6 left-6 z-40 lg:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger render={<Button className="rounded-full shadow-lg bg-teal-700 hover:bg-teal-800" size="lg">
                <Filter className="mr-2 size-4" /> Filtros
              </Button>} />
              <SheetContent side="left" className="w-72 p-4">
                {renderSidebarContent()}
              </SheetContent>
            </Sheet>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-10 md:space-y-12">
            {/* Featured Businesses */}
            <div>
              <div className="mb-5 flex items-center justify-between md:mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold md:text-2xl">
                  <Heart className="size-5 text-teal-600 md:size-6" />
                  Comercios destacados
                </h2>
                <Link href="/marketplace" className="text-sm font-medium text-teal-700 hover:underline shrink-0">
                  Ver todos <ArrowRight className="inline size-4" />
                </Link>
              </div>

              {filteredBusinesses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="text-muted-foreground">No se encontraron comercios con esos filtros.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" ref={businessRef}>
                  {filteredBusinesses.map((business) => {
                    const cover = businessVisual(business);
                    const logo = business.businessSettings?.logo || business.logo;
                    const productCount = business._count?.products ?? 0;
                    const isOpen = productCount > 0;
                    return (
                      <Link key={business.id} href={`/negocio/${business.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:hover:border-teal-700">
                        <div className="relative h-28 w-full bg-gradient-to-br from-teal-700 to-emerald-800">
                          {cover && (
                            <Image src={cover} alt={business.nombre} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                          <Badge className={cn(
                            'absolute left-3 top-3 border-0 text-[10px] font-bold uppercase tracking-wide',
                            isOpen ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
                          )}>
                            {isOpen ? 'Abierto' : 'Proximamente'}
                          </Badge>
                          <div className="absolute -bottom-6 left-4 flex size-12 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-teal-700 text-sm font-black text-white shadow-sm">
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logo} alt={business.nombre} className="h-full w-full object-cover" />
                            ) : (
                              business.nombre.slice(0, 2).toUpperCase()
                            )}
                          </div>
                        </div>
                        <div className="space-y-3 p-4 pt-8">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-foreground transition-colors group-hover:text-teal-700 dark:group-hover:text-teal-300">{business.nombre}</h3>
                            <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{business.tipoNegocio}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex min-w-0 items-center gap-1 rounded-lg bg-muted/60 px-2 py-1.5">
                              <MapPin className="size-3.5 shrink-0" />
                              <span className="truncate">{business.barrio || business.ciudad || 'Mocoa'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1.5">
                              <ShoppingBag className="size-3.5" />
                              {productCount} productos
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                              1 sede
                            </span>
                            {business.deliveryConfig?.activo && (
                              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                                <Truck className="mr-1 size-3" /> Domicilio
                              </Badge>
                            )}
                          </div>
                          <span className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800 transition-colors group-hover:bg-teal-700 group-hover:text-white dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                            Ver tienda <ArrowRight className="size-4" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Featured Products */}
            <div>
              <div className="mb-5 flex items-center justify-between md:mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold md:text-2xl">
                  <Package className="size-5 text-teal-600 md:size-6" />
                  Productos destacados
                </h2>
                <Link href="/marketplace" className="text-sm font-medium text-teal-700 hover:underline shrink-0">
                  Ver todos <ArrowRight className="inline size-4" />
                </Link>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="text-muted-foreground">No se encontraron productos destacados.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" ref={productRef}>
                  {filteredProducts.map((product) => (
                    <Link key={`${product.tenantId ?? product.tenant?.id}-${product.id}`} href={`/negocio/${product.tenant?.slug ?? ''}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <div className="relative h-40 w-full md:h-44">
                        {PRODUCT_IMAGES[product.nombre] || product.imagenPrincipal ? (
                          <Image src={PRODUCT_IMAGES[product.nombre] || product.imagenPrincipal!} alt={product.nombre} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-sm text-muted-foreground">
                            Sin imagen
                          </div>
                        )}
                        <button className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-transform hover:scale-110">
                          <Heart className="size-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="space-y-2 p-3 md:p-4">
                        <Badge variant="secondary" className="text-xs truncate max-w-full">{product.tenant?.nombre ?? 'Comercio'}</Badge>
                        <h3 className="font-bold leading-tight text-foreground group-hover:text-teal-700 transition-colors text-sm md:text-base">{product.nombre}</h3>
                        <p className="text-base font-bold text-teal-700 md:text-lg">{formatCopCentavos(product.precio)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
