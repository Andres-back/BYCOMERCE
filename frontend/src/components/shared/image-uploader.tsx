'use client';

import { useState, useRef } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiEnvelope } from '@/types/api';
import { csrfHeaders } from '@/services/api/client';

interface UploadResponse {
  key: string;
  url: string;
  size: number;
  mimetype: string;
  originalName?: string;
}

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  previewClassName?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'banner' | 'avatar';
  disabled?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  folder = 'branding',
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 10,
  className,
  previewClassName,
  placeholder = 'Subir imagen',
  aspectRatio = 'square',
  disabled = false,
}: ImageUploaderProps) {
  const token = useAuthStore((s) => s.token);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClass =
    aspectRatio === 'banner'
      ? 'aspect-[4/1]'
      : aspectRatio === 'avatar'
        ? 'aspect-square w-32'
        : 'aspect-square';

  async function handleFile(file: File) {
    if (!token) {
      toast.error('No autenticado');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Archivo demasiado grande (max ${maxSizeMB}MB)`);
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/uploads/upload`,
        {
          method: 'POST',
          headers: csrfHeaders(),
          credentials: 'include',
          body: formData,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir imagen');
      }
      const payload = (await res.json()) as ApiEnvelope<UploadResponse> | UploadResponse;
      const data = 'data' in payload ? payload.data : payload;
      onChange(data.url);
      toast.success('Imagen subida');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors',
          aspectClass,
          !disabled && 'hover:border-primary/50',
          previewClassName,
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute right-2 top-2"
                onClick={() => onChange(null)}
              >
                <X className="size-3" />
              </Button>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="text-xs">{placeholder}</span>
              </>
            )}
          </button>
        )}
      </div>
      {!disabled && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : value ? (
              'Cambiar'
            ) : (
              'Subir'
            )}
          </Button>
          {value && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {value.split('/').pop()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface MultiImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxItems?: number;
  className?: string;
  disabled?: boolean;
}

export function MultiImageUploader({
  value,
  onChange,
  folder = 'gallery',
  maxItems = 20,
  className,
  disabled = false,
}: MultiImageUploaderProps) {
  const token = useAuthStore((s) => s.token);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    if (!token) {
      toast.error('No autenticado');
      return;
    }
    setIsUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/uploads/upload`,
          {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'include',
            body: formData,
          },
        );
        if (!res.ok) {
          toast.error(`Error al subir ${file.name}`);
          continue;
        }
        const payload = (await res.json()) as ApiEnvelope<UploadResponse> | UploadResponse;
        const data = 'data' in payload ? payload.data : payload;
        uploaded.push(data.url);
      }
      onChange([...value, ...uploaded].slice(0, maxItems));
      if (uploaded.length > 0) toast.success(`${uploaded.length} imagen(es) subida(s)`);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {value.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Imagen ${i + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeAt(i)}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        ))}
        {!disabled && value.length < maxItems && (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            <span className="text-xs">Agregar</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />
    </div>
  );
}
