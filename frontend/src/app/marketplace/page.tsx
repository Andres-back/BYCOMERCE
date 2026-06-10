import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag, ArrowRight, Heart, MapPin, Tag, Package } from 'lucide-react';
import { listFeaturedProducts, listBusinesses } from '@/services/marketplace/marketplace.service';
import { formatCopCentavos } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Product } from '@/types/api';

const PRODUCT_IMAGES: Record<string, string> = {
  'Hamburguesa Clásica': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'Zapatilla Urbana Café': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80',
  'Limonada Natural': 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600&q=80',
  'Arroz Premium 1kg': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',
};

export default async function MarketplacePage() {
  const [products, businesses] = await Promise.all([
    listFeaturedProducts().catch(() => [] as Product[]),
    listBusinesses().catch(() => []),
  ]);

  const businessMap = Object.fromEntries(businesses.map((b) => [b.id, b]));

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/icono.png" alt="" width={32} height={32} className="rounded-lg" unoptimized />
            <span className="text-lg font-bold text-teal-800">Mocoa Market</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-teal-700">Comercios</Link>
            <Link href="/marketplace" className="text-sm font-medium text-teal-700">Productos</Link>
            <Link href="/auth/login" className="inline-flex h-8 items-center rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white md:text-4xl">Productos</h1>
          <p className="mt-2 text-teal-100">Explora todos los productos disponibles en los comercios de Mocoa</p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <Package className="mx-auto size-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No hay productos destacados disponibles.</p>
            <Link href="/" className="mt-4 inline-flex items-center text-sm font-medium text-teal-700 hover:underline">
              Ver comercios <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const business = product.tenant?.slug ? null : null;
              return (
                <Link
                  key={product.id}
                  href={`/negocio/${product.tenant?.slug ?? ''}`}
                  className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="relative h-44 w-full bg-gray-100">
                    {PRODUCT_IMAGES[product.nombre] || product.imagenPrincipal ? (
                      <Image src={PRODUCT_IMAGES[product.nombre] || product.imagenPrincipal!} alt={product.nombre} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Sin imagen
                      </div>
                    )}
                    <button className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-transform hover:scale-110">
                      <Heart className="size-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="space-y-2 p-4">
                    <Badge variant="secondary" className="text-xs">{product.tenant?.nombre ?? 'Comercio'}</Badge>
                    <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{product.nombre}</h3>
                    {product.category && <p className="text-xs text-gray-500">{product.category.nombre}</p>}
                    <p className="text-lg font-bold text-teal-700">{formatCopCentavos(product.precio)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
          &copy; 2024 Mocoa Market. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
