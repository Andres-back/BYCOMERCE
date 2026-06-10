import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api/client';
import { CashMovement, CashMovementType, CashRegister, Expense } from '@/types/api';

export interface OpenCashRegisterInput {
  saldoInicial: number;
}

export interface CloseCashRegisterInput {
  saldoFinal: number;
  observacion?: string;
}

export interface CreateCashMovementInput {
  tipo: Extract<CashMovementType, 'INGRESO_MANUAL' | 'AJUSTE' | 'RETIRO'>;
  monto: number;
  descripcion?: string;
}

export interface ExpenseFilters {
  q?: string;
  categoria?: string;
  from?: string;
  to?: string;
}

export interface CreateExpenseInput {
  categoria: string;
  descripcion: string;
  valor: number;
  comprobanteUrl?: string;
  fecha?: string;
}

function toQuery(filters?: ExpenseFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.categoria) params.set('categoria', filters.categoria);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listCashRegisters(token: string) {
  return apiGet<CashRegister[]>('/cash-registers', token);
}

export function getCurrentCashRegister(token: string) {
  return apiGet<CashRegister | null>('/cash-registers/current', token);
}

export function openCashRegister(token: string, input: OpenCashRegisterInput) {
  return apiPost<CashRegister, OpenCashRegisterInput>('/cash-registers/open', input, token);
}

export function closeCashRegister(token: string, id: string, input: CloseCashRegisterInput) {
  return apiPost<CashRegister, CloseCashRegisterInput>(`/cash-registers/${id}/close`, input, token);
}

export function createCashMovement(token: string, cashRegisterId: string, input: CreateCashMovementInput) {
  return apiPost<CashMovement, CreateCashMovementInput>(`/cash-registers/${cashRegisterId}/movements`, input, token);
}

export function listExpenses(token: string, filters?: ExpenseFilters) {
  return apiGet<Expense[]>(`/expenses${toQuery(filters)}`, token);
}

export function createExpense(token: string, input: CreateExpenseInput) {
  return apiPost<Expense, CreateExpenseInput>('/expenses', input, token);
}

export function updateExpense(token: string, id: string, input: Partial<CreateExpenseInput>) {
  return apiPatch<Expense, Partial<CreateExpenseInput>>(`/expenses/${id}`, input, token);
}

export function deleteExpense(token: string, id: string) {
  return apiDelete<{ id: string; deleted: boolean }>(`/expenses/${id}`, token);
}
