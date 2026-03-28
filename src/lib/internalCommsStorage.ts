import { supabase } from '@/integrations/supabase/client';

/** Supabase Storage bucket for internal comms message attachments */
export const INTERNAL_COMMS_BUCKET = 'internal-comms-files';

/**
 * Paths are stored as `userId/timestamp-filename.ext`.
 * Older or malformed rows may store a full Storage URL — normalize for createSignedUrl / download.
 */
export function extractInternalCommsStoragePath(fileUrlOrPath: string): string {
  if (!fileUrlOrPath) return '';
  let s = fileUrlOrPath.trim();

  if (!/^https?:\/\//i.test(s)) {
    s = s.replace(/^\/+/, '');
    if (s.startsWith(`${INTERNAL_COMMS_BUCKET}/`)) {
      s = s.slice(INTERNAL_COMMS_BUCKET.length + 1);
    }
    return s.replace(/^\/+/, '');
  }

  try {
    const url = new URL(s);
    const path = decodeURIComponent(url.pathname);
    const marker = `/${INTERNAL_COMMS_BUCKET}/`;
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      return path.slice(idx + marker.length).replace(/^\/+/, '');
    }
    const parts = path.split('/').filter(Boolean);
    const bi = parts.indexOf(INTERNAL_COMMS_BUCKET);
    if (bi !== -1 && bi < parts.length - 1) {
      return parts.slice(bi + 1).join('/');
    }
  } catch {
    // fall through
  }

  return s.replace(/^\/+/, '');
}

export type ResolvedInternalCommsUrl =
  | { kind: 'signed'; url: string }
  | { kind: 'blob'; url: string; revoke: () => void };

/** Signed URL when possible (good for img/pdf preview); otherwise downloadable blob URL. */
export async function resolveInternalCommsFileAccess(
  filePath: string,
): Promise<{ result: ResolvedInternalCommsUrl | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(INTERNAL_COMMS_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (!error && data?.signedUrl) {
    return { result: { kind: 'signed', url: data.signedUrl }, error: null };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(INTERNAL_COMMS_BUCKET)
    .download(filePath);

  if (downloadError || !blob) {
    return {
      result: null,
      error: error?.message || downloadError?.message || 'Could not access file',
    };
  }

  const url = URL.createObjectURL(blob);
  return {
    result: { kind: 'blob', url, revoke: () => URL.revokeObjectURL(url) },
    error: null,
  };
}

/** Reliable save-as for the other party: uses Storage download with current session/JWT. */
export async function downloadInternalCommsAttachment(
  fileUrlOrPath: string,
  downloadAsName: string,
): Promise<{ ok: boolean; error?: string }> {
  const path = extractInternalCommsStoragePath(fileUrlOrPath);
  if (!path) return { ok: false, error: 'Invalid file path' };

  const { data, error } = await supabase.storage.from(INTERNAL_COMMS_BUCKET).download(path);
  if (error || !data) return { ok: false, error: error?.message || 'Download failed' };

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadAsName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
  return { ok: true };
}

export function attachmentLooksLikeImage(fileName: string, mime: string | null): boolean {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(fileName);
}

export function attachmentLooksLikePdf(fileName: string, mime: string | null): boolean {
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf')) return true;
  return /\.pdf$/i.test(fileName);
}
