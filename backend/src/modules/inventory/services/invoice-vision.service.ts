import { Injectable } from '@nestjs/common';
import { AiVisionService, InvoiceExtractionResult } from '../../ai/ai-vision.service';
import { ExtractPurchaseInvoiceDto } from '../dto/purchase.dto';

@Injectable()
export class InvoiceVisionService {
  constructor(private readonly aiVision: AiVisionService) {}

  extract(tenantId: string, dto: ExtractPurchaseInvoiceDto): Promise<InvoiceExtractionResult> {
    return this.aiVision.extractInvoice(tenantId, dto);
  }
}
