'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  Archive,
  ArrowUpDown,
  Bell,
  Boxes,
  Copy,
  DollarSign,
  Download,
  Layers,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layouts/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { ImageUploader } from '@/components/shared/image-uploader';

import { formatCopCentavos, availabilityLabel, availabilityVariant } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  useProducts,
  useCategories,
  useProductMovements,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useDuplicateProduct,
  useAdjustStock,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useExportProducts,
  useImportProducts,
} from '@/hooks/use-inventory';
import type {
  Product,
  Category,
  InventoryMovementType,
} from '@/types/api';
import type {
  ProductFilters,
  CreateProductInput,
  ImportProductInput,
} from '@/services/inventory/inventory.service';

const productSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(120),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  marca: z.string().optional(),
  precio: z.number().min(0, 'Debe ser positivo'),
  costo: z.number().min(0, 'Debe ser positivo'),
  stock: z.number().int().min(0, 'Debe ser >= 0'),
  stockMinimo: z.number().int().min(0, 'Debe ser >= 0'),
  imagenPrincipal: z.string().optional(),
  destacado: z.boolean(),
  descripcion: z.string().optional(),
});
type ProductFormValues = z.infer<typeof productSchema>;

const categorySchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(80),
  descripcion: z.string().optional(),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

const adjustSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION', 'PERDIDA']),
  cantidad: z.number().int().min(1).optional(),
  stockNuevo: z.number().int().min(0).optional(),
  observacion: z.string().optional(),
});
type AdjustFormValues = z.infer<typeof adjustSchema>;

const movementLabels: Record<InventoryMovementType, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
  DEVOLUCION: 'Devolucion',
  PERDIDA: 'Perdida',
};

function parseProductCsv(csv: string): ImportProductInput[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV debe incluir encabezados y al menos un producto');
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ''; });
    return {
      nombre: row.nombre || `Producto ${idx + 2}`,
      sku: row.sku || undefined,
      barcode: row.barcode || undefined,
      categoryId: row.categoryId || undefined,
      categoryName: row.categoria || row.categoryName || undefined,
      marca: row.marca || undefined,
      descripcion: row.descripcion || undefined,
      costo: toNum(row.costo),
      precio: toNum(row.precio),
      stock: toNum(row.stock),
      stockMinimo: toNum(row.stockMinimo),
      imagenPrincipal: row.imagenPrincipal || undefined,
      destacado: row.destacado ? row.destacado.toLowerCase() === 'true' || row.destacado === '1' : undefined,
    };
  });
}

function parseCsvLine(line: string): string[] {
  const vals: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const n = line[i + 1];
    if (c === '"' && quoted && n === '"') { cur += '"'; i++; }
    else if (c === '"') { quoted = !quoted; }
    else if (c === ',' && !quoted) { vals.push(cur); cur = ''; }
    else { cur += c; }
  }
  vals.push(cur);
  return vals;
}

