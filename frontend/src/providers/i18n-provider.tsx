'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/i18n/messages';

const I18nContext = createContext({ t: translate });

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ t: translate }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export type { MessageKey };
