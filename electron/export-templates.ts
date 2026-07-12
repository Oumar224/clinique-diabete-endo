import { roleLabel } from './utils/role-labels'

function generateMedicalHeader(
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string },
  logoBase64: string | null,
  docTitle: string,
  docReference: string,
): string {
  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="height:65px;width:auto;margin-right:15px;flex-shrink:0;" alt="Logo établissement" />`
    : ''
  const fullAddress = [hospital.address, hospital.city].filter(Boolean).join(', ')
  const displayDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return `
    <div class="republique">
      <div class="rep-devise">RÉPUBLIQUE DE GUINÉE</div>
      <div class="rep-devise-sub">Travail — Justice — Solidarité</div>
    </div>
    <div class="separator">✶ ✶ ✶</div>
    <div class="header">
      ${logoHtml}
      <div class="header-text">
        <div class="institution-name">${escapeHtml(hospital.name || 'Établissement de Santé')}</div>
        <div class="institution-addr">${escapeHtml(fullAddress)}</div>
        <div class="institution-contact">
          Tél : ${escapeHtml(hospital.phone || '—')}
          ${hospital.email ? ` | Email : ${escapeHtml(hospital.email)}` : ''}
        </div>
        ${hospital.regNumber ? `<div class="institution-reg">N° agrément : ${escapeHtml(hospital.regNumber)}</div>` : ''}
      </div>
    </div>
    <div class="separator">━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━</div>
    <div class="doc-title-block">
      <div class="doc-title">${escapeHtml(docTitle)}</div>
      <div class="doc-meta">
        <span class="doc-ref">Réf : ${escapeHtml(docReference)}</span>
        <span class="doc-date">Éditée le ${displayDate}</span>
      </div>
    </div>`
}

function generateFooter(): string {
  return '<div class="footer">Document généré par CDE — Clinique Diabète &amp; Endocrinologie</div>'
}

export function generateUserListHtml(
  users: any[],
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string },
  logoBase64: string | null,
): string {
  const rows = users
    .map((u, i) => {
      const fonctionName = typeof u.fonction === 'object' && u.fonction?.name ? u.fonction.name : (u.fonction || '')
      const specialties = (u.specialties || []).map((s: any) => s.name).join(', ')
      const sites = (u.sites || []).map((s: any) => s.name).join(', ')
      const contrat = [u.type_contrat || '', u.statut_contrat || ''].filter(Boolean).join(' — ')
      const statutCompte = u.is_validated ? 'Validé' : 'En attente'
      return `
    <tr${i % 2 === 1 ? ' class="alt"' : ''}>
      <td>${escapeHtml(getUserDisplayName(u))}</td>
      <td>${escapeHtml(roleLabel(u.role))}</td>
      <td>${escapeHtml(fonctionName)}</td>
      <td>${escapeHtml(u.email || '—')}</td>
      <td>${escapeHtml(u.telephone || '—')}</td>
      <td>${escapeHtml(u.service || '—')}</td>
      <td>${escapeHtml(specialties || '—')}</td>
      <td>${escapeHtml(sites || '—')}</td>
      <td>${escapeHtml(contrat || '—')}</td>
      <td>${statutCompte}</td>
    </tr>`
    })
    .join('')

  const docRef = `CDE-LISTE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(users.length).padStart(4, '0')}`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page {
    size: A4 landscape;
    margin: 15mm 12mm 20mm 12mm;
    @bottom-center {
      content: "— Page " counter(page) " / " counter(pages) " —";
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9px;
      color: #888;
    }
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10px;
    color: #222;
    line-height: 1.4;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .republique { text-align: center; margin-bottom: 4px; }
  .rep-devise { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; color: #0b3b6b; }
  .rep-devise-sub { font-size: 10px; font-weight: 600; color: #555; letter-spacing: 0.8px; }
  .separator { text-align: center; font-size: 11px; color: #999; margin: 4px 0; }
  .header { display: flex; align-items: center; margin: 6px 0 4px; }
  .header-text { flex: 1; }
  .institution-name { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .institution-addr { font-size: 10px; color: #555; margin-top: 1px; }
  .institution-contact { font-size: 10px; color: #555; }
  .institution-reg { font-size: 10px; color: #555; }
  .doc-title-block { margin: 8px 0 12px; display: flex; justify-content: space-between; align-items: baseline; }
  .doc-title { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .doc-meta { text-align: right; font-size: 9px; color: #777; line-height: 1.6; }
  .doc-ref { display: block; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #555; }
  .doc-date { display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #ccc; }
  thead { display: table-header-group; }
  th { background: #0b3b6b; color: white; padding: 6px 5px; text-align: left; white-space: nowrap; font-weight: 600; border: 1px solid #0a2f55; font-size: 9px; }
  td { padding: 4px 5px; border: 1px solid #ddd; vertical-align: top; }
  tr.alt td { background: #f0f4fa; }
  tbody tr:hover td { background: #e2ecf9; }
  .footer { text-align: center; font-size: 8px; color: #aaa; margin-top: 18px; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { margin: 0; padding: 0; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style></head><body>
  ${generateMedicalHeader(hospital, logoBase64, 'Liste des utilisateurs — Tous les détails', docRef)}
  <table>
    <thead><tr>
      <th>Noms</th><th>Rôle</th><th>Fonction</th><th>Email</th><th>Téléphone</th><th>Service</th><th>Spécialités</th><th>Sites</th><th>Contrat</th><th>Statut</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="text-align:right;font-size:9px;color:#888;margin-top:6px;">Total : <strong>${users.length}</strong> utilisateur${users.length > 1 ? 's' : ''}</div>
  ${generateFooter()}
</body></html>`
}

