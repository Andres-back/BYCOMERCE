'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, RefreshCw, Save, Palette, ImageIcon, Type, Sparkles, Trash2, Loader2, Bell,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader, MultiImageUploader } from '@/components/shared/image-uploader';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import {
  getBusinessProfile,
  updateBusinessProfile,
  listGallery,
  addGalleryImage,
  deleteGalleryImage,
} from '@/services/tenant/tenant.service';
import { useAuthStore } from '@/stores/auth-store';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { getPreferences, updatePreferences } from '@/services/notifications/notifications.service';

const infoSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  tipoNegocio: z.string().min(1, 'Requerido'),
  eslogan: z.string().optional(),
  textoBienvenida: z.string().optional(),
  direccion: z.string().optional(),
  barrio: z.string().optional(),
});
type InfoForm = z.infer<typeof infoSchema>;

const contactSchema = z.object({
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  sitioWeb: z.string().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

const deliverySchema = z.object({
  deliveryActivo: z.boolean(),
  deliveryCostoBase: z.number().min(0),
  deliveryRadioKm: z.number().min(0),
  deliveryHorarioInicio: z.string().optional(),
  deliveryHorarioFin: z.string().optional(),
});
type DeliveryForm = z.infer<typeof deliverySchema>;

const socialSchema = z.object({
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
});
type SocialForm = z.infer<typeof socialSchema>;

const appearanceSchema = z.object({
  logo: z.string().optional().nullable(),
  banner: z.string().optional().nullable(),
  colorPrimario: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color hexadecimal inválido')
    .optional()
    .or(z.literal('')),
  colorSecundario: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color hexadecimal inválido')
    .optional()
    .or(z.literal('')),
  colorAcento: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color hexadecimal inválido')
    .optional()
    .or(z.literal('')),
  fuente: z.string().optional(),
  modoTema: z.enum(['CLARO', 'OSCURO', 'AUTO']),
  radioTarjeta: z.enum(['NINGUNO', 'PEQUENO', 'MEDIO', 'GRANDE', 'COMPLETO']),
  mostrarPrecios: z.boolean(),
  mostrarStock: z.boolean(),
});
type AppearanceForm = z.infer<typeof appearanceSchema>;

const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato'] as const;

const PRESET_PALETTES = [
  { nombre: 'Mocoa Verde', primario: '#0d9488', secundario: '#0f766e', acento: '#f59e0b' },
  { nombre: 'Azul Cielo', primario: '#2563eb', secundario: '#1d4ed8', acento: '#f97316' },
  { nombre: 'Rosa Fresa', primario: '#e11d48', secundario: '#be123c', acento: '#fbbf24' },
  { nombre: 'Morado Real', primario: '#7c3aed', secundario: '#6d28d9', acento: '#10b981' },
  { nombre: 'Naranja Sol', primario: '#ea580c', secundario: '#c2410c', acento: '#0ea5e9' },
  { nombre: 'Café Tierra', primario: '#78350f', secundario: '#92400e', acento: '#facc15' },
  { nombre: 'Verde Bosque', primario: '#16a34a', secundario: '#15803d', acento: '#f43f5e' },
  { nombre: 'Grafito', primario: '#1f2937', secundario: '#374151', acento: '#22d3ee' },
];

const RADIO_OPTIONS = [
  { value: 'NINGUNO', label: 'Sin bordes', class: 'rounded-none' },
  { value: 'PEQUENO', label: 'Pequeño (4px)', class: 'rounded' },
  { value: 'MEDIO', label: 'Medio (8px)', class: 'rounded-lg' },
  { value: 'GRANDE', label: 'Grande (16px)', class: 'rounded-2xl' },
  { value: 'COMPLETO', label: 'Completo (píldora)', class: 'rounded-full' },
] as const;

export default function SettingsClient() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.tenant.profile,
    queryFn: () => getBusinessProfile(token!),
    enabled: !!token,
  });

  const { data: gallery, isLoading: galleryLoading } = useQuery({
    queryKey: queryKeys.tenant.gallery,
    queryFn: () => listGallery(token!),
    enabled: !!token,
  });

  useEffect(() => {
    if (gallery) setGalleryUrls(gallery.map((g) => g.url));
  }, [gallery]);

  const infoForm = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: { nombre: '', tipoNegocio: '', eslogan: '', textoBienvenida: '', direccion: '', barrio: '' },
  });

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { telefono: '', whatsapp: '', email: '', sitioWeb: '' },
  });

  const deliveryForm = useForm<DeliveryForm>({
    resolver: zodResolver(deliverySchema),
    defaultValues: { deliveryActivo: false, deliveryCostoBase: 0, deliveryRadioKm: 0, deliveryHorarioInicio: '', deliveryHorarioFin: '' },
  });

  const socialForm = useForm<SocialForm>({
    resolver: zodResolver(socialSchema),
    defaultValues: { facebook: '', instagram: '', tiktok: '', youtube: '' },
  });

  const appearanceForm = useForm<AppearanceForm>({
    resolver: zodResolver(appearanceSchema) as never,
    defaultValues: {
      logo: null,
      banner: null,
      colorPrimario: '#0d9488',
      colorSecundario: '#0f766e',
      colorAcento: '#f59e0b',
      fuente: 'Inter',
      modoTema: 'CLARO',
      radioTarjeta: 'MEDIO',
      mostrarPrecios: true,
      mostrarStock: true,
    },
  });

  useEffect(() => {
    if (!business) return;
    infoForm.reset({
      nombre: business.nombre ?? '',
      tipoNegocio: business.tipoNegocio ?? '',
      eslogan: business.eslogan ?? business.businessSettings?.eslogan ?? '',
      textoBienvenida: business.businessSettings?.textoBienvenida ?? '',
      direccion: business.direccion ?? '',
      barrio: business.barrio ?? '',
    });
    contactForm.reset({
      telefono: business.telefono ?? '',
      whatsapp: business.whatsapp ?? '',
      email: business.email ?? '',
      sitioWeb: business.businessSettings?.sitioWeb ?? '',
    });
    deliveryForm.reset({
      deliveryActivo: business.deliveryConfig?.activo ?? false,
      deliveryCostoBase: business.deliveryConfig?.costoBase ?? 0,
      deliveryRadioKm: business.deliveryConfig?.radioKm ?? 0,
      deliveryHorarioInicio: business.deliveryConfig?.horarioInicio ?? '',
      deliveryHorarioFin: business.deliveryConfig?.horarioFin ?? '',
    });
    socialForm.reset({
      facebook: business.businessSettings?.facebook ?? '',
      instagram: business.businessSettings?.instagram ?? '',
      tiktok: business.businessSettings?.tiktok ?? '',
      youtube: business.businessSettings?.youtube ?? '',
    });
    appearanceForm.reset({
      logo: business.businessSettings?.logo ?? business.logo ?? null,
      banner: business.businessSettings?.banner ?? null,
      colorPrimario: business.businessSettings?.colorPrimario ?? '#0d9488',
      colorSecundario: business.businessSettings?.colorSecundario ?? '#0f766e',
      colorAcento: business.businessSettings?.colorAcento ?? '#f59e0b',
      fuente: business.businessSettings?.fuente ?? 'Inter',
      modoTema: (business.businessSettings?.modoTema as 'CLARO' | 'OSCURO' | 'AUTO') ?? 'CLARO',
      radioTarjeta: (business.businessSettings?.radioTarjeta as AppearanceForm['radioTarjeta']) ?? 'MEDIO',
      mostrarPrecios: business.businessSettings?.mostrarPrecios ?? true,
      mostrarStock: business.businessSettings?.mostrarStock ?? true,
    });
  }, [business]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateBusinessProfile(token!, data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.tenant.profile, updated);
      toast.success('Configuración guardada');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar'),
  });

  const addImageMutation = useMutation({
    mutationFn: (url: string) => addGalleryImage(token!, { url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tenant.gallery }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeImageMutation = useMutation({
    mutationFn: (id: string) => deleteGalleryImage(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tenant.gallery }),
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () => getPreferences(token!),
    enabled: !!token,
  });

  const [prefState, setPrefState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (preferences) {
      setPrefState(Object.fromEntries(preferences.map((p) => [p.tipo, p.activo])));
    }
  }, [preferences]);

  const updatePrefsMutation = useMutation({
    mutationFn: (preferencias: { tipo: string; canal: string; activo: boolean }[]) =>
      updatePreferences(token!, { preferencias }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences });
      toast.success('Preferencias de notificaciones guardadas');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar preferencias'),
  });

  function onNotificationsSave() {
    const preferencias = Object.entries(prefState).map(([tipo, activo]) => ({
      tipo,
      canal: 'in-app',
      activo,
    }));
    updatePrefsMutation.mutate(preferencias);
  }

  const appearance = appearanceForm.watch();
  const livePalette = useMemo(
    () => ({
      primario: appearance.colorPrimario || '#0d9488',
      secundario: appearance.colorSecundario || '#0f766e',
      acento: appearance.colorAcento || '#f59e0b',
      fuente: appearance.fuente || 'Inter',
      radio: RADIO_OPTIONS.find((r) => r.value === appearance.radioTarjeta)?.class ?? 'rounded-lg',
    }),
    [appearance.colorPrimario, appearance.colorSecundario, appearance.colorAcento, appearance.fuente, appearance.radioTarjeta],
  );

  function applyPreset(preset: typeof PRESET_PALETTES[number]) {
    appearanceForm.setValue('colorPrimario', preset.primario);
    appearanceForm.setValue('colorSecundario', preset.secundario);
    appearanceForm.setValue('colorAcento', preset.acento);
    toast.success(`Paleta "${preset.nombre}" aplicada`);
  }

  function onInfoSave(data: InfoForm) { saveMutation.mutate(data); }
  function onContactSave(data: ContactForm) { saveMutation.mutate(data); }
  function onDeliverySave(data: DeliveryForm) { saveMutation.mutate(data); }
  function onSocialSave(data: SocialForm) { saveMutation.mutate(data); }
  function onAppearanceSave(data: AppearanceForm) {
    saveMutation.mutate({
      logo: data.logo || undefined,
      banner: data.banner || undefined,
      colorPrimario: data.colorPrimario || undefined,
      colorSecundario: data.colorSecundario || undefined,
      colorAcento: data.colorAcento || undefined,
      fuente: data.fuente,
      modoTema: data.modoTema,
      radioTarjeta: data.radioTarjeta,
      mostrarPrecios: data.mostrarPrecios,
      mostrarStock: data.mostrarStock,
    });
  }

  async function onGalleryChange(urls: string[]) {
    setGalleryUrls(urls);
    const known = new Set((gallery ?? []).map((g) => g.url));
    const knownUrls = new Set(urls);
    const newUrls = urls.filter((u) => !known.has(u));
    const removedIds = (gallery ?? []).filter((g) => !knownUrls.has(g.url));
    for (const url of newUrls) {
      try { await addImageMutation.mutateAsync(url); } catch {}
    }
    for (const img of removedIds) {
      try { await removeImageMutation.mutateAsync(img.id); } catch {}
    }
  }

  if (!token) return null;

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Configuración" description="Personaliza tu negocio, branding, vitrina pública y delivery.">
        <Button variant="outline" size="icon" onClick={() => qc.invalidateQueries({ queryKey: queryKeys.tenant.profile })} title="Actualizar">
          <RefreshCw className="size-4" />
        </Button>
        <Link href={business ? `/negocio/${business.slug}` : '/marketplace'} className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
          <Eye className="size-4" /> Ver vitrina
        </Link>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Tabs defaultValue="info">
            <TabsList className="flex-wrap">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="mr-1 size-3.5" /> Apariencia
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <ImageIcon className="mr-1 size-3.5" /> Galería
              </TabsTrigger>
              <TabsTrigger value="social">Redes</TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-1 size-3.5" /> Notificaciones
              </TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Información del negocio</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={infoForm.handleSubmit(onInfoSave)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="nombre">Nombre comercial</Label>
                        <Input id="nombre" {...infoForm.register('nombre')} />
                        {infoForm.formState.errors.nombre && <p className="text-xs text-destructive">{infoForm.formState.errors.nombre.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tipoNegocio">Tipo de negocio</Label>
                        <Input id="tipoNegocio" placeholder="Ej: Restaurante, Tienda, Farmacia" {...infoForm.register('tipoNegocio')} />
                        {infoForm.formState.errors.tipoNegocio && <p className="text-xs text-destructive">{infoForm.formState.errors.tipoNegocio.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="eslogan">Eslogan</Label>
                      <Input id="eslogan" placeholder="Frase corta que identifique tu negocio" {...infoForm.register('eslogan')} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="textoBienvenida">Mensaje de bienvenida</Label>
                      <Textarea id="textoBienvenida" rows={3} placeholder="Mensaje que verán tus clientes al entrar a la vitrina" {...infoForm.register('textoBienvenida')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input id="direccion" {...infoForm.register('direccion')} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="barrio">Barrio</Label>
                        <Input id="barrio" {...infoForm.register('barrio')} />
                      </div>
                    </div>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      Guardar información
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Contacto</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={contactForm.handleSubmit(onContactSave)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input id="telefono" {...contactForm.register('telefono')} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input id="whatsapp" placeholder="+57 300 000 0000" {...contactForm.register('whatsapp')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" {...contactForm.register('email')} />
                        {contactForm.formState.errors.email && <p className="text-xs text-destructive">{contactForm.formState.errors.email.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sitioWeb">Sitio web</Label>
                        <Input id="sitioWeb" placeholder="https://..." {...contactForm.register('sitioWeb')} />
                      </div>
                    </div>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      Guardar contacto
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="size-4" /> Apariencia y branding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={appearanceForm.handleSubmit(onAppearanceSave)} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Logo del negocio</Label>
                        <ImageUploader
                          value={appearance.logo}
                          onChange={(url) => appearanceForm.setValue('logo', url)}
                          folder="branding/logo"
                          aspectRatio="avatar"
                          placeholder="Subir logo"
                        />
                        <p className="text-xs text-muted-foreground">PNG, JPG o WebP. Recomendado 500x500px</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Banner / Portada</Label>
                        <ImageUploader
                          value={appearance.banner}
                          onChange={(url) => appearanceForm.setValue('banner', url)}
                          folder="branding/banner"
                          aspectRatio="banner"
                          placeholder="Subir banner"
                        />
                        <p className="text-xs text-muted-foreground">Recomendado 1500x400px (ratio 4:1)</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <Label>Paletas prediseñadas</Label>
                        <p className="text-xs text-muted-foreground">Haz clic para aplicar</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {PRESET_PALETTES.map((p) => (
                          <button
                            key={p.nombre}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="group flex items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:border-primary/50"
                          >
                            <div className="flex shrink-0">
                              <div className="size-6 rounded-l-full" style={{ background: p.primario }} />
                              <div className="size-6" style={{ background: p.secundario }} />
                              <div className="size-6 rounded-r-full" style={{ background: p.acento }} />
                            </div>
                            <span className="text-xs font-medium group-hover:text-primary">{p.nombre}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="colorPrimario">Color primario</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={appearance.colorPrimario || '#0d9488'}
                            onChange={(e) => appearanceForm.setValue('colorPrimario', e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded border bg-background"
                          />
                          <Input
                            value={appearance.colorPrimario || ''}
                            onChange={(e) => appearanceForm.setValue('colorPrimario', e.target.value)}
                            placeholder="#0d9488"
                            className="font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="colorSecundario">Color secundario</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={appearance.colorSecundario || '#0f766e'}
                            onChange={(e) => appearanceForm.setValue('colorSecundario', e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded border bg-background"
                          />
                          <Input
                            value={appearance.colorSecundario || ''}
                            onChange={(e) => appearanceForm.setValue('colorSecundario', e.target.value)}
                            placeholder="#0f766e"
                            className="font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="colorAcento">Color de acento</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={appearance.colorAcento || '#f59e0b'}
                            onChange={(e) => appearanceForm.setValue('colorAcento', e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded border bg-background"
                          />
                          <Input
                            value={appearance.colorAcento || ''}
                            onChange={(e) => appearanceForm.setValue('colorAcento', e.target.value)}
                            placeholder="#f59e0b"
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Tipografía</Label>
                        <Select
                          value={appearance.fuente}
                          onValueChange={(v) => { if (v) appearanceForm.setValue('fuente', v); }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((f) => (
                              <SelectItem key={f} value={f}>
                                <span style={{ fontFamily: f }}>{f}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Modo de tema</Label>
                        <Select
                          value={appearance.modoTema}
                          onValueChange={(v) => { if (v) appearanceForm.setValue('modoTema', v as AppearanceForm['modoTema']); }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLARO">Claro</SelectItem>
                            <SelectItem value="OSCURO">Oscuro</SelectItem>
                            <SelectItem value="AUTO">Automático</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Estilo de bordes</Label>
                        <Select
                          value={appearance.radioTarjeta}
                          onValueChange={(v) => { if (v) appearanceForm.setValue('radioTarjeta', v as AppearanceForm['radioTarjeta']); }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RADIO_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <Label className="text-sm">Mostrar precios en vitrina</Label>
                          <p className="text-xs text-muted-foreground">Los clientes ven los precios de los productos</p>
                        </div>
                        <Switch
                          checked={appearance.mostrarPrecios}
                          onCheckedChange={(v: boolean) => appearanceForm.setValue('mostrarPrecios', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <Label className="text-sm">Mostrar stock disponible</Label>
                          <p className="text-xs text-muted-foreground">Muestra las unidades disponibles</p>
                        </div>
                        <Switch
                          checked={appearance.mostrarStock}
                          onCheckedChange={(v: boolean) => appearanceForm.setValue('mostrarStock', v)}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      Guardar apariencia
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="size-4" /> Galería de imágenes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sube fotos de tu local, productos, equipo o ambiente. Se mostrarán en tu vitrina pública.
                  </p>
                  {galleryLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <MultiImageUploader
                      value={galleryUrls}
                      onChange={onGalleryChange}
                      folder="gallery"
                    />
                  )}
                  {(addImageMutation.isPending || removeImageMutation.isPending) && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Sincronizando galería...
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Preferencias de notificaciones</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {prefsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <>
                      {preferences?.map((pref) => (
                        <div key={pref.tipo} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <Label className="text-sm">{pref.titulo}</Label>
                            <p className="text-xs text-muted-foreground">
                              {pref.canales?.join(', ') || 'In-app'}
                            </p>
                          </div>
                          <Switch
                            checked={prefState[pref.tipo] ?? pref.activo}
                            onCheckedChange={(v: boolean) =>
                              setPrefState((prev) => ({ ...prev, [pref.tipo]: v }))
                            }
                          />
                        </div>
                      ))}
                      {(!preferences || preferences.length === 0) && (
                        <p className="text-sm text-muted-foreground">No hay preferencias disponibles.</p>
                      )}
                      <Button
                        type="button"
                        onClick={onNotificationsSave}
                        disabled={updatePrefsMutation.isPending || !preferences || preferences.length === 0}
                      >
                        {updatePrefsMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin mr-1" />
                        ) : (
                          <Save className="size-4 mr-1" />
                        )}
                        Guardar preferencias
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Configuración de delivery</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={deliveryForm.handleSubmit(onDeliverySave)} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Switch checked={deliveryForm.watch('deliveryActivo')} onCheckedChange={(v: boolean) => deliveryForm.setValue('deliveryActivo', v)} />
                      <Label>Delivery activo</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Costo base (COP)</Label>
                        <Input type="number" min={0} step={100} {...deliveryForm.register('deliveryCostoBase', { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Radio (km)</Label>
                        <Input type="number" min={0} step={0.1} {...deliveryForm.register('deliveryRadioKm', { valueAsNumber: true })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Horario inicio</Label>
                        <Input type="time" {...deliveryForm.register('deliveryHorarioInicio')} />
                      </div>
                      <div className="space-y-1">
                        <Label>Horario fin</Label>
                        <Input type="time" {...deliveryForm.register('deliveryHorarioFin')} />
                      </div>
                    </div>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      Guardar delivery
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Redes sociales</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={socialForm.handleSubmit(onSocialSave)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input id="facebook" placeholder="URL o @usuario" {...socialForm.register('facebook')} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input id="instagram" placeholder="@usuario" {...socialForm.register('instagram')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="tiktok">TikTok</Label>
                        <Input id="tiktok" placeholder="@usuario" {...socialForm.register('tiktok')} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="youtube">YouTube</Label>
                        <Input id="youtube" placeholder="@canal" {...socialForm.register('youtube')} />
                      </div>
                    </div>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
                      Guardar redes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden">
              {appearance.banner ? (
                <div className="h-32 bg-muted bg-cover bg-center" style={{ backgroundImage: `url(${appearance.banner})` }} />
              ) : (
                <div className="h-32 bg-muted" />
              )}
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center gap-3">
                  {appearance.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={appearance.logo} alt="Logo" className={cn('size-12 object-cover', livePalette.radio)} />
                  ) : (
                    <div
                      className={cn('flex size-12 items-center justify-center text-sm font-bold text-white', livePalette.radio)}
                      style={{ background: livePalette.primario }}
                    >
                      {(infoForm.watch('nombre') || business?.nombre || 'N').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold" style={{ fontFamily: livePalette.fuente, color: livePalette.primario }}>
                      {infoForm.watch('nombre') || business?.nombre || 'Nombre del negocio'}
                    </h2>
                    {infoForm.watch('eslogan') && (
                      <p className="truncate text-xs italic text-muted-foreground">{infoForm.watch('eslogan')}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {infoForm.watch('tipoNegocio') || 'Tipo'} · {infoForm.watch('barrio') || 'Barrio'}
                </p>
                <Separator />
                <div className="space-y-1 text-xs">
                  <p>{business?.telefono ?? 'Sin teléfono'}</p>
                  <p>{business?.email ?? 'Sin email'}</p>
                  {business?.whatsapp && <p>WhatsApp: {business.whatsapp}</p>}
                </div>
                {business?.deliveryConfig?.activo && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">Delivery activo</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="size-3.5" /> Vista previa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-1">
                  {([livePalette.primario, livePalette.secundario, livePalette.acento] as string[]).map((c, i) => (
                    <div key={i} className="h-8 flex-1 rounded" style={{ background: c }} title={c} />
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs">Tipografía: <span style={{ fontFamily: livePalette.fuente }}>{livePalette.fuente}</span></p>
                  <p className="text-xs">Bordes: {RADIO_OPTIONS.find((r) => r.value === appearance.radioTarjeta)?.label}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Button
                    size="sm"
                    className="w-full"
                    style={{ background: livePalette.primario, borderColor: livePalette.primario }}
                  >
                    Botón primario
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    style={{ borderColor: livePalette.acento, color: livePalette.acento }}
                  >
                    Botón acento
                  </Button>
                </div>
                <div className={cn('border bg-card p-2 text-center', livePalette.radio)}>
                  <p className="text-xs font-medium" style={{ fontFamily: livePalette.fuente }}>Tarjeta de ejemplo</p>
                  <p className="text-xs text-muted-foreground">$ 25.000</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </FadeIn>
  );
}
