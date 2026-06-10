import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">Pagina no encontrada</p>
      <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Volver al inicio
      </Link>
    </div>
  );
}