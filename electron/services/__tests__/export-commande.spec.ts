import { describe, expect, it } from 'vitest'
import { generateBonCommandeHtml } from '../../export-templates'

describe('generateBonCommandeHtml', () => {
  const html = generateBonCommandeHtml({
    commande: {
      numero: 'BC-20261024-0001',
      dateCommande: '2026-10-24',
      datePrevue: '2026-11-05',
      periode: 'Novembre 2026',
      urgence: true,
      statut: 'envoyee',
      fournisseurNom: 'Pharmacie Centrale de Guinée (PCG)',
      notes: 'Livraison au magasin central',
      lignes: [
        {
          designation: 'Metformine — Glucophage',
          forme: 'Comprimé',
          dosage: '500 mg',
          conditionnement: 'Boîte de 30',
          unite: 'cp',
          cmm: 120,
          stockRestant: 40,
          quantiteCommandee: 200,
          quantiteLivree: 0,
        },
      ],
    },
    hospital: { name: 'Clinique CDE', address: 'Ratoma', city: 'Conakry', phone: '620000000' },
    logoBase64: null,
    generatedAt: '24/10/2026 21:30',
  })

  it('produit un bon de commande complet sans prix ni montant', () => {
    expect(html).toMatch(/République de Guinée/i)
    // En-tête et pied de page partagés avec tous les documents CDE.
    expect(html).toContain('class="rep-devise"')
    expect(html).toContain('Clinique CDE')
    expect(html).toContain('Document généré par CDE')
    // Tableau large → A4 paysage, colonnes à largeur fixe.
    expect(html).toContain('size: A4 landscape')
    expect(html).toContain('table-layout: fixed')
    expect(html).toContain('Pharmacie Centrale de Guinée (PCG)')
    expect(html).toContain('BC-20261024-0001')
    expect(html).toContain('Envoyée')
    expect(html).not.toContain('>envoyee<')
    expect(html).toContain('Metformine — Glucophage')
    // Colonnes attendues : quantité commandée uniquement (pas de CMM/SR ni
    // de quantité livrée sur le bon destiné au fournisseur).
    expect(html).toContain('Quantité commandée')
    expect(html).not.toContain('>CMM<')
    expect(html).not.toContain('>SR<')
    expect(html).not.toContain('Quantité livrée')
    expect(html).toContain('Pharmacien chef')
    expect(html).toContain('Directeur de l’établissement')
    expect(html).toContain('Visa DPS-DCS')

    // Aucune colonne ni libellé de prix/montant (BC destiné à la PCG).
    expect(html).not.toMatch(/prix/i)
    expect(html).not.toMatch(/montant/i)
    expect(html).not.toContain('P.U.')
    expect(html).not.toContain('Prix Total')
    expect(html).not.toContain('GNF')
  })

  it('traduit aussi le statut partiel en libellé français', () => {
    const partial = generateBonCommandeHtml({
      commande: {
        numero: 'BC-20261024-0002',
        dateCommande: '2026-10-24',
        statut: 'partielle',
        fournisseurNom: 'PCG',
        lignes: [{ designation: 'Metformine', quantiteCommandee: 10, quantiteLivree: 4 }],
      },
      hospital: {},
      logoBase64: null,
    })
    expect(partial).toContain('Partielle')
    expect(partial).not.toContain('>partielle<')
    expect(partial).not.toMatch(/prix/i)
    expect(partial).not.toMatch(/montant/i)
  })

  it('adresse le bon au fournisseur réellement choisi', () => {
    const other = generateBonCommandeHtml({
      commande: {
        numero: 'BC-20261024-0003',
        dateCommande: '2026-10-24',
        statut: 'brouillon',
        fournisseurNom: 'Grossiste Kiné Pharma',
        lignes: [{ designation: 'Metformine', quantiteCommandee: 5 }],
      },
      hospital: {},
      logoBase64: null,
    })
    // Le destinataire ne doit jamais être codé en dur sur la PCG.
    expect(other).toContain('Grossiste Kiné Pharma')
    expect(other).not.toContain('Pharmacie Centrale de Guinée')
  })

  it('échappe les données saisies', () => {
    const malicious = generateBonCommandeHtml({
      commande: {
        numero: 'BC-1',
        dateCommande: '2026-10-24',
        fournisseurNom: '<script>alert(1)</script>',
        lignes: [{ designation: '<img src=x onerror=alert(1)>', quantiteCommandee: 1 }],
      },
      hospital: {},
      logoBase64: null,
    })
    expect(malicious).not.toContain('<script>alert(1)</script>')
    expect(malicious).not.toContain('<img src=x')
    expect(malicious).toContain('&lt;script&gt;')
  })
})
