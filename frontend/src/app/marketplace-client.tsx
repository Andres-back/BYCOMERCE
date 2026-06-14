'use client';

import {
  ArrowRight, Building2, CheckCircle2, ChevronLeft, ChevronRight, Coffee,
  Dumbbell, Flame, Hammer, Heart, MapPin, Package, Search, ShieldCheck,
  ShoppingBag, Sparkles, Store, Tag, Truck, UtensilsCrossed, X, Filter,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  { id: 'tiendas', label: 'Tiendas', icon: Store },
  { id: 'restaurantes', label: 'Restaurantes', icon: UtensilsCrossed },
  { id: 'moda', label: 'Moda y deporte', icon: ShoppingBag },
  { id: 'ferreteria', label: 'Ferreteria', icon: Hammer },
  { id: 'servicios', label: 'Servicios', icon: Building2 },
  { id: 'bienestar', label: 'Bienestar', icon: Dumbbell },
] as const;

const BUSINESS_IMAGES: Record<string, string> = {
  'ALFA': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80',
  'anmarg': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&q=80',
  'Calzado Selva': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80',
  'DISTRILUNA LTDA': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
  'FAST FOOD': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80',
  'Lopbuk Gastrobar': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
  'SIRIUSGASTROPUD': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80',
  'Tienda Demo Mocoa': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&q=80',
};

const PRODUCT_IMAGES: Record<string, string> = {
  'Burger Amazonica': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80',
  'Hamburguesa Clasica': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80',
  'Tenis urbanos negros': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=700&q=80',
  'Limonada Natural': 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=700&q=80',
  'Arroz Premium 1kg': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=700&q=80',
};

function businessMatchesCategory(business: Business, categoryId: string) {
  if (categoryId === 'Todos') return true;
  if (categoryId === 'destacados') return (business._count?.products ?? 0) > 0;
  if (categoryId === 'domicilio') return Boolean(business.deliveryConfig?.activo);
  const type = business.tipoNegocio.toLowerCase();
  const matchers: Record<string, RegExp> = {
    tiendas: /(tienda|mercado|super|abarrote|miscelanea|licor|vape)/,
    restaurantes: /(restaurante|comida|chef|cafe|cafeter|bar|gastro|panader|fast|menu)/,
    moda: /(moda|deportiva|ropa|calzado|zapato|tenis|sneaker|accesorio)/,
    ferreteria: /(ferreter|construccion|herramienta|material)/,
    servicios: /(servicio|seguridad|tapicer|instalacion|asesoria|content)/,
    bienestar: /(belleza|spa|gimnasio|gym|bienestar|salud)/,
  };
  return matchers[categoryId]?.test(type) ?? type.includes(categoryId.toLowerCase());
}

function businessVisual(business: Business) {
  return business.businessSettings?.banner
    || business.businessImages?.[0]?.url
    || BUSINESS_IMAGES[business.nombre]
    || null;
}

