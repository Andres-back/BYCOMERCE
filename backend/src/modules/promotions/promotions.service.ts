import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PromotionType, PromotionScope, CouponType, Prisma } from '../../database/prisma-client';
import { CreatePromotionDto, UpdatePromotionDto, CreateCouponDto, UpdateCouponDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPromotions(tenantId: string) {
    return this.prisma.promotion.findMany({
      where: { tenantId },
      include: { products: { include: { product: { select: { id: true, nombre: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPromotion(tenantId: string, id: string) {
    const prom = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
      include: { products: { include: { product: { select: { id: true, nombre: true } } } } },
    });
    if (!prom) throw new NotFoundException('Promoción no encontrada');
    return prom;
  }

  async createPromotion(tenantId: string, dto: CreatePromotionDto, usuarioId: string) {
    const { productIds, ...data } = dto;
    const prom = await this.prisma.promotion.create({
      data: {
        tenantId,
        ...data,
        tipo: data.tipo as PromotionType,
        alcance: data.alcance as PromotionScope,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        products: productIds?.length
          ? { create: productIds.map((productId) => ({ productId, tenantId })) }
          : undefined,
      },
      include: { products: { include: { product: { select: { id: true, nombre: true } } } } },
    });

    await this.audit.log({ tenantId, usuarioId, accion: 'PROMOCION_CREADA', entidad: 'promotions', entidadId: prom.id, newValue: prom });
    return prom;
  }

  async updatePromotion(tenantId: string, id: string, dto: UpdatePromotionDto, usuarioId: string) {
    const existing = await this.getPromotion(tenantId, id);
    const { productIds, fechaInicio, fechaFin, ...data } = dto;
    const updateData: Prisma.PromotionUncheckedUpdateInput = { ...data };
    if (fechaInicio) updateData.fechaInicio = new Date(fechaInicio);
    if (fechaFin) updateData.fechaFin = new Date(fechaFin);

    if (productIds) {
      await this.prisma.promotionProduct.deleteMany({ where: { promotionId: id } });
      if (productIds.length) {
        await this.prisma.promotionProduct.createMany({
          data: productIds.map((productId) => ({ promotionId: id, productId, tenantId })),
        });
      }
    }

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: updateData,
      include: { products: { include: { product: { select: { id: true, nombre: true } } } } },
    });

    await this.audit.log({ tenantId, usuarioId, accion: 'PROMOCION_ACTUALIZADA', entidad: 'promotions', entidadId: id, oldValue: existing, newValue: updated });
    return updated;
  }

  async deletePromotion(tenantId: string, id: string, usuarioId: string) {
    const existing = await this.getPromotion(tenantId, id);
    await this.prisma.promotion.delete({ where: { id } });
    await this.audit.log({ tenantId, usuarioId, accion: 'PROMOCION_ELIMINADA', entidad: 'promotions', entidadId: id, oldValue: existing });
    return { deleted: true };
  }

  async listCoupons(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      include: { promotion: { select: { id: true, nombre: true } }, _count: { select: { usages: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(tenantId: string, dto: CreateCouponDto, usuarioId: string) {
    const coupon = await this.prisma.coupon.create({
      data: { ...dto, tipo: dto.tipo as CouponType, tenantId, fechaExpiracion: dto.fechaExpiracion ? new Date(dto.fechaExpiracion) : null },
      include: { promotion: { select: { id: true, nombre: true } } },
    });
    await this.audit.log({ tenantId, usuarioId, accion: 'CUPON_CREADO', entidad: 'coupons', entidadId: coupon.id, newValue: coupon });
    return coupon;
  }

  async updateCoupon(tenantId: string, id: string, dto: UpdateCouponDto, usuarioId: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Cupón no encontrado');
    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { ...dto, fechaExpiracion: dto.fechaExpiracion ? new Date(dto.fechaExpiracion) : undefined },
      include: { promotion: { select: { id: true, nombre: true } } },
    });
    await this.audit.log({ tenantId, usuarioId, accion: 'CUPON_ACTUALIZADO', entidad: 'coupons', entidadId: id, oldValue: coupon, newValue: updated });
    return updated;
  }

  async deleteCoupon(tenantId: string, id: string, usuarioId: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Cupón no encontrado');
    await this.prisma.coupon.delete({ where: { id } });
    await this.audit.log({ tenantId, usuarioId, accion: 'CUPON_ELIMINADO', entidad: 'coupons', entidadId: id, oldValue: coupon });
    return { deleted: true };
  }
}
