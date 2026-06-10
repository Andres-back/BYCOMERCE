'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { userService } from '@/services/users/users.service';
import type { InviteUserInput, UpdateUserInput } from '@/services/users/users.service';

interface InviteResponse {
  user: { id: string; nombre: string; email: string; rol: string; estado: string; createdAt: string };
  temporaryPassword: string;
}

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useUsers(filters?: Record<string, string>) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.users.all(filters),
    queryFn: () => userService.list(token!, filters),
    enabled: !!token,
  });
}

export function useUser(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.get(token!, id),
    enabled: !!token && !!id,
  });
}

export function useInviteUser() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => userService.invite(token!, input) as unknown as Promise<InviteResponse>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      userService.update(token!, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deactivate(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useActivateUser() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.activate(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}