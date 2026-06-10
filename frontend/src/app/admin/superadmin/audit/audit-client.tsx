'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
} from '@tanstack/react-table';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FadeIn, StaggerList } from '@/components/shared/fade-in';
import { PageHeader } from '@/components/layouts/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { superadminService } from '@/services/superadmin/superadmin.service';
import type { AuditLogItem } from '@/services/superadmin/superadmin.service';

const PAGE_SIZE = 20;

export default function AuditClient() {
  const token = useAuthStore((s) => s.token);
  const [page, setPage] = useState(1);
  const [tenantFilter, setTenantFilter] = useState('all');
  const [accionFilter, setAccionFilter] = useState('');
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const { data: tenantsData } = useQuery({
    queryKey: ['superadmin', 'tenants', 'list'],
    queryFn: () => superadminService.listTenants(token!, { pageSize: 500 }),
    enabled: !!token,
  });

  const tenants = tenantsData?.data ?? [];

  const { data: auditData, isLoading, refetch, isFetching } = useQuery({
    queryKey: [
      'superadmin', 'audit-logs',
      { page, tenantId: tenantFilter !== 'all' ? tenantFilter : undefined, accion: accionFilter || undefined },
    ],
    queryFn: () => superadminService.auditLogs(token!, {
      page,
      pageSize: PAGE_SIZE,
      tenantId: tenantFilter !== 'all' ? tenantFilter : undefined,
      accion: accionFilter || undefined,
    }),
    enabled: !!token,
  });

  const logs = auditData?.data ?? [];
  const total = auditData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns: ColumnDef<AuditLogItem>[] = useMemo(() => [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) =>
        row.getCanExpand() ? (
          <Button size="icon-xs" variant="ghost" onClick={() => row.toggleExpanded()}>
            {row.getIsExpanded() ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </Button>
        ) : null,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: 'accion',
      header: 'Acción',
      cell: ({ row }) => <span className="font-medium">{row.original.accion}</span>,
    },
    { accessorKey: 'entidad', header: 'Entidad' },
    {
      accessorKey: 'entidadId',
      header: 'ID',
      cell: ({ row }) =>
        row.original.entidadId ? (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{row.original.entidadId.slice(0, 8)}...</code>
        ) : (
          '-'
        ),
    },
    {
      header: 'Usuario',
      cell: ({ row }) => (row.original.user ? row.original.user.nombre : '-'),
    },
    {
      header: 'Tenant',
      cell: ({ row }) => (row.original.tenant ? <Badge variant="secondary" className="text-xs">{row.original.tenant.nombre}</Badge> : '-'),
    },
    {
      header: 'Metadata',
      cell: ({ row }) =>
        row.original.metadata ? (
          <Badge variant="outline" className="text-xs">JSON</Badge>
        ) : (
          '-'
        ),
    },
  ], []);

  const table = useReactTable({
    data: logs,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => !!row.original.metadata,
  });

  return (
    <FadeIn as="main" className="space-y-6">
      <PageHeader title="Auditoría" description="Registro de acciones del sistema">
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Tenant</Label>
              <Select
                value={tenantFilter}
                onValueChange={(v) => { setTenantFilter(v ?? 'all'); setPage(1); }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos los tenants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tenants</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Acción</Label>
              <Input
                className="w-[220px]"
                placeholder="Filtrar por acción..."
                value={accionFilter}
                onChange={(e) => { setAccionFilter(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="Sin registros"
              description="No se encontraron acciones registradas con los filtros actuales."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <Fragment key={row.id}>
                      <TableRow data-state={row.getIsExpanded() ? 'expanded' : undefined}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {row.getIsExpanded() && (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="bg-muted/30 p-0">
                            <pre className="max-h-48 overflow-auto p-4 text-xs whitespace-pre-wrap font-mono">
                              {JSON.stringify(row.original.metadata, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {total} registro{total !== 1 ? 's' : ''} &middot; Página {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
