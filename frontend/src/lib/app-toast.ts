import { toast, type ExternalToast } from 'sonner';

type ToastOptions = ExternalToast & { id?: string | number };

function toastId(kind: string, message: string, id?: string | number) {
  return id ?? `${kind}:${message}`;
}

export const appToast = {
  success(message: string, options: ToastOptions = {}) {
    return toast.success(message, { ...options, id: toastId('success', message, options.id) });
  },
  error(message: string, options: ToastOptions = {}) {
    return toast.error(message, { ...options, id: toastId('error', message, options.id) });
  },
  info(message: string, options: ToastOptions = {}) {
    return toast.info(message, { ...options, id: toastId('info', message, options.id) });
  },
  warning(message: string, options: ToastOptions = {}) {
    return toast.warning(message, { ...options, id: toastId('warning', message, options.id) });
  },
};
