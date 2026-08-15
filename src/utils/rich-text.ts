/**
 * Converts rich-text HTML into plain text suitable for display in previews.
 *
 * Strips all tags, decodes the common HTML entities (`&nbsp; &amp; &apos; &#39;
 * &quot; &lt; &gt;`), collapses runs of whitespace into a single space and
 * trims the result. Returns `''` for `null`/`undefined`.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<\s*img[^>]*>/gi, ' [image] ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function htmlToLines(html: string | undefined | null): string[] {
  if (!html) return []
  return html
    .split(/<\/p>|<br\s*\/?>/i)
    .map(chunk =>
      chunk
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim(),
    )
    .filter(Boolean)
}

/**
 * Returns `true` when the rich-text HTML contains no meaningful content
 * (empty, `null`/`undefined`, tags-only or whitespace-only).
 */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  const value = String(html ?? '')
  if (/<\s*img\b/i.test(value)) return false
  return htmlToPlainText(value) === ''
}