export function generateUserProfileHtml(
  user: any,
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string },
  logoBase64: string | null,
): string {
  const displayName = getUserDisplayName(user)
  const photoHtml = user.photo
    ? `<img src="${user.photo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #ddd;" alt="Photo" />`
    : ''

  const fonctionName = typeof user.fonction === 'object' && user.fonction?.name ? user.fonction.name : (user.fonction || '')

  const tags = (items: any[], field: string = 'name') =>
    items.length
      ? items.map((i: any) => `<span class="tag">${escapeHtml(i[field])}</span>`).join('')
      : '—'

  const specialtiesTags = tags(user.specialties || [])
  const servicesTags = tags(user.services || [])
  const sitesTags = tags(user.sites || [])
  const medicalUnitsTags = tags(user.medical_units || [])

  const docRef = `CDE-PROFIL-${String(user.id || '0').padStart(5, '0')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 20mm 15mm;
    @bottom-center {
      content: "— Page " counter(page) " / " counter(pages) " —";
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9px;
      color: #888;
    }
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #222;
    line-height: 1.5;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .republique { text-align: center; margin-bottom: 4px; }
  .rep-devise { font-size: 14px; font-weight: 700; letter-spacing: 1.5px; color: #0b3b6b; }
  .rep-devise-sub { font-size: 10px; font-weight: 600; color: #555; letter-spacing: 0.8px; }
  .separator { text-align: center; font-size: 11px; color: #999; margin: 4px 0; }
  .header { display: flex; align-items: center; margin: 6px 0 4px; }
  .header-text { flex: 1; }
  .institution-name { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .institution-addr { font-size: 10px; color: #555; margin-top: 1px; }
  .institution-contact { font-size: 10px; color: #555; }
  .institution-reg { font-size: 10px; color: #555; }
  .doc-title-block { margin: 8px 0 12px; display: flex; justify-content: space-between; align-items: baseline; }
  .doc-title { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .doc-meta { text-align: right; font-size: 9px; color: #777; line-height: 1.6; }
  .doc-ref { display: block; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #555; }
  .doc-date { display: block; }
  .profile { display: flex; gap: 20px; margin: 10px 0 16px; padding: 12px 14px; background: #f7f9fc; border: 1px solid #e0e4ea; border-radius: 4px; }
  .profile-info { flex: 1; align-self: center; }
  .profile-info h2 { margin: 0 0 3px; font-size: 18px; color: #0b3b6b; }
  .profile-info .role { color: #0b3b6b; font-weight: 600; font-size: 13px; margin-bottom: 6px; }
  .section { margin-top: 16px; }
  .section h3 { font-size: 13px; font-weight: 700; color: #0b3b6b; border-left: 4px solid #0b3b6b; padding-left: 8px; margin: 0 0 8px; }
  .section-content { padding-left: 12px; }
  .field-row { display: flex; margin-bottom: 3px; }
  .field-label { font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase; min-width: 120px; flex-shrink: 0; }
  .field-value { font-size: 11px; color: #222; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  .tag { background: #e0eaf5; color: #0b3b6b; padding: 2px 9px; border-radius: 10px; font-size: 10px; font-weight: 500; }
  .contrat-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10px; }
  .contrat-table th { background: #e0eaf5; color: #0b3b6b; padding: 5px 8px; text-align: left; font-weight: 600; border: 1px solid #cdd6e2; }
  .contrat-table td { padding: 5px 8px; border: 1px solid #ddd; }
  .footer { text-align: center; font-size: 8px; color: #aaa; margin-top: 24px; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { margin: 0; padding: 0; } .section { page-break-inside: avoid; } }
</style></head><body>
  ${generateMedicalHeader(hospital, logoBase64, 'Fiche individuelle — Personnel', docRef)}

  <div class="profile">
    ${photoHtml}
    <div class="profile-info">
      <h2>${escapeHtml(displayName)}</h2>
      <div class="role">${escapeHtml(roleLabel(user.role))}</div>
    </div>
  </div>

  <div class="section">
    <h3>Coordonnées</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">Email</span><span class="field-value">${escapeHtml(user.email || '—')}</span></div>
      <div class="field-row"><span class="field-label">Téléphone</span><span class="field-value">${escapeHtml(user.telephone || '—')}</span></div>
      <div class="field-row"><span class="field-label">Ville / Pays</span><span class="field-value">${escapeHtml([user.ville || '', user.pays || ''].filter(Boolean).join(', ') || '—')}</span></div>
    </div>
  </div>

  <div class="section">
    <h3>Profession</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">Fonction</span><span class="field-value">${escapeHtml(fonctionName || '—')}</span></div>
      <div class="field-row"><span class="field-label">Service</span><span class="field-value">${escapeHtml(user.service || '—')}</span></div>
      ${(user.specialties || []).length ? `<div class="field-row"><span class="field-label">Spécialités</span><span class="field-value"><div class="tags">${specialtiesTags}</div></span></div>` : ''}
      ${(user.services || []).length ? `<div class="field-row"><span class="field-label">Services</span><span class="field-value"><div class="tags">${servicesTags}</div></span></div>` : ''}
      ${(user.sites || []).length ? `<div class="field-row"><span class="field-label">Sites</span><span class="field-value"><div class="tags">${sitesTags}</div></span></div>` : ''}
      ${(user.medical_units || []).length ? `<div class="field-row"><span class="field-label">Unités médicales</span><span class="field-value"><div class="tags">${medicalUnitsTags}</div></span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <h3>Contrat</h3>
    <div class="section-content">
      <table class="contrat-table">
        <thead><tr>
          <th>Type</th><th>Date début</th><th>Date fin</th><th>Statut</th>${user.motif_resiliation ? '<th>Motif résiliation</th>' : ''}
        </tr></thead>
        <tbody><tr>
          <td>${escapeHtml(user.type_contrat || '—')}</td>
          <td>${escapeHtml(user.date_debut_contrat || '—')}</td>
          <td>${escapeHtml(user.date_fin_contrat || '—')}</td>
          <td>${escapeHtml(user.statut_contrat || '—')}</td>
          ${user.motif_resiliation ? `<td>${escapeHtml(user.motif_resiliation)}</td>` : ''}
        </tr></tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h3>Compte</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">Statut</span><span class="field-value">${user.is_validated ? 'Validé ✓' : 'En attente'}</span></div>
      <div class="field-row"><span class="field-label">Actif</span><span class="field-value">${user.is_active ? 'Oui' : 'Non'}</span></div>
    </div>
  </div>

  ${generateFooter()}
</body></html>`
}

export function generatePatientProfileHtml(
  patient: any,
  trustedPerson: any | null,
  hospital: any,
  logoBase64: string | null,
): string {
  const photoHtml = patient.photo
    ? `<img src="${patient.photo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid #ddd;" alt="Photo" />`
    : ''

  const displayName = `${getCiviliteLabel(patient.civilite)} ${patient.prenom || ''} ${patient.nom || ''}`.trim()
  const age = patient.date_naissance ? calculateAge(patient.date_naissance) : '—'
  const dateNaissance = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : '—'

  const docRef = `CDE-PATIENT-${String(patient.id || '0').padStart(6, '0')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

  const trustedSection = trustedPerson?.has_trusted ? `
  <div class="section">
    <h3>Personne de confiance</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">Nom</span><span class="field-value">${escapeHtml(trustedPerson.nom || '—')}</span></div>
      <div class="field-row"><span class="field-label">Pr\u00e9nom</span><span class="field-value">${escapeHtml(trustedPerson.prenom || '—')}</span></div>
      <div class="field-row"><span class="field-label">Lien de parent\u00e9</span><span class="field-value">${escapeHtml(trustedPerson.lien_parente || '—')}</span></div>
      <div class="field-row"><span class="field-label">T\u00e9l\u00e9phone</span><span class="field-value">${escapeHtml(trustedPerson.telephone || '—')}</span></div>
      <div class="field-row"><span class="field-label">Email</span><span class="field-value">${escapeHtml(trustedPerson.email || '—')}</span></div>
      <div class="field-row"><span class="field-label">R\u00e9sidence</span><span class="field-value">${escapeHtml(trustedPerson.residence || trustedPerson.residence_code || '—')}</span></div>
    </div>
  </div>` : ''

  const allergiesHtml = (patient.allergies || []).length
    ? patient.allergies.map((a: string) => `<span class="tag tag--danger">${escapeHtml(a)}</span>`).join(' ')
    : 'Aucune'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm;
    @bottom-center { content: "\u2014 Page " counter(page) " / " counter(pages) " \u2014"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #888; } }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; line-height: 1.5; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .republique { text-align: center; margin-bottom: 4px; }
  .rep-devise { font-size: 14px; font-weight: 700; letter-spacing: 1.5px; color: #0b3b6b; }
  .rep-devise-sub { font-size: 10px; font-weight: 600; color: #555; letter-spacing: 0.8px; }
  .separator { text-align: center; font-size: 11px; color: #999; margin: 4px 0; }
  .header { display: flex; align-items: center; margin: 6px 0 4px; }
  .header-text { flex: 1; }
  .institution-name { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .institution-addr { font-size: 10px; color: #555; margin-top: 1px; }
  .institution-contact { font-size: 10px; color: #555; }
  .institution-reg { font-size: 10px; color: #555; }
  .doc-title-block { margin: 8px 0 12px; display: flex; justify-content: space-between; align-items: baseline; }
  .doc-title { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .doc-meta { text-align: right; font-size: 9px; color: #777; line-height: 1.6; }
  .doc-ref { display: block; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #555; }
  .doc-date { display: block; }
  .profile { display: flex; gap: 20px; margin: 10px 0 16px; padding: 12px 14px; background: #f7f9fc; border: 1px solid #e0e4ea; border-radius: 4px; }
  .profile-info { flex: 1; align-self: center; }
  .profile-info h2 { margin: 0 0 3px; font-size: 18px; color: #0b3b6b; }
  .section { margin-top: 16px; }
  .section h3 { font-size: 13px; font-weight: 700; color: #0b3b6b; border-left: 4px solid #0b3b6b; padding-left: 8px; margin: 0 0 8px; }
  .section-content { padding-left: 12px; }
  .field-row { display: flex; margin-bottom: 3px; }
  .field-label { font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase; min-width: 130px; flex-shrink: 0; }
  .field-value { font-size: 11px; color: #222; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  .tag { background: #e0eaf5; color: #0b3b6b; padding: 2px 9px; border-radius: 10px; font-size: 10px; font-weight: 500; }
  .tag--danger { background: #fde8e8; color: #c0392b; }
  .footer { text-align: center; font-size: 8px; color: #aaa; margin-top: 24px; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { margin: 0; padding: 0; } .section { page-break-inside: avoid; } }
</style></head><body>
  ${generateMedicalHeader(hospital, logoBase64, 'Profil Patient', docRef)}

  <div class="profile">
    ${photoHtml}
    <div class="profile-info">
      <h2>${escapeHtml(displayName)}</h2>
    </div>
  </div>

  <div class="section">
    <h3>Identit\u00e9</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">Civilit\u00e9</span><span class="field-value">${escapeHtml(getCiviliteLabel(patient.civilite))}</span></div>
      <div class="field-row"><span class="field-label">Date naissance</span><span class="field-value">${escapeHtml(dateNaissance)} (${escapeHtml(String(age))} ans)</span></div>
      <div class="field-row"><span class="field-label">Lieu naissance</span><span class="field-value">${escapeHtml(patient.lieu_naissance || '—')}</span></div>
      <div class="field-row"><span class="field-label">Profession</span><span class="field-value">${escapeHtml(patient.profession || '—')}</span></div>
    </div>
  </div>

  <div class="section">
    <h3>Coordonn\u00e9es</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">T\u00e9l\u00e9phone</span><span class="field-value">${escapeHtml(patient.telephone || '—')}</span></div>
      <div class="field-row"><span class="field-label">Email</span><span class="field-value">${escapeHtml(patient.email || '—')}</span></div>
      <div class="field-row"><span class="field-label">Adresse</span><span class="field-value">${escapeHtml(patient.adresse || '—')}</span></div>
      <div class="field-row"><span class="field-label">Compl\u00e9ment</span><span class="field-value">${escapeHtml(patient.complement_adresse || '—')}</span></div>
      <div class="field-row"><span class="field-label">R\u00e9gion</span><span class="field-value">${escapeHtml(patient.region || '—')}</span></div>
      <div class="field-row"><span class="field-label">R\u00e9sidence</span><span class="field-value">${escapeHtml(patient.residence_code || '—')}</span></div>
    </div>
  </div>

  <div class="section">
    <h3>Informations m\u00e9dicales</h3>
    <div class="section-content">
      <div class="field-row"><span class="field-label">N\u00b0 SS</span><span class="field-value">${escapeHtml(patient.nir || '—')}</span></div>
      <div class="field-row"><span class="field-label">NIP</span><span class="field-value">${escapeHtml(patient.nip || '—')}</span></div>
      <div class="field-row"><span class="field-label">Mutuelles</span><span class="field-value">${escapeHtml(patient.assuranceMutuelle || patient.mutuelle || '—')}</span></div>
      <div class="field-row"><span class="field-label">M\u00e9decin traitant</span><span class="field-value">${escapeHtml(patient.medecin_traitant || '—')}</span></div>
      <div class="field-row"><span class="field-label">Allergies</span><span class="field-value">${allergiesHtml}</span></div>
    </div>
  </div>

  ${trustedSection}

  ${generateFooter()}
</body></html>`
}

export function generateCrhDiabeteHtml(
  data: any,
  patient: any,
  contact: any,
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string },
  _logoBase64: string | null,
  signedAt?: string,
  signedBy?: string,
): string {
  const admission = data.admission || {}
  const modeVieAtcd = data.modeVieAtcd || {}
  const ficheDiabete = data.ficheDiabete || {}
  const bilanInitial = data.bilanInitial || {}
  const examenPhysique = bilanInitial.examenPhysique || {}
  const glasgow = bilanInitial.glasgow || {}
  const examensComplementaires = data.examensComplementaires || {}
  const echoCardiaque = examensComplementaires.echographieCardiaque || {}
  const evolutionMedicale = data.evolutionMedicale || {}
  const sortie = data.sortie || {}

  const dateFmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
  const now = new Date()
  const printDate = now.toLocaleDateString('fr-FR')
  const printTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })

  const nomUC = (patient.nom || '').toUpperCase()
  const prenom = patient.prenom || ''
  const patientIdentity = `${nomUC} ${prenom}`
  const patientAddress = [patient.adresse, patient.complement_adresse].filter(Boolean).join(' – ')
  const patientCPVille = [patient.region].filter(Boolean).join('')

  const age = admission.dateNaissance && admission.dateEntree
    ? calculateAgeFromDates(admission.dateNaissance, admission.dateEntree)
    : '—'

  const nda = contact?.id || '—'

  const dureeDiabete = ficheDiabete.dateDiagnostic
    ? calculateDuration(ficheDiabete.dateDiagnostic)
    : '—'

  const glasgowTotal = (glasgow.ouvertureYeux || 0) + (glasgow.reponseVerbale || 0) + (glasgow.reponseMotrice || 0)
  const glasgowText = glasgowTotal > 0 ? `${glasgowTotal}/15` : '—'

  const autonomieSL = modeVieAtcd.autonomieSL || {}
  const autoItems = [
    ['Alimentation', autonomieSL.alimentation],
    ['Hygiène', autonomieSL.hygiene],
    ['Habillage', autonomieSL.habillage],
    ['Déplacement', autonomieSL.deplacement],
    ['Continence', autonomieSL.continence],
  ]

  const sexeLabel = admission.sexe === 'M' ? 'Masculin' : admission.sexe === 'F' ? 'Féminin' : '—'

  const docRef = `CDE-CRH-${String(patient.id || '0').padStart(6, '0')}-${now.toISOString().slice(0, 10).replace(/-/g, '')}`

  const signataireMedecin = signedBy || '—'

  function s(v: any): string {
    return v != null && v !== '' ? escapeHtml(String(v)) : '—'
  }

  function na(v: any): string {
    return v != null && v !== '' ? s(v) : 'Non renseigné'
  }

  const interventionsHtml = (examensComplementaires.actesInterventionnels || []).map((a: any, i: number) => `
    <div class="acte-box">
      <p class="acte-title">Acte #${i + 1} — ${s(a.date)} — ${s(a.type)}</p>
      <p class="acte-detail">Opérateur : ${s(a.operateur)}</p>
      ${a.compteRendu ? `<p class="acte-detail">${s(a.compteRendu)}</p>` : ''}
      <p class="acte-detail"><span class="acte-concl">Conclusion :</span> ${s(a.conclusion)}</p>
    </div>
  `).join('')

  const rdvHtml = (sortie.rdvSuivi || []).sort((a: any, b: any) => a.date?.localeCompare(b.date) || 0).map((r: any) => `
    <tr>
      <td>${s(r.date)} ${r.heure ? s(r.heure) : ''}</td>
      <td>${s(r.intitule)}</td>
      <td>${s(r.lieuPraticien)}</td>
    </tr>
  `).join('')

  const poidsHtml = [
    ficheDiabete.poidsForme != null ? `${ficheDiabete.poidsForme} kg (forme)` : null,
    ficheDiabete.poidsJuillet2024 != null ? `${ficheDiabete.poidsJuillet2024} kg (juil. 2024)` : null,
    ficheDiabete.poidsDecembre2025 != null ? `${ficheDiabete.poidsDecembre2025} kg (déc. 2025)` : null,
  ].filter(Boolean).join(' | ') || '—'

  // Duration of stay
  let dureeSejour = '—'
  if (admission.dateEntree && sortie.dateSortie) {
    const d1 = new Date(admission.dateEntree)
    const d2 = new Date(sortie.dateSortie)
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
    dureeSejour = `${diff} jour${diff > 1 ? 's' : ''}`
  } else if (admission.dateEntree) {
    dureeSejour = 'En cours'
  }

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 15mm 22mm 15mm;
    @bottom-left {
      content: "Patient : ${escapeHtml(patientIdentity)} — Né(e) le ${dateFmt(admission.dateNaissance)} (${age} ans) — IPP : ${s(admission.ipp)} — NDA : ${nda}";
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.5pt;
      color: #555;
    }
    @bottom-center {
      content: "Imprimé le ${printDate} à ${printTime}";
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.5pt;
      color: #999;
    }
    @bottom-right {
      content: "Page " counter(page) " / " counter(pages);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.5pt;
      color: #888;
    }
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #222;
    line-height: 1.45;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .crh-hdr {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .crh-hdr-left {
    font-size: 9pt;
    color: #333;
    flex: 1;
  }
  .crh-hdr-left .rep {
    font-size: 11pt;
    font-weight: 700;
    color: #1a3c6e;
    letter-spacing: 0.5px;
  }
  .crh-hdr-left .devise {
    font-size: 9pt;
    font-weight: 600;
    color: #666;
  }
  .crh-hdr-left .separator {
    font-size: 10pt;
    color: #aaa;
    margin: 3px 0;
  }
  .crh-hdr-left .inst-name {
    font-size: 12pt;
    font-weight: 700;
    color: #1a3c6e;
    margin-top: 4px;
  }
  .crh-hdr-left .inst-detail {
    font-size: 8.5pt;
    color: #555;
    margin-top: 1px;
  }
  .crh-hdr-left .sec-label {
    font-size: 8.5pt;
    color: #555;
    margin-top: 6px;
  }
  .crh-hdr-right {
    font-size: 9pt;
    color: #222;
    text-align: right;
    min-width: 240px;
    padding-left: 20px;
  }
  .crh-hdr-right .pat-name {
    font-size: 11pt;
    font-weight: 700;
    color: #1a3c6e;
  }
  .crh-hdr-right .pat-addr {
    font-size: 8.5pt;
    color: #555;
  }
  .crh-hdr-right .pat-meta {
    font-size: 8.5pt;
    color: #444;
    margin-top: 4px;
    line-height: 1.5;
  }

  .crh-title-block {
    text-align: center;
    margin: 12px 0 10px;
    padding: 6px 0;
    border-top: 2px solid #1a3c6e;
    border-bottom: 2px solid #1a3c6e;
  }
  .crh-title {
    font-size: 14pt;
    font-weight: 700;
    color: #1a3c6e;
    letter-spacing: 0.5px;
  }
  .crh-subtitle {
    font-size: 9pt;
    color: #555;
    margin-top: 2px;
  }

  .crh-section {
    page-break-inside: avoid;
    margin-top: 12px;
  }
  .crh-section-title {
    font-size: 10.5pt;
    font-weight: 700;
    color: #1a3c6e;
    border-left: 3px solid #1a3c6e;
    padding: 2px 0 2px 8px;
    margin: 0 0 6px;
  }
  .crh-section-content {
    padding-left: 12px;
  }
  .crh-field {
    display: flex;
    margin-bottom: 1px;
    font-size: 9.5pt;
    line-height: 1.5;
  }
  .crh-label {
    font-weight: 600;
    color: #555;
    min-width: 150px;
    flex-shrink: 0;
  }
  .crh-value {
    color: #222;
    flex: 1;
  }
  .crh-alert {
    color: #a0522d;
    font-weight: 600;
  }
  .crh-para {
    margin: 4px 0;
    font-size: 9.5pt;
    line-height: 1.5;
  }
  .crh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin: 6px 0;
  }
  .crh-table th {
    background: #1a3c6e;
    color: #fff;
    padding: 5px 7px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #15335c;
  }
  .crh-table td {
    padding: 4px 7px;
    border: 1px solid #ccc;
    vertical-align: top;
  }
  .crh-table tr:nth-child(even) td {
    background: #f7f9fc;
  }
  .acte-box {
    margin: 6px 0;
    padding: 6px 8px;
    background: #f4f6f9;
    border-left: 3px solid #1a3c6e;
    font-size: 9pt;
  }
  .acte-title {
    font-weight: 700;
    margin: 0 0 3px;
  }
  .acte-detail {
    margin: 1px 0;
    font-size: 9pt;
    font-weight: 400;
  }
  .acte-concl {
    font-weight: 600;
  }
  .signature-block {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    display: flex;
    justify-content: space-between;
  }
  .signature-col {
    font-size: 9.5pt;
    line-height: 1.6;
  }
  .signature-col strong {
    color: #1a3c6e;
  }
  .badge-yes {
    color: #1a6e3c;
    font-weight: 600;
  }
  .badge-no {
    color: #999;
  }
  @media print {
    body { margin: 0; padding: 0; }
    .crh-section { page-break-inside: avoid; }
  }
</style></head><body>

<div class="crh-hdr">
  <div class="crh-hdr-left">
    <div class="rep">RÉPUBLIQUE DE GUINÉE</div>
    <div class="devise">Travail — Justice — Solidarité</div>
    <div class="separator">✶ ✶ ✶</div>
    <div class="inst-name">${s(hospital.name || 'Établissement de Santé')}</div>
    <div class="inst-detail">${[hospital.address, hospital.city].filter(Boolean).join(' – ')}</div>
    <div class="inst-detail">Tél : ${s(hospital.phone)}</div>
    ${hospital.regNumber ? `<div class="inst-detail">N° agrément : ${s(hospital.regNumber)}</div>` : ''}
    <div class="sec-label"><strong>SECRÉTARIAT :</strong> ${s(hospital.phone)}${hospital.email ? ` — ${s(hospital.email)}` : ''}</div>
  </div>
  <div class="crh-hdr-right">
    <div class="pat-name">${escapeHtml(patientIdentity)}</div>
    ${patientAddress ? `<div class="pat-addr">${escapeHtml(patientAddress)}</div>` : ''}
    ${patientCPVille ? `<div class="pat-addr">${escapeHtml(patientCPVille)}</div>` : ''}
    <div class="pat-meta">
      ‣ Né(e) le : ${dateFmt(admission.dateNaissance)} (${age} ans) — ${sexeLabel}<br>
      ‣ IPP : ${s(admission.ipp)} | NDA : ${nda}<br>
      ‣ Admission : ${dateFmt(admission.dateEntree)}
      ${admission.serviceAccueil ? `<br>&emsp;— Service : ${s(admission.serviceAccueil)}` : ''}
      <br>
      ‣ CRH éditée le : ${printDate}<br>
      &emsp;— Réf : ${docRef}
    </div>
  </div>
</div>

<div class="crh-title-block">
  <div class="crh-title">COMPTE-RENDU D'HOSPITALISATION — DIABÈTE</div>
  <div class="crh-subtitle">Du ${dateFmt(admission.dateEntree)} au ${dateFmt(sortie.dateSortie || admission.dateEntree)} (${dureeSejour})</div>
</div>

<!-- 1. ADMISSION -->
<div class="crh-section">
  <div class="crh-section-title">1. ADMISSION</div>
  <div class="crh-section-content">
    <p class="crh-para"><strong>Motif d'hospitalisation :</strong><br>${na(bilanInitial.motifHospitalisation)}</p>
    ${bilanInitial.histoireRecent ? `<p class="crh-para"><strong>Histoire de la maladie :</strong><br>${s(bilanInitial.histoireRecent)}</p>` : ''}
    ${bilanInitial.conclusionEntree ? `<p class="crh-para"><strong>Conclusion à l'entrée :</strong><br>${s(bilanInitial.conclusionEntree)}</p>` : ''}
  </div>
</div>

<!-- 2. MODE DE VIE / CONTEXTE SOCIAL -->
<div class="crh-section">
  <div class="crh-section-title">2. MODE DE VIE / CONTEXTE SOCIAL</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Situation familiale</span><span class="crh-value">${na(modeVieAtcd.situationFamiliale)}</span></div>
    <div class="crh-field"><span class="crh-label">Isolement</span><span class="crh-value">${modeVieAtcd.isolement ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Hébergement</span><span class="crh-value">${na(modeVieAtcd.hebergement)}</span></div>
    <div class="crh-field"><span class="crh-label">Autonomie SL</span><span class="crh-value">
      <table class="crh-table">
        <thead><tr><th>Domaine</th><th>Niveau</th></tr></thead>
        <tbody>${autoItems.map(([label, val]) => `<tr><td>${label}</td><td>${s(val)}</td></tr>`).join('')}</tbody>
      </table>
    </span></div>
    <div class="crh-field"><span class="crh-label">Compréhension français</span><span class="crh-value">${modeVieAtcd.comprehensionFrancais ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Statut juridique</span><span class="crh-value">Non renseigné</span></div>
    <div class="crh-field"><span class="crh-label">Prise en charge</span><span class="crh-value">${na(modeVieAtcd.priseEnCharge)}</span></div>
    ${modeVieAtcd.commentaireVie ? `<div class="crh-field"><span class="crh-label">Commentaire</span><span class="crh-value">${s(modeVieAtcd.commentaireVie)}</span></div>` : ''}
  </div>
</div>

<!-- 3. TOXIQUES / ADDICTIONS -->
<div class="crh-section">
  <div class="crh-section-title">3. TOXIQUES / ADDICTIONS</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Tabac</span><span class="crh-value">${na(modeVieAtcd.tabagisme)}</span></div>
    <div class="crh-field"><span class="crh-label">Alcool</span><span class="crh-value">${modeVieAtcd.alcool ? `<span class="badge-yes">Oui</span>${modeVieAtcd.alcoolDetail ? ` — ${s(modeVieAtcd.alcoolDetail)}` : ''}` : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Cannabis</span><span class="crh-value">${modeVieAtcd.cannabis ? `<span class="badge-yes">Oui</span>${modeVieAtcd.cannabisDetail ? ` — ${s(modeVieAtcd.cannabisDetail)}` : ''}` : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Date évaluation</span><span class="crh-value">Non renseigné</span></div>
  </div>
</div>

<!-- 4. ALLERGIES -->
<div class="crh-section">
  <div class="crh-section-title">4. ALLERGIES</div>
  <div class="crh-section-content">
    <p class="crh-para">${modeVieAtcd.allergies && modeVieAtcd.allergies.trim().toLowerCase() !== "pas d'allergie connue" && modeVieAtcd.allergies.trim() !== '' ? `<span class="crh-alert">⚠ ${s(modeVieAtcd.allergies)}</span>` : s(modeVieAtcd.allergies || 'Pas d\'allergie connue')}</p>
  </div>
</div>

<!-- 5. ANTÉCÉDENTS MÉDICAUX / CHIRURGICAUX -->
<div class="crh-section">
  <div class="crh-section-title">5. ANTÉCÉDENTS MÉDICAUX / CHIRURGICAUX</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Médicaux</span><span class="crh-value">${na(modeVieAtcd.antecedentsMedicaux)}</span></div>
    <div class="crh-field"><span class="crh-label">Chirurgicaux</span><span class="crh-value">Non renseigné</span></div>
  </div>
</div>

<!-- 6. DIABÈTE -->
<div class="crh-section">
  <div class="crh-section-title">6. DIABÈTE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date diagnostic</span><span class="crh-value">${s(ficheDiabete.dateDiagnostic || '—')}${ficheDiabete.dateDiagnostic ? ` (évolution : ${dureeDiabete})` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Poids historique</span><span class="crh-value">${poidsHtml}</span></div>
    <div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">${ficheDiabete.hba1c != null ? `${ficheDiabete.hba1c} % ${ficheDiabete.hba1cDate ? `(${dateFmt(ficheDiabete.hba1cDate)})` : ''}` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Bilan lipidique</span><span class="crh-value">HDL ${ficheDiabete.hdl != null ? ficheDiabete.hdl + ' mmol/L' : '—'} / LDL ${ficheDiabete.ldl != null ? ficheDiabete.ldl + ' mmol/L' : '—'} / TG ${ficheDiabete.triglycerides != null ? ficheDiabete.triglycerides + ' mmol/L' : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Fonction rénale</span><span class="crh-value">Créatininémie : ${ficheDiabete.creatininemie != null ? `${ficheDiabete.creatininemie} µmol/L` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Rétinopathie</span><span class="crh-value">${s(ficheDiabete.retinopathie || '—')}</span></div>
    <div class="crh-field"><span class="crh-label">Neuropathie</span><span class="crh-value">${ficheDiabete.neuropathie ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Grade podologique</span><span class="crh-value">${ficheDiabete.podologiqueGrade != null ? s(ficheDiabete.podologiqueGrade) : '—'}${ficheDiabete.amputation ? `${ficheDiabete.podologiqueGrade != null ? ' — ' : ''}<span class="crh-alert">Amputation${ficheDiabete.amputationDetail ? ` : ${s(ficheDiabete.amputationDetail)}` : ''}</span>` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Insuffisance cardiaque</span><span class="crh-value">${ficheDiabete.insuffisanceCardiaque ? `<span class="badge-yes">Oui</span>${ficheDiabete.ntProBNP != null ? ` (NT-proBNP : ${ficheDiabete.ntProBNP} pg/mL)` : ''}` : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">AOMI</span><span class="crh-value">${ficheDiabete.aomi ? `<span class="badge-yes">Oui</span>${ficheDiabete.ischemicCritique ? ` — ${s(ficheDiabete.ischemicCritique)}` : ''}` : '<span class="badge-no">Non</span>'}</span></div>
  </div>
</div>

<!-- 7. TRAITEMENT À L'ENTRÉE / MÉDICAMENTS -->
<div class="crh-section">
  <div class="crh-section-title">7. TRAITEMENT À L'ENTRÉE / MÉDICAMENTS</div>
  <div class="crh-section-content">
    <p class="crh-para">Non renseigné</p>
  </div>
</div>

<!-- 8. EXAMEN CLINIQUE À L'ENTRÉE -->
<div class="crh-section">
  <div class="crh-section-title">8. EXAMEN CLINIQUE À L'ENTRÉE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Constantes</span><span class="crh-value">
      TA : ${examenPhysique.taSystolique != null ? `${examenPhysique.taSystolique}/${examenPhysique.taDiastolique || '?'}` : '—'} mmHg
      &ensp;|&ensp; FC : ${examenPhysique.frequenceCardiaque != null ? `${examenPhysique.frequenceCardiaque} /min` : '—'}
      &ensp;|&ensp; T° : ${examenPhysique.temperature != null ? `${examenPhysique.temperature} °C` : '—'}
      &ensp;|&ensp; Glycémie : ${examenPhysique.glycemie != null ? `${examenPhysique.glycemie} mmol/L` : '—'}
    </span></div>
    <div class="crh-field"><span class="crh-label">Score de Glasgow</span><span class="crh-value">${glasgowText}${glasgowTotal > 0 ? ` (Y:${glasgow.ouvertureYeux} V:${glasgow.reponseVerbale} M:${glasgow.reponseMotrice})` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Examen podologique</span><span class="crh-value">${na(examenPhysique.descriptionPlaie || (ficheDiabete.podologiqueGrade != null ? `Grade ${ficheDiabete.podologiqueGrade}` : null))}</span></div>
    <div class="crh-field"><span class="crh-label">Évaluation douleur (EN)</span><span class="crh-value">Non renseigné</span></div>
  </div>
</div>

<!-- 9. EXAMENS COMPLÉMENTAIRES -->
<div class="crh-section">
  <div class="crh-section-title">9. EXAMENS COMPLÉMENTAIRES</div>
  <div class="crh-section-content">
    ${examensComplementaires.ecgRepos ? `<div class="crh-field"><span class="crh-label">ECG de repos</span><span class="crh-value">${s(examensComplementaires.ecgRepos)}</span></div>` : ''}
    ${examensComplementaires.radioPied ? `<div class="crh-field"><span class="crh-label">Radio du pied</span><span class="crh-value">${s(examensComplementaires.radioPied)}</span></div>` : ''}
    ${echoCardiaque.fevg != null || echoCardiaque.hypokinesie || echoCardiaque.autre ? `
    <div class="crh-field"><span class="crh-label">Échographie cardiaque</span><span class="crh-value">
      ${echoCardiaque.fevg != null ? `FEVG : ${echoCardiaque.fevg}%` : ''}
      ${echoCardiaque.hypokinesie ? ` | Hypokinésie : ${s(echoCardiaque.hypokinesie)}` : ''}
      ${echoCardiaque.autre ? ` | ${s(echoCardiaque.autre)}` : ''}
    </span></div>` : ''}
    ${interventionsHtml ? `<p class="crh-para" style="margin-top:8px;"><strong>Actes interventionnels :</strong></p>${interventionsHtml}` : ''}
  </div>
</div>

<!-- 10. ÉVOLUTION MÉDICALE -->
<div class="crh-section">
  <div class="crh-section-title">10. ÉVOLUTION MÉDICALE</div>
  <div class="crh-section-content">
    ${evolutionMedicale.infoPatientFamille ? `<p class="crh-para"><span class="badge-yes">✓</span> Information du patient / famille</p>` : ''}
    ${evolutionMedicale.produitsSanguins ? `<p class="crh-para"><span class="badge-yes">✓</span> Administration de produits sanguins</p>` : ''}
    ${evolutionMedicale.bmrBhre ? `<p class="crh-para"><span class="crh-alert">⚠</span> Porteur / Contact BMR ou BHRe</p>` : ''}
    ${evolutionMedicale.journalEvolution ? `<p class="crh-para"><strong>Journal d'évolution :</strong></p><div style="background:#f7f9fc;padding:8px 10px;border-left:3px solid #1a3c6e;font-size:9.5pt;white-space:pre-wrap;margin:4px 0;">${s(evolutionMedicale.journalEvolution)}</div>` : ''}
  </div>
</div>

<!-- 11. PROJET THÉRAPEUTIQUE / CONCLUSION -->
<div class="crh-section">
  <div class="crh-section-title">11. PROJET THÉRAPEUTIQUE / CONCLUSION À L'ENTRÉE</div>
  <div class="crh-section-content">
    <p class="crh-para">${na(bilanInitial.conclusionEntree)}</p>
  </div>
</div>

<!-- 12. SORTIE -->
<div class="crh-section">
  <div class="crh-section-title">12. SORTIE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date de sortie</span><span class="crh-value">${dateFmt(sortie.dateSortie)}</span></div>
    <div class="crh-field"><span class="crh-label">Destination</span><span class="crh-value">${na(sortie.destinationSortie)}</span></div>
    ${sortie.conclusionSortie ? `<p class="crh-para"><strong>Conclusion / Synthèse de sortie :</strong><br>${s(sortie.conclusionSortie)}</p>` : ''}
    ${rdvHtml ? `
    <p class="crh-para" style="margin-top:6px;"><strong>Rendez-vous de suivi :</strong></p>
    <table class="crh-table">
      <thead><tr><th>Date / Heure</th><th>Intitulé</th><th>Lieu / Praticien</th></tr></thead>
      <tbody>${rdvHtml}</tbody>
    </table>` : ''}
  </div>
</div>

<!-- SIGNATURES -->
<div class="signature-block">
  <div class="signature-col">
    <strong>Médecin signataire</strong><br>
    ${escapeHtml(signataireMedecin)}
  </div>
  <div class="signature-col">
    ${signedAt ? `<strong>Date de signature</strong><br>${dateFmt(signedAt)}` : ''}
  </div>
  <div class="signature-col">
    <strong>Interne</strong><br>
    —
  </div>
</div>

</body></html>`
}

function calculateAgeFromDates(dateNaissance: string, dateEntree: string): number {
  const birth = new Date(dateNaissance)
  const entry = new Date(dateEntree)
  let age = entry.getFullYear() - birth.getFullYear()
  const m = entry.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && entry.getDate() < birth.getDate())) age--
  return age
}

function calculateDuration(dateDiagnostic: string): string {
  const parts = dateDiagnostic.split('-')
  if (parts.length < 2) return '—'
  const diagYear = parseInt(parts[0], 10)
  const diagMonth = parseInt(parts[1], 10)
  if (isNaN(diagYear) || isNaN(diagMonth)) return '—'
  const now = new Date()
  let years = now.getFullYear() - diagYear
  let months = (now.getMonth() + 1) - diagMonth
  if (months < 0) { years--; months += 12 }
  return `${years} ans ${months} mois`
}

function getCiviliteLabel(civilite: string): string {
  if (civilite === 'M') return 'Masculin'
  if (civilite === 'Mme' || civilite === 'Mlle') return 'F\u00e9minin'
  return 'Non pr\u00e9cis\u00e9'
}

function calculateAge(dateStr: string): number {
  const birth = new Date(dateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getUserDisplayName(user: any): string {
  const titlePrefix = user.specialties?.[0]?.title_prefix
  const title = titlePrefix || ''
  const nom = (user.nom || '').toUpperCase()
  const prenom = user.prenom || ''
  return [title, nom, prenom].filter(Boolean).join(' ')
}


