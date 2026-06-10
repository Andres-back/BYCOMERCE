import Link from 'next/link';
import Image from 'next/image';
import {
  listBusinesses,
  listFeaturedProducts,
} from '@/services/marketplace/marketplace.service';
import { MarketplaceClient } from './marketplace-client';
import { ShoppingBag, Truck, Shield, User } from 'lucide-react';

export default async function HomePage() {
  const [businesses, featuredProducts] = await Promise.all([
    listBusinesses().catch(() => []),
    listFeaturedProducts().catch(() => []),
  ]);

  return (
    <>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icons/icono.png"
              alt="Mocoa Market"
              width={36}
              height={36}
              className="rounded-lg"
              unoptimized
            />
            <span className="text-xl font-bold text-teal-800">Mocoa Market</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-teal-700">
              <ShoppingBag className="size-4" />
              Comercios
            </Link>
            <Link href="/marketplace" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-teal-700">
              <ShoppingBag className="size-4" />
              Productos
            </Link>
            <Link href="/marketplace" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-teal-700">
              <Truck className="size-4" />
              Domicilios
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
            >
              <Shield className="size-4" />
              Iniciar sesión
            </Link>
            <button className="flex size-9 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300">
              <User className="size-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <MarketplaceClient businesses={businesses} featuredProducts={featuredProducts} />

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <Image src="/icons/icono.png" alt="Mocoa Market" width={32} height={32} className="rounded-lg" unoptimized />
                <span className="text-xl font-bold text-teal-800">Mocoa Market</span>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Plataforma multi-tenant para comercios locales en Mocoa, Putumayo.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Enlaces</h4>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li><Link href="/" className="hover:text-teal-700">Inicio</Link></li>
                <li><Link href="/marketplace" className="hover:text-teal-700">Marketplace</Link></li>
                <li><Link href="/auth/login" className="hover:text-teal-700">Admin</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Legal</h4>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li><span className="cursor-default hover:text-teal-700">Términos de servicio</span></li>
                <li><span className="cursor-default hover:text-teal-700">Política de privacidad</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-6 text-center text-sm text-gray-500">
            &copy; 2024 Mocoa Market. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </>
  );
}
