import { describe, it, expect } from 'vitest'
import { generateCrhDiabeteHtml, generateOrdonnanceHtml, generatePatientProfileHtml } from '../../export-templates'

// ─── Test data factories ───────────────────────────────────────────

function createDefaultData() {
  return {
    admission: {
      dateEntree: '2025-01-15',
      serviceAccueil: 'Cardiologie',
      ipp: 'IPP-123456',
      motifHospitalisation: '<p>Décompensation diabétique</p>',
      medecinTraitantNom: 'Dr. Martin Pierre',
      interneIPANom: 'Dupont Jean',
    },
    modeVieAtcd: {
      situationFamiliale: 'Marié',
      isolement: false,
      hebergement: 'Domicile',
      commentaireVie: '',
      autonomieSL: {
        alimentation: 'Autonome',
        hygiene: 'Autonome',
        habillage: 'Autonome',
        deplacement: 'Autonome',
        continence: 'Continence urinaire',
      },
      comprehensionFrancais: true,
      tabagisme: 'Non-fumeur',
      tabagismeDetail: '',
      alcool: false,
      alcoolDetail: '',
      cannabis: false,
      cannabisDetail: '',
      allergies: [] as Array<{ libelle: string; type: string }>,
      antecedents: [] as Array<{ libelle: string; annee: string; type: string; categorie?: string }>,
    },
    ficheDiabete: {
      dateDiagnostic: '2010-06',
      retinopathie: 'Absente',
      creatininemie: 75,
      neuropathie: false,
      podologiqueGrade: null,
      amputation: false,
      amputationDetail: '',
      insuffisanceCardiaque: false,
      ntProBNP: null,
      aomi: false,
      ischemicCritique: '',
    },
    bilanInitial: {
      histoireRecent: '<p>Patient transféré <strong>des urgences</strong></p>',
      traitementEntree: '<p>Metformine 1000 mg — matin et soir</p>',
      scoreDouleur: 4 as number | null,
      examenPhysiqueTexte: '<p>Conscience claire, conjonctives normocolorées, pas de signes de gravité</p>',
      projetSoin: '<p>Surveillance glycémique rapprochée, éducation thérapeutique, adaptation du traitement</p>',
      glasgow: { ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
      examenPhysique: {
        taSystolique: 130,
        taDiastolique: 80,
        frequenceCardiaque: 75,
        temperature: 37.0,
        glycemie: 12.5,
        poids: 75,
        taille: 170,
      },
      conclusionEntree: '<p>Décompensation <em>sévère</em></p>',
    },
    examensComplementaires: {
      imagerieTests: [
        { _key: 'img1', date: '2026-01-05', type: 'Échographie cardiaque', typeLibre: '', resultat: '<p>FEVG conservée à 55%.</p>' },
        { _key: 'img2', date: '', type: '__autre__', typeLibre: 'Scanner abdominal', resultat: '' },
      ],
      bilanBio: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        results: [
          { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', isNormal: false, requestDate: '2026-01-10', parameterReferenceValues: { min: 3.5, max: 6.5 } },
          { parameterName: 'Glycémie', parameterUnit: 'g/L', value: '1.1', isNormal: true, requestDate: '2026-01-10', parameterReferenceValues: { options: ['+', '++'] } },
        ],
      },
    },
    evolutionMedicale: {
      journalEvolution: [],
    },
    ordonnanceSortie: [],
    sortie: {
      dateSortie: '2025-01-25',
      destinationSortie: 'Domicile',
      conclusionSortie: 'Bon état général',
      rdvSuivi: [],
      infoPatientFamille: true,
      produitsSanguins: false,
      bmrBhre: false,
    },
  }
}

function createDefaultPatient() {
  return {
    id: 1,
    nom: 'Diallo',
    prenom: 'Mamadou',
    civilite: 'M',
    date_naissance: '1980-05-15',
    nip: 'NIP-789',
    adresse: '123 Rue de la Paix',
    complement_adresse: '',
    region: 'Conakry',
  }
}

function createDefaultContact() {
  return { id: 'NDA-456' }
}

function createDefaultHospital() {
  return {
    name: 'Hôpital Central',
    address: '456 Avenue du Sahel',
    phone: '+224 123 456 789',
    email: 'contact@hopital.gn',
    regNumber: 'AGR-001',
    city: 'Conakry',
  }
}

// ─── Test suite ────────────────────────────────────────────────────

describe('generateCrhDiabeteHtml', () => {
  it('returns a valid HTML document', () => {
    const html = generateCrhDiabeteHtml(
      createDefaultData(),
      createDefaultPatient(),
      createDefaultContact(),
      createDefaultHospital(),
      null,
    )
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="fr">')
    expect(html).toContain('</html>')
  })

  it('uses the 17px base font-size for CRH/CRC content (Feature: default font-size 17)', () => {
    const data = createDefaultData()
    data.evolutionMedicale.journalEvolution = [{ _key: 'e1', content: '<p>Évolution stable</p>', date: '', heure: '', user: '' }]
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    // .crh-field, .crh-para and .crh-rich all use the 17px base size (13px before)
    expect(html).toContain('.crh-field {')
    expect(html).toMatch(/\.crh-field \{[\s\S]*?font-size:17px/)
    expect(html).toMatch(/\.crh-para \{[\s\S]*?font-size:17px/)
    expect(html).toMatch(/\.crh-rich \{[\s\S]*?font-size:17px/)
    // The journal inline style is also 17px (shared by CRH and CRC)
    expect(html).toContain('font-size:17px')
    // Ensure the old 13px base is gone from these content rules
    expect(html).not.toMatch(/\.crh-rich \{[\s\S]*?font-size:13px/)
  })

  // ─── 1. Falls back to patient.date_naissance ─────────────────────

  it('falls back to patient.date_naissance when admission.dateNaissance is empty', () => {
    const data = createDefaultData()
    const patient = createDefaultPatient()
    // admission has no dateNaissance field, so it falls back to patient.date_naissance
    const html = generateCrhDiabeteHtml(data, patient, createDefaultContact(), createDefaultHospital(), null)
    // 1980-05-15 formatted in fr-FR
    expect(html).toContain('15/05/1980')
  })

  // ─── 2. Falls back to patient.nip ────────────────────────────────

  it('falls back to patient.nip when admission.ipp is empty', () => {
    const data = createDefaultData()
    data.admission.ipp = ''
    const patient = createDefaultPatient()
    const html = generateCrhDiabeteHtml(data, patient, createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('NIP-789')
  })

  // ─── 3. Derives sexe from patient.civilite ───────────────────────

  it('derives sexe from patient.civilite — M → Masculin', () => {
    const data = createDefaultData()
    const patient = createDefaultPatient()
    patient.civilite = 'M'
    const html = generateCrhDiabeteHtml(data, patient, createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('Masculin')
    expect(html).not.toContain('Féminin')
  })

  it('derives sexe from patient.civilite — Mme → Féminin', () => {
    const data = createDefaultData()
    const patient = createDefaultPatient()
    patient.civilite = 'Mme'
    const html = generateCrhDiabeteHtml(data, patient, createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('Féminin')
    expect(html).not.toContain('Masculin')
  })

  // ─── 4. Renders admission.motifHospitalisation ───────────────────

  it('renders admission.motifHospitalisation in the ADMISSION section', () => {
    const data = createDefaultData()
    data.admission.motifHospitalisation = '<p>Décompensation diabétique sévère</p>'
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain("Motif d'hospitalisation")
    expect(html).toContain('Décompensation diabétique sévère')
    expect(html).toContain('<div class="crh-para"><strong>Motif d\'hospitalisation :</strong><br><p>Décompensation diabétique sévère</p></div>')
    // Verify it's in the ADMISSION section
    expect(html).toContain('1. ADMISSION')
  })

  it('renders Non renseigné for empty TipTap motifHospitalisation in the ADMISSION section', () => {
    const data = createDefaultData()
    data.admission.motifHospitalisation = '<p></p>'
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain("Motif d'hospitalisation")
    expect(html).toContain('<div class="crh-para"><strong>Motif d\'hospitalisation :</strong><br>Non renseigné</div>')
  })

  // ─── 5. Does NOT render bilanInitial.motifHospitalisation ────────

  it('does NOT render bilanInitial.motifHospitalisation (removed)', () => {
    const data = createDefaultData()
    // bilanInitial.motifHospitalisation is not a field in BilanInitialData
    // Even if we add it as an extra property, the HTML template only reads admission.motifHospitalisation
    const patient = createDefaultPatient()
    const html = generateCrhDiabeteHtml(data, patient, createDefaultContact(), createDefaultHospital(), null)
    // The motifHospitalisation in the output should come from admission, not bilanInitial
    // Verify there's exactly one "Motif d'hospitalisation" occurrence
    const matches = html.match(/Motif d/g)
    expect(matches).toHaveLength(1)
  })

  // ─── 6. Renders medecinTraitantNom ───────────────────────────────

  it('renders medecinTraitantNom when present', () => {
    const data = createDefaultData()
    data.admission.medecinTraitantNom = 'Dr. Martin Pierre'
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('Médecin référent')
    expect(html).toContain('Dr. Martin Pierre')
  })

  it('does not render medecinTraitantNom line when empty', () => {
    const data = createDefaultData()
    data.admission.medecinTraitantNom = ''
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    // The conditional: ${admission.medecinTraitantNom ? ... : ''}
    // Should not render the line
    const medecinMatches = html.match(/Médecin référent/g)
    expect(medecinMatches).toBeNull()
  })

  // ─── 7. Renders interneIPANom in header and signature block ──────

  it('renders interneIPANom in header and signature block', () => {
    const data = createDefaultData()
    data.admission.interneIPANom = 'Dupont Jean'
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    // Header: "Responsable : Dupont Jean"
    expect(html).toContain('Responsable')
    expect(html).toContain('Dupont Jean')
    // Signature block has "Responsable" label
    const responsableMatches = html.match(/Responsable/g)
    expect(responsableMatches!.length).toBeGreaterThanOrEqual(1)
  })

  // ─── 8. Shows "—" for interne when empty ─────────────────────────

  it('shows "—" for interne when interneIPANom is empty', () => {
    const data = createDefaultData()
    data.admission.interneIPANom = ''
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    // Header: conditional — does not render "Responsable" line when empty
    const responsableLineMatch = html.match(/Responsable :/g)
    expect(responsableLineMatch).toBeNull()
    // Signature block: shows "—" via s() fallback
    expect(html).toContain('<strong>Responsable</strong>')
  })

  // ─── Additional: header info ─────────────────────────────────────

  it('renders patient identity in header', () => {
    const data = createDefaultData()
    const patient = createDefaultPatient()
    const html = generateCrhDiabeteHtml(data, patient, createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('DIALLO')
    expect(html).toContain('Mamadou')
  })

  it('renders hospital name in header', () => {
    const data = createDefaultData()
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('Hôpital Central')
  })

  it('renders NDA from contact', () => {
    const data = createDefaultData()
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('NDA-456')
  })

  it('renders Glasgow score correctly', () => {
    const data = createDefaultData()
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('15/15')
  })

  it('renders duration of stay', () => {
    const data = createDefaultData()
    const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    expect(html).toContain('10 jours')
  })

  // ─── Allergies (structured array) ───────────────────────────────

  describe('allergies (structured array)', () => {
    it('renders "Aucune allergie connue" when allergies array is empty', () => {
      const data = createDefaultData()
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Aucune allergie connue')
    })

    it('renders structured allergy entries as libellé + type tag, with no year', () => {
      const data = createDefaultData()
      data.modeVieAtcd.allergies = [
        { libelle: 'Pénicilline', type: 'Médicamenteuse' },
        { libelle: 'Arachide', type: 'Alimentaire' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('5. ALLERGIES')
      expect(html).toContain('Pénicilline')
      expect(html).toContain('Médicamenteuse')
      expect(html).toContain('Arachide')
      expect(html).toContain('Alimentaire')
      // type is rendered as a tag
      expect(html).toContain('<span class="tag tag--danger">Médicamenteuse</span>')
      expect(html).not.toContain('Aucune allergie connue')
    })

    it('never renders a year for allergies, even from legacy annee data', () => {
      const data = createDefaultData()
      // legacy saved data may still carry an annee field — the template must ignore it
      data.modeVieAtcd.allergies = [
        { libelle: 'Pénicilline', annee: '2019', type: 'Médicamenteuse' },
      ] as Array<{ libelle: string; type: string }>
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Pénicilline')
      expect(html).toContain('Médicamenteuse')
      expect(html).not.toContain('2019')
    })

    it('renders a legacy STRING allergies value as-is without crashing', () => {
      // pre-feature CRH/CRC documents stored allergies as a plain string;
      // .map on a string used to crash the export — the template must render it as-is
      const data = createDefaultData()
      data.modeVieAtcd.allergies = 'Pénicilline' as any
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('5. ALLERGIES')
      // rendered verbatim into the section (not via the array path, no type tag)
      expect(html).toContain('>Pénicilline</p>')
      expect(html).not.toContain('Aucune allergie connue')
    })

    it('renders an empty legacy STRING allergies value as "Aucune allergie connue" without crashing', () => {
      const data = createDefaultData()
      data.modeVieAtcd.allergies = '' as any
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('5. ALLERGIES')
      expect(html).toContain('Aucune allergie connue')
    })
  })

  // ─── Antécédents (structured array) ─────────────────────────────

  describe('antécédents (structured array)', () => {
    it('renders "Non renseigné" when antecedents array is empty', () => {
      const data = createDefaultData()
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Non renseigné')
    })

    it('renders structured entries grouped under "Antécédents familiaux" and "Antécédents personnels" headers, year-first', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
        { libelle: 'Appendicite', annee: '2005', type: 'Familiale' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('6. ANTÉCÉDENTS')
      // both group headers are rendered
      expect(html).toContain('<strong>Antécédents familiaux :</strong>')
      expect(html).toContain('<strong>Antécédents personnels :</strong>')
      // year-first format, each entry under its type header
      expect(html).toContain('<strong>Antécédents familiaux :</strong><br>2005 Appendicite')
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>2010 Diabète')
      expect(html).toContain('2010 Diabète')
      expect(html).toContain('2005 Appendicite')
      // type is rendered as a header label, not as a tag
      expect(html).not.toContain('<span class="tag')
    })

    it('omits the year when annee is empty (renders just the libellé)', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Appendicite', annee: '', type: 'Familiale' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Antécédents familiaux :')
      expect(html).toContain('Appendicite')
      expect(html).not.toContain('2005')
      expect(html).toContain('>Appendicite</p>')
    })

    it('does not render the "Antécédents personnels" header when only family entries exist', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Appendicite', annee: '2005', type: 'Familiale' },
        { libelle: 'Hernie inguinale', annee: '1998', type: 'Familiale' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents familiaux :</strong><br>2005 Appendicite<br>1998 Hernie inguinale')
      expect(html).not.toContain('Antécédents personnels')
    })

    it('does not render the "Antécédents familiaux" header when only personal entries exist', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>2010 Diabète')
      expect(html).not.toContain('Antécédents familiaux')
    })

    it('renders a legacy STRING antecedents value as-is without crashing', () => {
      // pre-feature CRH/CRC documents stored antecedents as a plain string;
      // .map on a string used to crash the export — the template must render it as-is
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = 'Appendicite' as any
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('6. ANTÉCÉDENTS')
      // rendered verbatim into the section — no year prefix, no type tag, no group headers
      expect(html).toContain('>Appendicite</p>')
      expect(html).not.toContain('2010 Appendicite')
      expect(html).not.toContain('Antécédents familiaux')
      expect(html).not.toContain('Antécédents personnels')
    })

    it('renders a Personnelle entry with a `categorie` as "année · categorie : libellé"', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Arachide', annee: '2020', type: 'Personnelle', categorie: 'Allergies alimentaires' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      // `·` and `:` are safe HTML literals; only libellé/categorie/année pass through s()
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>2020 · Allergies alimentaires : Arachide')
      expect(html).not.toContain('2020 Allergies alimentaires')
    })

    it('renders a Personnelle entry with `categorie` = "Autres" (a PERSONNELLE_CATEGORIES value) as "année · Autres : libellé"', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Pied diabétique', annee: '2020', type: 'Personnelle', categorie: 'Autres' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>2020 · Autres : Pied diabétique')
      expect(html).not.toContain('2020 Autres')
    })

    it('keeps the legacy "année libellé" format for a Personnelle entry without `categorie`', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>2010 Diabète')
      expect(html).not.toContain('·')
      expect(html).not.toContain(': Arachide')
    })

    it('keeps the legacy "année libellé" format for Familiale entries even when a `categorie` is present', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Appendicite', annee: '2005', type: 'Familiale', categorie: 'Chirurgie' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents familiaux :</strong><br>2005 Appendicite')
      // categorie is ignored for Familiale entries
      expect(html).not.toContain('Chirurgie')
      expect(html).not.toContain('·')
    })

    it('renders "categorie : libellé" without a year when annee is empty and categorie is present', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Arachide', annee: '', type: 'Personnelle', categorie: 'Allergies alimentaires' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>Allergies alimentaires : Arachide')
      expect(html).not.toContain('·')
    })

    it('escapes HTML in `categorie` and libellé of a Personnelle entry', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Arachide & fruits à coque', annee: '2020', type: 'Personnelle', categorie: 'Allergies <alimentaires>' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('2020 · Allergies &lt;alimentaires&gt; : Arachide &amp; fruits à coque')
      expect(html).not.toContain('Allergies <alimentaires>')
    })

    it('renders a mix of `categorie` and legacy Personnelle entries in the same group', () => {
      const data = createDefaultData()
      data.modeVieAtcd.antecedents = [
        { libelle: 'Arachide', annee: '2020', type: 'Personnelle', categorie: 'Allergies alimentaires' },
        { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Antécédents personnels :</strong><br>2020 · Allergies alimentaires : Arachide<br>2010 Diabète')
    })
  })

  // ─── Tabagisme detail ───────────────────────────────────────────

  describe('tabagisme detail', () => {
    it('includes tabagismeDetail when present', () => {
      const data = createDefaultData()
      data.modeVieAtcd.tabagisme = 'Fumeur actif'
      data.modeVieAtcd.tabagismeDetail = '15 cigarettes/jour depuis 20 ans'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('15 cigarettes/jour depuis 20 ans')
    })

    it('does not include tabagismeDetail when empty', () => {
      const data = createDefaultData()
      data.modeVieAtcd.tabagisme = 'Non-fumeur'
      data.modeVieAtcd.tabagismeDetail = ''
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Non-fumeur')
      // The detail line should not have additional text after tabagisme
    })
  })

  // ─── Bilan initial restructured sections ────────────────────────

  describe('bilan initial restructured sections', () => {
    function sectionContent(html: string, title: string): string {
      const anchor = `<div class="crh-section-title">${title}`
      const start = html.indexOf(anchor)
      const nextSection = html.indexOf('<div class="crh-section">', start + anchor.length)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    it('renders HISTOIRE RÉCENTE DE LA MALADIE as its own section', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('2. HISTOIRE RÉCENTE DE LA MALADIE')
      const histoire = sectionContent(html, '2. HISTOIRE RÉCENTE DE LA MALADIE')
      // raw TipTap markup passes through unescaped so the PDF renders formatting
      expect(histoire).toContain('<p>Patient transféré <strong>des urgences</strong></p>')
      expect(histoire).toContain('<strong>des urgences</strong>')
      expect(histoire).not.toContain('&lt;strong&gt;')
      expect(histoire).toContain('<div class="crh-para">')
      // histoireRecent is no longer rendered inside the ADMISSION section
      expect(sectionContent(html, '1. ADMISSION')).not.toContain('Histoire récente de la maladie')
    })

    it("renders TRAITEMENT À L'ENTRÉE with traitementEntree instead of hardcoded Non renseigné", () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain("8. TRAITEMENT À L'ENTRÉE")
      const traitement = sectionContent(html, "8. TRAITEMENT À L'ENTRÉE")
      expect(traitement).toContain('Metformine 1000 mg — matin et soir')
      expect(traitement).not.toContain('Non renseigné')
      // rich text passes through unescaped so the PDF renders formatting
      expect(html).toContain('<p>Metformine 1000 mg — matin et soir</p>')
      // raw TipTap <p> content must NOT be nested inside a <p> wrapper
      expect(html).toContain('<div class="crh-para"><p>Metformine 1000 mg — matin et soir</p></div>')
    })

    it("renders the douleur score in the EXAMEN CLINIQUE section", () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const clinique = sectionContent(html, "9. EXAMEN CLINIQUE À L'ENTRÉE")
      expect(clinique).toContain("Score de douleur à l'entrée")
      expect(clinique).toContain('4 / 10')
    })

    it('renders a douleur history table sorted descending by date', () => {
      const data = createDefaultData()
      ;(data.bilanInitial as any).douleurHistory = [
        { _key: 'older', date: '2026-08-07T08:00:00', score: 3 },
        { _key: 'newer', date: '2026-08-08T09:00:00', score: 7 },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const clinique = sectionContent(html, "9. EXAMEN CLINIQUE À L'ENTRÉE")
      expect(clinique).toContain('7 / 10')
      expect(clinique).toContain('3 / 10')
      expect(clinique.indexOf('7 / 10')).toBeLessThan(clinique.indexOf('3 / 10'))
    })

    it('omits the douleur history table when douleurHistory is empty', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const clinique = sectionContent(html, "9. EXAMEN CLINIQUE À L'ENTRÉE")
      expect(clinique).not.toContain('<th>Score</th>')
    })

    it('renders the examen physique rich text', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const clinique = sectionContent(html, "9. EXAMEN CLINIQUE À L'ENTRÉE")
      expect(clinique).toContain('Examen physique')
      expect(clinique).toContain('Conscience claire, conjonctives normocolorées, pas de signes de gravité')
      expect(clinique).toContain('<div class="crh-para"><strong>Examen physique :</strong><br><p>Conscience claire, conjonctives normocolorées, pas de signes de gravité</p></div>')
    })

    it("renders the Glasgow score inside the EXAMEN CLINIQUE section", () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(sectionContent(html, "9. EXAMEN CLINIQUE À L'ENTRÉE")).toContain('15/15')
    })

    it("renders CONCLUSION À L'ENTRÉE as a dedicated section", () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain("12. CONCLUSION À L'ENTRÉE")
      const conclusion = sectionContent(html, "12. CONCLUSION À L'ENTRÉE")
      // raw TipTap markup passes through unescaped so the PDF renders formatting
      expect(conclusion).toContain('<p>Décompensation <em>sévère</em></p>')
      expect(conclusion).toContain('<em>sévère</em>')
      expect(conclusion).not.toContain('&lt;em&gt;')
      expect(conclusion).toContain('<div class="crh-para">')
    })

    it("renders PROJET DE SOIN PENDANT L'HOSPITALISATION with projetSoin", () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain("13. PROJET DE SOIN PENDANT L'HOSPITALISATION")
      expect(sectionContent(html, "13. PROJET DE SOIN")).toContain('Surveillance glycémique rapprochée, éducation thérapeutique, adaptation du traitement')
      expect(html).toContain('<div class="crh-para"><p>Surveillance glycémique rapprochée, éducation thérapeutique, adaptation du traitement</p></div>')
    })

    it('renders Non renseigné for empty new fields without crashing', () => {
      const data = createDefaultData()
      data.bilanInitial.traitementEntree = ''
      data.bilanInitial.scoreDouleur = null
      data.bilanInitial.examenPhysiqueTexte = ''
      data.bilanInitial.projetSoin = ''
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(sectionContent(html, "8. TRAITEMENT À L'ENTRÉE")).toContain('Non renseigné')
      expect(sectionContent(html, "9. EXAMEN CLINIQUE À L'ENTRÉE")).toContain('Non renseigné')
      expect(sectionContent(html, "13. PROJET DE SOIN")).toContain('Non renseigné')
      expect(html).toContain('15. SORTIE')
    })

    it('renders Non renseigné for empty / tag-only histoireRecent and conclusionEntree', () => {
      const cases: Array<[string, string]> = [
        ['', ''],
        ['<p></p>', '<p></p>'],
        ['<p> </p>', '<p><br></p>'],
      ]
      for (const [histoire, conclusion] of cases) {
        const data = createDefaultData()
        data.bilanInitial.histoireRecent = histoire
        data.bilanInitial.conclusionEntree = conclusion
        const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
        const histoireSection = sectionContent(html, '2. HISTOIRE RÉCENTE DE LA MALADIE')
        const conclusionSection = sectionContent(html, "12. CONCLUSION À L'ENTRÉE")
        expect(histoireSection).toContain('Non renseigné')
        expect(conclusionSection).toContain('Non renseigné')
        expect(histoireSection).not.toContain('<p>Patient transféré')
        expect(conclusionSection).not.toContain('<p>Décompensation')
        expect(conclusionSection).not.toContain('<em>')
      }
    })
  })

  // ─── Poids / Taille / IMC in the admission vitals block ────────

  describe('poids / taille / IMC in the admission vitals block', () => {
    it('renders Poids, Taille and IMC when poids and taille are present', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Poids : 75 kg')
      expect(html).toContain('Taille : 170 cm')
      // 75 / (170/100)² = 25.9515… rounded to 1 decimal → 26
      expect(html).toContain('IMC : 26 kg/m²')
    })

    it('renders — for Poids, Taille and IMC when poids / taille are absent', () => {
      const data = createDefaultData()
      data.bilanInitial.examenPhysique.poids = null as any
      data.bilanInitial.examenPhysique.taille = null as any
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Poids : —')
      expect(html).toContain('Taille : —')
      expect(html).toContain('IMC : —')
    })
  })

  // ─── Examens complémentaires: imagerieTests + bilanBio ──────────

  describe('examens complémentaires (imagerie + bilan bio)', () => {
    it('renders imagerieTests with date, type and rich-text resultat', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Imagerie / Test :</strong>')
      expect(html).toContain('Imagerie / Test — 05/01/2026 — Échographie cardiaque')
      expect(html).toContain('FEVG conservée à 55%')
    })

    it('uses typeLibre as effective type when type is __autre__', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('Scanner abdominal')
      expect(html).toContain('Imagerie / Test — Scanner abdominal')
    })

    it('renders imagerieTests date-desc in the PDF', () => {
      const data = createDefaultData()
      data.examensComplementaires.imagerieTests = [
        { _key: 'older', date: '2026-01-05', type: 'Échographie cardiaque', typeLibre: '', resultat: '<p>FEVG 55%.</p>' },
        { _key: 'empty', date: '', type: '__autre__', typeLibre: 'Scanner abdominal', resultat: '' },
        { _key: 'newer', date: '2026-02-01', type: 'Scanner cérébral', typeLibre: '', resultat: '<p>RAS</p>' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const sectionStart = html.indexOf('<strong>Imagerie / Test :</strong>')
      const nextSection = html.indexOf('<div class="crh-section">', sectionStart)
      const section = html.slice(sectionStart, nextSection === -1 ? undefined : nextSection)
      const newer = section.indexOf('Imagerie / Test — 01/02/2026 — Scanner cérébral')
      const older = section.indexOf('Imagerie / Test — 05/01/2026 — Échographie cardiaque')
      const empty = section.indexOf('Imagerie / Test — Scanner abdominal')
      expect(newer).toBeGreaterThan(-1)
      expect(older).toBeGreaterThan(-1)
      expect(empty).toBeGreaterThan(-1)
      // most recent first, empties last
      expect(newer).toBeLessThan(older)
      expect(older).toBeLessThan(empty)
    })

    it('renders imagerie label, bio range, bio requestDate and RDV dates as DD/MM/YYYY', () => {
      const data = createDefaultData()
      data.sortie.rdvSuivi = [
        { _key: 'rdv1', date: '2025-02-10', heure: '09:30', intitule: 'Consultation endocrinologie', lieuPraticien: 'Dr. Camara' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      // imagerie label date
      expect(html).toContain('Imagerie / Test — 05/01/2026 — Échographie cardiaque')
      expect(html).not.toContain('Imagerie / Test — 2026-01-05')
      // bio date range + bio requestDate cells
      expect(html).toContain('Résultat Bio (01/01/2026 → 31/01/2026)')
      expect(html).toContain('<td>10/01/2026</td>')
      expect(html).not.toContain('2026-01-01 → 2026-01-31')
      // RDV de suivi date cell
      expect(html).toContain('<td>10/02/2025 09:30</td>')
      // month picker diagnostic rendered as MM/YYYY
      expect(html).toContain('06/2010')
    })

    it('passes a legacy full-date dateDiagnostic through unchanged (not truncated to MM/YYYY)', () => {
      const data = createDefaultData()
      data.ficheDiabete.dateDiagnostic = '2026-01-15'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      // full-date value renders as-is, matching the UI's formatMonth behavior
      expect(html).toContain('>2026-01-15 (évolution :')
      expect(html).not.toContain('>01/2026 (évolution')
    })

    it('renders the bilanBio heading with the date range', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Résultat Bio (01/01/2026 → 31/01/2026) :</strong>')
    })

    it('renders bilanBio rows with values, units and reference values', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<td>HbA1c</td>')
      expect(html).toContain('7.2')
      expect(html).toContain('3.5 – 6.5')
      expect(html).toContain('<td>Glycémie</td>')
      expect(html).toContain('+ / ++')
    })

    it('groups Résultat Bio by examName with one header per group, params sorted by name', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', isNormal: false, requestDate: '2026-01-10', examName: 'Bilan glycémique' },
        { parameterName: 'Glycémie', parameterUnit: 'g/L', value: '1.1', isNormal: true, requestDate: '2026-01-10', examName: 'Bilan glycémique' },
        { parameterName: 'Créatinine', parameterUnit: 'µmol/L', value: '85', isNormal: true, requestDate: '2026-01-10', examName: 'Bilan rénal' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      // both group headers are rendered
      expect(html).toContain('Bilan glycémique')
      expect(html).toContain('Bilan rénal')
      // groups sorted alphabetically (case-insensitive): Bilan glycémique < Bilan rénal
      expect(html.indexOf('Bilan glycémique')).toBeLessThan(html.indexOf('Bilan rénal'))
      // parameters sorted by name within a group: Glycémie < HbA1c
      expect(html.indexOf('<td>Glycémie</td>')).toBeLessThan(html.indexOf('<td>HbA1c</td>'))
      // each parameter is rendered after its group header
      expect(html.indexOf('<td>Glycémie</td>')).toBeGreaterThan(html.indexOf('Bilan glycémique'))
      expect(html.indexOf('<td>HbA1c</td>')).toBeGreaterThan(html.indexOf('Bilan glycémique'))
      expect(html.indexOf('<td>Créatinine</td>')).toBeGreaterThan(html.indexOf('Bilan rénal'))
    })

    it('groups results without examName under « Examen non précisé »', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', requestDate: '2026-01-10' },
        { parameterName: 'Créatinine', parameterUnit: 'µmol/L', value: '85', requestDate: '2026-01-10', examName: '' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      expect(html).toContain('Examen non précisé')
      expect(html).toContain('<td>HbA1c</td>')
      expect(html).toContain('<td>Créatinine</td>')
      // both parameters land under the fallback group header
      expect(html.indexOf('<td>HbA1c</td>')).toBeGreaterThan(html.indexOf('Examen non précisé'))
      expect(html.indexOf('<td>Créatinine</td>')).toBeGreaterThan(html.indexOf('Examen non précisé'))
    })

    it('omits the imagerie and bilanBio blocks when data is absent', () => {
      const data = createDefaultData()
      delete (data.examensComplementaires as any).imagerieTests
      delete (data.examensComplementaires as any).bilanBio
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).not.toContain('Imagerie / Test')
      expect(html).not.toContain('Résultat Bio')
    })
  })

  // ─── « Dernier examen métabolique » (section 7 DIABÈTE) ──────────
  //
  // Mirrors the read-only card in FicheDiabeteTab.vue: the LAST result of
  // each metabolic parameter (HbA1c, LDL-c, HDL-c, Triglycérides) taken from
  // examensComplementaires.bilanBio.results, rendered as "value unit
  // (DD/MM/YYYY)" with the same matching/sorting rules. No dedicated row for
  // any other parameter; « — » when the patient has no result for one.

  describe('dernier examen métabolique (bilan bio → section 7 DIABÈTE)', () => {
    function diabeSectionContent(html: string): string {
      const anchor = '<div class="crh-section-title">7. DIABÈTE'
      const start = html.indexOf(anchor)
      const nextSection = html.indexOf('<div class="crh-section">', start + anchor.length)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    it('renders the latest values with unit and DD/MM/YYYY date (— for the rest)', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>Dernier examen métabolique :</strong>')
      expect(html).toContain('<div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">7.2 % (10/01/2026)</span></div>')
      expect(html).toContain('<div class="crh-field"><span class="crh-label">LDL-c</span><span class="crh-value">—</span></div>')
      expect(html).toContain('<div class="crh-field"><span class="crh-label">HDL-c</span><span class="crh-value">—</span></div>')
      expect(html).toContain('<div class="crh-field"><span class="crh-label">Triglycérides</span><span class="crh-value">—</span></div>')
    })

    it('takes the LATEST result of each parameter (most recent requestDate wins)', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'HbA1c', parameterUnit: '%', value: '9.1', requestDate: '2025-06-01' },
        { parameterName: 'HbA1c', parameterUnit: '%', value: '8.1', requestDate: '2025-11-02' },
        { parameterName: 'LDL-c', parameterUnit: 'mmol/L', value: '2.30', requestDate: '2026-02-10' },
        { parameterName: 'HDL-c', parameterUnit: 'mmol/L', value: '1.10', requestDate: '2026-02-10' },
        { parameterName: 'Triglycérides', parameterUnit: 'mmol/L', value: '1.50', requestDate: '2026-02-10' },
        { parameterName: 'Cholestérol total', parameterUnit: 'mmol/L', value: '4.8', requestDate: '2026-02-10' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      // the OLDER HbA1c result is not displayed — only the latest one is
      expect(html).not.toContain('9.1 % (01/06/2025)')
      expect(html).toContain('8.1 % (02/11/2025)')
      expect(html).toContain('2.30 mmol/L (10/02/2026)')
      expect(html).toContain('1.10 mmol/L (10/02/2026)')
      expect(html).toContain('1.50 mmol/L (10/02/2026)')
      // Cholestérol total has no dedicated row in this block
      expect(html).not.toContain('Cholestérol total</span><span class="crh-value">4.8')
    })

    it('falls back to filledAt (and createdAt) for the display date', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'HbA1c', parameterUnit: '%', value: '6.9', filledAt: '2026-01-20 08:00:00' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">6.9 % (20/01/2026)</span></div>')
    })

    it('renders a YYYY-MM requestDate as the 1st of the month (M1 parity with the UI)', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', requestDate: '2026-01' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      // dateFmt forces T00:00:00 on non-T strings → local month-start, same as
      // the renderer formatDate('2026-01').
      expect(html).toContain('<div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">7.2 % (01/01/2026)</span></div>')
    })

    it('matches parameter names case/accents-insensitively (Hémoglobine glyquée)', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'Hémoglobine glyquée (HbA1c)', parameterUnit: '%', value: '6.8', requestDate: '2026-01-20' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">6.8 % (20/01/2026)</span></div>')
    })

    it('omits the whole block when no metabolic parameter matches', () => {
      const data = createDefaultData()
      data.examensComplementaires.bilanBio.results = [
        { parameterName: 'Créatinine', parameterUnit: 'µmol/L', value: '85', requestDate: '2026-01-10' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).not.toContain('Dernier examen métabolique')
      // the Résultat Bio table still renders (unrelated block)
      expect(html).toContain('<td>Créatinine</td>')
    })

    it('renders the metabolic block between Anticorps and Fonction rénale in section 7 (no Poids historique)', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const section = diabeSectionContent(html)
      expect(section).not.toContain('Poids historique')
      const anticorps = section.indexOf('>Anticorps<')
      const fonctionRenale = section.indexOf('Fonction rénale')
      const block = section.indexOf('Dernier examen métabolique')
      expect(anticorps).toBeGreaterThanOrEqual(0)
      expect(block).toBeGreaterThan(anticorps)
      expect(block).toBeLessThan(fonctionRenale)
    })
  })

  // ─── Traitement / Autosurveillance (parité FicheDiabeteTab.vue) ──────
  //
  // Bloc « Traitement / Autosurveillance : » inséré entre Dernier examen
  // métabolique et Fonction rénale. Médicaments cochés (ADO/aGLP-1/INSULINE/
  // POMPE) en lignes « depuis MM/YYYY (durée) », durée années+mois via
  // expoLabel pour les 3 premiers et années ENTIÈRES révolues pour la POMPE,
  // commentaires riche par médicament, traitement habituel riche, badges
  // Oui/Non capillaire & MCG (seulement si renseignés) et commentaire riche.
  // Le bloc entier est omis quand rien n'est renseigné.

  describe('traitement / autosurveillance block (parité FicheDiabeteTab.vue)', () => {
    function diabeSectionContent(html: string): string {
      const anchor = '<div class="crh-section-title">7. DIABÈTE'
      const start = html.indexOf(anchor)
      const nextSection = html.indexOf('<div class="crh-section">', start + anchor.length)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    const baseHtml = (patch: (data: any) => void): string => {
      const data = createDefaultData()
      patch(data)
      return generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    }

    it('omits the whole block when no medicament / traitement / autosurveillance is set', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).not.toContain('Traitement / Autosurveillance')
      expect(html).not.toContain('Autosurveillance capillaire')
    })

    it('renders the block between Dernier examen métabolique and Fonction rénale in section 7', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['ADO']
        data.ficheDiabete.adoDateDebut = '2022-01'
      })
      const section = diabeSectionContent(html)
      const dernierExamen = section.indexOf('Dernier examen métabolique')
      const fonctionRenale = section.indexOf('Fonction rénale')
      const block = section.indexOf('Traitement / Autosurveillance')
      expect(block).toBeGreaterThan(dernierExamen)
      expect(block).toBeLessThan(fonctionRenale)
    })

    it('renders medicament lines with MM/YYYY debut and year+month durations (refExpo = dateEntree 2025-01-15)', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['ADO', 'INSULINE']
        data.ficheDiabete.adoDateDebut = '2022-01'
        data.ficheDiabete.insulineType = 'multi injection'
        data.ficheDiabete.insulineDateDebut = '2024-03'
      })
      // ADO : 2025-01 − 2022-01 = 3 ans ; INSULINE : 2025-01 − 2024-03 = 10 mois
      expect(html).toContain('<div class="crh-field"><span class="crh-label">ADO</span><span class="crh-value">depuis 01/2022 (3 ans)</span></div>')
      expect(html).toContain('<div class="crh-field"><span class="crh-label">INSULINE</span><span class="crh-value">multi injection — depuis 03/2024 (10 mois)</span></div>')
      // non-cochés → absents
      expect(html).not.toContain('crh-label">aGLP-1<')
      expect(html).not.toContain('crh-label">POMPE<')
    })

    it('renders the POMPE duration in whole EXACT years only (anniversaire mois révolu)', () => {
      // 2025-01 − 2023-01 = 2 ans calendaires, mois d'anniversaire (janvier)
      // ATTEINT → 2 ans entiers révolus ; mois de début PRÉSERVÉ.
      const html = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['POMPE']
        data.ficheDiabete.pompeType = 'Omnipod 5'
        data.ficheDiabete.pompeDateDebut = '2023-01'
      })
      expect(html).toContain('<div class="crh-field"><span class="crh-label">POMPE</span><span class="crh-value">Omnipod 5 — depuis 01/2023 (2 ans)</span></div>')

      // Anniversaire PAS encore atteint (début 2023-02, référence janvier) → 1 an
      const htmlNonRevolu = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['POMPE']
        data.ficheDiabete.pompeDateDebut = '2023-02'
      })
      expect(htmlNonRevolu).toContain('<div class="crh-field"><span class="crh-label">POMPE</span><span class="crh-value">depuis 02/2023 (1 an)</span></div>')
    })

    it('does not render a duration when the POMPE start date is in the future', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['POMPE']
        data.ficheDiabete.pompeDateDebut = '2027-01'
      })
      expect(html).toContain('<div class="crh-field"><span class="crh-label">POMPE</span><span class="crh-value">depuis 01/2027</span></div>')
      expect(html).not.toContain('(1 an)')
      expect(html).not.toContain('(0 an')
    })

    it('embeds medicament commentaires as raw rich HTML when set (escaping regression)', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['ADO']
        data.ficheDiabete.adoDateDebut = '2024-01'
        data.ficheDiabete.adoCommentaire = '<p>Metformine <strong>1000</strong> mg</p>'
      })
      expect(html).toContain('<strong>ADO – commentaire :</strong>')
      expect(html).toContain('<div class="crh-rich"><p>Metformine <strong>1000</strong> mg</p></div>')
      expect(html).not.toContain('&lt;strong&gt;')
    })

    it('renders the traitement habituel rich block when set', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.traitementHabituel = '<p>Metformine 1000 mg — matin et soir</p>'
      })
      expect(html).toContain('<strong>Traitement habituel :</strong>')
      expect(html).toContain('<div class="crh-rich"><p>Metformine 1000 mg — matin et soir</p></div>')
      expect(html).not.toContain('&lt;')
    })

    it('renders Oui/Non autosurveillance badges + rich commentaire when set', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.surveillanceCapillaire = 'Oui'
        data.ficheDiabete.surveillanceMCG = 'Non'
        data.ficheDiabete.surveillanceCommentaire = '<p>3 mesures/j</p>'
      })
      expect(html).toContain('<div class="crh-field"><span class="crh-label">Autosurveillance capillaire</span><span class="crh-value"><span class="badge-yes">Oui</span></span></div>')
      expect(html).toContain('<div class="crh-field"><span class="crh-label">Autosurveillance MCG</span><span class="crh-value"><span class="badge-no">Non</span></span></div>')
      expect(html).toContain('<strong>Autosurveillance :</strong>')
      expect(html).toContain('<div class="crh-rich"><p>3 mesures/j</p></div>')
    })

    it('skips the badge rows when the autosurveillance values are empty', () => {
      const html = baseHtml((data) => {
        data.ficheDiabete.medicaments = ['aGLP-1']
        data.ficheDiabete.glp1DateDebut = '2022-11'
      })
      expect(html).toContain('<div class="crh-field"><span class="crh-label">aGLP-1</span><span class="crh-value">depuis 11/2022 (2 ans 2 mois)</span></div>')
      expect(html).not.toContain('Autosurveillance capillaire')
      expect(html).not.toContain('Autosurveillance MCG')
    })
  })

  // ─── Rich-text escaping regression: TipTap HTML must be embedded raw ────
  //
  // The template previously HTML-escaped the rich-text fields
  // evolutionMedicale.journalEvolution and the imagerie exam resultat,
  // producing literal &lt;p&gt; tags in the rendered PDF. These tests pin the
  // FINAL contract: the TipTap HTML passes through unescaped so the PDF
  // renders formatting.

  describe('rich-text fields embedded as raw TipTap HTML (escaping regression)', () => {
    it('embeds journalEvolution rich text unescaped — no literal &lt;p&gt;', () => {
      const data = createDefaultData()
      // Remove the imagerie rich-text fixtures so the evolution journal is the
      // only possible source of an escaped &lt;p&gt; in the output.
      data.examensComplementaires.imagerieTests = []
      data.evolutionMedicale.journalEvolution = [
        { _key: 'e1', content: '<p>Glycémie stable</p>', date: '2026-01-12', heure: '10:30', user: 'Dr Alpha' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain("Journal d'évolution")
      // Stamp format: [DD/MM/YYYY HH:MM] · auteur + contenu non échappé
      expect(html).toContain('[12/01/2026 10:30] · Dr Alpha')
      expect(html).toContain('Glycémie stable')
      expect(html).toContain('<p>Glycémie stable</p>')
      expect(html).not.toContain('&lt;p&gt;')
    })

    it('embeds imagerie resultat rich text unescaped — no literal &lt;p&gt;', () => {
      const data = createDefaultData()
      data.examensComplementaires.imagerieTests = [
        { _key: 'img-ras', date: '2026-02-01', type: 'Scanner', typeLibre: '', resultat: '<p>RAS</p>' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('RAS')
      expect(html).not.toContain('&lt;p&gt;')
    })
  })

  // ─── Rich-text detail fields (commentaireVie, tabagismeDetail, …) ────
  //
  // The new RichTextEditor outputs TipTap HTML for the habitus / diabète /
  // sortie detail fields. The template must embed them raw inside .crh-rich,
  // exactly like the other rich fields — never escaped.

  describe('rich text colors & highlights preserved in PDF (éditeur avancé)', () => {
    function htmlWithTraitementHabituel(value: string): string {
      const data = createDefaultData()
      ;(data.ficheDiabete as any).traitementHabituel = value
      return generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
    }

    it('préserve span color + mark background-color + data-color', () => {
      const html = htmlWithTraitementHabituel(
        '<p><span style="color: #ff0000;">rouge</span> et <mark data-color="#ffff00" style="background-color: #ffff00; color: inherit">surligné</mark></p>',
      )
      expect(html).toContain('<span style="color: #ff0000">rouge</span>')
      expect(html).toContain('<mark')
      expect(html).toContain('background-color: #ffff00')
      expect(html).toContain('data-color="#ffff00"')
      expect(html).toContain('surligné')
    })

    it('préserve rgb(), font-size et text-align sûrs', () => {
      const html = htmlWithTraitementHabituel(
        '<p style="text-align: center;"><span style="color: rgb(37, 99, 235); font-size: 20px;">centré bleu</span></p>',
      )
      expect(html).toContain('text-align: center')
      expect(html).toContain('color: rgb(37, 99, 235)')
      expect(html).toContain('font-size: 20px')
    })

    it('rejette les déclarations CSS dangereuses mais garde les sûres', () => {
      const html = htmlWithTraitementHabituel(
        '<p><span style="color: #00ff00; background-image: url(javascript:alert(1)); position: absolute;">x</span></p>',
      )
      expect(html).toContain('color: #00ff00')
      expect(html).not.toContain('background-image')
      expect(html).not.toContain('javascript')
      expect(html).not.toContain('position')
    })

    it('rejette expression(), behavior et !important', () => {
      const html = htmlWithTraitementHabituel(
        '<p><span style="width: expression(alert(1)); color: #0000ff !important;">x</span></p>',
      )
      expect(html).not.toContain('expression')
      expect(html).not.toContain('!important')
      // `color` accompagné de !important est rejeté avec sa déclaration
      expect(html).not.toContain('#0000ff')
      expect(html).toContain('>x</span>')
    })

    it('retire les gestionnaires d’événements sur mark mais garde le surlignage', () => {
      const html = htmlWithTraitementHabituel(
        '<p><mark style="background-color: #ffff00" onclick="alert(1)">texte</mark></p>',
      )
      expect(html).not.toContain('onclick')
      expect(html).toContain('<mark style="background-color: #ffff00">texte</mark>')
    })

    it('retire style et data-color invalides', () => {
      const html = htmlWithTraitementHabituel(
        '<p><span style="color: red;">a</span><mark data-color="javascript:alert(1)" style="background-color: red;">b</mark></p>',
      )
      // noms de couleurs non hexadécimaux : dégradation gracieuse (texte conservé)
      expect(html).toContain('>a</span>')
      expect(html).not.toContain('color: red')
      expect(html).not.toContain('data-color=')
      expect(html).toContain('>b</mark>')
    })
  })

  describe('habitus / diabète / sortie detail fields embedded as raw HTML', () => {
    it('embeds commentaireVie rich text unescaped inside .crh-rich', () => {
      const data = createDefaultData()
      data.modeVieAtcd.commentaireVie = '<p>A à sa charge son neveu <strong>autiste</strong></p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-rich"><p>A à sa charge son neveu <strong>autiste</strong></p></div>')
      expect(html).toContain('<strong>autiste</strong>')
      expect(html).not.toContain('&lt;strong&gt;')
    })

    it('embeds tabagismeDetail rich text unescaped in the stacked layout — no literal &lt;p&gt;', () => {
      const data = createDefaultData()
      data.modeVieAtcd.tabagisme = 'Fumeur actif'
      data.modeVieAtcd.tabagismeDetail = '<p>15 cigarettes/jour <strong>depuis 20 ans</strong></p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-para"><strong>Tabac :</strong><br>Fumeur actif<br><div class="crh-rich"><p>15 cigarettes/jour <strong>depuis 20 ans</strong></p></div></div>')
      expect(html).not.toContain('&lt;p&gt;')
      expect(html).not.toContain('&lt;strong&gt;')
    })

    it('embeds alcoolDetail and cannabisDetail rich text unescaped', () => {
      const data = createDefaultData()
      data.modeVieAtcd.alcool = true
      data.modeVieAtcd.alcoolDetail = '<p>3 canettes de bière/jour <em>(2L)</em></p>'
      data.modeVieAtcd.cannabis = true
      data.modeVieAtcd.cannabisDetail = '<p>2 joints par jour</p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<em>(2L)</em>')
      expect(html).toContain('<p>2 joints par jour</p>')
      expect(html).not.toContain('&lt;em&gt;')
      expect(html).not.toContain('&lt;p&gt;')
    })

    it('embeds amputationDetail and ischemicCritique rich text unescaped', () => {
      const data = createDefaultData()
      data.ficheDiabete.amputation = true
      data.ficheDiabete.amputationDetail = '<p>Amputation transmétatarsienne gauche le <strong>08/12/2025</strong></p>'
      data.ficheDiabete.aomi = true
      data.ficheDiabete.ischemicCritique = '<p>Ischémie critique du membre inférieur droit</p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<strong>08/12/2025</strong>')
      expect(html).toContain('Ischémie critique du membre inférieur droit')
      expect(html).not.toContain('&lt;strong&gt;')
      expect(html).not.toContain('&lt;p&gt;')
    })

    it('embeds conclusionSortie rich text unescaped inside .crh-rich', () => {
      const data = createDefaultData()
      data.sortie.conclusionSortie = '<p>Bon état général, <strong>régime adapté</strong></p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-rich"><p>Bon état général, <strong>régime adapté</strong></p></div>')
      expect(html).not.toContain('&lt;strong&gt;')
    })
  })

  // ─── Section 7 DIABÈTE: new historique fields ────────────────────
  //
  // typeDiabete / typeDiabeteAutre / circonstanceDecouverte / anticorps /
  // typeAnticorps are stored as JSON and may be undefined on old records —
  // the template must render '—' (or omit the rich blocks) in that case.

  describe('diabète historique new fields', () => {
    function diabeSectionContent(html: string): string {
      const anchor = '<div class="crh-section-title">7. DIABÈTE'
      const start = html.indexOf(anchor)
      const nextSection = html.indexOf('<div class="crh-section">', start + anchor.length)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    it('renders — for Type de diabète and Anticorps and omits rich blocks when absent', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const section = diabeSectionContent(html)
      expect(section).toContain('<div class="crh-field"><span class="crh-label">Type de diabète</span><span class="crh-value">—</span></div>')
      expect(section).toContain('<div class="crh-field"><span class="crh-label">Anticorps</span><span class="crh-value">—</span></div>')
      expect(section).not.toContain('Circonstances de découverte')
      expect(section).not.toContain("Type d'anticorps")
    })

    it('renders Type de diabète after the Date diagnostic field', () => {
      const data = createDefaultData()
      data.ficheDiabete.typeDiabete = 'Type 2'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      const section = diabeSectionContent(html)
      expect(section).toContain('<div class="crh-field"><span class="crh-label">Type de diabète</span><span class="crh-value">Type 2</span></div>')
      expect(section.indexOf('Date diagnostic')).toBeLessThan(section.indexOf('Type de diabète'))
    })

    it('renders "Autre (…)" with the free-text suffix for typeDiabete = Autre', () => {
      const data = createDefaultData()
      data.ficheDiabete.typeDiabete = 'Autre'
      data.ficheDiabete.typeDiabeteAutre = 'MODY'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<span class="crh-value">Autre (MODY)</span>')
    })

    it('escapes HTML in typeDiabeteAutre free text', () => {
      const data = createDefaultData()
      data.ficheDiabete.typeDiabete = 'Autre'
      data.ficheDiabete.typeDiabeteAutre = 'Suspect <MODY> & co'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<span class="crh-value">Autre (Suspect &lt;MODY&gt; &amp; co)</span>')
      expect(html).not.toContain('Suspect <MODY>')
    })

    it('renders circonstanceDecouverte rich text unescaped inside .crh-rich', () => {
      const data = createDefaultData()
      data.ficheDiabete.circonstanceDecouverte = '<p>Découverte fortuite lors d\'un <strong>bilan systématique</strong></p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-para"><strong>Circonstances de découverte :</strong><br><div class="crh-rich"><p>Découverte fortuite lors d\'un <strong>bilan systématique</strong></p></div></div>')
      expect(html).not.toContain('&lt;strong&gt;')
      expect(html).not.toContain('&lt;p&gt;')
    })

    it('renders the Anticorps value when present', () => {
      const data = createDefaultData()
      data.ficheDiabete.anticorps = 'Positifs'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-field"><span class="crh-label">Anticorps</span><span class="crh-value">Positifs</span></div>')
    })

    it('renders typeAnticorps rich text unescaped inside .crh-rich', () => {
      const data = createDefaultData()
      data.ficheDiabete.typeAnticorps = '<p>Anti-GAD <strong>et</strong> anti-IA2</p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain('<div class="crh-para"><strong>Type d\'anticorps :</strong><br><div class="crh-rich"><p>Anti-GAD <strong>et</strong> anti-IA2</p></div></div>')
      expect(html).not.toContain('&lt;strong&gt;')
      expect(html).not.toContain('&lt;p&gt;')
    })
  })

  // ─── Section 7 DIABÈTE: "Facteurs de risque" block ──────────────
  //
  // Corrections de revue: the risk-factor sub-block is only rendered when at
  // least one factor is filled, PA / exposure duration align on `dateEntree`
  // (not today), the exposure duration label ("X ans Y mois") is exported, and
  // a future start date suppresses both PA and the duration.

  describe('diabète "Facteurs de risque" block', () => {
    function diabeSectionContent(html: string): string {
      const anchor = '<div class="crh-section-title">7. DIABÈTE'
      const start = html.indexOf(anchor)
      const nextSection = html.indexOf('<div class="crh-section">', start + anchor.length)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    it('omits the "Facteurs de risque" block when no risk factor is set', () => {
      const data = createDefaultData()
      // default factory has no dyslipidemie/hta/sas/tabac/substance filled
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).not.toContain('Facteurs de risque')
      expect(diabeSectionContent(html)).not.toContain('Facteurs de risque')
    })

    it('renders the block and aligns PA on dateEntree, not today (1 PA, not 1.3 PA)', () => {
      const data = createDefaultData()
      data.admission.dateEntree = '2026-06-01'
      data.ficheDiabete.tabac = 'Oui'
      data.ficheDiabete.tabacQuantite = 20
      data.ficheDiabete.tabacUnite = 'cigarette'
      data.ficheDiabete.tabacDuree = 'j'
      data.ficheDiabete.tabacDateDebut = '2025-06'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section = diabeSectionContent(html)
      expect(section).toContain('Facteurs de risque')
      // refExpo = dateEntree 2026-06 → 20 cig/j over exactly 1 year → 1 PA
      expect(section).toContain('(≈ 1 PA)')
      expect(section).toContain('depuis 06/2025')
      // if the reference were "today" (2026-09) the PA would be 1.25 → 1.3 — asserts dateEntree is used
      expect(section).not.toContain('1.3 PA')
    })

    it('exports the compound exposure duration label ("2 ans 3 mois")', () => {
      const data = createDefaultData()
      data.admission.dateEntree = '2026-06-01'
      data.ficheDiabete.tabac = 'Oui'
      data.ficheDiabete.tabacQuantite = 20
      data.ficheDiabete.tabacUnite = 'cigarette'
      data.ficheDiabete.tabacDuree = 'j'
      data.ficheDiabete.tabacDateDebut = '2024-03'
      data.ficheDiabete.substance = 'Alcool'
      data.ficheDiabete.substanceDateDebut = '2024-03'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section = diabeSectionContent(html)
      // 2026-06 − 2024-03 = 2 ans 3 mois for both tabac and substance lines
      expect(section).toContain('(2 ans 3 mois)')
    })

    it('suppresses PA and the duration for a future tabac start date', () => {
      const data = createDefaultData()
      data.admission.dateEntree = '2026-06-01'
      data.ficheDiabete.tabac = 'Oui'
      data.ficheDiabete.tabacQuantite = 20
      data.ficheDiabete.tabacUnite = 'cigarette'
      data.ficheDiabete.tabacDuree = 'j'
      data.ficheDiabete.tabacDateDebut = '2027-01'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section = diabeSectionContent(html)
      expect(section).toContain('Facteurs de risque')
      // PA is null → no "(≈ … PA)"
      expect(section).not.toContain('≈')
      expect(section).not.toContain('PA)')
      // duration label is '' → no "(X ans / X mois)" parenthetical
      expect(section).not.toMatch(/\(\d+\s*(an|ans|mois)/)
    })

    it('suppresses the duration label for a future substance start date', () => {
      const data = createDefaultData()
      data.admission.dateEntree = '2026-06-01'
      data.ficheDiabete.substance = 'Alcool'
      data.ficheDiabete.substanceDateDebut = '2027-01'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section = diabeSectionContent(html)
      expect(section).toContain('Facteurs de risque')
      expect(section).toContain('Substance / Alcool')
      // no duration parenthetical for the future start
      expect(section).not.toMatch(/\(\d+\s*(an|ans|mois)/)
    })
  })

  // ─── Réglementaires checkboxes moved from ÉVOLUTION to SORTIE ────

  describe('réglementaires checkboxes in section 15 SORTIE', () => {
    const SECTION_11 = '<div class="crh-section-title">11. '

    function section11Content(html: string): string {
      const start = html.indexOf(SECTION_11)
      const nextSection = html.indexOf('<div class="crh-section">', start + SECTION_11.length)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    it('renders the réglementaires checkboxes inside section 15 SORTIE, not section 11', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html.indexOf(SECTION_11)).toBeLessThan(html.indexOf('15. SORTIE'))
      // the row appears after the SORTIE header and before the conclusion block
      expect(html.indexOf('15. SORTIE')).toBeLessThan(html.indexOf('Information du patient / famille'))
      expect(html.indexOf('Information du patient / famille')).toBeLessThan(html.indexOf('Conclusion / Synthèse de sortie'))
      // section 11 (between its header and section 12) no longer contains the rows
      const section11 = section11Content(html)
      expect(section11).not.toContain('Information du patient / famille')
      expect(section11).not.toContain('Administration de produits sanguins')
      expect(section11).not.toContain('Porteur / Contact BMR ou BHRe')
    })

    it('renders legacy evolutionMedicale.* booleans via the fallback pick-up', () => {
      const data = createDefaultData()
      // pre-move signed documents keep the booleans only under evolutionMedicale.*
      delete (data.sortie as any).infoPatientFamille
      delete (data.sortie as any).produitsSanguins
      delete (data.sortie as any).bmrBhre
      data.evolutionMedicale.infoPatientFamille = true
      data.evolutionMedicale.produitsSanguins = true
      data.evolutionMedicale.bmrBhre = true
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      // all three rows still render inside section 15 SORTIE
      expect(html.indexOf('15. SORTIE')).toBeLessThan(html.indexOf('Information du patient / famille'))
      expect(html.indexOf('15. SORTIE')).toBeLessThan(html.indexOf('Administration de produits sanguins'))
      expect(html.indexOf('15. SORTIE')).toBeLessThan(html.indexOf('Porteur / Contact BMR ou BHRe'))
      expect(html.indexOf('Information du patient / famille')).toBeLessThan(html.indexOf('Conclusion / Synthèse de sortie'))
      expect(section11Content(html)).not.toContain('Information du patient / famille')
    })

    it('does not override explicit sortie booleans with legacy evolutionMedicale values', () => {
      const data = createDefaultData()
      // sortie explicitly sets infoPatientFamille: false → the legacy true must not leak through
      data.sortie.infoPatientFamille = false
      data.evolutionMedicale.infoPatientFamille = true
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).not.toContain('Information du patient / famille')
    })
  })

  // ─── Section 11 ÉVOLUTION ET AVIS + sous-partie Avis ─────────────

  describe('section 11 ÉVOLUTION ET AVIS', () => {
    function section11Content(html: string): string {
      const start = html.indexOf('<div class="crh-section-title">11. ')
      const nextSection = html.indexOf('<div class="crh-section">', start + 1)
      return html.slice(start, nextSection === -1 ? undefined : nextSection)
    }

    it('renames section 11 to ÉVOLUTION ET AVIS', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      expect(html).toContain('<div class="crh-section-title">11. ÉVOLUTION ET AVIS</div>')
      expect(html).not.toContain('11. ÉVOLUTION MÉDICALE')
    })

    it('renders the Avis sub-part with the formatted date, specialite and motif', () => {
      const data = createDefaultData()
      data.evolutionMedicale.avis = [
        { _key: 'a1', date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section11 = section11Content(html)
      expect(section11).toContain('<div class="crh-ord-subtitle">Avis</div>')
      expect(section11).toContain('<span style="font-weight:bold;">15/08/2026 — Cardiologie</span> : Tolérance')
    })

    it('escapes the specialite and motif of an avis', () => {
      const data = createDefaultData()
      data.evolutionMedicale.avis = [
        { _key: 'a1', date: '2026-08-15', specialite: 'Cardio & Co', motif: 'A < B' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section11 = section11Content(html)
      expect(section11).toContain('<span style="font-weight:bold;">15/08/2026 — Cardio &amp; Co</span> : A &lt; B')
      expect(section11).not.toContain('A < B')
    })

    it('omits the Avis sub-part when there is no avis', () => {
      const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).not.toContain('crh-ord-subtitle">Avis')

      const data = createDefaultData()
      data.evolutionMedicale.avis = []
      const htmlEmpty = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(htmlEmpty).not.toContain('crh-ord-subtitle">Avis')
    })

    it('renders the recovered avis range in the Avis sub-part title', () => {
      const data = createDefaultData()
      data.evolutionMedicale.avis = [
        { _key: 'a1', date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' },
      ]
      data.evolutionMedicale.avisDateFrom = '2026-08-01'
      data.evolutionMedicale.avisDateTo = '2026-08-31'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section11 = section11Content(html)
      expect(section11).toContain('<div class="crh-ord-subtitle">Avis (01/08/2026 → 31/08/2026)</div>')
      expect(section11).toContain('<span style="font-weight:bold;">15/08/2026 — Cardiologie</span> : Tolérance')
    })

    it('renders the plain Avis sub-part when the range is missing', () => {
      const data = createDefaultData()
      data.evolutionMedicale.avis = [
        { _key: 'a1', date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' },
      ]
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)

      const section11 = section11Content(html)
      expect(section11).toContain('<div class="crh-ord-subtitle">Avis</div>')
      expect(section11).not.toContain('Avis (')
    })
  })

  // ─── Annexe (pièces jointes) ────────────────────────────────────

  describe('annexe (pièces jointes)', () => {
    const IMG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    function renderWithAnnexes(annexes: Array<{
      display_name?: string
      file_name?: string
      mime_type?: string
      file_size?: number
      description?: string
      file_data?: string
    }>): string {
      return generateCrhDiabeteHtml(
        createDefaultData(),
        createDefaultPatient(),
        createDefaultContact(),
        createDefaultHospital(),
        null,
        undefined,
        undefined,
        undefined,
        annexes,
      )
    }

    it('renders the 16. ANNEXE section with an image, its data URI and caption', () => {
      const html = renderWithAnnexes([
        {
          display_name: 'Photo pied.png',
          file_name: 'photo-pied.png',
          mime_type: 'image/png',
          file_size: 1024,
          description: 'Plaie du pied gauche avant traitement',
          file_data: IMG_DATA_URI,
        },
      ])

      expect(html).toContain('16. ANNEXE')
      expect(html).toContain('<div class="annexe-item-name">Photo pied.png</div>')
      expect(html).toContain(`<img src="${IMG_DATA_URI}" class="annexe-img" />`)
      expect(html).toContain('<div class="annexe-caption crh-rich">Plaie du pied gauche avant traitement</div>')
      expect(html.indexOf('annexe-item-name')).toBeLessThan(html.indexOf('class="annexe-img"'))
      // Section is inserted between the SORTIE section and the SIGNATURES block
      expect(html.indexOf('15. SORTIE')).toBeLessThan(html.indexOf('16. ANNEXE'))
      expect(html.indexOf('16. ANNEXE')).toBeLessThan(html.indexOf('SIGNATURES'))
    })

    it('renders no name above the image when display_name is empty', () => {
      const html = renderWithAnnexes([
        {
          display_name: '',
          file_name: 'photo-pied.png',
          mime_type: 'image/png',
          file_size: 1024,
          file_data: IMG_DATA_URI,
        },
      ])

      expect(html).toContain('16. ANNEXE')
      expect(html).toContain('class="annexe-img"')
      // la classe CSS .annexe-item-name reste dans le <style> : l'assertion porte sur la section ANNEXE
      const sectionStart = html.indexOf('<div class="crh-section-title">16. ANNEXE')
      const nextSection = html.indexOf('<div class="crh-section">', sectionStart)
      const section = html.slice(sectionStart, nextSection === -1 ? undefined : nextSection)
      expect(section).not.toContain('annexe-item-name')
      expect(html).not.toMatch(/annexe-item-name">[^<]/)
    })

    it('renders a PDF attachment as a file entry with name and metadata', () => {
      const html = renderWithAnnexes([
        {
          display_name: 'Compte rendu labo.pdf',
          file_name: 'cr-labo.pdf',
          mime_type: 'application/pdf',
          file_size: 2048,
        },
      ])

      expect(html).toContain('16. ANNEXE')
      expect(html).toContain('<div class="annexe-item annexe-file">')
      expect(html).toContain('<span class="annexe-file-name">Compte rendu labo.pdf</span>')
      expect(html).toContain('<span class="annexe-file-meta">application/pdf · 2 Ko</span>')
      // no caption when the attachment has no description
      expect(html).not.toContain('class="annexe-caption"')
    })

    it('renders the caption inside the file block when a PDF has a description', () => {
      const html = renderWithAnnexes([
        {
          display_name: 'Compte rendu labo.pdf',
          file_name: 'cr-labo.pdf',
          mime_type: 'application/pdf',
          file_size: 2048,
          description: 'Bilan biologique du 12/01/2026',
        },
      ])

      const sectionStart = html.indexOf('<div class="crh-section-title">16. ANNEXE')
      const nextSection = html.indexOf('<div class="crh-section">', sectionStart)
      const section = html.slice(sectionStart, nextSection === -1 ? undefined : nextSection)

      expect(section).toContain('<div class="annexe-item annexe-file">')
      expect(section).toContain('<span class="annexe-file-name">Compte rendu labo.pdf</span>')
      expect(section).toContain('<div class="annexe-caption crh-rich">Bilan biologique du 12/01/2026</div>')
      expect(section.indexOf('annexe-file-name')).toBeLessThan(section.indexOf('annexe-caption'))
    })

    it('renders a rich HTML description unescaped in the caption', () => {
      const html = renderWithAnnexes([
        {
          display_name: 'Photo pied.png',
          file_name: 'photo-pied.png',
          mime_type: 'image/png',
          file_size: 1024,
          description: '<p>Texte <strong>gras</strong> et <em>italique</em></p>',
          file_data: IMG_DATA_URI,
        },
      ])

      expect(html).toContain('<div class="annexe-caption crh-rich"><p>Texte <strong>gras</strong> et <em>italique</em></p></div>')
      expect(html).not.toContain('&lt;strong&gt;')
    })

    it('omits the caption when the rich description is empty HTML', () => {
      const html = renderWithAnnexes([
        {
          display_name: 'Photo pied.png',
          file_name: 'photo-pied.png',
          mime_type: 'image/png',
          file_size: 1024,
          description: '<p></p>',
          file_data: IMG_DATA_URI,
        },
      ])

      expect(html).toContain('16. ANNEXE')
      expect(html).toContain('class="annexe-img"')
      expect(html).not.toContain('class="annexe-caption"')
    })

    it('escapes HTML-like characters in plain-text descriptions', () => {
      const html = renderWithAnnexes([
        {
          display_name: 'Note.txt',
          file_name: 'note.txt',
          mime_type: 'text/plain',
          file_size: 64,
          description: 'A < B',
        },
      ])

      expect(html).toContain('<div class="annexe-caption crh-rich">A &lt; B</div>')
    })

    it('omits the ANNEXE section when annexeAttachments is empty', () => {
      const html = renderWithAnnexes([])

      expect(html).not.toContain('16. ANNEXE')
      expect(html).not.toContain('class="annexe-img"')
      expect(html).not.toContain('class="annexe-file"')
      expect(html).not.toContain('class="annexe-caption"')
      // SIGNATURES still closes the document
      expect(html).toContain('<!-- SIGNATURES -->')
    })

    it('omits the ANNEXE section when annexeAttachments is undefined', () => {
      const html = generateCrhDiabeteHtml(
        createDefaultData(),
        createDefaultPatient(),
        createDefaultContact(),
        createDefaultHospital(),
        null,
      )

      expect(html).not.toContain('16. ANNEXE')
      expect(html).not.toContain('class="annexe-img"')
    })

    describe('ordonnance section', () => {
      function ordonnanceSectionContent(html: string): string {
        const anchor = '<div class="crh-section-title">14. ORDONNANCE'
        const start = html.indexOf(anchor)
        const nextSection = html.indexOf('<div class="crh-section">', start + anchor.length)
        return html.slice(start, nextSection === -1 ? undefined : nextSection)
      }

      function renderWithOrdonnance(ordonnance: any) {
        return generateCrhDiabeteHtml(
          createDefaultData(),
          createDefaultPatient(),
          createDefaultContact(),
          createDefaultHospital(),
          null,
          undefined,
          undefined,
          undefined,
          undefined,
          ordonnance,
        )
      }

      it('renders the 14. ORDONNANCE section between PROJET DE SOIN and SORTIE', () => {
        const html = generateCrhDiabeteHtml(createDefaultData(), createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
        expect(html).toContain('14. ORDONNANCE')
        expect(html.indexOf('13. PROJET DE SOIN')).toBeLessThan(html.indexOf('14. ORDONNANCE'))
        expect(html.indexOf('14. ORDONNANCE')).toBeLessThan(html.indexOf('15. SORTIE'))
      })

      it('renders medicaments, soins, examens and avis blocks with their items', () => {
        const html = renderWithOrdonnance({
          medicaments: [{ nom: 'Metformine 500', posologie: '1cp x2/jour' }],
          soins: [{ nom: 'Pansement', posologie: '1/jour' }],
          examens: [{ label: 'NFS', detail: 'À jeun' }],
          avis: [{ label: 'Cardiologue' }],
        })
        const section = ordonnanceSectionContent(html)
        expect(section).toContain('MÉDICAMENTS')
        expect(section).toContain('SOINS')
        expect(section).toContain('DEMANDES D\u2019EXAMENS')
        expect(section).toContain('AVIS SPÉCIALISÉS')
        expect(section).toContain('Metformine 500')
        expect(section).toContain('1cp x2/jour')
        expect(section).toContain('Pansement')
        expect(section).toContain('NFS')
        expect(section).toContain('Cardiologue')
      })

      it('renders "Non renseigné" when no ordonnance data is provided', () => {
        const html = renderWithOrdonnance(undefined)
        expect(ordonnanceSectionContent(html)).toContain('Non renseigné')
      })

      it('escapes HTML in medication names and exam labels', () => {
        const html = renderWithOrdonnance({
          medicaments: [{ nom: '<script>alert(1)</script>', posologie: 'x' }],
          avis: [{ label: 'Avis < spécialiste >' }],
        })
        const section = ordonnanceSectionContent(html)
      expect(section).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(section).toContain('Avis &lt; spécialiste &gt;')
      expect(section).not.toContain('<script>alert(1)</script>')
    })

    it('groups medicaments into courte durée and longue durée subgroups with the right relative order', () => {
      const html = renderWithOrdonnance({
        medicaments: [
          { nom: 'Metformine 500', posologie: '1cp x2/jour', dureeType: 'courte' },
          { nom: 'Insuline Glargine', posologie: '20 UI au coucher', dureeType: 'longue' },
        ],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('<div class="crh-ord-subtitle">Traitement de courte durée</div>')
      expect(section).toContain('<div class="crh-ord-subtitle">Traitement de longue durée</div>')
      const courteIndex = section.indexOf('<div class="crh-ord-subtitle">Traitement de courte durée</div>')
      const longueIndex = section.indexOf('<div class="crh-ord-subtitle">Traitement de longue durée</div>')
      const metformineIndex = section.indexOf('Metformine 500')
      const insulineIndex = section.indexOf('Insuline Glargine')
      expect(courteIndex).toBeGreaterThan(-1)
      expect(metformineIndex).toBeGreaterThan(courteIndex)
      expect(metformineIndex).toBeLessThan(longueIndex)
      expect(insulineIndex).toBeGreaterThan(longueIndex)
    })

    it('defaults medicaments without dureeType to the courte durée subgroup', () => {
      const html = renderWithOrdonnance({
        medicaments: [{ nom: 'Paracétamol', posologie: '1cp x3/jour' }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('<div class="crh-ord-subtitle">Traitement de courte durée</div>')
      expect(section).not.toContain('<div class="crh-ord-subtitle">Traitement de longue durée</div>')
      expect(section.indexOf('Traitement de courte durée')).toBeLessThan(section.indexOf('Paracétamol'))
    })

    it('renders only the longue durée subgroup when all medicaments are longue durée', () => {
      const html = renderWithOrdonnance({
        medicaments: [{ nom: 'Amlodipine 5', posologie: '1cp le matin', dureeType: 'longue' }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).not.toContain('<div class="crh-ord-subtitle">Traitement de courte durée</div>')
      expect(section).toContain('<div class="crh-ord-subtitle">Traitement de longue durée</div>')
      expect(section.indexOf('Traitement de longue durée')).toBeLessThan(section.indexOf('Amlodipine 5'))
    })

    it('omits the MÉDICAMENTS block and its subgroups when there are no medicaments', () => {
      const html = renderWithOrdonnance({ medicaments: [] })
      const section = ordonnanceSectionContent(html)
      expect(section).not.toContain('crh-ord-subtitle')
      expect(section).not.toContain('MÉDICAMENTS')
      expect(section).toContain('Non renseigné')
    })

    it('renders "Qté : X" for medicaments with a quantite, nothing without', () => {
      const html = renderWithOrdonnance({
        medicaments: [
          { nom: 'Metformine 500', posologie: '1cp x2/jour', quantite: 14 },
          { nom: 'Paracétamol', posologie: '1cp x3/jour' },
        ],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('<span style="font-weight:bold;">Metformine 500</span> : 1cp x2/jour · Qté : 14')
      expect(section).toContain('<span style="font-weight:bold;">Paracétamol</span> : 1cp x3/jour</div>')
      expect(section).not.toContain('Qté : undefined')
    })

    it('renders rich ordonnance detail (motif) without escaping', () => {
      const html = renderWithOrdonnance({
        examens: [{ label: 'Bilan cardiaque', detail: '<p>Bilan <strong>cardiaque</strong></p>' }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('<strong>cardiaque</strong>')
      expect(section).not.toContain('&lt;')
      // single-paragraph rich detail keeps the inline "label : detail" layout
      expect(section).toContain('>Bilan cardiaque</span> : Bilan <strong>cardiaque</strong></div>')
    })

    it('keeps legacy plain-string ordonnance detail unchanged', () => {
      const html = renderWithOrdonnance({
        examens: [{ label: 'NFS', detail: 'À jeun' }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('>NFS</span> : À jeun</div>')
      expect(section).not.toContain('&lt;')
    })

    it('collapses multi-paragraph rich ordonnance detail into <br> so the inline layout survives', () => {
      const html = renderWithOrdonnance({
        examens: [{ label: 'Surveillance', detail: '<p>Glycémie à jeun</p><p>HbA1c à 3 mois</p>' }],
      })
      const section = ordonnanceSectionContent(html)
      // paragraph boundaries become <br> (any serializer variant: <br>, <br/>, <br />)
      expect(section).toMatch(/Glycémie à jeun<br\s*\/?>HbA1c à 3 mois/)
      // no mid-string </p><p> block element remains inside the inline "label : detail" line
      expect(section).not.toContain('Glycémie à jeun</p><p>HbA1c à 3 mois')
    })

    it('strips paragraph attributes (text-align) from rich ordonnance detail', () => {
      const html = renderWithOrdonnance({
        examens: [{ label: 'ECG', detail: '<p style="text-align:center">Repos strict</p>' }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).not.toContain('<p style')
      expect(section).toContain('Repos strict')
      expect(section).toContain('>ECG</span> : Repos strict</div>')
    })

    it('renders the 5 new soins detail lines (nb séances, objectif, consignes, dispositifs, professionnel) with escaped values', () => {
      const html = renderWithOrdonnance({
        soins: [{
          nom: 'Pansement',
          posologie: '1/jour',
          nbSeances: 3,
          objectifClinique: '<p>Favoriser <strong>la cicatrisation</strong></p>',
          consignesSpecifiques: '<p>À faire à jeun</p>',
          dispositifsMedicaux: 'Compresses <stériles> & Seringue',
          professionnelCible: 'Infirmier <référent>',
        }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('SOINS')
      // ligne principale "nom : posologie" conservée
      expect(section).toContain('<span style="font-weight:bold;">Pansement</span> : 1/jour')
      // nouvelle ligne Nb séances
      expect(section).toContain('<span style="font-weight:bold;">Nb séances :</span> 3')
      // rich objectif rendu non échappé (texte + balise forte)
      expect(section).toContain('<span style="font-weight:bold;">Objectif clinique :</span> Favoriser <strong>la cicatrisation</strong>')
      expect(section).toContain('<strong>la cicatrisation</strong>')
      expect(section).not.toContain('&lt;strong&gt;')
      // rich consignes
      expect(section).toContain('<span style="font-weight:bold;">Consignes spécifiques :</span> À faire à jeun')
      // dispositifs : libellé avec &amp; et ’ intégrés, valeur échappée
      expect(section).toContain('<span style="font-weight:bold;">Dispositifs &amp; Voies d\u2019abord :</span> Compresses &lt;stériles&gt; &amp; Seringue')
      expect(section).not.toContain('Compresses <stériles>')
      // professionnel cible : valeur échappée
      expect(section).toContain('<span style="font-weight:bold;">Professionnel cible :</span> Infirmier &lt;référent&gt;')
      expect(section).not.toContain('Infirmier <référent>')
    })

    it('renders multi-paragraph rich soins detail (objectif / consignes) flattened into <br>', () => {
      const html = renderWithOrdonnance({
        soins: [{
          nom: 'Pansement',
          posologie: '1/jour',
          objectifClinique: '<p>Une\n cible riche</p>',
          consignesSpecifiques: '<p>Premier paragraphe</p><p>Second paragraphe</p>',
        }],
      })
      const section = ordonnanceSectionContent(html)
      // le texte du rich objectif est présent (newline conservée hors balises)
      expect(section).toContain('Objectif clinique :</span> Une\n cible riche')
      // les paragraphes des consignes sont aplatis en <br> (inline layout)
      expect(section).toMatch(/Consignes spécifiques :<\/span> Premier paragraphe<br\s*\/?>Second paragraphe/)
      expect(section).not.toContain('Premier paragraphe</p><p>Second paragraphe')
    })

    it('renders no new soins detail lines when the item has none (strict retro-compatibility)', () => {
      const html = renderWithOrdonnance({
        soins: [{ nom: 'Pansement', posologie: '1/jour' }],
      })
      const section = ordonnanceSectionContent(html)
      // la ligne de base "nom : posologie" reste identique à avant
      expect(section).toContain('<span style="font-weight:bold;">Pansement</span> : 1/jour')
      // AUCUN des 5 nouveaux libellés ne doit apparaître
      expect(section).not.toContain('Nb séances')
      expect(section).not.toContain('Objectif clinique')
      expect(section).not.toContain('Consignes spécifiques')
      expect(section).not.toContain('Dispositifs')
      expect(section).not.toContain('Professionnel cible')
    })

    it('renders the Nb séances label for a soins item with nbSeances=0 (coherent everywhere)', () => {
      const html = renderWithOrdonnance({
        soins: [{ nom: 'Pansement', posologie: '1/jour', nbSeances: 0 }],
      })
      const section = ordonnanceSectionContent(html)
      // le garde `item.nbSeances != null` garde le libellé même pour 0
      expect(section).toContain('<span style="font-weight:bold;">Nb séances :</span> 0')
      expect(section).toContain('SOINS')
    })

    it('omits Objectif clinique and Consignes spécifiques labels when rich text is empty (<p></p> / <p><br></p>)', () => {
      const html = renderWithOrdonnance({
        soins: [{
          nom: 'Pansement',
          posologie: '1/jour',
          objectifClinique: '<p></p>',
          consignesSpecifiques: '<p><br></p>',
        }],
      })
      const section = ordonnanceSectionContent(html)
      // la ligne de base reste identique
      expect(section).toContain('<span style="font-weight:bold;">Pansement</span> : 1/jour')
      // rich vide ⇒ le libellé NE doit pas être rendu (ni objectif ni consignes)
      expect(section).not.toContain('Objectif clinique')
      expect(section).not.toContain('Consignes spécifiques')
    })

    it('renders IMAGERIE / LABORATOIRE sub-blocks when examens carry kind (compat flat otherwise)', () => {
      const html = renderWithOrdonnance({
        examens: [
          { label: 'Scanner cérébral', detail: 'Sans injection', kind: 'imagerie' },
          { label: 'NFS, Ionogramme', detail: 'À jeun', kind: 'laboratoire' },
        ],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('DEMANDES D\u2019EXAMENS')
      expect(section).toContain('>Imagerie<')
      expect(section).toContain('>Laboratoire<')
      expect(section).toContain('Scanner cérébral')
      expect(section).toContain('NFS, Ionogramme')
      expect(section.indexOf('>Imagerie<')).toBeLessThan(section.indexOf('Scanner cérébral'))
      expect(section.indexOf('>Laboratoire<')).toBeLessThan(section.indexOf('NFS, Ionogramme'))
    })

    it('keeps the flat DEMANDES D’EXAMENS rendering for legacy examens without kind', () => {
      const html = renderWithOrdonnance({
        examens: [{ label: 'NFS', detail: 'À jeun' }],
      })
      const section = ordonnanceSectionContent(html)
      expect(section).toContain('DEMANDES D\u2019EXAMENS')
      expect(section).toContain('>NFS</span> : À jeun</div>')
      expect(section).not.toContain('>Imagerie<')
      expect(section).not.toContain('>Laboratoire<')
    })
  })
  })
})

// ─── Patient profile (generatePatientProfileHtml) ──────────────────

describe('generatePatientProfileHtml', () => {
  it('returns a valid HTML document', () => {
    const html = generatePatientProfileHtml(createDefaultPatient(), null, createDefaultHospital(), null)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Profil Patient')
    expect(html).toContain('</html>')
  })

  // ─── Allergies: legacy string / structured / array ───────────────

  describe('allergies', () => {
    it('renders a legacy STRING allergies value as a single danger tag without crashing', () => {
      // pre-feature patients stored allergies as a plain string;
      // .map on a string used to crash the export — the template must render it as-is
      const patient = createDefaultPatient()
      ;(patient as any).allergies = 'Pénicilline'
      const html = generatePatientProfileHtml(patient, null, createDefaultHospital(), null)
      expect(html).toContain('Allergies')
      expect(html).toContain('<span class="tag tag--danger">Pénicilline</span>')
    })

    it('renders structured { libelle } allergies as libellé danger tags', () => {
      const patient = createDefaultPatient()
      ;(patient as any).allergies = [{ libelle: 'Arachide' }, { libelle: 'Latex' }]
      const html = generatePatientProfileHtml(patient, null, createDefaultHospital(), null)
      expect(html).toContain('<span class="tag tag--danger">Arachide</span>')
      expect(html).toContain('<span class="tag tag--danger">Latex</span>')
    })

    it('renders array allergies with string entries as danger tags', () => {
      const patient = createDefaultPatient()
      ;(patient as any).allergies = ['Pénicilline', 'Arachide']
      const html = generatePatientProfileHtml(patient, null, createDefaultHospital(), null)
      expect(html).toContain('<span class="tag tag--danger">Pénicilline</span>')
      expect(html).toContain('<span class="tag tag--danger">Arachide</span>')
    })

    it('renders "Aucune" when allergies are empty', () => {
      const patient = createDefaultPatient()
      const html = generatePatientProfileHtml(patient, null, createDefaultHospital(), null)
      expect(html).toContain('Aucune')
    })
  })

  describe('generateOrdonnanceHtml', () => {
    function createOrdonnanceParams(prescriptions: Array<{ nomMedicament: string; posologie: string; reglesConditionnelles?: string[]; dureeType?: 'courte' | 'longue' }>) {
      return {
        clinique: { logoUrl: null },
        medecin: { nom: 'DUPONT', prenom: 'Jean', specialite: 'Médecine interne', numeroOrdre: '01234' },
        structure: { nom: 'Clinique Diabète', ville: 'Conakry', adresse: 'Rue 123', telephone: '+224 000', numeroAgrement: 'AGR-1' },
        patient: { civilite: 'M.', nom: 'CAMARA', prenom: 'Moussa', numeroDossier: 'P-42', dateNaissance: '01/01/1980', age: 45 },
        prescriptions,
        dispositifsMedicaux: [],
        dateEmission: '16/08/2026',
        heureEmission: '10:30',
        numeroOrdonnance: 'ORD-2026-08-0001',
        legalNotice: 'Notice légale',
        barcodes: { ordreSvg: '', agrementSvg: '' },
        qrCodes: { dossierSvg: '' },
      }
    }

    it('groups prescriptions into courte durée and longue durée sections', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Metformine 500', posologie: '1cp x2/jour', dureeType: 'courte' },
        { nomMedicament: 'Insuline Glargine', posologie: '20 UI au coucher', dureeType: 'longue' },
      ]))
      expect(html).toContain('Traitement de courte durée')
      expect(html).toContain('Traitement de longue durée')
      const courteIndex = html.indexOf('Traitement de courte durée')
      const longueIndex = html.indexOf('Traitement de longue durée')
      const metformineIndex = html.indexOf('METFORMINE 500')
      const insulineIndex = html.indexOf('INSULINE GLARGINE')
      expect(courteIndex).toBeGreaterThan(-1)
      expect(metformineIndex).toBeGreaterThan(courteIndex)
      expect(metformineIndex).toBeLessThan(longueIndex)
      expect(insulineIndex).toBeGreaterThan(longueIndex)
    })

    it('indents the prescriptions to the right inside each duration section', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Metformine 500', posologie: '1cp x2/jour', dureeType: 'courte' },
        { nomMedicament: 'Insuline Glargine', posologie: '20 UI au coucher', dureeType: 'longue' },
      ]))
      const courteSection = html.slice(html.indexOf('Traitement de courte durée'), html.indexOf('Traitement de longue durée'))
      expect(courteSection).toContain('padding-left:20px')
      expect(courteSection.indexOf('padding-left:20px')).toBeLessThan(courteSection.indexOf('METFORMINE 500'))
      const longueSection = html.slice(html.indexOf('Traitement de longue durée'))
      expect(longueSection).toContain('padding-left:20px')
      expect(longueSection.indexOf('padding-left:20px')).toBeLessThan(longueSection.indexOf('INSULINE GLARGINE'))
    })

    it('defaults missing dureeType to courte durée', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Paracétamol', posologie: '1cp x3/jour' },
      ]))
      expect(html).toContain('Traitement de courte durée')
      expect(html).toContain('PARACÉTAMOL')
      expect(html).not.toContain('Traitement de longue durée')
    })

    it('renders only the longue durée section when all prescriptions are longue', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Amlodipine 5', posologie: '1cp le matin', dureeType: 'longue' },
      ]))
      expect(html).not.toContain('Traitement de courte durée')
      expect(html).toContain('Traitement de longue durée')
      expect(html).toContain('AMLODIPINE 5')
    })

    it('renders "Aucun médicament prescrit" when prescriptions is empty', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([]))
      expect(html).toContain('Aucun médicament prescrit')
      expect(html).not.toContain('Traitement de courte durée')
      expect(html).not.toContain('Traitement de longue durée')
    })

    it('keeps regles conditionnelles inside each duration section', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Warfarine 5', posologie: '1cp le soir', reglesConditionnelles: ['Ne pas interrompre'], dureeType: 'longue' },
      ]))
      expect(html).toContain('**** Ne pas interrompre')
      expect(html.indexOf('Traitement de longue durée')).toBeLessThan(html.indexOf('**** Ne pas interrompre'))
    })

    it('renders rich reglesConditionnelles without double-escaping', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Metformine 500', posologie: '1cp x2/jour', reglesConditionnelles: ['<p>Prendre <strong>le matin</strong></p>'], dureeType: 'courte' },
      ]))
      expect(html).toContain('<strong>le matin</strong>')
      expect(html).not.toContain('&lt;strong&gt;')
      expect(html).not.toContain('&lt;p&gt;')
    })

    it('keeps legacy plain-string reglesConditionnelles unchanged', () => {
      const html = generateOrdonnanceHtml(createOrdonnanceParams([
        { nomMedicament: 'Warfarine 5', posologie: '1cp le soir', reglesConditionnelles: ['Ne pas interrompre'], dureeType: 'longue' },
      ]))
      expect(html).toContain('**** Ne pas interrompre')
      expect(html).not.toContain('&lt;')
    })
  })
})