function productVisual(product: Product) {
  return PRODUCT_IMAGES[product.nombre] || product.imagenPrincipal || null;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function MarketplaceClient({ businesses, featuredProducts }: MarketplaceClientProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<'comercios' | 'ofertas' | 'novedades'>('comercios');
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
      const matchesQuery = !normalized
        || [business.nombre, business.tipoNegocio, business.barrio, business.ciudad]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalized));
      const matchesCategory = businessMatchesCategory(business, activeCategory);
      const matchesLocation = location === 'Todas' || (business.barrio ?? business.ciudad) === location;
      const matchesCategoryFilter = category === 'Todas'
        || business.tipoNegocio.toLowerCase().includes(category.toLowerCase());
      return matchesQuery && matchesCategory && matchesLocation && matchesCategoryFilter;
    });
  }, [activeCategory, businesses, category, location, query]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return featuredProducts.filter((product) => {
      if (!normalized) return true;
      return [product.nombre, product.category?.nombre, product.tenant?.nombre, product.tenant?.tipoNegocio]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [featuredProducts, query]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = businesses.filter((business) => businessMatchesCategory(business, cat.id)).length;
    }
    return counts;
  }, [businesses]);

  const metrics = useMemo(() => ({
    businesses: businesses.length,
    products: businesses.reduce((total, business) => total + (business._count?.products ?? 0), 0),
    delivery: businesses.filter((business) => business.deliveryConfig?.activo).length,
    verified: businesses.filter((business) => business.businessSettings?.logo || business.logo).length,
  }), [businesses]);

  const leadProduct = filteredProducts[0];
  const promoProducts = filteredProducts.slice(0, 4);

  function clearFilters() {
    setQuery('');
    setActiveCategory('Todos');
    setLocation('Todas');
    setCategory('Todas');
  }

  const heroRef = useGsapAnimation<HTMLDivElement>({ preset: 'fadeIn', duration: 0.8 });
  const businessRef = useGsapStagger<HTMLDivElement>(filteredBusinesses.length, { stagger: 0.05 });
  const productRef = useGsapStagger<HTMLDivElement>(promoProducts.length, { stagger: 0.05 });

  const filterPanel = (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
          <X className="mr-1 size-3.5" />
          Limpiar
        </Button>
      </div>
      <div className="grid gap-3">
        <Select value={location} onValueChange={(value) => setLocation(value ?? 'Todas')}>
          <SelectTrigger className="h-10 border-border bg-background">
            <MapPin className="mr-2 size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {neighborhoods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(value) => setCategory(value ?? 'Todas')}>
          <SelectTrigger className="h-10 border-border bg-background">
            <Tag className="mr-2 size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('destacados')}
          className={cn(
            'rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors',
            activeCategory === 'destacados' ? 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'border-border hover:bg-muted',
          )}
        >
          Destacados
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('domicilio')}
          className={cn(
            'rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors',
            activeCategory === 'domicilio' ? 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' : 'border-border hover:bg-muted',
          )}
        >
          Domicilio
        </button>
      </div>
    </div>
  );

  return (
    <main className="bg-[#f6f8f7] text-foreground dark:bg-background">
      <section className="mx-auto max-w-[1520px] px-4 py-5 sm:px-6 lg:px-8">
        <div ref={heroRef} className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_370px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid min-h-[320px] lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="relative h-full min-h-[430px] overflow-hidden bg-teal-900 p-6 text-white sm:p-8">
                <Image
                  src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1800&q=80"
                  alt=""
                  fill
                  className="object-cover opacity-35"
                  unoptimized
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-teal-950/95 via-teal-900/70 to-transparent" />
                <div className="relative flex h-full max-w-3xl flex-col justify-between gap-8">
                  <div>
                    <Badge className="border-0 bg-amber-400 text-xs font-black uppercase text-slate-950">
                      Marketplace local
                    </Badge>
                    <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                      Mocoa Market
                    </h1>
                    <p className="mt-4 max-w-xl text-base font-medium text-teal-50 sm:text-lg">
                      Comercios, productos y domicilios locales en una vitrina rapida para comprar por WhatsApp.
                    </p>
                  </div>
                  <div className="grid gap-3 rounded-xl bg-white/95 p-3 shadow-xl backdrop-blur md:grid-cols-[minmax(0,1fr)_180px_170px_auto] dark:bg-slate-950/95">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="h-11 border-border bg-background pl-10"
                        placeholder="Buscar comercios, productos o categorias..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <Select value={location} onValueChange={(value) => setLocation(value ?? 'Todas')}>
                      <SelectTrigger className="h-11 border-border bg-background">
                        <MapPin className="mr-2 size-4 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {neighborhoods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={category} onValueChange={(value) => setCategory(value ?? 'Todas')}>
                      <SelectTrigger className="h-11 border-border bg-background">
                        <Tag className="mr-2 size-4 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button className="h-11 bg-teal-700 px-5 font-bold text-white hover:bg-teal-800">
                      Buscar
                    </Button>
                  </div>
                </div>
                <button className="absolute left-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/30 md:flex">
                  <ChevronLeft className="size-5" />
                </button>
                <button className="absolute right-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/30 md:flex">
                  <ChevronRight className="size-5" />
                </button>
              </div>
              <div className="grid gap-3 border-t border-border bg-card p-4 lg:border-l lg:border-t-0">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-teal-700 dark:text-teal-300">Unete a Mocoa Market</p>
                  <p className="mt-1 text-sm text-muted-foreground">{metrics.businesses} comercios activos · {metrics.products} productos</p>
                  <Link href="/auth/register" className="mt-4 inline-flex w-full items-center justify-between rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-500">
                    Publicar comercio <ArrowRight className="size-4" />
                  </Link>
                </div>
                {leadProduct && (
                  <Link href={`/negocio/${leadProduct.tenant?.slug ?? ''}`} className="group relative min-h-[190px] overflow-hidden rounded-xl bg-slate-900 text-white">
                    {productVisual(leadProduct) && (
                      <Image src={productVisual(leadProduct)!} alt={leadProduct.nombre} fill className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-105" unoptimized />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                    <Badge className="absolute left-3 top-3 border-0 bg-amber-400 text-[10px] font-black uppercase text-slate-950">Destacado</Badge>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="line-clamp-2 text-sm font-black">{leadProduct.nombre}</p>
                      <p className="mt-1 text-xs text-white/75">{leadProduct.tenant?.nombre ?? 'Comercio'}</p>
                      <p className="mt-2 text-lg font-black">{formatCopCentavos(leadProduct.precio)}</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              {[
                { label: 'Comercios', value: metrics.businesses, icon: Store },
                { label: 'Productos', value: metrics.products, icon: Package },
                { label: 'Domicilios', value: metrics.delivery, icon: Truck },
                { label: 'Verificados', value: metrics.verified, icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/50 p-4 text-center">
                  <item.icon className="mx-auto size-5 text-teal-700 dark:text-teal-300" />
                  <p className="mt-2 text-2xl font-black text-teal-700 dark:text-teal-300">{item.value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            {filterPanel}
          </aside>
        </div>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide text-teal-800 dark:text-teal-300">Para ti</h2>
            <div className="hidden gap-2 md:flex">
              <button className="flex size-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted">
                <ChevronLeft className="size-4" />
              </button>
              <button className="flex size-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" ref={productRef}>
            {promoProducts.slice(0, 3).map((product, index) => (
              <Link key={`${product.id}-${index}`} href={`/negocio/${product.tenant?.slug ?? ''}`} className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-black text-foreground">{index === 0 ? 'Novedades' : index === 1 ? 'En oferta' : 'Recomendado'}</p>
                <div className="relative mt-3 h-32 overflow-hidden rounded-lg bg-muted">
                  {productVisual(product) ? (
                    <Image src={productVisual(product)!} alt={product.nombre} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sin imagen</div>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 min-h-[36px] text-sm font-medium">{product.nombre}</p>
                <p className="mt-1 text-sm font-black">{formatCopCentavos(product.precio)}</p>
                <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">Disponible</p>
              </Link>
            ))}
            {[
              { title: 'Comercios', copy: 'Explora tiendas locales.', icon: Store, action: 'Ver comercios' },
              { title: 'Ofertas', copy: 'Productos destacados hoy.', icon: Tag, action: 'Ver ofertas' },
              { title: 'Novedades', copy: 'Lo mas reciente del marketplace.', icon: Sparkles, action: 'Explorar' },
            ].map((item) => (
              <button key={item.title} type="button" onClick={() => setActiveTab(item.title.toLowerCase() as 'comercios' | 'ofertas' | 'novedades')} className="rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-black text-foreground">{item.title}</p>
                <div className="mx-auto mt-5 flex size-16 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-200">
                  <item.icon className="size-7" />
                </div>
                <p className="mt-5 min-h-[36px] text-center text-sm text-muted-foreground">{item.copy}</p>
                <span className="mt-5 flex h-9 items-center justify-center rounded-lg border border-teal-700 text-sm font-bold text-teal-700 dark:border-teal-500 dark:text-teal-200">
                  {item.action}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex gap-5 border-b border-border">
                  {[
                    { id: 'comercios', label: 'Comercios' },
                    { id: 'ofertas', label: 'Ofertas' },
                    { id: 'novedades', label: 'Novedades' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as 'comercios' | 'ofertas' | 'novedades')}
                      className={cn(
                        '-mb-px border-b-2 px-1 pb-3 text-sm font-black transition-colors',
                        activeTab === tab.id ? 'border-amber-400 text-teal-800 dark:text-teal-300' : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{filteredBusinesses.length} comercios encontrados</p>
              </div>
              <div className="lg:hidden">
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger render={<Button variant="outline" className="w-full">
                    <Filter className="mr-2 size-4" /> Filtros
                  </Button>} />
                  <SheetContent side="left" className="w-80 p-4">
                    {filterPanel}
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setActiveCategory('Todos')}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-sm font-black transition-colors',
                  activeCategory === 'Todos' ? 'border-teal-700 bg-teal-700 text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                Todos
              </button>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = categoryCounts[cat.id] ?? 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(activeCategory === cat.id ? 'Todos' : cat.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors',
                      activeCategory === cat.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {cat.label}
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredBusinesses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <Store className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-3 font-bold">No se encontraron comercios</p>
                <p className="mt-1 text-sm text-muted-foreground">Ajusta la busqueda o limpia los filtros.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" ref={businessRef}>
                {filteredBusinesses.map((business) => {
                  const cover = businessVisual(business);
                  const logo = business.businessSettings?.logo || business.logo;
                  const productCount = business._count?.products ?? 0;
                  const isOpen = productCount > 0;
                  return (
                    <Link key={business.id} href={`/negocio/${business.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:hover:border-teal-700">
                      <div className="relative h-40 bg-gradient-to-br from-slate-900 to-teal-900">
                        {cover && (
                          <Image src={cover} alt={business.nombre} fill className="object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" unoptimized />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <Badge className={cn('absolute right-3 top-3 border-0 text-[10px] font-black uppercase', isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white')}>
                          {isOpen ? 'Abierto' : 'Proximamente'}
                        </Badge>
                        <div className="absolute -bottom-7 left-4 flex size-14 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-teal-700 text-sm font-black text-white shadow-sm">
                          {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt={business.nombre} className="h-full w-full object-cover" />
                          ) : (
                            initials(business.nombre)
                          )}
                        </div>
                      </div>
                      <div className="space-y-3 p-4 pt-9">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300">{business.nombre}</h3>
                            <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{business.tipoNegocio}</p>
                          </div>
                          {(logo || business.businessSettings?.banner) && <CheckCircle2 className="mt-1 size-5 shrink-0 text-emerald-600" />}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                            <MapPin className="size-3.5" />
                            {business.ciudad || 'Mocoa'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                            <ShoppingBag className="size-3.5" />
                            {productCount} productos
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                            <Store className="size-3.5" />
                            1 sede
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          {business.deliveryConfig?.activo ? (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                              <Truck className="mr-1 size-3" /> Domicilio
                            </Badge>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">Recoger en tienda</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-sm font-black text-teal-700 dark:text-teal-300">
                            Ver tienda <ArrowRight className="size-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-black text-teal-800 dark:text-teal-300">
                <Flame className="size-5" />
                Promos del momento
              </h3>
              <div className="mt-4 space-y-3">
                {promoProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin promociones destacadas.</p>
                ) : promoProducts.map((product) => (
                  <Link key={`promo-${product.id}`} href={`/negocio/${product.tenant?.slug ?? ''}`} className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {productVisual(product) && (
                        <Image src={productVisual(product)!} alt={product.nombre} fill className="object-cover" unoptimized />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold">{product.nombre}</p>
                      <p className="text-sm font-black text-teal-700 dark:text-teal-300">{formatCopCentavos(product.precio)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-base font-black">Tienes un comercio?</h3>
              <p className="mt-2 text-sm text-muted-foreground">Publica tu catalogo, controla inventario y recibe pedidos por WhatsApp.</p>
              <Link href="/auth/register" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-black text-white hover:bg-teal-800">
                Empezar <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
