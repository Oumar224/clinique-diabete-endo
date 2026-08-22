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

  const allergiesHtml = Array.isArray(patient.allergies) && patient.allergies.length
    ? patient.allergies.map((a: any) => `<span class="tag tag--danger">${typeof a === 'string' ? escapeHtml(a) : escapeHtml(a.libelle || '')}</span>`).join(' ')
    : typeof patient.allergies === 'string' && patient.allergies.trim()
      ? `<span class="tag tag--danger">${escapeHtml(patient.allergies)}</span>`
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
      <div class="field-row"><span class="field-label">M\u00e9decin r\u00e9f\u00e9rent</span><span class="field-value">${escapeHtml(patient.medecin_traitant || '—')}</span></div>
      <div class="field-row"><span class="field-label">Allergies</span><span class="field-value">${allergiesHtml}</span></div>
    </div>
  </div>

  ${trustedSection}

  ${generateFooter()}
</body></html>`
}

export interface CrhDiabeteOptions {
  /** Override the document title displayed in the title block (default: "COMPTE-RENDU D'HOSPITALISATION — DIABÈTE") */
  docTitle?: string
  /** Override the document reference prefix (default: "CDE-CRH") */
  docRefPrefix?: string
  /** Override the short type label used in "XXX éditée le" (default: "CRH") */
  typeLabel?: string
}

export interface CrhOrdonnanceData {
  medicaments: Array<{ nom: string; posologie: string; dureeType?: 'courte' | 'longue' }>
  soins: Array<{ nom: string; posologie: string }>
  examens: Array<{ label: string; detail?: string }>
  avis: Array<{ label: string; detail?: string }>
}

export function generateCrhDiabeteHtml(
  data: any,
  patient: any,
  contact: any,
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string },
  _logoBase64: string | null,
  signedAt?: string,
  signedBy?: string,
  options?: CrhDiabeteOptions,
  annexeAttachments?: Array<{ id?: number; display_name?: string; file_name?: string; mime_type?: string; file_size?: number; description?: string; file_data?: string }>,
  ordonnance?: CrhOrdonnanceData,
): string {
  const annexes = annexeAttachments ?? []
  const admission = data.admission || {}
  const modeVieAtcd = data.modeVieAtcd || {}
  const ficheDiabete = data.ficheDiabete || {}
  const bilanInitial = data.bilanInitial || {}
  const traitementEntree = (bilanInitial as any).traitementEntree
  const scoreDouleur = (bilanInitial as any).scoreDouleur
  const examenPhysiqueTexte = (bilanInitial as any).examenPhysiqueTexte
  const projetSoin = (bilanInitial as any).projetSoin
  const examenPhysique = bilanInitial.examenPhysique || {}
  // IMC must stay in sync with calcIMC (src/utils/medical-calculations.ts) —
  // this bundle cannot import the renderer module.
  const tailleM = examenPhysique.taille != null ? examenPhysique.taille / 100 : 0
  const imcVital = examenPhysique.poids != null && tailleM > 0
    ? Math.round((examenPhysique.poids / (tailleM * tailleM)) * 10) / 10
    : null
  const glasgow = bilanInitial.glasgow || {}
  const examensComplementaires = data.examensComplementaires || {}
  const evolutionMedicale = data.evolutionMedicale || {}
  // Legacy pick-up: old signed documents keep the réglementaires booleans under evolutionMedicale.*
  const sortie = { ...(data.sortie || {}) }
  for (const k of ['infoPatientFamille', 'produitsSanguins', 'bmrBhre'] as const) {
    if (sortie[k] == null && typeof evolutionMedicale[k] === 'boolean') sortie[k] = evolutionMedicale[k]
  }

  const dateFmt = (d: string) => d
    ? new Date(d.includes('T') ? d : `${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  const monthFmt = (d: string) => {
    if (!d) return '—'
    // Strict YYYY-MM only: a legacy full-date value (e.g. '2026-01-15') must
    // pass through unchanged instead of being truncated to MM/YYYY.
    const m = String(d).match(/^(\d{4})-(\d{2})$/)
    return m ? `${m[2]}/${m[1]}` : String(d)
  }
  const dateTimeFmt = (d: string) => d.includes('T')
    ? `${dateFmt(d)} ${new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : dateFmt(d)
  const now = new Date()
  const printDate = now.toLocaleDateString('fr-FR')
  const printTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })

  const nomUC = (patient.nom || '').toUpperCase()
  const prenom = patient.prenom || ''
  const patientIdentity = `${nomUC} ${prenom}`
  const patientAddress = [patient.adresse, patient.complement_adresse].filter(Boolean).join(' – ')
  const patientCPVille = [patient.region].filter(Boolean).join('')

  const dateNaissance = admission.dateNaissance || patient.date_naissance || ''
  const ipp = admission.ipp || patient.nip || ''
  const sexeRaw = admission.sexe || (patient.civilite === 'M' ? 'M' : patient.civilite ? 'F' : '')
  const age = dateNaissance && admission.dateEntree
    ? calculateAgeFromDates(dateNaissance, admission.dateEntree)
    : '—'

  const nda = contact?.id || '—'

  const dureeDiabete = ficheDiabete.dateDiagnostic
    ? calculateDuration(ficheDiabete.dateDiagnostic)
    : '—'

  const glaYeux = glasgow.ouvertureYeux || 4
  const glaVerbale = glasgow.reponseVerbale || 5
  const glaMotrice = glasgow.reponseMotrice || 6
  const glasgowTotal = glaYeux + glaVerbale + glaMotrice
  const glasgowText = `${glasgowTotal}/15`

  const autonomieSL = modeVieAtcd.autonomieSL || {}
  const autoItems = [
    ['Alimentation', autonomieSL.alimentation],
    ['Hygiène', autonomieSL.hygiene],
    ['Habillage', autonomieSL.habillage],
    ['Déplacement', autonomieSL.deplacement],
    ['Continence', autonomieSL.continence],
  ]

  const sexeLabel = sexeRaw === 'M' ? 'Masculin' : sexeRaw === 'F' ? 'Féminin' : '—'

  const docRefPrefix = options?.docRefPrefix ?? 'CDE-CRH'
  const docRef = `${docRefPrefix}-${String(patient.id || '0').padStart(6, '0')}-${now.toISOString().slice(0, 10).replace(/-/g, '')}`

  const signataireMedecin = signedBy || '—'

  function s(v: any): string {
    return v != null && v !== '' ? escapeHtml(String(v)) : '—'
  }

  function na(v: any): string {
    return v != null && v !== '' ? s(v) : 'Non renseigné'
  }

  const imagerieTestsHtml = (examensComplementaires.imagerieTests || [])
    .slice()
    .sort((a: any, b: any) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.localeCompare(a.date)
    })
    .map((e: any) => {
      const type = e.type === '__autre__' ? e.typeLibre : e.type
      const hasContent = e.date || type || e.resultat
      if (!hasContent) return ''
      const label = ['Imagerie / Test', e.date ? dateFmt(e.date) : '', type].filter(Boolean).join(' — ')
      if (!hasText(e.resultat)) {
        return `<div class="crh-field"><span class="crh-label">${s(label)}</span><span class="crh-value">—</span></div>`
      }
      return `<div class="crh-para"><strong>${s(label)} :</strong><br><div class="crh-rich">${richHtml(e.resultat)}</div></div>`
    })
    .join('')

  const bilanBioData = examensComplementaires.bilanBio || {}
  const bioResultsList = bilanBioData.results || []
  const formatRefs = (ref: any): string => {
    if (!ref || typeof ref !== 'object') return ''
    if (Array.isArray(ref.options)) return ref.options.join(' / ')
    if (ref.min != null && ref.max != null) return `${ref.min} – ${ref.max}`
    if (ref.min_h != null && ref.max_h != null) return `H : ${ref.min_h} – ${ref.max_h}`
    if (ref.min_f != null && ref.max_f != null) return `F : ${ref.min_f} – ${ref.max_f}`
    if (ref.normal_value != null) return String(ref.normal_value)
    return ''
  }
  const bioGrouped = bioResultsList.reduce((groups: Map<string, any[]>, r: any) => {
    const exam = r.examName?.trim() || 'Examen non précisé'
    const group = groups.get(exam) || []
    group.push(r)
    groups.set(exam, group)
    return groups
  }, new Map<string, any[]>())
  const bioRowsHtml = [...bioGrouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
    .map(([exam, rows]) => `
    <tr><th colspan="5" style="text-align:left">${s(exam)}</th></tr>
    ${rows
      .sort((a: any, b: any) => (a.parameterName || '').localeCompare(b.parameterName || '', 'fr', { sensitivity: 'base' }))
      .map((r: any) => {
        const bioDate = r.requestDate || r.filledAt ? dateFmt(r.requestDate || r.filledAt) : ''
        return `
    <tr>
      <td>${s(bioDate)}</td>
      <td>${s(r.parameterName || '')}</td>
      <td style="text-align:right${r.isNormal === false ? ';font-weight:bold;color:#c00' : ''}">${s(r.value || '')}</td>
      <td>${s(r.parameterUnit || '')}</td>
      <td>${s(formatRefs(r.parameterReferenceValues))}</td>
    </tr>`}).join('')}
  `).join('')
  const bilanBioHtml = bioResultsList.length
    ? `<p class="crh-para" style="margin-top:8px;"><strong>Résultat Bio${bilanBioData.dateFrom ? ` (${dateFmt(bilanBioData.dateFrom)} → ${dateFmt(bilanBioData.dateTo)})` : ''} :</strong></p>
<table class="crh-table">
  <thead>
    <tr>
      <th style="text-align:left">Date</th>
      <th style="text-align:left">Paramètre</th>
      <th style="text-align:right">Valeur</th>
      <th style="text-align:left">Unité</th>
      <th style="text-align:left">Références</th>
    </tr>
  </thead>
  <tbody>
    ${bioRowsHtml}
  </tbody>
</table>`
    : ''

  const rdvHtml = (sortie.rdvSuivi || []).slice().sort((a: any, b: any) => a.date?.localeCompare(b.date) || 0).map((r: any) => `
    <tr>
      <td>${dateFmt(r.date)} ${r.heure ? s(r.heure) : ''}</td>
      <td>${s(r.intitule)}</td>
      <td>${s(r.lieuPraticien)}</td>
    </tr>
  `).join('')

  const poidsHtml = [
    ficheDiabete.poidsForme != null ? `${ficheDiabete.poidsForme} kg (forme)` : null,
    ficheDiabete.poidsJuillet2024 != null ? `${ficheDiabete.poidsJuillet2024} kg (juil. 2024)` : null,
    ficheDiabete.poidsDecembre2025 != null ? `${ficheDiabete.poidsDecembre2025} kg (déc. 2025)` : null,
  ].filter(Boolean).join(' | ') || '—'

  // `allergies` / `antecedents` are arrays in current documents, but pre-feature
  // CRH/CRC documents stored them as plain strings. Guard both shapes so legacy
  // data renders as-is instead of crashing the export (`.map` on a string).
  const allergiesRaw = modeVieAtcd.allergies
  const allergiesHtml = Array.isArray(allergiesRaw)
    ? allergiesRaw.length
      ? allergiesRaw.map((a: any) => `${s(a.libelle)} <span class="tag tag--danger">${s(a.type)}</span>`).join('<br>')
      : 'Aucune allergie connue'
    : typeof allergiesRaw === 'string' && allergiesRaw.trim()
      ? s(allergiesRaw)
      : 'Aucune allergie connue'

const antecedentsRaw = modeVieAtcd.antecedents
  const normalizeAntecedentType = (t: any): string => {
    const norm = String(t ?? '').trim().toLowerCase()
    if (norm === 'familiale' || norm === 'familial') return 'Familiale'
    if (norm === 'personnelle' || norm === 'personnel') return 'Personnelle'
    return ''
  }
  const antecedentsHtml = Array.isArray(antecedentsRaw)
    ? antecedentsRaw.length
      ? ['Familiale', 'Personnelle', 'Autre']
          .map((g) => {
            const items = antecedentsRaw.filter((a: any) => {
              const type = normalizeAntecedentType(a.type)
              return g === 'Autre' ? type === '' : type === g
            })
            if (!items.length) return ''
            const header = g === 'Familiale' ? 'Antécédents familiaux :' : g === 'Personnelle' ? 'Antécédents personnels :' : 'Autres antécédents :'
            const lines = items
              .map((a: any) => {
                const annee = a.annee ? s(a.annee) : ''
                const libelle = s(a.libelle)
                // Personnelle entries may carry an optional `categorie` (e.g. 'Allergies
                // alimentaires') → render `année · categorie : libellé`; legacy entries
                // without `categorie` (and all Familiale/fallback entries) keep `année libellé`.
                const cat = g === 'Personnelle' && a.categorie ? String(a.categorie).trim() : ''
                return cat
                  ? `${annee ? `${annee} · ` : ''}${s(cat)} : ${libelle}`.trim()
                  : `${annee ? `${annee} ` : ''}${libelle}`.trim()
              })
              .join('<br>')
            return `<p class="crh-para"><strong>${header}</strong><br>${lines}</p>`
          })
          .join('')
      : '<p class="crh-para">Non renseigné</p>'
    : typeof antecedentsRaw === 'string' && antecedentsRaw.trim()
      ? `<p class="crh-para">${s(antecedentsRaw)}</p>`
      : '<p class="crh-para">Non renseigné</p>'

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

  const annexeItemsHtml = annexes.map((att) => {
    const isImage = (att.mime_type || '').startsWith('image/')
    const nameHtml = escapeHtml((att.display_name || '').trim())
    const description = att.description || ''
    const isPlain = !/<[a-zA-Z][^>]*>/.test(description)
    const captionHtml = hasText(description)
      ? `<div class="annexe-caption crh-rich">${isPlain ? escapeHtml(description) : richHtml(description)}</div>`
      : ''
    if (isImage && att.file_data) {
      return `<div class="annexe-item">${nameHtml ? `<div class="annexe-item-name">${nameHtml}</div>` : ''}<img src="${escapeHtml(att.file_data)}" class="annexe-img" />${captionHtml}</div>`
    }
    const metaHtml = [escapeHtml(att.mime_type || ''), att.file_size != null ? formatSize(att.file_size) : ''].filter(Boolean).join(' · ')
    return `<div class="annexe-item annexe-file">${nameHtml ? `<span class="annexe-file-name">${nameHtml}</span>` : ''}${metaHtml ? `<span class="annexe-file-meta">${metaHtml}</span>` : ''}${captionHtml}</div>`
  }).join('')
  const annexeHtml = annexes.length > 0
    ? `
<!-- 16. ANNEXE -->
<div class="crh-section">
  <div class="crh-section-title">16. ANNEXE</div>
  <div class="crh-section-content">
    ${annexeItemsHtml}
  </div>
</div>`
    : ''

  // ── ORDONNANCE (médicaments / soins / demandes d'examens / avis spécialisés) ──
  const ordonnanceData: Partial<CrhOrdonnanceData> = ordonnance ?? {}
  const renderOrdonnanceItem = (item: { nom: string; posologie: string }) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}</div>`
  }
  const renderOrdonnanceLabel = (item: { label: string; detail?: string }) => {
    const label = escapeHtml(item.label || '')
    const detail = item.detail
      ? richHtml(item.detail)
          .replace(/^<p[^>]*>\s*/i, '')
          .replace(/<\/p>\s*$/i, '')
          .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
      : ''
    if (!label && !detail) return ''
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${label}</span>${detail ? ` : ${detail}` : ''}</div>`
  }
  const renderOrdonnanceSubgroup = (title: string, items: Array<{ nom: string; posologie: string }>): string => {
    const itemsHtml = items.map(renderOrdonnanceItem).join('')
    if (!itemsHtml) return ''
    return `<div class="crh-ord-subtitle">${escapeHtml(title)}</div>${itemsHtml}`
  }
  const ordonnanceMedicaments = ordonnanceData.medicaments ?? []
  const medicamentsHtml =
    renderOrdonnanceSubgroup('Traitement de courte dur\u00e9e', ordonnanceMedicaments.filter(m => (m.dureeType ?? 'courte') === 'courte')) +
    renderOrdonnanceSubgroup('Traitement de longue dur\u00e9e', ordonnanceMedicaments.filter(m => m.dureeType === 'longue'))
  const ordonnanceBlocks = [
    { title: 'M\u00c9DICAMENTS', items: medicamentsHtml },
    { title: 'SOINS', items: (ordonnanceData.soins ?? []).map(renderOrdonnanceItem).join('') },
    { title: 'DEMANDES D\u2019EXAMENS', items: (ordonnanceData.examens ?? []).map(renderOrdonnanceLabel).join('') },
    { title: 'AVIS SP\u00c9CIALIS\u00c9S', items: (ordonnanceData.avis ?? []).map(renderOrdonnanceLabel).join('') },
  ]
  const ordonnanceBlocksHtml = ordonnanceBlocks
    .filter(b => b.items !== '')
    .map(b => `<div style="margin-bottom:8px;"><div style="font-weight:bold;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(b.title)}</div><div style="padding-left:16px;">${b.items}</div></div>`)
    .join('')
  const ordonnanceHtml = `
<!-- 14. ORDONNANCE -->
<div class="crh-section">
  <div class="crh-section-title">14. ORDONNANCE</div>
  <div class="crh-section-content">
    ${ordonnanceBlocksHtml || '<div class="crh-para">Non renseign\u00e9</div>'}
  </div>
</div>`

  const evolutionAvisHtml = (evolutionMedicale.avis ?? [])
    .map((av: any) => {
      const date = av.date ? dateFmt(av.date) : ''
      const specialite = escapeHtml(av.specialite || '')
      const motif = av.motif ? escapeHtml(av.motif) : ''
      if (!date && !specialite && !motif) return ''
      const label = [date, specialite].filter(Boolean).join(' — ')
      return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${label}</span>${motif ? ` : ${motif}` : ''}</div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 15mm 22mm 15mm;
    @bottom-left {
      content: "Patient : ${escapeHtml(patientIdentity)} — Né(e) le ${dateFmt(dateNaissance)} (${age} ans) — IPP : ${s(ipp)} — NDA : ${nda}";
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
  .crh-page { width: 210mm; min-height: 297mm; padding: 18mm 15mm 22mm; box-sizing: border-box; margin: 0 auto; }
  @media print { .crh-page { width: auto; min-height: auto; padding: 0; margin: 0; } }
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
  .crh-ord-subtitle {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1a3c6e;
    margin: 6px 0 4px;
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
  .crh-rich {
    font-size: 12px;
    line-height: 1.5;
  }
  .crh-rich p { margin: 0 0 6px; }
  .crh-rich h1, .crh-rich h2, .crh-rich h3 { margin: 10px 0 6px; font-weight: 700; color: #1f2937; }
  .crh-rich h1 { font-size: 16px; }
  .crh-rich h2 { font-size: 14px; }
  .crh-rich h3 { font-size: 13px; }
  .crh-rich ul, .crh-rich ol { margin: 0 0 6px; padding-left: 18px; }
  .crh-rich li { margin-bottom: 2px; }
  .crh-rich blockquote { border-left: 3px solid #d1d5db; margin: 6px 0; padding: 2px 8px; color: #4b5563; font-style: italic; }
  .crh-rich pre { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 8px; font-family: monospace; font-size: 11px; white-space: pre-wrap; margin: 6px 0; }
  .crh-rich code { background: #f3f4f6; font-family: monospace; font-size: 11px; padding: 1px 3px; }
  .crh-rich hr { border: none; border-top: 1px solid #d1d5db; margin: 10px 0; }
  .crh-para img, .crh-value img, .crh-rich img { max-width: 100%; height: auto; }
  .crh-para img.is-left, .crh-value img.is-left, .crh-rich img.is-left { float: left; margin: 0 12px 6px 0; max-width: 45%; }
  .crh-para img.is-right, .crh-value img.is-right, .crh-rich img.is-right { float: right; margin: 0 0 6px 12px; max-width: 45%; }
  .crh-para img.is-center, .crh-value img.is-center, .crh-rich img.is-center { display: block; margin: 6px auto; }
  .crh-rich a { color: #2563eb; text-decoration: underline; }
  .annexe-item { margin-bottom: 12px; }
  .annexe-img { max-width: 100%; border: 1px solid #ccc; }
  .annexe-caption { font-size: 11px; color: #555; margin-top: 4px; font-style: italic; }
  .annexe-file-name { font-weight: 600; display: block; }
  .annexe-item-name { font-weight: 600; display: block; }
  .annexe-file-meta { font-size: 11px; color: #555; }
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

<div class="crh-page">
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
      ‣ Né(e) le : ${dateFmt(dateNaissance)} (${age} ans) — ${sexeLabel}<br>
      ‣ IPP : ${s(ipp)} | NDA : ${nda}<br>
      ‣ Admission : ${dateFmt(admission.dateEntree)}
      ${admission.serviceAccueil ? `<br>&emsp;— Service : ${s(admission.serviceAccueil)}` : ''}
      ${admission.medecinTraitantNom ? `<br>&emsp;— Médecin référent : ${s(admission.medecinTraitantNom)}` : ''}
      ${admission.interneIPANom ? `<br>&emsp;— Responsable : ${s(admission.interneIPANom)}` : ''}
      <br>
      ‣ ${(options?.typeLabel ?? 'CRH')} éditée le : ${printDate}<br>
      &emsp;— Réf : ${docRef}
    </div>
  </div>
</div>

<div class="crh-title-block">
  <div class="crh-title">${escapeHtml(options?.docTitle ?? "COMPTE-RENDU D'HOSPITALISATION — DIABÈTE")}</div>
  <div class="crh-subtitle">Du ${dateFmt(admission.dateEntree)} au ${dateFmt(sortie.dateSortie || admission.dateEntree)} (${dureeSejour})</div>
</div>

<!-- 1. ADMISSION -->
<div class="crh-section">
  <div class="crh-section-title">1. ADMISSION</div>
  <div class="crh-section-content">
    <div class="crh-para"><strong>Motif d'hospitalisation :</strong><br>${hasText(admission.motifHospitalisation) ? admission.motifHospitalisation : 'Non renseigné'}</div>
  </div>
</div>

<!-- 2. HISTOIRE RÉCENTE DE LA MALADIE -->
<div class="crh-section">
  <div class="crh-section-title">2. HISTOIRE RÉCENTE DE LA MALADIE</div>
  <div class="crh-section-content">
    <div class="crh-para"><strong>Histoire récente de la maladie :</strong><br>${hasText(bilanInitial.histoireRecent) ? bilanInitial.histoireRecent : 'Non renseigné'}</div>
  </div>
</div>

<!-- 3. MODE DE VIE / CONTEXTE SOCIAL -->
<div class="crh-section">
  <div class="crh-section-title">3. MODE DE VIE / CONTEXTE SOCIAL</div>
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
    ${hasText(modeVieAtcd.commentaireVie) ? `<div class="crh-para"><strong>Commentaire :</strong><br><div class="crh-rich">${richHtml(modeVieAtcd.commentaireVie)}</div></div>` : ''}
  </div>
</div>

<!-- 4. TOXIQUES / ADDICTIONS -->
<div class="crh-section">
  <div class="crh-section-title">4. TOXIQUES / ADDICTIONS</div>
  <div class="crh-section-content">
    ${hasText((modeVieAtcd as any).tabagismeDetail) ? `<div class="crh-para"><strong>Tabac :</strong><br>${na(modeVieAtcd.tabagisme)}<br><div class="crh-rich">${richHtml((modeVieAtcd as any).tabagismeDetail)}</div></div>` : `<div class="crh-field"><span class="crh-label">Tabac</span><div class="crh-value">${na(modeVieAtcd.tabagisme)}</div></div>`}
    ${hasText(modeVieAtcd.alcoolDetail) ? `<div class="crh-para"><strong>Alcool :</strong><br>${modeVieAtcd.alcool ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}<br><div class="crh-rich">${richHtml(modeVieAtcd.alcoolDetail)}</div></div>` : `<div class="crh-field"><span class="crh-label">Alcool</span><div class="crh-value">${modeVieAtcd.alcool ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</div></div>`}
    ${hasText(modeVieAtcd.cannabisDetail) ? `<div class="crh-para"><strong>Cannabis :</strong><br>${modeVieAtcd.cannabis ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}<br><div class="crh-rich">${richHtml(modeVieAtcd.cannabisDetail)}</div></div>` : `<div class="crh-field"><span class="crh-label">Cannabis</span><div class="crh-value">${modeVieAtcd.cannabis ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</div></div>`}
    <div class="crh-field"><span class="crh-label">Date évaluation</span><span class="crh-value">Non renseigné</span></div>
  </div>
</div>

<!-- 5. ALLERGIES -->
<div class="crh-section">
  <div class="crh-section-title">5. ALLERGIES</div>
  <div class="crh-section-content">
    <p class="crh-para">${allergiesHtml}</p>
  </div>
</div>

<!-- 6. ANTÉCÉDENTS -->
<div class="crh-section">
  <div class="crh-section-title">6. ANTÉCÉDENTS</div>
  <div class="crh-section-content">
    ${antecedentsHtml}
  </div>
</div>

<!-- 7. DIABÈTE -->
<div class="crh-section">
  <div class="crh-section-title">7. DIABÈTE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date diagnostic</span><span class="crh-value">${monthFmt(ficheDiabete.dateDiagnostic)}${ficheDiabete.dateDiagnostic ? ` (évolution : ${dureeDiabete})` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Poids historique</span><span class="crh-value">${poidsHtml}</span></div>
    <div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">${ficheDiabete.hba1c != null ? `${ficheDiabete.hba1c} % ${ficheDiabete.hba1cDate ? `(${dateFmt(ficheDiabete.hba1cDate)})` : ''}` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Bilan lipidique</span><span class="crh-value">HDL ${ficheDiabete.hdl != null ? ficheDiabete.hdl + ' mmol/L' : '—'} / LDL ${ficheDiabete.ldl != null ? ficheDiabete.ldl + ' mmol/L' : '—'} / TG ${ficheDiabete.triglycerides != null ? ficheDiabete.triglycerides + ' mmol/L' : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Fonction rénale</span><span class="crh-value">Créatininémie : ${ficheDiabete.creatininemie != null ? `${ficheDiabete.creatininemie} µmol/L` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Rétinopathie</span><span class="crh-value">${s(ficheDiabete.retinopathie || '—')}</span></div>
    <div class="crh-field"><span class="crh-label">Neuropathie</span><span class="crh-value">${ficheDiabete.neuropathie ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Grade podologique</span><div class="crh-value">${ficheDiabete.podologiqueGrade != null ? s(ficheDiabete.podologiqueGrade) : '—'}${ficheDiabete.amputation ? `${ficheDiabete.podologiqueGrade != null ? ' — ' : ''}<span class="crh-alert">Amputation</span>` : ''}</div></div>${hasText(ficheDiabete.amputationDetail) ? `<div class="crh-para"><strong>Amputation :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.amputationDetail)}</div></div>` : ''}
    <div class="crh-field"><span class="crh-label">Insuffisance cardiaque</span><span class="crh-value">${ficheDiabete.insuffisanceCardiaque ? `<span class="badge-yes">Oui</span>${ficheDiabete.ntProBNP != null ? ` (NT-proBNP : ${ficheDiabete.ntProBNP} pg/mL)` : ''}` : '<span class="badge-no">Non</span>'}</span></div>
    ${hasText(ficheDiabete.ischemicCritique) ? `<div class="crh-para"><strong>AOMI :</strong><br>${ficheDiabete.aomi ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}<br><div class="crh-rich">${richHtml(ficheDiabete.ischemicCritique)}</div></div>` : `<div class="crh-field"><span class="crh-label">AOMI</span><div class="crh-value">${ficheDiabete.aomi ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</div></div>`}
  </div>
</div>

<!-- 8. TRAITEMENT À L'ENTRÉE -->
<div class="crh-section">
  <div class="crh-section-title">8. TRAITEMENT À L'ENTRÉE</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(traitementEntree) ? traitementEntree : 'Non renseigné'}</div>
  </div>
</div>

<!-- 9. EXAMEN CLINIQUE À L'ENTRÉE -->
<div class="crh-section">
  <div class="crh-section-title">9. EXAMEN CLINIQUE À L'ENTRÉE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Score de Glasgow</span><span class="crh-value">${glasgowText} (Y:${glaYeux} V:${glaVerbale} M:${glaMotrice})</span></div>
${(bilanInitial as any).glasgowHistory?.length ? `
<p class="crh-para" style="margin-top:8px;"><strong>Historique des évaluations :</strong></p>
<table class="crh-table">
  <thead><tr><th>Date</th><th>Ouverture yeux</th><th>Réponse verbale</th><th>Réponse motrice</th><th>Score</th></tr></thead>
  <tbody>${(bilanInitial as any).glasgowHistory.map((e: any) => {
    const score = (e.ouvertureYeux || 0) + (e.reponseVerbale || 0) + (e.reponseMotrice || 0)
    return `<tr><td>${dateFmt(e.date)}</td><td>${e.ouvertureYeux}</td><td>${e.reponseVerbale}</td><td>${e.reponseMotrice}</td><td>${score}/15</td></tr>`
  }).join('')}</tbody>
</table>` : ''}
    <div class="crh-field"><span class="crh-label">Score de douleur à l'entrée</span><span class="crh-value">${scoreDouleur != null && scoreDouleur !== '' ? `${scoreDouleur} / 10` : 'Non renseigné'}</span></div>
${(bilanInitial as any).douleurHistory?.length ? `
<p class="crh-para" style="margin-top:8px;"><strong>Historique des mesures :</strong></p>
<table class="crh-table">
  <thead><tr><th>Date</th><th>Score</th></tr></thead>
  <tbody>${(bilanInitial as any).douleurHistory
    .slice()
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
    .map((e: any) => `<tr><td>${dateFmt(e.date)}</td><td>${e.score} / 10</td></tr>`)
    .join('')}</tbody>
</table>` : ''}
    <div class="crh-field"><span class="crh-label">Constantes</span><span class="crh-value">
      TA : ${examenPhysique.taSystolique != null ? `${examenPhysique.taSystolique}/${examenPhysique.taDiastolique || '?'}` : '—'} mmHg
      &ensp;|&ensp; FC : ${examenPhysique.frequenceCardiaque != null ? `${examenPhysique.frequenceCardiaque} /min` : '—'}
      &ensp;|&ensp; T° : ${examenPhysique.temperature != null ? `${examenPhysique.temperature} °C` : '—'}
      &ensp;|&ensp; Glycémie : ${examenPhysique.glycemie != null ? `${examenPhysique.glycemie} g/L` : '—'}
      &ensp;|&ensp; Cétominurie : ${examenPhysique.cetonurie ?? '—'}
      &ensp;|&ensp; Glucosurie : ${examenPhysique.glucosurie ?? '—'}
      &ensp;|&ensp; Cétonémie : ${examenPhysique.cetonemie != null ? `${examenPhysique.cetonemie} mmol/L` : '—'}
      &ensp;|&ensp; Poids : ${examenPhysique.poids != null ? `${examenPhysique.poids} kg` : '—'}
      &ensp;|&ensp; Taille : ${examenPhysique.taille != null ? `${examenPhysique.taille} cm` : '—'}
      &ensp;|&ensp; IMC : ${imcVital != null ? `${imcVital} kg/m²` : '—'}
    </span></div>
    <div class="crh-field"><span class="crh-label">Examen podologique</span><span class="crh-value">${na(ficheDiabete.podologiqueGrade != null ? `Grade ${ficheDiabete.podologiqueGrade}` : null)}</span></div>
${(bilanInitial as any).vitalSignsHistory?.length ? `
<p class="crh-para" style="margin-top:8px;"><strong>Historique des mesures :</strong></p>
<table class="crh-table">
  <thead><tr><th>Date</th><th>TA (mmHg)</th><th>FC (bpm)</th><th>T° (°C)</th><th>Glycémie (g/L)</th><th>Cétominurie</th><th>Glucosurie</th><th>Cétonémie (mmol/L)</th><th>SaO₂ (%)</th><th>Diurèse (ml)</th></tr></thead>
  <tbody>${(bilanInitial as any).vitalSignsHistory.map((e: any) => 
    `<tr><td>${dateTimeFmt(e.date)}</td><td>${e.taSystolique != null ? `${e.taSystolique}/${e.taDiastolique ?? '?'}` : '—'}</td><td>${e.frequenceCardiaque ?? '—'}</td><td>${e.temperature ?? '—'}</td><td>${e.glycemie ?? '—'}</td><td>${e.cetonurie ?? '—'}</td><td>${e.glucosurie ?? '—'}</td><td>${e.cetonemie ?? '—'}</td><td>${e.saO2 ?? '—'}</td><td>${e.diurese ?? '—'}</td></tr>`
  ).join('')}</tbody>
</table>` : ''}
    <div class="crh-para"><strong>Examen physique :</strong><br>${hasText(examenPhysiqueTexte) ? examenPhysiqueTexte : 'Non renseigné'}</div>
  </div>
</div>

<!-- 10. EXAMENS COMPLÉMENTAIRES -->
<div class="crh-section">
  <div class="crh-section-title">10. EXAMENS COMPLÉMENTAIRES</div>
  <div class="crh-section-content">
    ${imagerieTestsHtml ? `<p class="crh-para" style="margin-top:8px;"><strong>Imagerie / Test :</strong></p>${imagerieTestsHtml}` : ''}
    ${bilanBioHtml}
  </div>
</div>

<!-- 11. ÉVOLUTION ET AVIS -->
<div class="crh-section">
  <div class="crh-section-title">11. ÉVOLUTION ET AVIS</div>
  <div class="crh-section-content">
    ${evolutionMedicale.journalEvolution ? `<p class="crh-para"><strong>Journal d'évolution :</strong></p><div class="crh-rich" style="background:#f7f9fc;padding:8px 10px;border-left:3px solid #1a3c6e;font-size:9.5pt;white-space:pre-wrap;margin:4px 0;">${evolutionMedicale.journalEvolution}</div>` : ''}
    ${evolutionAvisHtml ? `<div class="crh-ord-subtitle">Avis</div>${evolutionAvisHtml}` : ''}
  </div>
</div>

<!-- 12. CONCLUSION À L'ENTRÉE -->
<div class="crh-section">
  <div class="crh-section-title">12. CONCLUSION À L'ENTRÉE</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(bilanInitial.conclusionEntree) ? bilanInitial.conclusionEntree : 'Non renseigné'}</div>
  </div>
</div>

<!-- 13. PROJET DE SOIN PENDANT L'HOSPITALISATION -->
<div class="crh-section">
  <div class="crh-section-title">13. PROJET DE SOIN PENDANT L'HOSPITALISATION</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(projetSoin) ? projetSoin : 'Non renseigné'}</div>
  </div>
</div>

${ordonnanceHtml}

<!-- 15. SORTIE -->
<div class="crh-section">
  <div class="crh-section-title">15. SORTIE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date de sortie</span><span class="crh-value">${dateFmt(sortie.dateSortie)}</span></div>
    <div class="crh-field"><span class="crh-label">Destination</span><span class="crh-value">${na(sortie.destinationSortie)}</span></div>
    ${sortie.infoPatientFamille ? `<p class="crh-para"><span class="badge-yes">✓</span> Information du patient / famille</p>` : ''}
    ${sortie.produitsSanguins ? `<p class="crh-para"><span class="badge-yes">✓</span> Administration de produits sanguins</p>` : ''}
    ${sortie.bmrBhre ? `<p class="crh-para"><span class="crh-alert">⚠</span> Porteur / Contact BMR ou BHRe</p>` : ''}
    ${hasText(sortie.conclusionSortie) ? `<div class="crh-para"><strong>Conclusion / Synthèse de sortie :</strong><br><div class="crh-rich">${richHtml(sortie.conclusionSortie)}</div></div>` : ''}
    ${rdvHtml ? `
    <p class="crh-para" style="margin-top:6px;"><strong>Rendez-vous de suivi :</strong></p>
    <table class="crh-table">
      <thead><tr><th>Date / Heure</th><th>Intitulé</th><th>Lieu / Praticien</th></tr></thead>
      <tbody>${rdvHtml}</tbody>
    </table>` : ''}
  </div>
</div>

${annexeHtml}
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
    <strong>Responsable</strong><br>${s(admission.interneIPANom) || '—'}
  </div>
</div>

</div>
</body></html>`
}

export function generateClinicalDocumentHtml(params: {
  title: string
  formSchema: { key?: string; name?: string; label: string; type: string }[]
  formData: Record<string, any>
  patient?: { nom?: string; prenom?: string; date_naissance?: string; nip?: string; adresse?: string; region?: string } | null
  hospital?: any
  logo?: string | null
  signedAt?: string
  signedByName?: string
}): string {
  const { title, formSchema, formData, patient, hospital, signedAt, signedByName } = params
  const logo = params.logo ?? null

  const dateFmt = (d: string) => d ? new Date(d.includes('T') ? d : `${d.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : '—'
  const now = new Date()
  const printDate = now.toLocaleDateString('fr-FR')
  const printTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })

  const patientIdentity = patient && (patient.nom || patient.prenom)
    ? `${(patient.nom || '').toUpperCase()} ${patient.prenom || ''}`.trim()
    : ''

  const logoHtml = logo
    ? `<img src="${logo}" style="height:48px;width:auto;margin:0 0 6px;flex-shrink:0;" alt="Logo établissement" />`
    : ''

  const humanizeKey = (k: string): string =>
    k
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase())

  const lookupOption = (field: any, value: any): string | null => {
    const options = field?.options
    if (!Array.isArray(options)) return null
    const found = options.find((o: any) => String(o.value) === String(value))
    return found && found.label ? String(found.label) : null
  }

  const formatValue = (value: any, field: any): string => {
    if (value == null || value === '') return '—'
    if (Array.isArray(value)) {
      if (value.length === 0) return '—'
      return value
        .map((v) => lookupOption(field, v) ?? formatValue(v, {}))
        .join('<br>')
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value).filter(([, v]) => v != null && v !== '' && v !== false)
      if (entries.length === 0) return '—'
      return entries
        .map(([k, v]) => `<strong>${escapeHtml(humanizeKey(k))} :</strong> ${formatValue(v, {})}`)
        .join('<br>')
    }
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    const optionLabel = lookupOption(field, value)
    if (optionLabel) return escapeHtml(optionLabel)
    const str = String(value)
    if (field.type === 'date' || /^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str.includes('T') ? str : `${str.slice(0, 10)}T00:00:00`)
      if (!Number.isNaN(d.getTime())) return escapeHtml(d.toLocaleDateString('fr-FR'))
    }
    return escapeHtml(str)
  }

  const fieldsHtml = formSchema
    .map((field) => {
      const fieldKey = field.key ?? field.name ?? ''
      if (!fieldKey) return ''
      const valueHtml = formatValue(formData[fieldKey], field)
      return `<div class="crh-field"><span class="crh-label">${escapeHtml(field.label || humanizeKey(fieldKey))}</span><span class="crh-value">${valueHtml}</span></div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 15mm 22mm 15mm;
    @bottom-center {
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
  .crh-page { width: 210mm; min-height: 297mm; padding: 18mm 15mm 22mm; box-sizing: border-box; margin: 0 auto; }
  @media print { .crh-page { width: auto; min-height: auto; padding: 0; margin: 0; } }
  .crh-hdr { display: flex; justify-content: space-between; margin-bottom: 10px; }
  .crh-hdr-left { font-size: 9pt; color: #333; flex: 1; }
  .crh-hdr-left .rep { font-size: 11pt; font-weight: 700; color: #1a3c6e; letter-spacing: 0.5px; }
  .crh-hdr-left .devise { font-size: 9pt; font-weight: 600; color: #666; }
  .crh-hdr-left .separator { font-size: 10pt; color: #aaa; margin: 3px 0; }
  .crh-hdr-left .inst-name { font-size: 12pt; font-weight: 700; color: #1a3c6e; margin-top: 4px; }
  .crh-hdr-left .inst-detail { font-size: 8.5pt; color: #555; margin-top: 1px; }
  .crh-hdr-right { font-size: 9pt; color: #222; text-align: right; min-width: 240px; padding-left: 20px; }
  .crh-hdr-right .pat-name { font-size: 11pt; font-weight: 700; color: #1a3c6e; }
  .crh-hdr-right .pat-addr { font-size: 8.5pt; color: #555; }
  .crh-hdr-right .pat-meta { font-size: 8.5pt; color: #444; margin-top: 4px; line-height: 1.5; }
  .crh-title-block { text-align: center; margin: 12px 0 10px; padding: 6px 0; border-top: 2px solid #1a3c6e; border-bottom: 2px solid #1a3c6e; }
  .crh-title { font-size: 14pt; font-weight: 700; color: #1a3c6e; letter-spacing: 0.5px; }
  .crh-subtitle { font-size: 9pt; color: #555; margin-top: 2px; }
  .crh-section { page-break-inside: avoid; margin-top: 12px; }
  .crh-section-title { font-size: 10.5pt; font-weight: 700; color: #1a3c6e; border-left: 3px solid #1a3c6e; padding: 2px 0 2px 8px; margin: 0 0 6px; }
  .crh-section-content { padding-left: 12px; }
  .crh-field { display: flex; margin-bottom: 4px; font-size: 9.5pt; line-height: 1.5; }
  .crh-label { font-weight: 600; color: #555; min-width: 180px; flex-shrink: 0; }
  .crh-value { color: #222; flex: 1; white-space: pre-line; }
  .signature-block { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; }
  .signature-col { font-size: 9.5pt; line-height: 1.6; }
  .signature-col strong { color: #1a3c6e; }
  @media print {
    body { margin: 0; padding: 0; }
    .crh-section { page-break-inside: avoid; }
  }
</style></head><body>

<div class="crh-page">
<div class="crh-hdr">
  <div class="crh-hdr-left">
    ${logoHtml}
    <div class="rep">RÉPUBLIQUE DE GUINÉE</div>
    <div class="devise">Travail — Justice — Solidarité</div>
    <div class="separator">✶ ✶ ✶</div>
    <div class="inst-name">${escapeHtml(hospital?.name || 'Établissement de Santé')}</div>
    ${hospital?.address || hospital?.city ? `<div class="inst-detail">${escapeHtml([hospital.address, hospital.city].filter(Boolean).join(' – '))}</div>` : ''}
    ${hospital?.phone ? `<div class="inst-detail">Tél : ${escapeHtml(hospital.phone)}</div>` : ''}
    ${hospital?.email ? `<div class="inst-detail">Email : ${escapeHtml(hospital.email)}</div>` : ''}
    ${hospital?.regNumber ? `<div class="inst-detail">N° agrément : ${escapeHtml(hospital.regNumber)}</div>` : ''}
  </div>
  <div class="crh-hdr-right">
    ${patientIdentity ? `<div class="pat-name">${escapeHtml(patientIdentity)}</div>` : ''}
    ${patient?.adresse ? `<div class="pat-addr">${escapeHtml(patient.adresse)}</div>` : ''}
    ${patient?.date_naissance ? `<div class="pat-meta">Né(e) le : ${dateFmt(patient.date_naissance)}</div>` : ''}
    ${patient?.nip ? `<div class="pat-meta">IPP : ${escapeHtml(patient.nip)}</div>` : ''}
  </div>
</div>

<div class="crh-title-block">
  <div class="crh-title">${escapeHtml(title)}</div>
  <div class="crh-subtitle">Édité le ${printDate} à ${printTime}</div>
</div>

<!-- CONTENU -->
<div class="crh-section">
  <div class="crh-section-title">DÉTAILS DU DOCUMENT</div>
  <div class="crh-section-content">
    ${fieldsHtml || '<div class="crh-para">Aucune donnée saisie</div>'}
  </div>
</div>

<!-- SIGNATURES -->
<div class="signature-block">
  <div class="signature-col">
    <strong>Responsable</strong><br>
    ${signedByName ? escapeHtml(signedByName) : '&nbsp;'}
  </div>
  <div class="signature-col">
    <strong>Date de signature</strong><br>
    ${signedAt ? dateFmt(signedAt) : '&nbsp;'}
  </div>
  <div class="signature-col">
    <strong>Signature</strong><br>&nbsp;
  </div>
</div>

</div>
</body></html>`
}

export function generateOrdonnanceHtml(params: {
  clinique: { logoUrl: string | null }
  medecin: { nom: string; prenom?: string; specialite: string; numeroOrdre: string }
  structure: { nom: string; ville: string; adresse: string; telephone: string; numeroAgrement: string }
  patient: { civilite: string; nom: string; prenom: string; numeroDossier: string; pieceIdentite?: string; dateNaissance: string; age: number; poids?: number; taille?: number; traitementChronique?: boolean }
  prescriptions: Array<{ nomMedicament: string; posologie: string; reglesConditionnelles?: string[]; dureeType?: 'courte' | 'longue' }>
  dispositifsMedicaux: Array<{ nom: string; quantiteFrequence: string }>
  dateEmission: string
  heureEmission: string
  numeroOrdonnance: string
  legalNotice: string
  barcodes: { ordreSvg: string; agrementSvg: string }
  qrCodes: { dossierSvg: string; notices?: Array<{ medicament: string; svg: string; sousTitre: string; url?: string }> }
}): string {
  const {
    clinique, medecin, structure, patient,
    prescriptions, dispositifsMedicaux,
    dateEmission, heureEmission, numeroOrdonnance, legalNotice,
    barcodes, qrCodes,
  } = params

  // ── Logo ──
  const logoHtml = clinique.logoUrl
    ? `<img src="${clinique.logoUrl}" style="max-height:60px;max-width:120px;width:auto;height:auto;display:block;" alt="Logo clinique" />`
    : ''

  // ── Patient display name ──
  const patientFullName = `${escapeHtml(patient.civilite)} ${escapeHtml(patient.prenom)} ${escapeHtml(patient.nom.toUpperCase())}`

  // ── Check for QR notices sidebar ──
  const hasQrNotices = qrCodes.notices && qrCodes.notices.length > 0

  // ── Check insulin mention ──
  const hasInsulin = prescriptions.some(p =>
    p.nomMedicament.toLowerCase().includes('insuline')
  )

  // ── Prescriptions HTML (grouped by duration type) ──
  const renderPrescriptionItem = (p: { nomMedicament: string; posologie: string; reglesConditionnelles?: string[] }) => {
    const nameHtml = escapeHtml(p.nomMedicament.toUpperCase())
    const posologieHtml = escapeHtml(p.posologie)
    const reglesHtml = p.reglesConditionnelles && p.reglesConditionnelles.length > 0
      ? `<div style="font-weight:bold;margin-top:2px;">**** ${p.reglesConditionnelles.map(r => richHtml(r)).join(' \u2014 ')}</div>`
      : ''
    return `
      <div style="margin-bottom:10px;">
        <div><span style="font-weight:bold;">${nameHtml}</span> : ${posologieHtml}</div>
        ${reglesHtml}
      </div>`
  }

  const renderPrescriptionSection = (title: string, items: Array<{ nomMedicament: string; posologie: string; reglesConditionnelles?: string[]; dureeType?: 'courte' | 'longue' }>) => items.length > 0
    ? `<div style="font-weight:bold;margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(title)}</div><div style="padding-left:20px;">${items.map(renderPrescriptionItem).join('')}</div>`
    : ''

  const courteDuree = prescriptions.filter(p => (p.dureeType ?? 'courte') === 'courte')
  const longueDuree = prescriptions.filter(p => (p.dureeType ?? 'courte') === 'longue')

  const prescriptionsHtml = prescriptions.length > 0
    ? `${renderPrescriptionSection('Traitement de courte dur\u00e9e', courteDuree)}${renderPrescriptionSection('Traitement de longue dur\u00e9e', longueDuree)}`
    : '<div style="font-style:italic;color:#999;">Aucun m\u00e9dicament prescrit</div>'

  // ── Dispositifs médicaux HTML ──
  const dispositifsHtml = dispositifsMedicaux.length > 0
    ? `<div style="margin-top:12px;margin-bottom:4px;font-weight:bold;">DISPOSITIFS MEDICAUX</div>
       ${dispositifsMedicaux.map(d => `
      <div style="margin-bottom:4px;">
        <span style="font-weight:bold;">${escapeHtml(d.nom)}</span> : ${escapeHtml(d.quantiteFrequence)}
      </div>`).join('')}`
    : ''

  // ── QR notices sidebar ──
  const noticesHtml = hasQrNotices
    ? qrCodes.notices!.map(n => `
      <div style="margin-bottom:8px;text-align:center;">
        <div>${n.svg}</div>
        <div style="font-weight:bold;margin-top:2px;">${escapeHtml(n.medicament)}</div>
        <div style="font-style:italic;">${escapeHtml(n.sousTitre)}</div>
      </div>`).join('')
    : ''

  const sidebarHtml = hasQrNotices ? `
    <div class="prescription-sidebar">
      ${noticesHtml}
      <div style="font-style:italic;margin-top:4px;">Vid\u00e9os de d\u00e9monstration</div>
    </div>` : ''

  // ── Doctor barcode block ──
  const ordreBarcodeHtml = barcodes.ordreSvg
    ? `<div style="margin-top:4px;">${barcodes.ordreSvg}</div>`
    : ''

  // ── Structure barcode block ──
  const agrementBarcodeHtml = barcodes.agrementSvg
    ? `<div style="margin-top:4px;">${barcodes.agrementSvg}</div>`
    : ''

  // ── Patient QR code block ──
  const dossierQrHtml = qrCodes.dossierSvg
    ? `<div style="margin:4px 0;">${qrCodes.dossierSvg}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .orange-band { position: fixed; top: 0; right: 0; width: 6px; height: 100vh; background-color: #D9531E; }

  .cols-box { display: flex; border: 1px solid #000; }
  .cols-box .col { flex: 1; padding: 8px; }
  .cols-box .col:first-child { border-right: 1px solid #000; }

  .patient-box { display: flex; border: 1px solid #000; }
  .patient-left { flex: 0 0 20%; padding: 8px; border-right: 1px solid #000; text-align: center; }
  .patient-center { flex: 0 0 55%; padding: 8px; border-right: 1px solid #000; }
  .patient-right { flex: 1; padding: 8px; font-size: 0.85em; }

  .med-box { border: 1px solid #000; border-radius: 8px; text-align: center; padding: 6px 12px; margin: 4px auto; width: 330px; background: #F0F0F0; }
  .pill-icon { display: inline-block; width: 32px; height: 16px; border-radius: 8px; background: linear-gradient(to right, #D9531E 50%, #FFF 50%); border: 1px solid #000; }

  .prescription-area { display: flex; position: relative; }
  .prescription-main { flex: 1; }
  .prescription-sidebar { width: 120px; border-left: 1px solid #000; padding: 6px; font-size: 0.75em; }

  .hr { border: none; border-top: 1px solid #000; margin: 0; padding: 0; }

  .disclaimer { font-size: 0.75em; color: #333; padding: 4px 0; }
  .page-info { text-align: right; font-size: 0.8em; margin-top: 4px; }
</style></head><body>

<div class="orange-band"></div>

<div class="page" style="width:210mm;margin:0 auto;padding:15mm;box-sizing:border-box;">

  <!-- ===== HEADER ===== -->
  <div style="display:flex;align-items:flex-start;margin-bottom:4px;">
    <div style="flex:0 0 auto;margin-right:12px;">
      ${logoHtml}
    </div>
    <div style="flex:1;text-align:center;">
      <div style="font-size:28px;font-weight:bold;margin:0;line-height:1.2;">Ordonnance m\u00e9dicale</div>
      <div style="font-size:12px;margin-top:2px;">${escapeHtml(structure.nom)} \u2014 ${escapeHtml(structure.ville)}, Guin\u00e9e</div>
    </div>
    <div style="flex:0 0 auto;text-align:right;font-size:0.75em;min-width:140px;">
      <div style="font-weight:bold;">R\u00e9f. :</div>
      <div>${escapeHtml(numeroOrdonnance)}</div>
    </div>
  </div>
  <hr class="hr">

  <!-- ===== DOCTOR & STRUCTURE ===== -->
  <div class="cols-box">
    <div class="col" style="text-align:center;">
      <div style="font-weight:bold;font-size:0.95em;">Identification du prescripteur</div>
      <div style="font-weight:bold;margin:8px 0;">Docteur ${escapeHtml(medecin.nom)}</div>
      <div>${escapeHtml(medecin.specialite)}</div>
      <div style="margin-top:4px;font-size:0.85em;">N\u00b0 Ordre ONMG : ${escapeHtml(medecin.numeroOrdre)}</div>
      ${ordreBarcodeHtml}
    </div>
    <div class="col" style="text-align:center;">
      <div style="font-weight:bold;font-size:0.95em;">Identification de l'\u00e9tablissement</div>
      <div style="margin:8px 0;">${escapeHtml(structure.nom)}</div>
      <div>${escapeHtml(structure.adresse)}</div>
      <div>${escapeHtml(structure.telephone)}</div>
      <div style="margin-top:4px;font-size:0.85em;">N\u00b0 agr\u00e9ment MSHP : ${escapeHtml(structure.numeroAgrement)}</div>
      ${agrementBarcodeHtml}
    </div>
  </div>
  <hr class="hr">

  <!-- ===== PATIENT ===== -->
  <div class="patient-box">
    <div class="patient-left">
      <div style="font-weight:bold;font-size:0.85em;">N\u00b0 dossier patient</div>
      <div style="font-size:0.95em;">${escapeHtml(patient.numeroDossier)}</div>
      ${dossierQrHtml}
    </div>
    <div class="patient-center">
      <div style="text-align:center;font-weight:bold;">Identification du patient</div>
      <div style="font-weight:bold;font-size:1.15em;margin:8px 0;">${patientFullName}</div>
      ${patient.pieceIdentite
        ? `<div style="font-size:0.85em;">N\u00b0 pi\u00e8ce d\u2019identit\u00e9 / carnet de sant\u00e9 : ${escapeHtml(patient.pieceIdentite)}</div>`
        : ''}
    </div>
    <div class="patient-right">
      <div><strong>Ordonnance du</strong> ${escapeHtml(dateEmission)} &agrave; ${escapeHtml(heureEmission)}</div>
      <div style="margin-top:4px;"><strong>N\u00e9(e) le</strong> ${escapeHtml(patient.dateNaissance)}</div>
      <div><strong>\u00c2g\u00e9(e) de</strong> ${patient.age} ans</div>
      <div><strong>Poids :</strong> ${patient.poids != null ? `${patient.poids} kg` : '\u2014'} &nbsp; <strong>Taille :</strong> ${patient.taille != null ? `${patient.taille} cm` : '\u2014'}</div>
    </div>
  </div>
  <hr class="hr">

  <!-- ===== MEDICAMENTS ET DISPOSITIFS MEDICAUX BOX ===== -->
  <div class="med-box" style="margin:6px auto;">
    <div style="font-weight:bold;">M\u00c9DICAMENTS ET</div>
    <div style="font-weight:bold;">DISPOSITIFS M\u00c9DICAUX</div>
    <div style="margin-top:4px;"><span class="pill-icon"></span></div>
  </div>
  <hr class="hr">

  <!-- ===== PRESCRIPTION SECTION ===== -->
  <div style="text-align:center;padding:4px 0;">
    <div style="font-weight:bold;">Prescription m\u00e9dicale</div>
    ${patient.traitementChronique
      ? '<div style="font-style:italic;font-size:0.9em;">Traitement au long cours</div>'
      : ''}
  </div>
  <hr class="hr">

  <!-- ===== PRESCRIPTION ZONE ===== -->
  <div class="prescription-area">
    <div class="prescription-main">
      ${prescriptionsHtml}
      ${dispositifsHtml}
      ${hasInsulin
        ? '<div style="font-weight:bold;font-style:italic;margin-top:12px;">Les prescriptions d\u2019insuline (type et mat\u00e9riel) ne sont pas substituables.</div>'
        : ''}
    </div>
    ${sidebarHtml}
  </div>

  <hr class="hr">

  <!-- ===== FOOTER ===== -->
  <div class="disclaimer">
    ${escapeHtml(legalNotice)}
  </div>

  <div class="page-info">
    Page 1 / 1<br>
    S 3321 b
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

function hasText(v: any): boolean {
  if (v == null) return false
  const html = String(v)
  if (/<\s*img\b/i.test(html)) return true
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() !== ''
}

function richHtml(v: string | null | undefined): string {
  return hasText(v) ? String(v) : ''
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getUserDisplayName(user: any): string {
  const titlePrefix = user.specialties?.[0]?.title_prefix
  const title = titlePrefix || ''
  const nom = (user.nom || '').toUpperCase()
  const prenom = user.prenom || ''
  return [title, nom, prenom].filter(Boolean).join(' ')
}