describe('generateOrdonnanceHtml – blocs optionnels soins / examens / avis (ordonnance par groupe)', () => {
  function createOrdonnanceParams(overrides?: Partial<{
    soins: any[]
    examens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire' }>
    avis: Array<{ label: string; detail?: string }>
  }>) {
    const base = {
      clinique: { logoUrl: null },
      medecin: { nom: 'DUPONT', prenom: 'Jean', specialite: 'Médecine interne', numeroOrdre: '01234' },
      structure: { nom: 'Clinique Diabète', ville: 'Conakry', adresse: 'Rue 123', telephone: '+224 000', numeroAgrement: 'AGR-1' },
      patient: { civilite: 'M.', nom: 'CAMARA', prenom: 'Moussa', numeroDossier: 'P-42', dateNaissance: '01/01/1980', age: 45 },
      prescriptions: [] as Array<{ nomMedicament: string; posologie: string }>,
      dispositifsMedicaux: [] as Array<{ nom: string; quantiteFrequence: string }>,
      dateEmission: '16/08/2026',
      heureEmission: '10:30',
      numeroOrdonnance: 'ORD-2026-08-0001',
      legalNotice: 'Notice légale',
      barcodes: { ordreSvg: '', agrementSvg: '' },
      qrCodes: { dossierSvg: '' },
    }
    return { ...base, ...(overrides || {}) }
  }

  it('renders the SOINS block with nom : quantiteFrequence', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{ nom: 'Pansement quotidien', quantiteFrequence: '1/jour' }],
    }))
    expect(html).toContain('>SOINS<')
    expect(html).toContain('<span style="font-weight:bold;">Pansement quotidien</span> : 1/jour')
  })

  it('renders the 5 rich soins fields (nbSeances, objectif, consignes, dispositifs, professionnel)', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{
        nom: 'Rééducation',
        quantiteFrequence: '3 séances/semaine',
        nbSeances: 6,
        objectifClinique: '<p>Récupérer <strong>la mobilité</strong></p>',
        consignesSpecifiques: '<p>À jeun le matin</p>',
        dispositifsMedicaux: 'Attelle, Béquilles',
        professionnelCible: 'Kinésithérapeute',
      }],
    }))
    expect(html).toContain('Nb séances :</span> 6')
    expect(html).toContain('Objectif clinique :</span> Récupérer <strong>la mobilité</strong>')
    expect(html).toContain('Consignes spécifiques :</span> À jeun le matin')
    expect(html).toContain('Dispositifs &amp; Voies d\u2019abord :</span> Attelle, Béquilles')
    expect(html).toContain('Professionnel cible :</span> Kinésithérapeute')
  })

  it('collapses multi-paragraph rich objectifClinique into <br> without double-escaping', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{
        nom: 'Rééducation',
        quantiteFrequence: 'x2/jour',
        objectifClinique: '<p>Ligne 1</p><p>Ligne <strong>2</strong></p>',
      }],
    }))
    expect(html).toContain('Objectif clinique :</span> Ligne 1<br>Ligne <strong>2</strong>')
    expect(html).not.toContain('&lt;strong&gt;')
    expect(html).not.toContain('&lt;p&gt;')
  })

  it('escapes plain-text soins nom/quantiteFrequence (XSS)', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{ nom: '<script>alert(1)</script>', quantiteFrequence: '<b>1/jour</b>' }],
    }))
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;1/jour&lt;/b&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('omits the SOINS block when soins is undefined or empty', () => {
    expect(generateOrdonnanceHtml(createOrdonnanceParams())).not.toContain('>SOINS<')
    expect(generateOrdonnanceHtml(createOrdonnanceParams({ soins: [] }))).not.toContain('>SOINS<')
  })

  it('skips soin items with empty nom AND empty quantiteFrequence', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [
        { nom: '', quantiteFrequence: '' },
        { nom: 'Pansement', quantiteFrequence: '1/jour' },
      ],
    }))
    expect(html).toContain('>SOINS<')
    expect(html).toContain('Pansement')
    // ne rend ni ligne vide ni ":" orphelin pour l'item vide
    expect(html).not.toContain('</span> :</div>')
  })

  it('renders the DEMANDES D’EXAMENS block with label + rich detail passthrough', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      examens: [{ label: 'Scanner cérébral', detail: '<p><strong>Sans injection</strong></p>' }],
    }))
    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('<span style="font-weight:bold;">Scanner cérébral</span> : <strong>Sans injection</strong>')
    expect(html).not.toContain('&lt;strong&gt;')
  })

  it('escapes examens label but keeps plain detail passthrough', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      examens: [{ label: 'NFS <b>+ CRP</b>', detail: 'À jeun' }],
    }))
    expect(html).toContain('<span style="font-weight:bold;">NFS &lt;b&gt;+ CRP&lt;/b&gt;</span> : À jeun')
  })

  it('omits the examens block when examens is empty', () => {
    expect(generateOrdonnanceHtml(createOrdonnanceParams({ examens: [] }))).not.toContain('>DEMANDES D\u2019EXAMENS<')
  })

  it('splits DEMANDES D’EXAMENS into IMAGERIE / LABORATOIRE sub-blocks when kind is present', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      examens: [
        { label: 'Scanner cérébral', detail: 'Sans injection', kind: 'imagerie' },
        { label: 'NFS, Ionogramme', detail: 'À jeun', kind: 'laboratoire' },
      ],
    }))
    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('>Imagerie<')
    expect(html).toContain('>Laboratoire<')
    expect(html).toContain('Scanner cérébral')
    expect(html).toContain('NFS, Ionogramme')
  })

  it('keeps the flat DEMANDES D’EXAMENS rendering for legacy examens without kind', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      examens: [{ label: 'Scanner', detail: 'À jeun' }],
    }))
    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('Scanner')
    expect(html).not.toContain('>Imagerie<')
    expect(html).not.toContain('>Laboratoire<')
  })

  it('renders the AVIS SPÉCIALISÉS block with label + detail', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      avis: [{ label: 'Cardiologue', detail: 'Bilan cardiaque' }],
    }))
    expect(html).toContain('>AVIS SPÉCIALISÉS<')
    expect(html).toContain('<span style="font-weight:bold;">Cardiologue</span> : Bilan cardiaque')
  })

  it('omits the avis block when avis is empty', () => {
    expect(generateOrdonnanceHtml(createOrdonnanceParams({ avis: [] }))).not.toContain('>AVIS SPÉCIALISÉS<')
  })

  it('orders the blocks SOINS → DEMANDES D’EXAMENS → AVIS SPÉCIALISÉS', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{ nom: 'Pansement', quantiteFrequence: '1/jour' }],
      examens: [{ label: 'Scanner', detail: '' }],
      avis: [{ label: 'Cardio', detail: '' }],
    }))
    const soinsIndex = html.indexOf('>SOINS<')
    const examensIndex = html.indexOf('>DEMANDES D\u2019EXAMENS<')
    const avisIndex = html.indexOf('>AVIS SPÉCIALISÉS<')
    expect(soinsIndex).toBeGreaterThan(-1)
    expect(examensIndex).toBeGreaterThan(soinsIndex)
    expect(avisIndex).toBeGreaterThan(examensIndex)
  })

  it('places the soins block after DISPOSITIFS MEDICAUX when both are present', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      dispositifsMedicaux: [{ nom: 'Glycémie', quantiteFrequence: 'x3/jour' }],
      soins: [{ nom: 'Pansement', quantiteFrequence: '1/jour' }],
    }))
    expect(html.indexOf('>DISPOSITIFS MEDICAUX<')).toBeGreaterThan(-1)
    expect(html.indexOf('>SOINS<')).toBeGreaterThan(html.indexOf('>DISPOSITIFS MEDICAUX<'))
  })

  it('renders "Aucun médicament prescrit" alongside the soins block when prescriptions is empty', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{ nom: 'Pansement', quantiteFrequence: '1/jour' }],
    }))
    expect(html).toContain('Aucun m\u00e9dicament prescrit')
    expect(html).toContain('>SOINS<')
  })
})

