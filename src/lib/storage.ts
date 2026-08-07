import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Builds a public Storage URL directly from the bucket/path, no Supabase client needed —
 * only valid for public buckets (`brand-logos`). Used wherever a URL is all that's needed
 * (handing a logo to a third-party API) or a client isn't in scope (`gemini.ts`).
 */
export function publicStorageUrl(bucket: string, path: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export async function signUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 3600,
) {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data) throw error ?? new Error(`Failed to sign url for ${bucket}/${path}`);
  return data.signedUrl;
}

export async function uploadToStorage(
  client: SupabaseClient,
  bucket: string,
  path: string,
  bytes: Uint8Array | Buffer,
  contentType = "video/mp4",
) {
  const { error } = await client.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;

  return path;
}

/** Downloads a remote video (from a provider's result URL) and re-hosts it in our own storage. */
export async function mirrorToStorage(
  client: SupabaseClient,
  bucket: string,
  path: string,
  sourceUrl: string,
  headers?: Record<string, string>,
) {
  const res = await fetch(sourceUrl, { headers });
  if (!res.ok) throw new Error(`Failed to fetch generated video: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "video/mp4";

  return uploadToStorage(client, bucket, path, bytes, contentType);
}
