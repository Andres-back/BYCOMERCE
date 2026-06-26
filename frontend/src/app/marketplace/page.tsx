import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Shield, Truck, User } from 'lucide-react';
import {
  listBusinesses,
  listFeaturedProducts,
} from '@/services/marketplace/marketplace.service';
import { MarketplaceClient } from '../marketplace-client';

export default async function MarketplacePage() {
  const [businesses, featuredProducts] = await Promise.all([
    listBusinesses().catch(() => []),
    listFeaturedProducts().catch(() => []),
  ]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-[1520px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icons/icono.png" alt="Mocoa Market" width={36} height={36} className="rounded-lg" unoptimized />
            <span className="text-xl font-black text-teal-800 dark:text-teal-300">Mocoa Market</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/marketplace#comercios" className="flex items-center gap-2 text-sm font-black text-teal-700 dark:text-teal-300">
              <ShoppingBag className="size-4" />
              Comercios
            </Link>
            <Link href="/marketplace#domicilios" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300">
              <Truck className="size-4" />
              Domicilios
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
            >
              <Shield className="size-4" />
              Admin
            </Link>
            <button className="hidden size-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 sm:flex">
              <User className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <MarketplaceClient businesses={businesses} featuredProducts={featuredProducts} />
    </>
  );
}
