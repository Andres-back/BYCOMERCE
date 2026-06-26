import {
  Clock,
  Facebook,
  Gem,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Utensils,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { getBusiness, listBusinessProducts } from '@/services/marketplace/marketplace.service';
import { CatalogClient } from './catalog-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function classifyBusiness(type: string) {
  const value = type.toLowerCase();
  if (/(restaurante|comida|cafe|cafeter|panader|bar|gastro|menu)/.test(value)) return 'food';
  if (/(ropa|vestido|moda|boutique|textil)/.test(value)) return 'fashion';
  if (/(zapato|calzado|tenis|sneaker)/.test(value)) return 'shoes';
  if (/(maquillaje|belleza|cosmetic|spa|unas)/.test(value)) return 'beauty';
  if (/(joya|joyer|accesorio|reloj)/.test(value)) return 'jewelry';
  if (/(tienda|mercado|super|abarrote|licor|farmacia)/.test(value)) return 'store';
  return 'generic';
}

function templateFor(type: string) {
  const kind = classifyBusiness(type);
  const templates = {
    food: {
      Icon: Utensils,
      eyebrow: 'Menu fresco y pedidos directos',
      title: 'Sabores listos para pedir',
      subtitle: 'Explora el menu, arma tu pedido y confirma disponibilidad por WhatsApp.',
      defaultColors: ['#0f766e', '#b45309', '#ef4444'],
      productLabel: 'Platos y combos destacados',
    },
    fashion: {
      Icon: Shirt,
      eyebrow: 'Colecciones seleccionadas',
      title: 'Moda con estilo propio',
      subtitle: 'Descubre prendas, tallas y referencias conectadas al inventario real.',
      defaultColors: ['#be123c', '#111827', '#f59e0b'],
      productLabel: 'Coleccion destacada',
    },
    shoes: {
      Icon: ShoppingBag,
      eyebrow: 'Calzado disponible hoy',
      title: 'Encuentra tu proximo par',
      subtitle: 'Consulta tallas, modelos y marcas con stock actualizado.',
      defaultColors: ['#1d4ed8', '#111827', '#f97316'],
      productLabel: 'Modelos destacados',
    },
    beauty: {
      Icon: Sparkles,
      eyebrow: 'Belleza y cuidado personal',
      title: 'Productos para tu rutina',
      subtitle: 'Explora tonos, marcas y disponibilidad antes de escribir.',
      defaultColors: ['#c026d3', '#831843', '#14b8a6'],
      productLabel: 'Favoritos de belleza',
    },
    jewelry: {
      Icon: Gem,
      eyebrow: 'Detalles con brillo',
      title: 'Piezas para regalar o estrenar',
      subtitle: 'Mira materiales, referencias y productos seleccionados por el comercio.',
      defaultColors: ['#92400e', '#111827', '#d97706'],
      productLabel: 'Piezas destacadas',
    },
    store: {
      Icon: Store,
      eyebrow: 'Compra local sin vueltas',
      title: 'Todo lo esencial en un catalogo',
      subtitle: 'Busca productos, revisa stock y coordina compra o recogida con la tienda.',
      defaultColors: ['#0d9488', '#334155', '#f59e0b'],
      productLabel: 'Productos populares',
    },
    generic: {
      Icon: Store,
      eyebrow: 'Catalogo conectado al inventario',
      title: 'Compra directo con el comercio',
      subtitle: 'Consulta productos, precios y disponibilidad desde una vitrina actualizada.',
      defaultColors: ['#0d9488', '#1f2937', '#f59e0b'],
      productLabel: 'Destacados',
    },
  } as const;
  return templates[kind];
}

