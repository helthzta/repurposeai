import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Downloads a (possibly cross-origin) file as an attachment. The `download`
 * attribute on an <a> is ignored by browsers for cross-origin URLs (e.g.
 * Supabase Storage's signed CDN URLs), which just opens/navigates instead of
 * downloading — fetch as a blob and save that instead.
 */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download the file");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
