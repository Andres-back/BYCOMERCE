import { MessageCircle, MapPin, Phone, Clock, Truck, Globe, Facebook, Instagram } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getBusiness,
  listBusinessProducts,
} from '@/services/marketplace/marketplace.service';
import { Badge } from '@/components/ui/badge';
import { CatalogClient } from './catalog-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BusinessPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusiness(slug).catch(() => null);
  if (!business) notFound();

  const products = await listBusinessProducts(slug).catch(() => []);
  const bs = business.businessSettings;
  const whatsapp = business.whatsapp ?? bs?.whatsapp;
  const banner = bs?.banner;
  const logo = bs?.logo ?? business.logo;
  const primary = bs?.colorPrimario ?? '#0d9488';
  const secondary = bs?.colorSecundario ?? '#0f766e';
  const accent = bs?.colorAcento ?? '#f59e0b';
  const font = bs?.fuente ?? 'Inter';
  const showPrices = bs?.mostrarPrecios ?? true;
  const showStock = bs?.mostrarStock ?? true;
  const eslogan = bs?.eslogan ?? business.eslogan ?? null;
  const textoBienvenida = bs?.textoBienvenida ?? null;
  const gallery = business.businessImages ?? [];

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola ${business.nombre}, quiero consultar productos del catalogo.`)}`
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={business.nombre} className="size-8 rounded-lg object-cover" />
            )}
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: font, color: primary }}>
              {business.nombre}
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-white hover:opacity-90"
                style={{ background: primary }}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Volver al marketplace
            </Link>
          </nav>
        </div>
      </header>

      <section
        className={
          banner
            ? 'relative bg-cover bg-center py-16 md:py-24'
            : 'border-b py-16 md:py-20'
        }
        style={
          banner
            ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.24)), url(${banner})` }
            : { background: `linear-gradient(135deg, ${primary}15, ${secondary}10)` }
        }
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            {logo ? (
              <Image
                src={logo}
                alt={business.nombre}
                width={80}
                height={80}
                className="rounded-full border-2 border-white/30 shadow-md"
                unoptimized
              />
            ) : (
              <div
                className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
                style={{ background: primary, fontFamily: font }}
              >
                {business.nombre.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className={banner ? 'text-white' : ''}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={banner ? 'outline' : 'secondary'} className={banner ? 'border-white/30 text-white' : ''}>
                  {business.tipoNegocio}
                </Badge>
                {business.deliveryConfig?.activo && (
                  <Badge variant={banner ? 'outline' : 'default'} className={banner ? 'border-white/30 text-white' : ''}>
                    <Truck className="mr-1 size-3" /> Domicilio
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: font }}>{business.nombre}</h1>
              {eslogan && (
                <p className={`mt-1 text-base italic ${banner ? 'text-white/90' : 'text-muted-foreground'}`} style={{ fontFamily: font }}>
                  {eslogan}
                </p>
              )}
              {business.direccion && (
                <p className={`mt-2 flex items-center gap-1 text-sm ${banner ? 'text-white/80' : 'text-muted-foreground'}`}>
                  <MapPin className="size-4" /> {business.direccion}{business.barrio ? `, ${business.barrio}` : ''} - {business.ciudad}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {business.telefono && (
                  <a href={`tel:${business.telefono}`} className={`flex items-center gap-1 text-sm ${banner ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Phone className="size-3.5" /> {business.telefono}
                  </a>
                )}
                {business.deliveryConfig?.horarioInicio && business.deliveryConfig.horarioFin && (
                  <span className={`flex items-center gap-1 text-sm ${banner ? 'text-white/70' : 'text-muted-foreground'}`}>
                    <Clock className="size-3.5" /> {business.deliveryConfig.horarioInicio} - {business.deliveryConfig.horarioFin}
                  </span>
                )}
              </div>
              {(bs?.facebook || bs?.instagram || bs?.tiktok || bs?.sitioWeb) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {bs?.facebook && (
                    <a href={bs.facebook.startsWith('http') ? bs.facebook : `https://facebook.com/${bs.facebook}`} target="_blank" rel="noreferrer" className={banner ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}>
                      <Facebook className="size-4" />
                    </a>
                  )}
                  {bs?.instagram && (
                    <a href={bs.instagram.startsWith('http') ? bs.instagram : `https://instagram.com/${bs.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className={banner ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}>
                      <Instagram className="size-4" />
                    </a>
                  )}
                  {bs?.sitioWeb && (
                    <a href={bs.sitioWeb.startsWith('http') ? bs.sitioWeb : `https://${bs.sitioWeb}`} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-sm ${banner ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                      <Globe className="size-3.5" /> Web
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {textoBienvenida && (
            <p className={`mt-4 max-w-2xl text-sm ${banner ? 'text-white/80' : 'text-muted-foreground'}`}>
              {textoBienvenida}
            </p>
          )}

          <div className={`mt-4 flex flex-wrap gap-3 ${banner ? 'text-white/70' : 'text-muted-foreground'}`}>
            <span className="text-sm">{products.length} productos disponibles</span>
            {business.deliveryConfig?.activo && (
              <span className="text-sm">Domicilio hasta {business.deliveryConfig.radioKm} km</span>
            )}
            {!showPrices && <Badge variant="outline" className={banner ? 'border-white/30 text-white' : ''}>Solo cotización</Badge>}
            {showStock && <Badge variant="outline" className={banner ? 'border-white/30 text-white' : ''}>Stock en vivo</Badge>}
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {gallery.slice(0, 8).map((img) => (
              <div key={img.id} className="overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.titulo ?? business.nombre} className="aspect-square h-full w-full object-cover transition-transform hover:scale-105" />
              </div>
            ))}
          </div>
        </section>
      )}

      <CatalogClient
        business={business}
        products={products}
        primaryColor={primary}
        accentColor={accent}
        font={font}
        showPrices={showPrices}
        showStock={showStock}
      />

      {whatsappHref && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
            <MessageCircle className="mx-auto size-10" style={{ color: primary }} />
            <h2 className="mt-4 text-xl font-bold" style={{ fontFamily: font }}>Contacta a {business.nombre}</h2>
            <p className="mt-2 text-muted-foreground">
              Haz tu pedido o consulta disponibilidad directamente por WhatsApp
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-6 text-sm font-medium text-white hover:bg-green-700"
            >
              <MessageCircle className="size-4" /> Escribir por WhatsApp
            </a>
          </div>
        </section>
      )}

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; 2024 {business.nombre}. Powered by Mocoa Market.
      </footer>
    </>
  );
}