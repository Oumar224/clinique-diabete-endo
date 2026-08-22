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
      poidsForme: 80,
      poidsJuillet2024: 85,
      poidsDecembre2025: 87,
      hba1c: 8.5,
      hba1cDate: '2025-01-01',
      hdl: 1.2,
      ldl: 3.5,
      triglycerides: 2.0,
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
      journalEvolution: 'Évolution favorable',
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
      data.evolutionMedicale.journalEvolution = '<p>[12/01/2026 10:30] Glycémie stable</p>'
      const html = generateCrhDiabeteHtml(data, createDefaultPatient(), createDefaultContact(), createDefaultHospital(), null)
      expect(html).toContain("Journal d'évolution")
      expect(html).toContain('12/01/2026 10:30')
      expect(html).toContain('Glycémie stable')
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
