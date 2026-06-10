import { Store, Check } from 'lucide-react';
import { LoginForm } from './login-form';

const features = [
  'Inventario y productos en tiempo real',
  'Punto de venta y gestión de caja',
  'Pedidos, clientes y deliveries integrados',
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/20">
            <Store className="size-5" />
          </div>
          <span className="text-xl font-bold">Mocoa Market</span>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Digitaliza tu negocio en Mocoa
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              Gestiona inventario, ventas, clientes y deliveries desde un solo lugar.
            </p>
          </div>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Check className="size-3" strokeWidth={3} />
                </div>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Mocoa, Putumayo — Tecnología para tu negocio
        </p>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}