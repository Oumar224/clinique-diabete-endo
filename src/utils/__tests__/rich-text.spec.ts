import { describe, it, expect } from 'vitest'
import { htmlToLines, htmlToPlainText, isRichTextEmpty } from '../rich-text'

describe('htmlToLines', () => {
  it('splits TipTap paragraphs into separate lines', () => {
    expect(htmlToLines('<p>[12/01/2026 10:30] Entrée un</p><p>Texte libre</p>')).toEqual([
      '[12/01/2026 10:30] Entrée un',
      'Texte libre',
    ])
  })

  it('splits a line on <br> inside a paragraph', () => {
    expect(htmlToLines('<p>ligne un<br>ligne deux</p>')).toEqual(['ligne un', 'ligne deux'])
  })

  it('splits a line on self-closing <br/> inside a paragraph', () => {
    expect(htmlToLines('<p>ligne un<br/>ligne deux</p>')).toEqual(['ligne un', 'ligne deux'])
  })

  it('strips inline formatting tags (strong, em) keeping the text', () => {
    expect(htmlToLines('<p><strong>gras</strong> et <em>italique</em></p>')).toEqual(['gras et italique'])
  })

  it('drops &nbsp;-only lines and trims leading/trailing whitespace', () => {
    expect(htmlToLines('<p>&nbsp;</p><p>  première ligne  </p><p>&nbsp;</p>')).toEqual(['première ligne'])
  })

  it("returns [] for an empty string", () => {
    expect(htmlToLines('')).toEqual([])
  })

  it('returns [] for undefined input', () => {
    // Contract: nullish input yields []. The cast is required until the source
    // signature is widened to `string | null | undefined` (source author fixing
    // the nullish handling in parallel).
    expect(htmlToLines(undefined as unknown as string)).toEqual([])
  })

  it('returns [] for null input', () => {
    expect(htmlToLines(null as unknown as string)).toEqual([])
  })
})

describe('htmlToPlainText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToPlainText('<p>  Hello <strong>monde</strong>  </p>')).toBe('Hello monde')
  })

  it('replaces <img> with a placeholder token', () => {
    expect(htmlToPlainText('<p>Texte avant <img src="data:image/png;base64,abc" alt="schema"> texte après</p>'))
      .toBe('Texte avant [image] texte après')
  })

  it('replaces an uppercase/self-closing <IMG /> tag too', () => {
    expect(htmlToPlainText('<p><IMG src="x" /></p>')).toBe('[image]')
  })

  it('decodes common HTML entities', () => {
    expect(htmlToPlainText('<p>a &amp; b &lt;c&gt; &quot;d&quot; &nbsp; e&#39;f</p>')).toBe('a & b <c> "d" e\'f')
  })

  it("returns '' for empty, null and undefined input", () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText(undefined)).toBe('')
  })
})

describe('isRichTextEmpty', () => {
  it('returns true for empty, null and undefined input', () => {
    expect(isRichTextEmpty('')).toBe(true)
    expect(isRichTextEmpty(null)).toBe(true)
    expect(isRichTextEmpty(undefined)).toBe(true)
  })

  it('returns true for tags-only or whitespace-only content', () => {
    expect(isRichTextEmpty('<p></p>')).toBe(true)
    expect(isRichTextEmpty('<p><br></p>')).toBe(true)
    expect(isRichTextEmpty('<p>&nbsp;</p>')).toBe(true)
  })

  it('returns false when there is real text content', () => {
    expect(isRichTextEmpty('<p>Patient stable</p>')).toBe(false)
  })

  it('returns false when the content contains an <img> even without text', () => {
    expect(isRichTextEmpty('<p><img src="data:image/png;base64,abc"></p>')).toBe(false)
    expect(isRichTextEmpty('<p><IMG src="x"/></p>')).toBe(false)
  })
})
