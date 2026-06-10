import { IsUUID } from 'class-validator';

export class AssignDeliveryDto {
  @IsUUID()
  deliveryUserId!: string;
}
