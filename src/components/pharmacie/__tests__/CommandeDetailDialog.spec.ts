// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/pharmacie/CommandeDetailDialog.vue'),
  'utf8',
)

describe('CommandeDetailDialog — bon de réception', () => {
  it('propose un second document par réception', () => {
    expect(source).toContain('@click="openReceptionPreview(reception.id)"')
    expect(source).toContain('Bon de réception')
  })

  it('branche l’aperçu et le téléchargement sur les canaux dédiés', () => {
    expect(source).toContain('channel="export:reception-preview"')
    expect(source).toContain('download-channel="export:reception-pdf"')
    expect(source).toContain('orientation="landscape"')
  })

  it('transmet le couple commande / réception au document', () => {
    expect(source).toMatch(/receptionPreviewTarget\.value = \{ commandeId, receptionId \}/)
    expect(source).toContain(':params="receptionPreviewParams"')
  })
})
