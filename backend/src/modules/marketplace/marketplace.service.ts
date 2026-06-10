import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoGeneral } from '../../database/prisma-client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  listBusinesses() {
    return this.prisma.tenant.findMany({
      where: { estado: EstadoGeneral.ACTIVO },
      select: {
        id: true,
        nombre: true,
        slug: true,
        tipoNegocio: true,
        direccion: true,
        barrio: true,
        ciudad: true,
        latitud: true,
        longitud: true,
        logo: true,
        businessSettings: true,
        deliveryConfig: true,
        _count: {
          select: {
            products: {
              where: { estado: EstadoGeneral.ACTIVO },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
      take: 50,
    });
  }

  async getBusiness(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, estado: EstadoGeneral.ACTIVO },
      include: {
        businessSettings: true,
        deliveryConfig: true,
      },
    });

    if (!tenant) throw new NotFoundException('Comercio no encontrado');
    return tenant;
  }

  async listBusinessProducts(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, estado: EstadoGeneral.ACTIVO },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Comercio no encontrado');

    return this.prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        estado: EstadoGeneral.ACTIVO,
      },
      include: {
        category: true,
        images: { orderBy: { orden: 'asc' } },
        variants: { where: { estado: EstadoGeneral.ACTIVO } },
      },
      orderBy: [{ destacado: 'desc' }, { nombre: 'asc' }],
      take: 100,
    });
  }

  listFeaturedProducts() {
    return this.prisma.product.findMany({
      where: {
        estado: EstadoGeneral.ACTIVO,
        destacado: true,
        tenant: { estado: EstadoGeneral.ACTIVO },
      },
      include: {
        category: true,
        tenant: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            tipoNegocio: true,
            barrio: true,
            ciudad: true,
            logo: true,
            businessSettings: true,
            deliveryConfig: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { nombre: 'asc' }],
      take: 24,
    });
  }
}
