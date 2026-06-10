import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export interface TenantStore {
  tenantId: string | null;
  userId: string | null;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  set(store: TenantStore): void {
    this.storage.enterWith(store);
  }

  getStore(): TenantStore | undefined {
    return this.storage.getStore();
  }

  getTenantId(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  shouldBypassTenantFilter(): boolean {
    const store = this.storage.getStore();
    return Boolean(store?.isSuperAdmin && !store.isImpersonating);
  }
}