export default async function BusinessPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusiness(slug).catch(() => null);
  if (!business) notFound();

  const products = await listBusinessProducts(slug).catch(() => []);
  const bs = business.businessSettings;
  const template = templateFor(business.tipoNegocio);
  const Icon = template.Icon;
  const [fallbackPrimary, fallbackSecondary, fallbackAccent] = template.defaultColors;
  const primary = bs?.colorPrimario ?? fallbackPrimary;
  const secondary = bs?.colorSecundario ?? fallbackSecondary;
  const accent = bs?.colorAcento ?? fallbackAccent;
  const font = bs?.fuente ?? 'Inter';
  const whatsapp = business.whatsapp ?? bs?.whatsapp;
  const logo = bs?.logo ?? business.logo;
  const gallery = business.businessImages ?? [];
  const showPrices = bs?.mostrarPrecios ?? true;
  const showStock = bs?.mostrarStock ?? true;
  const eslogan = bs?.eslogan ?? business.eslogan ?? null;
  const textoBienvenida = bs?.textoBienvenida ?? null;
  const heroImage =
    bs?.banner ||
    gallery[0]?.url ||
    products.find((product) => product.imagenPrincipal)?.imagenPrincipal ||
    null;
  const featuredProducts = [
    ...products.filter((product) => product.destacado),
    ...products.filter((product) => !product.destacado),
  ].slice(0, 3);

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola ${business.nombre}, quiero consultar productos del catalogo.`)}`
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={business.nombre} className="size-9 rounded-lg object-cover" />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: primary }}>
                {business.nombre.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate text-base font-bold" style={{ fontFamily: font, color: primary }}>
              {business.nombre}
            </span>
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            <Link href="/marketplace" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Marketplace
            </Link>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white hover:opacity-90"
                style={{ background: primary }}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
          </nav>
        </div>
      </header>

      <section
        className="relative min-h-[72vh] overflow-hidden"
        style={
          heroImage
            ? { backgroundImage: `linear-gradient(90deg, rgba(8,13,23,0.88), rgba(8,13,23,0.34)), url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, ${primary}, ${secondary})` }
        }
      >
        <div className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_420px]">
          <div className="max-w-3xl text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-medium">
              <Icon className="size-3.5" /> {template.eyebrow}
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl" style={{ fontFamily: font }}>
              {business.nombre}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/88">
              {eslogan || textoBienvenida || template.title}. {template.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
                  style={{ background: primary }}
                >
                  <MessageCircle className="size-4" /> Pedir por WhatsApp
                </a>
              )}
              <a
                href="#catalogo"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur hover:bg-white/18"
              >
                Ver catalogo
              </a>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-white/78">
              <span className="inline-flex items-center gap-1"><Store className="size-4" /> {business.tipoNegocio}</span>
              {business.direccion && <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {business.barrio || business.ciudad}</span>}
              {business.deliveryConfig?.activo && <span className="inline-flex items-center gap-1"><Truck className="size-4" /> Domicilio</span>}
              {showStock && <span className="inline-flex items-center gap-1"><Star className="size-4" /> Stock en vivo</span>}
            </div>
          </div>

          {featuredProducts.length > 0 && (
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-white/80">{template.productLabel}</p>
              {featuredProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 rounded-lg border border-white/18 bg-white/14 p-3 text-white backdrop-blur">
                  <div className="relative size-16 overflow-hidden rounded-md bg-white/15">
                    {product.imagenPrincipal ? (
                      <Image src={product.imagenPrincipal} alt={product.nombre} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs">Sin foto</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.nombre}</p>
                    {product.category?.nombre && <p className="text-xs text-white/65">{product.category.nombre}</p>}
                  </div>
                  {showPrices && <Badge className="border-white/20 bg-white/16 text-white hover:bg-white/16">Disponible</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:grid-cols-3">
          {business.direccion && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4" style={{ color: primary }} />
              <span>{business.direccion}{business.barrio ? `, ${business.barrio}` : ''} - {business.ciudad}</span>
            </div>
          )}
          {business.telefono && (
            <a href={`tel:${business.telefono}`} className="flex items-start gap-2 text-sm hover:text-primary">
              <Phone className="mt-0.5 size-4" style={{ color: primary }} /> {business.telefono}
            </a>
          )}
          {business.deliveryConfig?.horarioInicio && business.deliveryConfig.horarioFin && (
            <div className="flex items-start gap-2 text-sm">
              <Clock className="mt-0.5 size-4" style={{ color: primary }} />
              {business.deliveryConfig.horarioInicio} - {business.deliveryConfig.horarioFin}
            </div>
          )}
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gallery.slice(0, 8).map((img, index) => (
              <div key={img.id} className={index === 0 ? 'col-span-2 row-span-2 overflow-hidden rounded-lg' : 'overflow-hidden rounded-lg'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.titulo ?? business.nombre} className="aspect-square h-full w-full object-cover transition-transform hover:scale-105" />
              </div>
            ))}
          </div>
        </section>
      )}

      <div id="catalogo">
        <CatalogClient
          business={business}
          products={products}
          primaryColor={primary}
          accentColor={accent}
          font={font}
          showPrices={showPrices}
          showStock={showStock}
        />
      </div>

      {whatsappHref && (
        <section className="border-t py-12" style={{ background: `${primary}12` }}>
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: font }}>Compra directo con {business.nombre}</h2>
              <p className="mt-1 text-muted-foreground">Confirma disponibilidad, domicilio o recogida en el local por WhatsApp.</p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white hover:opacity-90"
              style={{ background: primary }}
            >
              <MessageCircle className="size-4" /> Escribir por WhatsApp
            </a>
          </div>
        </section>
      )}

      {(bs?.facebook || bs?.instagram || bs?.tiktok || bs?.sitioWeb) && (
        <section className="border-t py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-4 text-sm text-muted-foreground">
            {bs?.facebook && (
              <a href={bs.facebook.startsWith('http') ? bs.facebook : `https://facebook.com/${bs.facebook}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                <Facebook className="size-4" /> Facebook
              </a>
            )}
            {bs?.instagram && (
              <a href={bs.instagram.startsWith('http') ? bs.instagram : `https://instagram.com/${bs.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                <Instagram className="size-4" /> Instagram
              </a>
            )}
            {bs?.sitioWeb && (
              <a href={bs.sitioWeb.startsWith('http') ? bs.sitioWeb : `https://${bs.sitioWeb}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                <Globe className="size-4" /> Sitio web
              </a>
            )}
          </div>
        </section>
      )}

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; 2026 {business.nombre}. Powered by Mocoa Market.
      </footer>
    </>
  );
}
