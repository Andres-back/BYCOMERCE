import { Injectable } from '@nestjs/common';
import { Subject, filter } from 'rxjs';
import type { EventName } from './events.catalog';

export interface DomainEvent {
  name: EventName;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class EventBusService {
  private readonly subject = new Subject<DomainEvent>();

  emit(name: EventName, tenantId: string, data: Record<string, unknown> = {}): void {
    this.subject.next({ name, tenantId, data, timestamp: new Date() });
  }

  on(name: EventName) {
    return this.subject.pipe(filter((e) => e.name === name));
  }

  onNamespace(namespace: string) {
    return this.subject.pipe(filter((e) => e.name.startsWith(namespace)));
  }
}
