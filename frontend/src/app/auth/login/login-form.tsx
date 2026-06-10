'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/stores/auth-store';

const loginSchema = z.object({
  email: z.email('Ingresa un email válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  tenantSlug: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_CREDENTIALS = [
  { label: 'Admin', email: 'admin@demo.com', password: 'Admin1234!', tenantSlug: 'tienda-demo-mocoa' },
  { label: 'Supervisor', email: 'supervisor@demo.com', password: 'Super1234!', tenantSlug: 'tienda-demo-mocoa' },
  { label: 'Cajero', email: 'cajero@demo.com', password: 'Cajero1234!', tenantSlug: 'tienda-demo-mocoa' },
];

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantSlug: '',
    },
  });

  async function onSubmit(data: LoginFormData) {
    setLoading(true);
    try {
      const result = await authService.login({
        email: data.email,
        password: data.password,
        tenantSlug: data.tenantSlug || undefined,
      });
      setSession(result.accessToken, result.user);
      if (result.refreshToken) {
        localStorage.setItem('mocoa_refresh_token', result.refreshToken);
      }
      router.push('/admin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(creds: (typeof DEMO_CREDENTIALS)[number]) {
    setValue('email', creds.email, { shouldValidate: true });
    setValue('password', creds.password, { shouldValidate: true });
    setValue('tenantSlug', creds.tenantSlug, { shouldValidate: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="size-4" />
        </div>
        <span className="text-lg font-bold">Mocoa Market</span>
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa con tus credenciales para acceder al panel
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-9"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantSlug">Negocio</Label>
          <Input
            id="tenantSlug"
            placeholder="Opcional — se detecta automáticamente"
            autoComplete="off"
            {...register('tenantSlug')}
          />
          {errors.tenantSlug && <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">Acceso rápido de demostración</p>
        <div className="flex gap-2">
          {DEMO_CREDENTIALS.map((creds) => (
            <Button
              key={creds.label}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              type="button"
              onClick={() => fillDemo(creds)}
              disabled={loading}
            >
              {creds.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}