describe('generateOrdonnanceHtml – assainissement des champs riches (XSS)', () => {
  function createOrdonnanceParams(overrides?: Partial<{
    soins: any[]
    examens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire' }>
    avis: Array<{ label: string; detail?: string }>
    prescriptions: Array<{ nomMedicament: string; posologie: string; reglesConditionnelles?: string[] }>
  }>) {
    const base = {
      clinique: { logoUrl: null },
      medecin: { nom: 'DUPONT', prenom: 'Jean', specialite: 'Médecine interne', numeroOrdre: '01234' },
      structure: { nom: 'Clinique Diabète', ville: 'Conakry', adresse: 'Rue 123', telephone: '+224 000', numeroAgrement: 'AGR-1' },
      patient: { civilite: 'M.', nom: 'CAMARA', prenom: 'Moussa', numeroDossier: 'P-42', dateNaissance: '01/01/1980', age: 45 },
      prescriptions: [] as Array<{ nomMedicament: string; posologie: string }>,
      dispositifsMedicaux: [] as Array<{ nom: string; quantiteFrequence: string }>,
      dateEmission: '16/08/2026',
      heureEmission: '10:30',
      numeroOrdonnance: 'ORD-2026-08-0001',
      legalNotice: 'Notice légale',
      barcodes: { ordreSvg: '', agrementSvg: '' },
      qrCodes: { dossierSvg: '' },
    }
    return { ...base, ...(overrides || {}) }
  }

  // jeux de données hostiles injectés dans les différents champs riches
  const XSS_PAYLOADS = [
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '<a href="javascript:alert(1)">x</a>',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
    '<p onclick="alert(1)">clique</p>',
    '<svg onload=alert(1)></svg>',
    '<iframe src="javascript:alert(1)"></iframe>',
  ]

  const FORBIDDEN_PATTERNS = [/\b<script\b/i, /&lt;\s*script/i, /\bonerror\s*=/i, /\bjavascript\s*:/i, /\bdata\s*:\s*image\b/i, /\bonclick\s*=/i, /\bonload\s*=/i]

  it('neutralizes every hostile payload across all rich fields (table-driven)', () => {
    const fieldSets: Array<{ label: string; build: () => ReturnType<typeof createOrdonnanceParams> }> = [
      {
        label: 'objectifClinique',
        build: () => createOrdonnanceParams({ soins: [{ nom: 'S', quantiteFrequence: 'x', objectifClinique: XSS_PAYLOADS.join(' ') }] }),
      },
      {
        label: 'consignesSpecifiques',
        build: () => createOrdonnanceParams({ soins: [{ nom: 'S', quantiteFrequence: 'x', consignesSpecifiques: XSS_PAYLOADS.join(' ') }] }),
      },
      {
        label: 'detail (examens)',
        build: () => createOrdonnanceParams({ examens: [{ label: 'E', detail: XSS_PAYLOADS.join(' ') }] }),
      },
      {
        label: 'detail (avis)',
        build: () => createOrdonnanceParams({ avis: [{ label: 'A', detail: XSS_PAYLOADS.join(' ') }] }),
      },
      {
        label: 'reglesConditionnelles',
        build: () => createOrdonnanceParams({ prescriptions: [{ nomMedicament: 'M', posologie: 'x', reglesConditionnelles: XSS_PAYLOADS }] }),
      },
    ]

    for (const { label, build } of fieldSets) {
      const html = generateOrdonnanceHtml(build())
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(html, `${label} contains forbidden ${pattern}`).not.toMatch(pattern)
      }
      expect(html, `${label} leaked inline handler`).not.toMatch(/alert\s*\(\s*1\s*\)/)
    }
  })

  it('keeps a healthy rich field identical (p/strong survive, p→br collapse preserved)', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{ nom: 'Rééducation', quantiteFrequence: 'x2/jour', objectifClinique: '<p>Objectif <strong>clinique</strong></p>' }],
    }))
    expect(html).toContain('Objectif clinique :</span> Objectif <strong>clinique</strong>')
    expect(html).not.toContain('&lt;strong&gt;')
  })

  it('keeps visible <p> text content when only the wrapper tag is dropped', () => {
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      examens: [{ label: 'ECG', detail: '<div>Texte du div</div><p>et <em>un</em> paragraphe</p>' }],
    }))
    // le texte du <div> interdit survit, mais le tag <div> injecté ne doit pas
    // être rendu tel quel (c'est un tag non-allowlisté)
    expect(html).toContain('Texte du div')
    expect(html).not.toContain('<div>Texte du div</div>')
    // les balises saines du paragraphe survivent et le <em> n'est pas échappé
    expect(html).toContain('et <em>un</em> paragraphe')
    expect(html).not.toContain('&lt;em&gt;')
  })

  it('renders empty-vs-full blocks consistently with sanitization (soins/examens/avis/règles)', () => {
    // bloc présent car l'item a du contenu malgré un champ riche entièrement hostile
    const htmlFull = generateOrdonnanceHtml(createOrdonnanceParams({
      soins: [{ nom: 'Pansement', quantiteFrequence: '1/jour', objectifClinique: '<script>alert(1)</script>' }],
      examens: [{ label: 'NFS', detail: '<img src=x onerror=alert(1)>' }],
      avis: [{ label: 'Cardio' }],
      prescriptions: [{ nomMedicament: 'M', posologie: 'x', reglesConditionnelles: ['<script>alert(1)</script>'] }],
    }))
    expect(htmlFull).toContain('>SOINS<')
    expect(htmlFull).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(htmlFull).not.toMatch(/\b<script\b/i)

    // un item riche 100 % hostile doit rester masqué (hasText → false), bloc omis
    const htmlOmit = generateOrdonnanceHtml(createOrdonnanceParams({ soins: [] }))
    expect(htmlOmit).not.toContain('>SOINS<')
  })

  it('keeps the legacy baseline identical when optional rich fields are absent', () => {
    const baseline = {
      clinique: { logoUrl: null },
      medecin: { nom: 'DUPONT', prenom: 'Jean', specialite: 'Médecine interne', numeroOrdre: '01234' },
      structure: { nom: 'Clinique Diabète', ville: 'Conakry', adresse: 'Rue 123', telephone: '+224 000', numeroAgrement: 'AGR-1' },
      patient: { civilite: 'M.', nom: 'CAMARA', prenom: 'Moussa', numeroDossier: 'P-42', dateNaissance: '01/01/1980', age: 45 },
      prescriptions: [{ nomMedicament: 'Metformine 500', posologie: '1cp x2/jour', dureeType: 'courte' }],
      dispositifsMedicaux: [],
      dateEmission: '16/08/2026',
      heureEmission: '10:30',
      numeroOrdonnance: 'ORD-2026-08-0001',
      legalNotice: 'Notice légale',
      barcodes: { ordreSvg: '', agrementSvg: '' },
      qrCodes: { dossierSvg: '' },
    }
    const first = generateOrdonnanceHtml(baseline)
    const second = generateOrdonnanceHtml(baseline)
    expect(second).toBe(first)
    expect(first).toContain('METFORMINE 500')
    expect(first).toContain('1cp x2/jour')
  })

  it('strips raw package-level helpers of any dangerous protocol/token residue', () => {
    // défense en profondeur : tokens dangereux en position de texte pur
    const html = generateOrdonnanceHtml(createOrdonnanceParams({
      examens: [{ label: 'E', detail: 'javascript:alert(1) et data:image/png;base64,AAAA' }],
    }))
    expect(html).not.toMatch(/\bjavascript\s*:/i)
    expect(html).not.toMatch(/\bdata\s*:\s*image\b/i)
  })
})