function toNum(v?: string): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function InventoryClient() {
  const { canManageProducts, canExport } = useAuth();
  const importRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<ProductFilters>({ q: '', categoryId: 'all', stockStatus: 'all' });
  const [searchText, setSearchText] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportProductInput[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useProducts(filters);
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: movements = [] } = useProductMovements(adjustProduct?.id);
  const createProductMut = useCreateProduct();
  const updateProductMut = useUpdateProduct();
  const deleteProductMut = useDeleteProduct();
  const duplicateProductMut = useDuplicateProduct();
  const adjustStockMut = useAdjustStock();
  const createCategoryMut = useCreateCategory();
  const updateCategoryMut = useUpdateCategory();
  const deleteCategoryMut = useDeleteCategory();
  const exportProductsMut = useExportProducts();
  const importProductsMut = useImportProducts();

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre: '', precio: 0, costo: 0, stock: 0, stockMinimo: 0,
      categoryId: '', sku: '', barcode: '', marca: '', descripcion: '',
      imagenPrincipal: '', destacado: false,
    },
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  const adjustForm = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { tipo: 'AJUSTE', cantidad: 1, stockNuevo: 0, observacion: '' },
  });

  const watchAdjustTipo = adjustForm.watch('tipo');

  function openCreateProduct() {
    setEditingProduct(null);
    productForm.reset({
      nombre: '', precio: 0, costo: 0, stock: 0, stockMinimo: 0,
      categoryId: '', sku: '', barcode: '', marca: '', descripcion: '',
      imagenPrincipal: '', destacado: false,
    });
    setProductDialogOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    productForm.reset({
      nombre: product.nombre,
      precio: product.precio / 100,
      costo: product.costo / 100,
      stock: product.stock,
      stockMinimo: product.stockMinimo,
      categoryId: product.category?.id ?? '',
      sku: product.sku ?? '',
      barcode: product.barcode ?? '',
      marca: product.marca ?? '',
      descripcion: product.descripcion ?? '',
      imagenPrincipal: product.imagenPrincipal ?? '',
      destacado: product.destacado,
    });
    setProductDialogOpen(true);
  }

  function openAdjustProduct(product: Product) {
    setAdjustProduct(product);
    adjustForm.reset({ tipo: 'AJUSTE', cantidad: 1, stockNuevo: product.stock, observacion: '' });
    setAdjustDialogOpen(true);
  }

  function openDeleteProduct(product: Product) {
    setDeleteProduct(product);
    setDeleteDialogOpen(true);
  }

  function openCreateCategory() {
    setEditingCategory(null);
    categoryForm.reset({ nombre: '', descripcion: '' });
    setCategoryDialogOpen(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category);
    categoryForm.reset({ nombre: category.nombre, descripcion: category.descripcion ?? '' });
    setCategoryDialogOpen(true);
  }

  async function onProductSubmit(data: ProductFormValues) {
    const payload: CreateProductInput = {
      ...data,
      precio: Math.round(data.precio * 100),
      costo: Math.round(data.costo * 100),
      categoryId: data.categoryId || undefined,
      sku: data.sku || undefined,
      barcode: data.barcode || undefined,
      marca: data.marca || undefined,
      descripcion: data.descripcion || undefined,
      imagenPrincipal: data.imagenPrincipal || undefined,
    };
    try {
      if (editingProduct) {
        const { stock: _skip, ...updateData } = payload;
        void _skip;
        await updateProductMut.mutateAsync({ id: editingProduct.id, input: updateData });
        toast.success('Producto actualizado');
      } else {
        await createProductMut.mutateAsync(payload);
        toast.success('Producto creado');
      }
      setProductDialogOpen(false);
      setEditingProduct(null);
    } catch {
      toast.error('Error al guardar producto');
    }
  }

  async function onCategorySubmit(data: CategoryFormValues) {
    try {
      if (editingCategory) {
        await updateCategoryMut.mutateAsync({ id: editingCategory.id, input: data });
        toast.success('Categoria actualizada');
      } else {
        await createCategoryMut.mutateAsync(data);
        toast.success('Categoria creada');
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch {
      toast.error('Error al guardar categoria');
    }
  }

  async function onAdjustSubmit(data: AdjustFormValues) {
    if (!adjustProduct) return;
    const input: { tipo: InventoryMovementType; cantidad?: number; stockNuevo?: number; observacion?: string } = {
      tipo: data.tipo,
      observacion: data.observacion || undefined,
    };
    if (data.tipo === 'AJUSTE') {
      input.stockNuevo = data.stockNuevo;
    } else {
      input.cantidad = data.cantidad;
    }
    try {
      await adjustStockMut.mutateAsync({ id: adjustProduct.id, input });
      toast.success('Stock ajustado');
      setAdjustDialogOpen(false);
      setAdjustProduct(null);
    } catch {
      toast.error('Error al ajustar stock');
    }
  }

  async function handleExport() {
    try {
      const result = await exportProductsMut.mutateAsync(filters);
      const blob = new Blob([result.csv], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${result.rows.length} productos exportados`);
    } catch {
      toast.error('Error al exportar');
    }
  }

  function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFile(file);
    file.text().then((csv) => {
      try {
        const parsed = parseProductCsv(csv);
        setImportPreview(parsed);
        setImportDialogOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al leer CSV');
      }
    });
  }

  async function handleImportConfirm() {
    if (importPreview.length === 0) return;
    try {
      const result = await importProductsMut.mutateAsync(importPreview);
      toast.success(`Importados: ${result.created.length}, Omitidos: ${result.skipped.length}`);
      if (result.skipped.length > 0) {
        toast.error(result.skipped.slice(0, 3).map((s) => `Fila ${s.row}: ${s.reason}`).join(' | '));
      }
      setImportDialogOpen(false);
      setImportPreview([]);
      setImportFile(null);
      refetchProducts();
    } catch {
      toast.error('Error al importar');
    }
  }

  async function handleDuplicate(product: Product) {
    try {
      await duplicateProductMut.mutateAsync(product.id);
      toast.success('Producto duplicado');
    } catch {
      toast.error('Error al duplicar');
    }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    try {
      await deleteProductMut.mutateAsync(deleteProduct.id);
      toast.success('Producto eliminado');
      setDeleteDialogOpen(false);
      setDeleteProduct(null);
    } catch {
      toast.error('Error al eliminar producto');
    }
  }

  const columns: ColumnDef<Product, unknown>[] = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: ({ column }) => (
        <Button variant="ghost" size="xs" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Nombre <ArrowUpDown className="ml-1 size-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original as Product;
        return (
          <div>
            <p className="font-medium">{p.nombre}</p>
            {p.destacado && <Badge variant="secondary" className="ml-1 text-[10px]">Destacado</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (row.original as Product).sku ?? '-',
    },
    {
      accessorKey: 'category',
      header: 'Categoria',
      cell: ({ row }) => (row.original as Product).category?.nombre ?? '-',
    },
    {
      accessorKey: 'precio',
      header: ({ column }) => (
        <Button variant="ghost" size="xs" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Precio <ArrowUpDown className="ml-1 size-3" />
        </Button>
      ),
      cell: ({ row }) => formatCopCentavos((row.original as Product).precio),
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => (
        <Button variant="ghost" size="xs" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Stock <ArrowUpDown className="ml-1 size-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original as Product;
        return (
          <div className="flex items-center gap-1">
            <span>{p.stock}</span>
            <Badge variant={availabilityVariant(p)} className="text-[10px]">
              {availabilityLabel(p)}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const p = row.original as Product;
        if (!canManageProducts) return null;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs" onClick={() => openEditProduct(p)} title="Editar">
              <Pencil className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => openAdjustProduct(p)} title="Ajustar stock">
              <SlidersHorizontal className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => handleDuplicate(p)} title="Duplicar">
              <Copy className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => openDeleteProduct(p)} title="Eliminar">
              <Archive className="size-3" />
            </Button>
          </div>
        );
      },
    },
  ], [canManageProducts]);

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const submitFilters = () => {
    setFilters({ q: searchText, categoryId: filters.categoryId, stockStatus: filters.stockStatus });
  };

  const stats = useMemo(() =>
    products.reduce(
      (acc, p) => ({
        units: acc.units + p.stock,
        value: acc.value + p.stock * p.costo,
        low: acc.low + (p.stock > 0 && p.stock <= p.stockMinimo ? 1 : 0),
        out: acc.out + (p.stock <= 0 ? 1 : 0),
      }),
      { units: 0, value: 0, low: 0, out: 0 },
    ),
  [products]);

  return (
    <FadeIn as="main" className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Inventario" description="Productos, categorias y movimientos de stock">
        {canManageProducts && (
          <Button onClick={openCreateProduct}>
            <PackagePlus className="mr-1 size-4" />
            Nuevo Producto
          </Button>
        )}
        {canManageProducts && (
          <>
            <input ref={importRef} accept=".csv,text/csv" hidden type="file" onChange={handleImportFileSelect} />
            <Button variant="outline" onClick={() => importRef.current?.click()}>
              <Upload className="mr-1 size-4" />
              Importar CSV
            </Button>
          </>
        )}
      </PageHeader>

      <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Productos" value={products.length} icon={Boxes} description="Productos registrados" />
        <StatCard title="Unidades" value={stats.units} icon={Layers} description="Unidades totales" />
        <StatCard title="Valor en costo" value={formatCopCentavos(stats.value)} icon={DollarSign} description="Valor total del inventario" />
        <StatCard title="Alertas" value={stats.low + stats.out} icon={Bell} description={`${stats.low} bajo stock · ${stats.out} agotado`} />
      </StaggerList>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar producto, SKU o marca..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitFilters()}
              />
            </div>
            <Select
              value={filters.categoryId ?? 'all'}
              onValueChange={(v) => {
                const next = { ...filters, categoryId: v ?? 'all' };
                setFilters(next);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.stockStatus ?? 'all'}
              onValueChange={(v) => {
                const next = { ...filters, stockStatus: (v ?? 'all') as ProductFilters['stockStatus'] };
                setFilters(next);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponible</SelectItem>
                <SelectItem value="low">Bajo stock</SelectItem>
                <SelectItem value="out">Agotado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={submitFilters}>
              <SlidersHorizontal className="mr-1 size-4" />
              Filtrar
            </Button>
            {canExport && (
              <Button variant="outline" onClick={handleExport} disabled={exportProductsMut.isPending}>
                <Download className="mr-1 size-4" />
                Exportar
              </Button>
            )}
          </div>

          {loadingProducts ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="admin-card overflow-hidden rounded-xl">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-80 text-center">
                        <EmptyState
                          icon={<PackagePlus className="size-9" />}
                          title="Aun no tienes productos"
                          description="Comienza agregando tu primer producto para empezar a gestionar tu inventario."
                          action={canManageProducts ? (
                            <Button onClick={openCreateProduct}>
                              <Plus className="mr-1 size-4" />
                              Crear producto
                            </Button>
                          ) : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-4">
          {canManageProducts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingCategory ? 'Editar categoria' : 'Nueva categoria'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="cat-nombre">Nombre</Label>
                      <Input id="cat-nombre" {...categoryForm.register('nombre')} />
                      {categoryForm.formState.errors.nombre && (
                        <p className="text-xs text-destructive">{categoryForm.formState.errors.nombre.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cat-desc">Descripcion</Label>
                      <Input id="cat-desc" {...categoryForm.register('descripcion')} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={createCategoryMut.isPending || updateCategoryMut.isPending}>
                      <Plus className="mr-1 size-4" />
                      {editingCategory ? 'Guardar' : 'Crear'}
                    </Button>
                    {editingCategory && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => { setEditingCategory(null); categoryForm.reset({ nombre: '', descripcion: '' }); }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categorias ({categories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCategories ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No hay categorias</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{cat.nombre}</p>
                        {cat.descripcion && <p className="text-xs text-muted-foreground">{cat.descripcion}</p>}
                      </div>
                      {canManageProducts && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-xs" onClick={() => openEditCategory(cat)}>
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={async () => {
                              try { await deleteCategoryMut.mutateAsync(cat.id); toast.success('Categoria eliminada'); }
                              catch { toast.error('Error al eliminar categoria'); }
                            }}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="prod-nombre">Nombre *</Label>
              <Input id="prod-nombre" {...productForm.register('nombre')} />
              {productForm.formState.errors.nombre && (
                <p className="text-xs text-destructive">{productForm.formState.errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-category">Categoria</Label>
              <Select
                value={productForm.watch('categoryId') ?? ''}
                onValueChange={(v) => productForm.setValue('categoryId', (v ?? '') || undefined)}
              >
                <SelectTrigger id="prod-category">
                  <SelectValue placeholder="Sin categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-sku">SKU</Label>
                <Input id="prod-sku" {...productForm.register('sku')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-barcode">Codigo de barras</Label>
                <Input id="prod-barcode" {...productForm.register('barcode')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-precio">Precio (COP) *</Label>
                <Input
                  id="prod-precio"
                  type="number"
                  min="0"
                  step="any"
                  {...productForm.register('precio', { valueAsNumber: true })}
                />
                {productForm.formState.errors.precio && (
                  <p className="text-xs text-destructive">{productForm.formState.errors.precio.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-costo">Costo (COP) *</Label>
                <Input
                  id="prod-costo"
                  type="number"
                  min="0"
                  step="any"
                  {...productForm.register('costo', { valueAsNumber: true })}
                />
              </div>
            </div>
            {!editingProduct && (
              <div className="space-y-1">
                <Label htmlFor="prod-stock">Stock inicial</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  min="0"
                  {...productForm.register('stock', { valueAsNumber: true })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-stockMinimo">Stock minimo</Label>
                <Input
                  id="prod-stockMinimo"
                  type="number"
                  min="0"
                  {...productForm.register('stockMinimo', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-marca">Marca</Label>
                <Input id="prod-marca" {...productForm.register('marca')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Imagen del producto</Label>
              <ImageUploader
                value={productForm.watch('imagenPrincipal') || null}
                onChange={(url) => productForm.setValue('imagenPrincipal', url ?? '', { shouldDirty: true, shouldValidate: true })}
                folder="products"
                aspectRatio="square"
                placeholder="Subir desde celular o computador"
              />
              <div className="space-y-1">
                <Label htmlFor="prod-imagen" className="text-xs text-muted-foreground">URL manual opcional</Label>
                <Input
                  id="prod-imagen"
                  placeholder="https://..."
                  {...productForm.register('imagenPrincipal')}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="prod-destacado"
                className="size-4 rounded border"
                {...productForm.register('destacado')}
              />
              <Label htmlFor="prod-destacado">Destacado</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prod-descripcion">Descripcion</Label>
              <Textarea id="prod-descripcion" {...productForm.register('descripcion')} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => { setProductDialogOpen(false); setEditingProduct(null); }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createProductMut.isPending || updateProductMut.isPending}>
                {editingProduct ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogDescription>
              {adjustProduct && `${adjustProduct.nombre} — Stock actual: ${adjustProduct.stock}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo de movimiento</Label>
              <Select
                value={watchAdjustTipo}
                onValueChange={(v) => { if (v !== null) adjustForm.setValue('tipo', v as InventoryMovementType); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(movementLabels) as InventoryMovementType[]).map((t) => (
                    <SelectItem key={t} value={t}>{movementLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {watchAdjustTipo === 'AJUSTE' ? (
              <div className="space-y-1">
                <Label htmlFor="adj-stockNuevo">Nuevo stock</Label>
                <Input
                  id="adj-stockNuevo"
                  type="number"
                  min="0"
                  {...adjustForm.register('stockNuevo', { valueAsNumber: true })}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="adj-cantidad">Cantidad</Label>
                <Input
                  id="adj-cantidad"
                  type="number"
                  min="1"
                  {...adjustForm.register('cantidad', { valueAsNumber: true })}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="adj-observacion">Observacion</Label>
              <Input id="adj-observacion" {...adjustForm.register('observacion')} />
            </div>

            {movements.length > 0 && (
              <div className="space-y-1">
                <Label>Ultimos movimientos</Label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                  {movements.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex justify-between text-xs">
                      <span>
                        <span className="font-medium">{movementLabels[m.tipo]}</span>
                        {' '}{m.cantidad}
                      </span>
                      <span className="text-muted-foreground">
                        {m.stockAnterior} &rarr; {m.stockNuevo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setAdjustDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={adjustStockMut.isPending}>
                Guardar movimiento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar producto"
        description={`Estas seguro de eliminar "${deleteProduct?.nombre ?? ''}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <Dialog open={importDialogOpen} onOpenChange={(open: boolean) => { setImportDialogOpen(open); if (!open) { setImportPreview([]); setImportFile(null); }}}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar productos CSV</DialogTitle>
            <DialogDescription>
              {importFile && `Archivo: ${importFile.name}`}
              {importPreview.length > 0 && ` — ${importPreview.length} productos encontrados`}
            </DialogDescription>
          </DialogHeader>
          {importPreview.length > 0 && (
            <div className="space-y-3">
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                      <TableHead className="text-xs">Precio</TableHead>
                      <TableHead className="text-xs">Costo</TableHead>
                      <TableHead className="text-xs">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.slice(0, 20).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{row.nombre}</TableCell>
                        <TableCell className="text-xs">{row.sku ?? '-'}</TableCell>
                        <TableCell className="text-xs">{row.categoryName ?? '-'}</TableCell>
                        <TableCell className="text-xs">{row.precio}</TableCell>
                        <TableCell className="text-xs">{row.costo}</TableCell>
                        <TableCell className="text-xs">{row.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importPreview.length > 20 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando 20 de {importPreview.length} productos
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview([]); setImportFile(null); }}>
                  Cancelar
                </Button>
                <Button onClick={handleImportConfirm} disabled={importProductsMut.isPending}>
                  <Upload className="mr-1 size-4" />
                  {importProductsMut.isPending ? 'Importando...' : `Importar ${importPreview.length} productos`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
