const MAX_HTML_BYTES = 2_000_000;
const MAX_SUMMARY_CHARS = 4000;
const FETCH_TIMEOUT_MS = 8000;

/**
 * Best-effort: fetches a brand's website and returns cleaned, truncated visible
 * text for use as script-writing context (see brandBrief() in prompts.ts).
 * Never throws — a dead site, timeout, or non-http(s) URL just returns null so
 * project creation isn't blocked by an unreachable link.
 */
export async function fetchWebsiteText(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "RepurposeAI-BrandScan/1.0" },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      chunks.push(value);
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");

    // Pull these out before the generic tag-strip below — a blind strip-and-slice often grabs
    // cookie-banner/nav boilerplate instead of the actual pitch; title + meta description are
    // the highest-signal, cheapest-to-extract summary of what the site is actually about.
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const description = (html.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
    ) ??
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i))?.[1]?.trim();

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    const prefix = [
      title && `Page title: ${title}`,
      description && `Meta description: ${description}`,
    ]
      .filter(Boolean)
      .join("\n");
    const combined = prefix ? `${prefix}\n\n${text}` : text;

    return combined ? combined.slice(0, MAX_SUMMARY_CHARS) : null;
  } catch {
    return null;
  }
}