describe('ordonnance prescripteur + planifié (CRH + ordonnance libre)', () => {
  function ordonnanceBase(overrides?: Partial<{ examens: any[]; avis: any[] }>) {
    return {
      clinique: { logoUrl: null },
      medecin: { nom: 'DUPONT', prenom: 'Jean', specialite: 'Médecine interne', numeroOrdre: '01234' },
      structure: { nom: 'Clinique Diabète', ville: 'Conakry', adresse: 'Rue 123', telephone: '+224 000', numeroAgrement: 'AGR-1' },
      patient: { civilite: 'M.', nom: 'CAMARA', prenom: 'Moussa', numeroDossier: 'P-42', dateNaissance: '01/01/1980', age: 45 },
      prescriptions: [],
      dispositifsMedicaux: [],
      dateEmission: '16/08/2026',
      heureEmission: '10:30',
      numeroOrdonnance: 'ORD-2026-08-0001',
      legalNotice: 'Notice légale',
      barcodes: { ordreSvg: '', agrementSvg: '' },
      qrCodes: { dossierSvg: '' },
      ...(overrides || {}),
    }
  }

  it('CRH: renders the discrete prescripteur/planifié line under examens and avis', () => {
    const html = generateCrhDiabeteHtml(
      createDefaultData(),
      createDefaultPatient(),
      createDefaultContact(),
      createDefaultHospital(),
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        medicaments: [],
        soins: [],
        examens: [{ label: 'Scanner cérébral', detail: 'Céphalées', kind: 'imagerie', prescripteur: 'Dr Diallo', plannedDate: '2026-01-10', plannedHour: 8 }],
        avis: [{ label: 'Cardiologue', detail: 'Bilan', prescripteur: 'Dr Camara', plannedDate: '2026-02-15', plannedHour: 14 }],
      },
    )
    expect(html).toContain('Prescrit par Dr Diallo · Planifié le 10/01/2026 (à 08:00)')
    expect(html).toContain('Prescrit par Dr Camara · Planifié le 15/02/2026 (à 14:00)')
    // sous-blocs et titres intacts
    expect(html).toContain('>Imagerie<')
    expect(html).toContain('font-size:14px')
  })

  it('CRH: omits the line when prescripteur/planifié are absent, keeps partial rendering', () => {
    const absent = generateCrhDiabeteHtml(
      createDefaultData(),
      createDefaultPatient(),
      createDefaultContact(),
      createDefaultHospital(),
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        medicaments: [],
        soins: [],
        examens: [{ label: 'Scanner cérébral', detail: 'Céphalées' }],
        avis: [{ label: 'Cardiologue', detail: 'Bilan' }],
      },
    )
    expect(absent).not.toContain('Prescrit par')
    expect(absent).not.toContain('Planifié')

    const partial = generateCrhDiabeteHtml(
      createDefaultData(),
      createDefaultPatient(),
      createDefaultContact(),
      createDefaultHospital(),
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        medicaments: [],
        soins: [],
        examens: [{ label: 'NFS', prescripteur: 'Dr Diallo' }],
        avis: [{ label: 'Cardiologue', plannedDate: '2026-02-15' }],
      },
    )
    expect(partial).toContain('Prescrit par Dr Diallo')
    expect(partial).not.toContain('Planifié le 10/01/2026')
    expect(partial).toContain('Planifié le 15/02/2026')
  })

  it('CRH: escapes the prescripteur name (XSS)', () => {
    const html = generateCrhDiabeteHtml(
      createDefaultData(),
      createDefaultPatient(),
      createDefaultContact(),
      createDefaultHospital(),
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        medicaments: [],
        soins: [],
        examens: [{ label: 'Scanner', prescripteur: '<script>alert(1)</script>' }],
        avis: [],
      },
    )
    expect(html).toContain('Prescrit par &lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('ordonnance libre: renders the discrete line under examens and avis', () => {
    const html = generateOrdonnanceHtml(ordonnanceBase({
      examens: [{ label: 'Scanner cérébral', detail: 'Céphalées', kind: 'imagerie', prescripteur: 'Dr Diallo', plannedDate: '2026-01-10', plannedHour: 8 }],
      avis: [{ label: 'Cardiologue', detail: 'Bilan', prescripteur: 'Dr Camara', plannedDate: '2026-02-15', plannedHour: 14 }],
    }))
    expect(html).toContain('Prescrit par Dr Diallo · Planifié le 10/01/2026 (à 08:00)')
    expect(html).toContain('Prescrit par Dr Camara · Planifié le 15/02/2026 (à 14:00)')
    expect(html).toContain('>Imagerie<')
    expect(html).toContain('>AVIS SPÉCIALISÉS<')
  })

  it('ordonnance libre: omits the line when absent', () => {
    const html = generateOrdonnanceHtml(ordonnanceBase({
      examens: [{ label: 'Scanner cérébral', detail: 'Céphalées' }],
      avis: [{ label: 'Cardiologue', detail: 'Bilan' }],
    }))
    expect(html).not.toContain('Prescrit par')
    expect(html).not.toContain('Planifié')
  })
})

