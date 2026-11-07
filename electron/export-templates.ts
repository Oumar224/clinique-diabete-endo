import { roleLabel } from './utils/role-labels'
import { commandeStatutLabel } from './utils/commande-statut'

/** Single source for HTML detection — mirrors `src/utils/rich-text.ts:isHtml` */
function isHtml(value: string | null | undefined): boolean {
  if (!value) return false
  return /<[a-z][^>]*>/i.test(String(value))
}

export function generateMedicalHeader(
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string },
  logoBase64: string | null,
  docTitle: string,
  docReference: string,
): string {
  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="height:65px;width:auto;margin-right:15px;flex-shrink:0;" alt="Logo établissement" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:56px;min-width:56px;padding:0 10px;margin-right:15px;flex-shrink:0;font-weight:800;font-size:22px;color:#fff;background:#1a5fb4;border-radius:8px;letter-spacing:1px;">CDE</div>`
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

export function generateFooter(): string {
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

export interface SoinsOrdonnanceItem {
  nom: string
  posologie: string
  nbSeances?: number
  objectifClinique?: string
  consignesSpecifiques?: string
  dispositifsMedicaux?: string
  professionnelCible?: string
}

export interface CrhOrdonnanceData {
  medicaments: Array<{ nom: string; posologie: string; dureeType?: 'courte' | 'longue'; quantite?: number }>
  soins: SoinsOrdonnanceItem[]
  examens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>
  avis: Array<{ label: string; detail?: string; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>
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

  // Pack-years ("paquets-année") — must stay in sync with the inline computation
  // in FicheDiabeteTab.vue (facteursPAOf); this bundle cannot import the renderer.
  const qteParJourOf = (rythme: unknown, qte: number): number | null => {
    if (rythme === 'j') return qte
    if (rythme === 'semaine') return qte / 7
    if (rythme === 'mois') return qte / 30
    return null
  }
  // Référence de fin pour durée d'exposition et PA : date d'entrée du dossier si
  // présente, sinon aujourd'hui — règle identique à dureeRefDate() dans FicheDiabeteTab.vue.
  const refExpo = (() => {
    const d = admission.dateEntree
    if (d && !isNaN(new Date(d.includes('T') ? d : `${d}T00:00:00`).getTime())) {
      return new Date(d.includes('T') ? d : `${d}T00:00:00`)
    }
    return new Date()
  })()
  // Durée d'exposition "X ans Y mois" (composant → export) ; '' quand la date de
  // début est absente ou postérieure à la référence (durée non rendue).
  const expoLabel = (dateDebut: string): string => {
    const begin = dateDebut ? String(dateDebut).split('-') : []
    if (begin.length < 2) return ''
    const by = parseInt(begin[0], 10)
    const bm = parseInt(begin[1], 10)
    if (isNaN(by) || isNaN(bm)) return ''
    let years = refExpo.getFullYear() - by
    let months = (refExpo.getMonth() + 1) - bm
    if (months < 0) { years--; months += 12 }
    if (years < 0) return ''
    const yTxt = years > 0 ? `${years} ${years > 1 ? 'ans' : 'an'}` : ''
    const mTxt = months > 0 ? `${months} mois` : ''
    return [yTxt, mTxt].filter(Boolean).join(' ')
  }
  const tabacPa = (() => {
    if (ficheDiabete.tabac !== 'Oui' || ficheDiabete.tabacQuantite == null || ficheDiabete.tabacQuantite <= 0) return null
    const qteJour = qteParJourOf(ficheDiabete.tabacDuree, ficheDiabete.tabacQuantite)
    if (qteJour == null) return null
    const begin = ficheDiabete.tabacDateDebut ? String(ficheDiabete.tabacDateDebut).split('-') : []
    if (begin.length < 2) return null
    const by = parseInt(begin[0], 10)
    const bm = parseInt(begin[1], 10)
    if (isNaN(by) || isNaN(bm)) return null
    let years = refExpo.getFullYear() - by
    let months = (refExpo.getMonth() + 1) - bm
    if (months < 0) { years--; months += 12 }
    if (years < 0) return null
    const annees = years + months / 12
    if (annees <= 0) return null
    let pa: number | null = null
    if (ficheDiabete.tabacUnite === 'cigarette') pa = (qteJour / 20) * annees
    else if (ficheDiabete.tabacUnite === 'paquet') pa = qteJour * annees
    return pa != null ? Math.round(pa * 10) / 10 : null
  })()
  const rythmeLabel = (rythme: unknown): string =>
    rythme === 'j' ? '/jour' : rythme === 'semaine' ? '/semaine' : rythme === 'mois' ? '/mois' : ''

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

  // « Dernier examen métabolique » — same selection logic as the read-only card
  // in FicheDiabeteTab.vue (src/utils/bio-results.ts), duplicated here because the
  // electron bundle cannot import renderer modules: most recent date wins; on equal
  // dates the LAST entry in the list wins. Keep both copies in sync.
  const bioNormParamName = (name: string): string =>
    String(name ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const isBioHbA1c = (name: string): boolean => {
    const n = bioNormParamName(name).replace(/[\s_]+/g, '')
    return /^hba1c$/.test(n) || n.includes('hba1c') || n.includes('hemoglobineglyquee')
  }
  const isBioLdl = (name: string): boolean => {
    const n = bioNormParamName(name).replace(/[\s_-]+/g, '')
    return /^ldl$/.test(n) || /^ldlc$/.test(n) || n.includes('ldl') || /lipoproteines?.*basse.*densite/.test(bioNormParamName(name))
  }
  const isBioHdl = (name: string): boolean => {
    const n = bioNormParamName(name).replace(/[\s_-]+/g, '')
    if (/^hdl$/.test(n) || /^hdlc$/.test(n) || n.includes('hdl')) return true
    return /lipoproteines?.*haute.*densite/.test(bioNormParamName(name))
  }
  const isBioTriglycerides = (name: string): boolean => /^trigly/.test(bioNormParamName(name))
  const bioLatestOf = (matcher: (name: string) => boolean): any => {
    let best: any = null
    let bestKey = -1
    let bestIndex = -1
    bioResultsList.forEach((r: any, i: number) => {
      if (!r || !r.parameterName || r.value == null || String(r.value).trim() === '') return
      if (!matcher(String(r.parameterName))) return
      let key = 0
      const raw = r.requestDate || r.filledAt || r.createdAt
      if (raw) {
        const sRaw = String(raw).trim()
        if (/^\d{4}-\d{2}-\d{2}/.test(sRaw)) {
          const iso = sRaw.replace(' ', 'T')
          const d = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`)
          key = isNaN(d.getTime()) ? 0 : d.getTime()
        } else {
          const ym = sRaw.match(/^(\d{4})-(\d{2})$/)
          const fallback = ym ? Date.UTC(Number(ym[1]), Number(ym[2]) - 1, 1) : new Date(sRaw).getTime()
          key = isNaN(Number(fallback)) ? 0 : fallback
        }
      }
      if (key > bestKey || (key === bestKey && i > bestIndex)) {
        best = r
        bestKey = key
        bestIndex = i
      }
    })
    return best
  }
  const bioDisplayRowOf = (r: any): string => {
    if (!r) return '—'
    const value = r.value != null ? String(r.value) : ''
    const unit = r.parameterUnit ? ` ${r.parameterUnit}` : ''
    const date = r.requestDate || r.filledAt || r.createdAt ? dateFmt(String(r.requestDate || r.filledAt || r.createdAt).replace(' ', 'T')) : ''
    return `${value}${unit}${date ? ` (${date})` : ''}`
  }
  const bioLatestRowsHtml = [
    ['HbA1c', isBioHbA1c],
    ['LDL-c', isBioLdl],
    ['HDL-c', isBioHdl],
    ['Triglycérides', isBioTriglycerides],
  ]
    .map(([label, matcher]) => `<div class="crh-field"><span class="crh-label">${label}</span><span class="crh-value">${bioDisplayRowOf(bioLatestOf(matcher as (name: string) => boolean))}</span></div>`)
    .join('')
  const hasBioLatest = bioResultsList.some((r: any) => {
    if (!r || !r.parameterName || r.value == null || String(r.value).trim() === '') return false
    const n = String(r.parameterName)
    return isBioHbA1c(n) || isBioLdl(n) || isBioHdl(n) || isBioTriglycerides(n)
  })
  const dernierExamenBioBlock = hasBioLatest
    ? `<p class="crh-para" style="margin-top:8px;"><strong>Dernier examen métabolique :</strong></p>${bioLatestRowsHtml}`
    : ''

  // ─── Traitement / Autosurveillance — parité avec FicheDiabeteTab.vue ────
  // Médicaments cochés (ADO/aGLP-1/INSULINE/POMPE) avec début MM/YYYY et durée
  // (années+mois pour ADO/aGLP-1/INSULINE via expoLabel ; années ENTIÈRES
  // révolues pour la POMPE), traitement habituel riche et autosurveillance.
  // Le bloc entier est vide quand rien n'est renseigné.
  const fdMeds: string[] = Array.isArray(ficheDiabete.medicaments) ? ficheDiabete.medicaments : []
  // Parité stricte avec `yearsElapsedSince` (FicheDiabeteTab.vue) : `number | null`
  // — null quand la date de début est invalid/invalide ou postérieure à la
  // référence ; jamais de durée négative. Le rendu teste `!= null && > 0` des
  // deux côtés (aucune parenthèse « (0 an) » n'est jamais émise).
  const pompeWholeYearsOf = (startYm: string): number | null => {
    const parts = startYm ? String(startYm).split('-') : []
    if (parts.length < 2) return null
    const sy = parseInt(parts[0], 10)
    const sm = parseInt(parts[1], 10)
    if (isNaN(sy) || isNaN(sm)) return null
    // Années entières révolues : le mois d'anniversaire n'étant pas encore
    // atteint (`sm > mois de la référence`), on retire une année — même règle
    // que dans le composant (mois identique → anniversaire révolu, ex. 2024-06
    // → réf. 2026-06 = 2 ans).
    const years = refExpo.getFullYear() - sy - (sm > refExpo.getMonth() + 1 ? 1 : 0)
    return years < 0 ? null : years
  }
  const medField = (label: string, value: string): string =>
    `<div class="crh-field"><span class="crh-label">${label}</span><span class="crh-value">${value}</span></div>`
  const medDetail = (dateDebut: string, type?: string): string => {
    const dur = expoLabel(dateDebut)
    return `${type ? `${s(type)} — ` : ''}depuis ${monthFmt(dateDebut)}${dur ? ` (${dur})` : ''}`
  }
  const medCommentBlock = (label: string, commentaire: string): string =>
    hasText(commentaire) ? `<p class="crh-para"><strong>${label} :</strong><br><div class="crh-rich">${richHtml(commentaire)}</div></p>` : ''
  const medRowsHtml: string[] = []
  if (fdMeds.includes('ADO') && ficheDiabete.adoDateDebut) {
    medRowsHtml.push(medField('ADO', medDetail(ficheDiabete.adoDateDebut)))
    medRowsHtml.push(medCommentBlock('ADO – commentaire', ficheDiabete.adoCommentaire))
  }
  if (fdMeds.includes('aGLP-1') && ficheDiabete.glp1DateDebut) {
    medRowsHtml.push(medField('aGLP-1', medDetail(ficheDiabete.glp1DateDebut)))
    medRowsHtml.push(medCommentBlock('aGLP-1 – commentaire', ficheDiabete.glp1Commentaire))
  }
  if (fdMeds.includes('INSULINE') && ficheDiabete.insulineDateDebut) {
    medRowsHtml.push(medField('INSULINE', medDetail(ficheDiabete.insulineDateDebut, ficheDiabete.insulineType)))
    medRowsHtml.push(medCommentBlock('Insuline – commentaire', ficheDiabete.insulineCommentaire))
  }
  if (fdMeds.includes('POMPE') && ficheDiabete.pompeDateDebut) {
    const pYears = pompeWholeYearsOf(ficheDiabete.pompeDateDebut)
    const detail = `${ficheDiabete.pompeType ? `${s(ficheDiabete.pompeType)} — ` : ''}depuis ${monthFmt(ficheDiabete.pompeDateDebut)}${pYears != null && pYears > 0 ? ` (${pYears} ${pYears > 1 ? 'ans' : 'an'})` : ''}`
    medRowsHtml.push(medField('POMPE', detail))
    medRowsHtml.push(medCommentBlock('Pompe – commentaire', ficheDiabete.pompeCommentaire))
  }
  const traitementHabituelBlock = hasText(ficheDiabete.traitementHabituel)
    ? `<p class="crh-para"><strong>Traitement habituel :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.traitementHabituel)}</div></p>`
    : ''
  const autosurveillanceRowsHtml: string[] = []
  if (ficheDiabete.surveillanceCapillaire) {
    autosurveillanceRowsHtml.push(`<div class="crh-field"><span class="crh-label">Autosurveillance capillaire</span><span class="crh-value">${ficheDiabete.surveillanceCapillaire === 'Oui' ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>`)
  }
  if (ficheDiabete.surveillanceMCG) {
    autosurveillanceRowsHtml.push(`<div class="crh-field"><span class="crh-label">Autosurveillance MCG</span><span class="crh-value">${ficheDiabete.surveillanceMCG === 'Oui' ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>`)
  }
  if (hasText(ficheDiabete.surveillanceCommentaire)) {
    autosurveillanceRowsHtml.push(`<p class="crh-para"><strong>Autosurveillance :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.surveillanceCommentaire)}</div></p>`)
  }
  const traitementBioBlock =
    medRowsHtml.length || traitementHabituelBlock || autosurveillanceRowsHtml.length
      ? `<p class="crh-para" style="margin-top:8px;"><strong>Traitement / Autosurveillance :</strong></p>${medRowsHtml.join('')}${traitementHabituelBlock}${autosurveillanceRowsHtml.join('')}`
      : ''

  const rdvHtml = (sortie.rdvSuivi || []).slice().sort((a: any, b: any) => a.date?.localeCompare(b.date) || 0).map((r: any) => `
    <tr>
      <td>${dateFmt(r.date)} ${r.heure ? s(r.heure) : ''}</td>
      <td>${s(r.intitule)}</td>
      <td>${s(r.lieuPraticien)}</td>
    </tr>
  `).join('')

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
    const isPlain = !isHtml(description)
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
  const renderOrdonnanceItem = (item: { nom: string; posologie: string; quantite?: number }) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    const quantite = typeof item.quantite === 'number' && Number.isFinite(item.quantite) ? ` · Qté : ${item.quantite}` : ''
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}${quantite}</div>`
  }
  const renderOrdonnanceMeta = (item: { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }): string => {
    const prescripteur = typeof item.prescripteur === 'string' ? item.prescripteur.trim() : ''
    const plannedDate = typeof item.plannedDate === 'string' ? item.plannedDate.trim() : ''
    const plannedHour = typeof item.plannedHour === 'number' && Number.isFinite(item.plannedHour) ? item.plannedHour : null
    const parts: string[] = []
    if (prescripteur) parts.push(`Prescrit par ${escapeHtml(prescripteur)}`)
    if (plannedDate || plannedHour != null) {
      if (plannedDate) {
        let formatted = plannedDate
        try {
          const f = dateFmt(plannedDate)
          if (f && f !== '—' && !/invalid/i.test(f)) formatted = f
        } catch { /* keep raw YYYY-MM-DD */ }
        const dateStr = escapeHtml(formatted)
        parts.push(plannedHour != null ? `Planifié le ${dateStr} (à ${String(plannedHour).padStart(2, '0')}:00)` : `Planifié le ${dateStr}`)
      } else {
        parts.push(`Planifié à ${String(plannedHour!).padStart(2, '0')}:00`)
      }
    }
    if (!parts.length) return ''
    return `<div style="font-size:12px;color:#444;padding-left:10px;">${parts.join(' · ')}</div>`
  }
  const renderOrdonnanceLabel = (item: { label: string; detail?: string; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }) => {
    const label = escapeHtml(item.label || '')
    const detail = item.detail
      ? sanitizeRichHtml(item.detail)
          .replace(/^<p[^>]*>\s*/i, '')
          .replace(/<\/p>\s*$/i, '')
          .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
      : ''
    if (!label && !detail) return ''
    const meta = renderOrdonnanceMeta(item)
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${label}</span>${detail ? ` : ${detail}` : ''}</div>${meta}`
  }
  const renderOrdonnanceRichDetail = (html: string): string =>
    sanitizeRichHtml(html)
      .replace(/^<p[^>]*>\s*/i, '')
      .replace(/<\/p>\s*$/i, '')
      .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
  const renderOrdonnanceSoinsItem = (item: SoinsOrdonnanceItem) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    const main = `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}</div>`
    const details: string[] = []
    if (item.nbSeances != null) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Nb s\u00e9ances :</span> ${escapeHtml(String(item.nbSeances))}</div>`)
    }
    if (hasText(item.objectifClinique)) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Objectif clinique :</span> ${renderOrdonnanceRichDetail(item.objectifClinique!)}</div>`)
    }
    if (hasText(item.consignesSpecifiques)) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Consignes sp\u00e9cifiques :</span> ${renderOrdonnanceRichDetail(item.consignesSpecifiques!)}</div>`)
    }
    if (item.dispositifsMedicaux) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Dispositifs &amp; Voies d\u2019abord :</span> ${escapeHtml(item.dispositifsMedicaux)}</div>`)
    }
    if (item.professionnelCible) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Professionnel cible :</span> ${escapeHtml(item.professionnelCible)}</div>`)
    }
    return main + details.join('')
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
  const renderExamensBlock = (examens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>): string => {
    if (!examens.length) return ''
    const hasKind = examens.some(e => e.kind === 'imagerie' || e.kind === 'laboratoire')
    // Compat : vieux items sans kind → rendu plat historique.
    if (!hasKind) return examens.map(renderOrdonnanceLabel).join('')
    const sansKind = examens.filter(e => e.kind !== 'imagerie' && e.kind !== 'laboratoire')
    const imagerie = examens.filter(e => e.kind === 'imagerie')
    const laboratoire = examens.filter(e => e.kind === 'laboratoire')
    const renderSub = (title: string, items: typeof examens): string => {
      const itemsHtml = items.map(renderOrdonnanceLabel).join('')
      if (!itemsHtml) return ''
      return `<div class="crh-ord-subtitle">${escapeHtml(title)}</div>${itemsHtml}`
    }
    return sansKind.map(renderOrdonnanceLabel).join('') + renderSub('Imagerie', imagerie) + renderSub('Laboratoire', laboratoire)
  }
  const ordonnanceBlocks = [
    { title: 'M\u00c9DICAMENTS', items: medicamentsHtml },
    { title: 'SOINS', items: (ordonnanceData.soins ?? []).map(renderOrdonnanceSoinsItem).join('') },
    { title: 'DEMANDES D\u2019EXAMENS', items: renderExamensBlock(ordonnanceData.examens ?? []) },
    { title: 'AVIS SP\u00c9CIALIS\u00c9S', items: (ordonnanceData.avis ?? []).map(renderOrdonnanceLabel).join('') },
  ]
  const ordonnanceBlocksHtml = ordonnanceBlocks
    .filter(b => b.items !== '')
    .map(b => `<div style="margin-bottom:8px;"><div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(b.title)}</div><div style="padding-left:16px;">${b.items}</div></div>`)
    .join('')
  const ordonnanceHtml = `
<!-- 14. ORDONNANCE -->
<div class="crh-section">
  <div class="crh-section-title">14. ORDONNANCE</div>
  <div class="crh-section-content">
    ${ordonnanceBlocksHtml || '<div class="crh-para">Non renseign\u00e9</div>'}
  </div>
</div>`

  const evolutionAvisRange = (evolutionMedicale.avisDateFrom && evolutionMedicale.avisDateTo)
    ? ` (${dateFmt(evolutionMedicale.avisDateFrom)} → ${dateFmt(evolutionMedicale.avisDateTo)})`
    : ''
  const evolutionAvisHtml = (evolutionMedicale.avis ?? [])
    .map((av: any) => {
      const date = av.date ? dateFmt(av.date) : ''
      const specialite = escapeHtml(av.specialite || '')
      const isPlain = !isHtml(av.motif)
      const motifHtml = hasText(av.motif)
        ? (isPlain
            ? escapeHtml(av.motif)
            : richHtml(av.motif)
                .replace(/^<p[^>]*>\s*/i, '')
                .replace(/<\/p>\s*$/i, '')
                .replace(/<\/p>\s*<p[^>]*>/gi, '<br>'))
        : ''
      if (!date && !specialite && !motifHtml) return ''
      const label = [date, specialite].filter(Boolean).join(' — ')
      return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${label}</span>${motifHtml ? ` : ${motifHtml}` : ''}</div>`
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
    font-size: 17px;
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
    font-size: 17px;
    line-height: 1.5;
  }
  .crh-rich {
    font-size: 17px;
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
    <div class="crh-para"><strong>Motif d'hospitalisation :</strong><br>${hasText(admission.motifHospitalisation) ? sanitizeRichHtml(admission.motifHospitalisation) : 'Non renseigné'}</div>
  </div>
</div>

<!-- 2. HISTOIRE RÉCENTE DE LA MALADIE -->
<div class="crh-section">
  <div class="crh-section-title">2. HISTOIRE RÉCENTE DE LA MALADIE</div>
  <div class="crh-section-content">
    <div class="crh-para"><strong>Histoire récente de la maladie :</strong><br>${hasText(bilanInitial.histoireRecent) ? sanitizeRichHtml(bilanInitial.histoireRecent) : 'Non renseigné'}</div>
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
    <div class="crh-field"><span class="crh-label">Type de diabète</span><span class="crh-value">${s(ficheDiabete.typeDiabete === 'Autre' && ficheDiabete.typeDiabeteAutre ? `Autre (${ficheDiabete.typeDiabeteAutre})` : (ficheDiabete.typeDiabete || ''))}</span></div>
    ${hasText(ficheDiabete.circonstanceDecouverte) ? `<div class="crh-para"><strong>Circonstances de découverte :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.circonstanceDecouverte)}</div></div>` : ''}
    <div class="crh-field"><span class="crh-label">Anticorps</span><span class="crh-value">${s(ficheDiabete.anticorps || '')}</span></div>
    ${hasText(ficheDiabete.typeAnticorps) ? `<div class="crh-para"><strong>Type d'anticorps :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.typeAnticorps)}</div></div>` : ''}
    ${dernierExamenBioBlock}${traitementBioBlock}
    <div class="crh-field"><span class="crh-label">Fonction rénale</span><span class="crh-value">Créatininémie : ${ficheDiabete.creatininemie != null ? `${ficheDiabete.creatininemie} µmol/L` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Rétinopathie</span><span class="crh-value">${s(ficheDiabete.retinopathie || '—')}</span></div>
    <div class="crh-field"><span class="crh-label">Neuropathie</span><span class="crh-value">${ficheDiabete.neuropathie ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
    <div class="crh-field"><span class="crh-label">Grade podologique</span><div class="crh-value">${ficheDiabete.podologiqueGrade != null ? s(ficheDiabete.podologiqueGrade) : '—'}${ficheDiabete.amputation ? `${ficheDiabete.podologiqueGrade != null ? ' — ' : ''}<span class="crh-alert">Amputation</span>` : ''}</div></div>${hasText(ficheDiabete.amputationDetail) ? `<div class="crh-para"><strong>Amputation :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.amputationDetail)}</div></div>` : ''}
    <div class="crh-field"><span class="crh-label">Insuffisance cardiaque</span><span class="crh-value">${ficheDiabete.insuffisanceCardiaque ? `<span class="badge-yes">Oui</span>${ficheDiabete.ntProBNP != null ? ` (NT-proBNP : ${ficheDiabete.ntProBNP} pg/mL)` : ''}` : '<span class="badge-no">Non</span>'}</span></div>
    ${hasText(ficheDiabete.ischemicCritique) ? `<div class="crh-para"><strong>AOMI :</strong><br>${ficheDiabete.aomi ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}<br><div class="crh-rich">${richHtml(ficheDiabete.ischemicCritique)}</div></div>` : `<div class="crh-field"><span class="crh-label">AOMI</span><div class="crh-value">${ficheDiabete.aomi ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</div></div>`}
    ${(ficheDiabete.dyslipidemie || ficheDiabete.hta || ficheDiabete.sas || ficheDiabete.tabac || ficheDiabete.tabacQuantite != null || ficheDiabete.tabacDateDebut || hasText(ficheDiabete.tabacCommentaire) || ficheDiabete.substance || ficheDiabete.substanceQuantite != null || ficheDiabete.substanceDateDebut || hasText(ficheDiabete.substanceCommentaire)) ? `
<p class="crh-para" style="margin-top:8px;"><strong>Facteurs de risque :</strong></p>
<div class="crh-field"><span class="crh-label">Dyslipidémie</span><span class="crh-value">${ficheDiabete.dyslipidemie ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
<div class="crh-field"><span class="crh-label">HTA</span><span class="crh-value">${ficheDiabete.hta ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>'}</span></div>
<div class="crh-field"><span class="crh-label">SAOS</span><span class="crh-value">${s(ficheDiabete.sas || '')}</span></div>
<div class="crh-field"><span class="crh-label">Tabac</span><span class="crh-value">${s(ficheDiabete.tabac || '')}${ficheDiabete.tabac === 'Oui' ? `${ficheDiabete.tabacQuantite != null ? ` — ${ficheDiabete.tabacQuantite} ${ficheDiabete.tabacUnite || ''}${rythmeLabel(ficheDiabete.tabacDuree)}` : ''}${ficheDiabete.tabacDateDebut ? ` depuis ${monthFmt(ficheDiabete.tabacDateDebut)}${expoLabel(ficheDiabete.tabacDateDebut) ? ` (${expoLabel(ficheDiabete.tabacDateDebut)})` : ''}` : ''}${tabacPa != null ? ` (≈ ${tabacPa} PA)` : ''}` : ''}</span></div>
${hasText(ficheDiabete.tabacCommentaire) ? `<div class="crh-para"><strong>Tabac – commentaire :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.tabacCommentaire)}</div></div>` : ''}
<div class="crh-field"><span class="crh-label">Substance / Alcool</span><span class="crh-value">${s(ficheDiabete.substance || '')}${ficheDiabete.substance ? `${ficheDiabete.substancePrecision ? ` (${s(ficheDiabete.substancePrecision)})` : ''}${ficheDiabete.substanceQuantite != null ? ` — ${ficheDiabete.substanceQuantite} ${ficheDiabete.substanceUnite || ''}${rythmeLabel(ficheDiabete.substanceDuree)}` : ''}${ficheDiabete.substanceDateDebut ? ` depuis ${monthFmt(ficheDiabete.substanceDateDebut)}${expoLabel(ficheDiabete.substanceDateDebut) ? ` (${expoLabel(ficheDiabete.substanceDateDebut)})` : ''}` : ''}` : ''}</span></div>
${hasText(ficheDiabete.substanceCommentaire) ? `<div class="crh-para"><strong>Substance – commentaire :</strong><br><div class="crh-rich">${richHtml(ficheDiabete.substanceCommentaire)}</div></div>` : ''}
` : ''}
  </div>
</div>

<!-- 8. TRAITEMENT À L'ENTRÉE -->
<div class="crh-section">
  <div class="crh-section-title">8. TRAITEMENT À L'ENTRÉE</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(traitementEntree) ? sanitizeRichHtml(traitementEntree) : 'Non renseigné'}</div>
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
    <div class="crh-para"><strong>Examen physique :</strong><br>${hasText(examenPhysiqueTexte) ? sanitizeRichHtml(examenPhysiqueTexte) : 'Non renseigné'}</div>
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
    ${(Array.isArray(evolutionMedicale.journalEvolution) && evolutionMedicale.journalEvolution.length)
      ? `<p class="crh-para"><strong>Journal d'évolution :</strong></p><div class="crh-rich" style="background:#f7f9fc;padding:8px 10px;border-left:3px solid #1a3c6e;font-size:17px;white-space:pre-wrap;margin:4px 0;">${evolutionMedicale.journalEvolution.map((e: any) => {
        const stamp = e && (e.date || e.heure)
          ? `[${e.date ? dateFmt(e.date) : ''}${e.heure ? ` ${e.heure}` : ''}]${e.user ? ` · ${e.user}` : ''} `
          : ''
        return `<p style="margin:0 0 6px;">${stamp}${e ? (e.content || '') : ''}</p>`
      }).join('')}</div>` : ''}
    ${(evolutionAvisHtml || evolutionAvisRange)
      ? `<div class="crh-ord-subtitle">Avis${evolutionAvisRange}</div>${evolutionAvisHtml}` : ''}
  </div>
</div>

<!-- 12. CONCLUSION À L'ENTRÉE -->
<div class="crh-section">
  <div class="crh-section-title">12. CONCLUSION À L'ENTRÉE</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(bilanInitial.conclusionEntree) ? sanitizeRichHtml(bilanInitial.conclusionEntree) : 'Non renseigné'}</div>
  </div>
</div>

<!-- 13. PROJET DE SOIN PENDANT L'HOSPITALISATION -->
<div class="crh-section">
  <div class="crh-section-title">13. PROJET DE SOIN PENDANT L'HOSPITALISATION</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(projetSoin) ? sanitizeRichHtml(projetSoin) : 'Non renseigné'}</div>
  </div>
</div>

${ordonnanceHtml}

<!-- 15. SORTIE -->
<div class="crh-section">
  <div class="crh-section-title">15. SORTIE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date de sortie</span><span class="crh-value">${dateFmt(sortie.dateSortie)}</span></div>
    <div class="crh-field"><span class="crh-label">Destination</span><span class="crh-value">${sortie.destinationSortie ? s(String(sortie.destinationSortie) + ((sortie as any).destinationPrecision ? ' — ' + String((sortie as any).destinationPrecision) : '')) : 'Non renseigné'}</span></div>
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

export function generateCrcObesiteHtml(
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
  data = data ?? {}
  patient = patient ?? {}
  contact = contact ?? {}
  hospital = hospital ?? {}
  const admission = data.admission || {}
  const infos = data.informationsComplementaires || {}
  const motifProfil = data.motifProfil || {}
  const modeVieAtcd = data.modeVieAtcd || {}
  const bilanInitial = data.bilanInitial || {}
  const examenPhysique = (bilanInitial as any).examenPhysique || {}
  const comportement = data.comportementAlimentaire || {}
  const psySocial = data.psySocial || {}
  const objectifs = data.objectifsPonderaux || {}
  const conclusion = data.conclusion || {}
  const projet = data.projetTherapeutique || {}
  const suivi = data.suivi || {}
  const evolution = data.evolutionPonderale || {}

  // ── keep in sync with src/utils/apports-alimentaires.ts ──
  // Private copies (electron bundle cannot import renderer modules).
  const FACTEUR_KCAL_PRIVE: Record<string, number | null> = { glucides: 4, protides: 4, lipides: 9, autres: null }
  const kcalLignePrive = (l: any): number | null => {
    if (!l) return null
    if (l.categorie === 'autres') return l.kcalManuel ?? null
    const facteur = FACTEUR_KCAL_PRIVE[l.categorie]
    if (facteur == null) return null
    if (l.quantite == null || l.equivalentParGramme == null) return null
    return Math.round(l.quantite * l.equivalentParGramme * facteur)
  }
  const ecartLignePrive = (l: any): number | null => {
    const kcal = kcalLignePrive(l)
    if (kcal == null || !l || l.objectifKcal == null) return null
    return kcal - l.objectifKcal
  }
  const totauxPrive = (lignes: any[]): { kcal: number; objectif: number; ecart: number | null } => {
    let kcal = 0
    let objectif = 0
    let hasObjectif = false
    for (const l of lignes || []) {
      const k = kcalLignePrive(l)
      if (k != null) kcal += k
      if (l && l.objectifKcal != null) {
        objectif += l.objectifKcal
        hasObjectif = true
      }
    }
    return { kcal, objectif, ecart: hasObjectif ? kcal - objectif : null }
  }
  const ecartJourPrive = (apports: any): number | null => {
    if (!apports || apports.objectifJourKcal == null) return null
    const { kcal } = totauxPrive(apports.lignes || [])
    return kcal - apports.objectifJourKcal
  }
  // calcIMC — keep in sync with src/utils/medical-calculations.ts (via src/utils/apports-alimentaires.ts)
  const calcIMCPrive = (poids: number | null | undefined, taille: number | null | undefined): number | null => {
    if (poids == null || taille == null) return null
    if (poids <= 0 || taille <= 0) return null
    const tailleM = taille / 100
    return Math.round((poids / (tailleM * tailleM)) * 10) / 10
  }
  // ratioTTTH — keep in sync with src/utils/apports-alimentaires.ts
  const ratioPrive = (tourTaille: number | null | undefined, tourHanche: number | null | undefined): number | null => {
    if (tourTaille == null || tourHanche == null) return null
    if (Number.isNaN(tourTaille) || Number.isNaN(tourHanche)) return null
    if (tourHanche <= 0) return null
    return Math.round((tourTaille / tourHanche) * 100) / 100
  }
  // ── end keep in sync with src/utils/apports-alimentaires.ts ──

  const dateFmt = (d: string) => d
    ? new Date(d.includes('T') ? d : `${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  const now = new Date()
  const printDate = now.toLocaleDateString('fr-FR')
  const printTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })

  const nomUC = (patient.nom || '').toUpperCase()
  const prenom = patient.prenom || ''
  const patientIdentity = `${nomUC} ${prenom}`.trim() || 'Patient'
  const patientAddress = [patient.adresse, patient.complement_adresse].filter(Boolean).join(' – ')
  const patientCPVille = [patient.region].filter(Boolean).join('')
  const dateNaissance = admission.dateNaissance || patient.date_naissance || ''
  const ipp = admission.ipp || patient.nip || ''
  const sexeRaw = admission.sexe || (patient.civilite === 'M' ? 'M' : patient.civilite ? 'F' : '')
  const age = dateNaissance && admission.dateEntree
    ? calculateAgeFromDates(dateNaissance, admission.dateEntree)
    : '—'
  const nda = contact?.id || '—'
  const sexeLabel = sexeRaw === 'M' ? 'Masculin' : sexeRaw === 'F' ? 'Féminin' : '—'

  const docRefPrefix = options?.docRefPrefix ?? 'CDE-CRO'
  const docRef = `${docRefPrefix}-${String(patient.id || '0').padStart(6, '0')}-${now.toISOString().slice(0, 10).replace(/-/g, '')}`
  const docTitle = options?.docTitle ?? "DOSSIER PATIENT EN PARCOURS DE SOINS D'OBÉSITÉ"
  const signataireMedecin = signedBy || '—'

  function s(v: any): string {
    return v != null && v !== '' ? escapeHtml(String(v)) : '—'
  }
  function na(v: any): string {
    return v != null && v !== '' ? s(v) : 'Non renseigné'
  }
  const yesNo = (b: any): string => (b ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>')
  const check = (b: boolean): string => (b ? '☑' : '☐')
  const joinArr = (vals: any[], map?: Record<string, string>): string => {
    if (!Array.isArray(vals) || vals.length === 0) return '—'
    return vals.map((v) => escapeHtml(map?.[String(v)] ?? String(v))).join(', ')
  }
  const fmtKcal = (v: number | null | undefined): string => (v == null ? '—' : `${v} kcal`)
  const fmtEcart = (v: number | null | undefined): string => {
    if (v == null) return '—'
    return v > 0 ? `+${v}` : `${v}`
  }
  const fmtObjectif = (t: { kcal: number; objectif: number; ecart: number | null }): string =>
    (t.ecart == null ? '—' : fmtKcal(t.objectif))

  const REPAS_LABELS: Record<string, string> = { matin: 'Matin', midi: 'Midi', soir: 'Soir', grignotage: 'Grignotage' }
  const REPAS_ORDER = ['matin', 'midi', 'soir', 'grignotage'] as const
  const CAT_LABELS: Record<string, string> = { glucides: 'Glucides', lipides: 'Lipides', protides: 'Protides', autres: 'Autres' }

  const buildApportsTableHtml = (apports: any): string => {
    const lignes: any[] = Array.isArray(apports?.lignes) ? apports.lignes : []
    const objectifJour = apports?.objectifJourKcal ?? null
    const ecartJ = ecartJourPrive({ lignes, objectifJourKcal: objectifJour })
    const totauxJour = totauxPrive(lignes)
    if (!lignes.length) {
      return `<p class="crh-para">—</p><div class="crh-field"><span class="crh-label">Objectif journalier</span><span class="crh-value">${fmtKcal(objectifJour)}</span><span class="crh-label">Écart journalier</span><span class="crh-value">${fmtEcart(ecartJ)}</span></div><div class="crh-field"><span class="crh-label">Apport énergétique quotidien</span><span class="crh-value">${fmtKcal(totauxJour.kcal)}</span></div>`
    }
    const groupes = (REPAS_ORDER as readonly string[])
      .map((repas) => ({ repas, lignes: lignes.filter((l: any) => l.repas === repas), totaux: totauxPrive(lignes.filter((l: any) => l.repas === repas)) }))
      .filter((g) => g.lignes.length > 0)
    // Lignes dont le repas est inconnu (défensif) : regroupées sous « Autres »
    const connus = new Set<string>(REPAS_ORDER as unknown as string[])
    const autresLignes = lignes.filter((l: any) => !connus.has(String(l.repas)))
    if (autresLignes.length) {
      groupes.push({ repas: 'autres', lignes: autresLignes, totaux: totauxPrive(autresLignes) })
    }
    const groupesHtml = groupes.map((g) => {
      const label = g.repas === 'autres' ? 'Autres' : (REPAS_LABELS[g.repas] || g.repas)
      const rows = g.lignes.map((l: any) => {
        const kcal = kcalLignePrive(l)
        const ecart = ecartLignePrive(l)
        const qte = l.quantite != null ? `${l.quantite}${l.unite ? ` ${l.unite}` : ''}` : '—'
        const eq = l.equivalentParGramme != null ? String(l.equivalentParGramme) : '—'
        const obj = l.objectifKcal != null ? `${l.objectifKcal} kcal` : '—'
        return `<tr><td>${s(l.aliment)}</td><td>${s(CAT_LABELS[String(l.categorie)] ?? l.categorie)}</td><td>${s(qte)}</td><td>${s(eq)}</td><td>${fmtKcal(kcal)}</td><td>${s(obj)}</td><td>${fmtEcart(ecart)}</td></tr>`
      }).join('')
      return `<tr><th colspan="7" style="text-align:left">Sous-total — ${escapeHtml(label)}</th></tr>${rows}<tr><td colspan="4"><strong>Sous-total ${escapeHtml(label)}</strong></td><td><strong>${fmtKcal(g.totaux.kcal)}</strong></td><td><strong>${fmtObjectif(g.totaux)}</strong></td><td><strong>${fmtEcart(g.totaux.ecart)}</strong></td></tr>`
    }).join('')
    return `<table class="crh-table">
  <thead><tr><th>Aliment</th><th>Catégorie</th><th>Quantité</th><th>Équiv / g</th><th>Apport (kcal)</th><th>Objectif (kcal)</th><th>Écart (kcal)</th></tr></thead>
  <tbody>${groupesHtml}<tr><td colspan="4"><strong>Total</strong></td><td><strong>${fmtKcal(totauxJour.kcal)}</strong></td><td><strong>${fmtObjectif(totauxJour)}</strong></td><td><strong>${fmtEcart(totauxJour.ecart)}</strong></td></tr></tbody>
</table>
<div class="crh-field"><span class="crh-label">Objectif journalier</span><span class="crh-value">${fmtKcal(objectifJour)}</span></div>
<div class="crh-field"><span class="crh-label">Écart journalier</span><span class="crh-value">${fmtEcart(ecartJ)}</span></div>
<div class="crh-field"><span class="crh-label">Apport énergétique quotidien</span><span class="crh-value">${fmtKcal(totauxJour.kcal)}</span></div>`
  }

  const buildParametresTableHtml = (p: any): string => {
    const imc = calcIMCPrive(p?.poids ?? null, p?.taille ?? null)
    const ratio = ratioPrive(p?.tourTaille ?? null, p?.tourHanche ?? null)
    const rows: Array<[string, string]> = [
      ['Glycémie à jeun', p?.glycemieJeun != null ? `${p.glycemieJeun} g/L` : '—'],
      ['Glycémie post-prandiale', p?.glycemiePostPrandiale != null ? `${p.glycemiePostPrandiale} g/L` : '—'],
      ['Cétonémie', p?.cetonemie != null ? `${p.cetonemie} mmol/L` : '—'],
      ['Cétonurie', p?.cetonurie ?? '—'],
      ['Glycosurie', p?.glycosurie ?? '—'],
      ['TA', p?.taSystolique != null ? `${p.taSystolique}/${p.taDiastolique ?? '?'} mmHg` : '—'],
      ['Fréquence cardiaque', p?.frequenceCardiaque != null ? `${p.frequenceCardiaque} bpm` : '—'],
      ['Température', p?.temperature != null ? `${p.temperature} °C` : '—'],
      ['SaO2', p?.saO2 != null ? `${p.saO2} %` : '—'],
      ['Poids', p?.poids != null ? `${p.poids} kg` : '—'],
      ['Taille', p?.taille != null ? `${p.taille} cm` : '—'],
      ['IMC', imc != null ? `${imc} kg/m²` : '—'],
      ['Tour de taille (TT)', p?.tourTaille != null ? `${p.tourTaille} cm` : '—'],
      ['Tour de hanche (TH)', p?.tourHanche != null ? `${p.tourHanche} cm` : '—'],
      ['Rapport TT/TH', ratio != null ? String(ratio) : '—'],
    ]
    return `<table class="crh-table"><tbody>${rows.map(([k, v]) => `<tr><td style="width:35%"><strong>${escapeHtml(k)}</strong></td><td>${s(v)}</td></tr>`).join('')}</tbody></table>`
  }

  // ── ORDONNANCE (même pattern que generateCrhDiabeteHtml) ──
  const ordonnanceData: Partial<CrhOrdonnanceData> = ordonnance ?? {}
  const renderOrdonnanceItem = (item: { nom: string; posologie: string; quantite?: number }) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    const quantite = typeof item.quantite === 'number' && Number.isFinite(item.quantite) ? ` · Qté : ${item.quantite}` : ''
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}${quantite}</div>`
  }
  const renderOrdonnanceMeta = (item: { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }): string => {
    const prescripteur = typeof item.prescripteur === 'string' ? (item.prescripteur as string).trim() : ''
    const plannedDate = typeof item.plannedDate === 'string' ? (item.plannedDate as string).trim() : ''
    const plannedHour = typeof item.plannedHour === 'number' && Number.isFinite(item.plannedHour) ? item.plannedHour : null
    const parts: string[] = []
    if (prescripteur) parts.push(`Prescrit par ${escapeHtml(prescripteur)}`)
    if (plannedDate || plannedHour != null) {
      if (plannedDate) {
        let formatted = plannedDate
        try {
          const f = dateFmt(plannedDate)
          if (f && f !== '—' && !/invalid/i.test(f)) formatted = f
        } catch { /* keep raw YYYY-MM-DD */ }
        const dateStr = escapeHtml(formatted)
        parts.push(plannedHour != null ? `Planifié le ${dateStr} (à ${String(plannedHour).padStart(2, '0')}:00)` : `Planifié le ${dateStr}`)
      } else {
        parts.push(`Planifié à ${String((plannedHour as number)).padStart(2, '0')}:00`)
      }
    }
    if (!parts.length) return ''
    return `<div style="font-size:12px;color:#444;padding-left:10px;">${parts.join(' · ')}</div>`
  }
  const renderOrdonnanceLabel = (item: { label: string; detail?: string; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }) => {
    const label = escapeHtml(item.label || '')
    const detail = item.detail
      ? sanitizeRichHtml(item.detail)
          .replace(/^<p[^>]*>\s*/i, '')
          .replace(/<\/p>\s*$/i, '')
          .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
      : ''
    if (!label && !detail) return ''
    const meta = renderOrdonnanceMeta(item)
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${label}</span>${detail ? ` : ${detail}` : ''}</div>${meta}`
  }
  const renderOrdonnanceRichDetail = (html: string): string =>
    sanitizeRichHtml(html)
      .replace(/^<p[^>]*>\s*/i, '')
      .replace(/<\/p>\s*$/i, '')
      .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
  const renderOrdonnanceSoinsItem = (item: any) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    const main = `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}</div>`
    const details: string[] = []
    if (item.nbSeances != null) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Nb séances :</span> ${escapeHtml(String(item.nbSeances))}</div>`)
    }
    if (hasText(item.objectifClinique)) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Objectif clinique :</span> ${renderOrdonnanceRichDetail(item.objectifClinique)}</div>`)
    }
    if (hasText(item.consignesSpecifiques)) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Consignes spécifiques :</span> ${renderOrdonnanceRichDetail(item.consignesSpecifiques)}</div>`)
    }
    if (item.dispositifsMedicaux) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Dispositifs &amp; Voies d’abord :</span> ${escapeHtml(item.dispositifsMedicaux)}</div>`)
    }
    if (item.professionnelCible) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Professionnel cible :</span> ${escapeHtml(item.professionnelCible)}</div>`)
    }
    return main + details.join('')
  }
  const renderOrdonnanceSubgroup = (title: string, items: Array<{ nom: string; posologie: string }>): string => {
    const itemsHtml = items.map(renderOrdonnanceItem).join('')
    if (!itemsHtml) return ''
    return `<div class="crh-ord-subtitle">${escapeHtml(title)}</div>${itemsHtml}`
  }
  const ordonnanceMedicaments = ordonnanceData.medicaments ?? []
  const medicamentsHtml =
    renderOrdonnanceSubgroup('Traitement de courte durée', ordonnanceMedicaments.filter((m: any) => (m.dureeType ?? 'courte') === 'courte')) +
    renderOrdonnanceSubgroup('Traitement de longue durée', ordonnanceMedicaments.filter((m: any) => m.dureeType === 'longue'))
  const renderExamensBlock = (examens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>): string => {
    if (!examens.length) return ''
    const hasKind = examens.some((e: any) => e.kind === 'imagerie' || e.kind === 'laboratoire')
    if (!hasKind) return examens.map(renderOrdonnanceLabel).join('')
    const sansKind = examens.filter((e: any) => e.kind !== 'imagerie' && e.kind !== 'laboratoire')
    const imagerie = examens.filter((e: any) => e.kind === 'imagerie')
    const laboratoire = examens.filter((e: any) => e.kind === 'laboratoire')
    const renderSub = (title: string, items: typeof examens): string => {
      const itemsHtml = items.map(renderOrdonnanceLabel).join('')
      if (!itemsHtml) return ''
      return `<div class="crh-ord-subtitle">${escapeHtml(title)}</div>${itemsHtml}`
    }
    return sansKind.map(renderOrdonnanceLabel).join('') + renderSub('Imagerie', imagerie) + renderSub('Laboratoire', laboratoire)
  }
  const ordonnanceBlocks = [
    { title: 'MÉDICAMENTS', items: medicamentsHtml },
    { title: 'SOINS', items: (ordonnanceData.soins ?? []).map(renderOrdonnanceSoinsItem).join('') },
    { title: 'DEMANDES D’EXAMENS', items: renderExamensBlock(ordonnanceData.examens ?? []) },
    { title: 'AVIS SPÉCIALISÉS', items: (ordonnanceData.avis ?? []).map(renderOrdonnanceLabel).join('') },
  ]
  const ordonnanceBlocksHtml = ordonnanceBlocks
    .filter((b: any) => b.items !== '')
    .map((b: any) => `<div style="margin-bottom:8px;"><div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(b.title)}</div><div style="padding-left:16px;">${b.items}</div></div>`)
    .join('')
  const ordonnanceHtml = ordonnance
    ? `
<!-- ORDONNANCE -->
<div class="crh-section">
  <div class="crh-section-title">ORDONNANCE</div>
  <div class="crh-section-content">
    ${ordonnanceBlocksHtml || '<div class="crh-para">Non renseigné</div>'}
  </div>
</div>`
    : ''

  const annexeItemsHtml = annexes.map((att: any) => {
    const isImage = (att.mime_type || '').startsWith('image/')
    const nameHtml = escapeHtml((att.display_name || '').trim())
    const description = att.description || ''
    const isPlain = !isHtml(description)
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
<!-- ANNEXES -->
<div class="crh-section">
  <div class="crh-section-title">ANNEXES</div>
  <div class="crh-section-content">
    ${annexeItemsHtml}
  </div>
</div>`
    : ''

  // ── Labels métier (parité avec les onglets renderer) ──
  const TYPE_CONTACT_LABELS: Record<string, string> = { ancien: 'Ancien', nouveau: 'Nouveau contact suivi', premier: '1er contact' }
  const PREMIER_MOTIF_LABELS: Record<string, string> = { diabete: 'Diabète', endocrino: 'Endocrino', obesite: 'Obésité' }
  const MECANISME_LABELS: Record<string, string> = { patient: 'Patient', clinique: 'Clinique', assurance: 'Assurance', internet: 'Internet', autres: 'Autres' }
  const MEDICAUX_LABELS: Record<string, string> = {
    diabete: 'Diabète', hta: 'HTA', dyslipidemie: 'Dyslipidémie', apnee_sommeil: 'Apnée du sommeil',
    arthrose: 'Arthrose', thyroide: 'Problèmes thyroïdiens', sopk: 'SOPK', cushing: 'Cushing',
    steatose_hepatique: 'Stéatose hépatique', incontinence_urinaire: 'Incontinence urinaire', depression: 'Dépression',
  }
  const TRAITEMENTS_LABELS: Record<string, string> = {
    corticoides: 'Corticoïdes', antidepresseurs: 'Antidépresseurs', neuroleptiques: 'Neuroleptiques', betabloquants: 'Bêtabloquants',
  }
  const FAMILIAUX_LABELS: Record<string, string> = {
    obesite: 'Obésité', diabete: 'Diabète', hta: 'HTA', cardiopathies: 'Cardiopathies',
  }
  const CONSULTATIONS_LABELS: Record<string, string> = { psychologue: 'Psychologue', nutritionniste: 'Nutritionniste', autre: 'Autre' }
  const SITUATION_LABELS: Record<string, string> = { travail_poste: 'Travail posté', sedentaire: 'Sédentaire' }
  const TYPE_CONCLUSION_LABELS: Record<string, string> = { surpoids: 'Surpoids', obesite: 'Obésité' }
  const CONTROLE_LABELS: Record<string, string> = {
    non_ameliore: 'Non amélioré', en_cours: 'En cours d’amélioration', ameliore_stable: 'Amélioré et stable', reprise: 'Reprise de poids',
  }
  const FACTEURS_LABELS: Record<string, string> = { non_identifie: 'Non identifié', identifie: 'Identifié' }
  const RAPPEL_LABELS: Record<string, string> = { activite_physique: 'Activité physique adaptée', alimentation: 'Alimentation' }
  const NIVEAU_LABELS: Record<string, string> = {
    '1': 'Niveau 1 — Surpoids',
    '2': 'Niveau 2 — Obésité modérée et sévère',
    '3': 'Niveau 3 — Obésité massive',
  }
  const ETAPES_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'bilan', label: 'Bilan minimum (TSH, GAJ, HbA1c, bilan lipidique, acide urique, calcémie, magnésémie, créat)' },
    { value: 'depistage', label: 'Dépistage des complications/comorbidités' },
    { value: 'controle', label: 'Contrôle des facteurs favorisants/aggravants' },
    { value: 'etp', label: 'Planification ETP : 2 séances APA, 4 séances DIET, 1 séance/semaine à l’initiation' },
    { value: 'prescription', label: 'Prescription médicaments' },
    { value: 'suivi', label: 'Suivi / évaluation' },
    { value: 'dossier_reference', label: 'Constitution d’un dossier de référence' },
  ]
  const ETAPES_LABELS: Record<string, string> = Object.fromEntries(ETAPES_OPTIONS.map((o) => [o.value, o.label]))
  const NIVEAUX = [
    { key: '1', num: 1, title: 'Parcours obésité niveau 1 : SURPOIDS', desc: 'Bilan minimum, contrôle des facteurs favorisants/aggravants, ETP (2 séances APA, 4 séances DIET, 1 séance/semaine), suivi/évaluation bi-mensuel.' },
    { key: '2', num: 2, title: 'Parcours obésité niveau 2 : OBÉSITÉ MODÉRÉE ET SÉVÈRE', desc: 'Bilan minimum + dépistage des complications/comorbidités, contrôle des facteurs, ETP, prescription médicaments, suivi/évaluation mensuel.' },
    { key: '3', num: 3, title: 'Parcours obésité niveau 3 : OBÉSITÉ MASSIVE', desc: 'Bilan minimum + dépistage des complications/comorbidités, contrôle des facteurs, ETP, prescription médicaments, suivi/évaluation mensuel, constitution d’un dossier de référence.' },
  ] as const

  const imcConclusionCalc = calcIMCPrive(examenPhysique.poids ?? null, examenPhysique.taille ?? null)
  const imcConclusionDisplay: number | null = conclusion.imc != null ? conclusion.imc : imcConclusionCalc

  const allergiesRaw = modeVieAtcd.allergies
  const allergiesHtml = Array.isArray(allergiesRaw)
    ? allergiesRaw.length
      ? allergiesRaw.map((a: any) => `${s(a.libelle)} <span class="tag tag--danger">${s(a.type)}</span>`).join('<br>')
      : 'Aucune allergie connue'
    : typeof allergiesRaw === 'string' && allergiesRaw.trim()
      ? s(allergiesRaw)
      : 'Aucune allergie connue'

  const evolutionsLignes: any[] = Array.isArray(evolution.lignes) ? evolution.lignes : []
  const evolutionRowsHtml = evolutionsLignes.length
    ? evolutionsLignes.map((l: any) => `<tr><td>${l.date ? s(dateFmt(l.date)) : '—'}</td><td>${s(l.poids)}</td><td>${s(l.imc)}</td><td>${s(l.tourTaille)}</td><td>${s(l.tourHanche)}</td><td>${s(l.commentaires)}</td></tr>`).join('')
    : '<tr><td colspan="6">—</td></tr>'

  const codeDesireesSousSections = (() => {
    const parts: string[] = []
    parts.push(`<p class="crh-para"><strong>Évolution pondérale et de la répartition de l'obésité :</strong></p>`)
    parts.push(`<table class="crh-table"><thead><tr><th>Date de consultation</th><th>Poids (kg)</th><th>IMC (kg/m²)</th><th>Tour de taille (cm)</th><th>Tour de hanche (cm)</th><th>Commentaires</th></tr></thead><tbody>${evolutionRowsHtml}</tbody></table>`)
    return parts.join('')
  })()

  const logoHtml = _logoBase64
    ? `<img src="${_logoBase64}" style="height:56px;width:auto;margin-right:12px;flex-shrink:0;" alt="Logo établissement" />`
    : ''

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
    font-size: 17px;
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
    font-size: 17px;
    line-height: 1.5;
  }
  .crh-rich {
    font-size: 17px;
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
  .annexe-item { margin-bottom: 12px; }
  .annexe-img { max-width: 100%; border: 1px solid #ccc; }
  .annexe-caption { font-size: 11px; color: #555; margin-top: 4px; font-style: italic; }
  .annexe-file-name { font-weight: 600; display: block; }
  .annexe-item-name { font-weight: 600; display: block; }
  .annexe-file-meta { font-size: 11px; color: #555; }
  .tag--danger { color: #b91c1c; font-weight: 600; }
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
    <div style="display:flex;align-items:center;">
      ${logoHtml}
      <div>
        <div class="inst-name">${s(hospital.name || 'Établissement de Santé')}</div>
        <div class="inst-detail">${[hospital.address, hospital.city].filter(Boolean).join(' – ') || '—'}</div>
        <div class="inst-detail">Tél : ${s(hospital.phone)}</div>
        ${hospital.regNumber ? `<div class="inst-detail">N° agrément : ${s(hospital.regNumber)}</div>` : ''}
        <div class="sec-label"><strong>SECRÉTARIAT :</strong> ${s(hospital.phone)}${hospital.email ? ` — ${s(hospital.email)}` : ''}</div>
      </div>
    </div>
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
      ‣ ${(options?.typeLabel ?? 'CRO')} éditée le : ${printDate}<br>
      &emsp;— Réf : ${docRef}
    </div>
  </div>
</div>

<div class="crh-title-block">
  <div class="crh-title">${escapeHtml(docTitle)}</div>
</div>

<!-- 1. IDENTITE + INFORMATIONS COMPLEMENTAIRES -->
<div class="crh-section">
  <div class="crh-section-title">1. IDENTITÉ</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Nom et Prénoms</span><span class="crh-value">${escapeHtml(patientIdentity)}</span></div>
    <div class="crh-field"><span class="crh-label">Âge</span><span class="crh-value">${s(age)} ans</span></div>
    <div class="crh-field"><span class="crh-label">Sexe</span><span class="crh-value">${sexeLabel}</span></div>
    <div class="crh-field"><span class="crh-label">Tél</span><span class="crh-value">${s(patient.telephone || infos.telephones)}</span></div>
    <div class="crh-field"><span class="crh-label">Quartier</span><span class="crh-value">${na(patient.adresse)}</span></div>
    <div class="crh-field"><span class="crh-label">Commune / Préfecture</span><span class="crh-value">${na(patient.region)}</span></div>
    <div class="crh-field"><span class="crh-label">Date d’admission</span><span class="crh-value">${dateFmt(admission.dateEntree)}</span></div>
  </div>
</div>

<div class="crh-section">
  <div class="crh-section-title">2. INFORMATIONS COMPLÉMENTAIRES</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Profession</span><span class="crh-value">${s(infos.profession)}</span></div>
    <div class="crh-field"><span class="crh-label">Résidence (Quartier / commune / ville)</span><span class="crh-value">${s(infos.residence)}</span></div>
    <div class="crh-field"><span class="crh-label">Village de naissance</span><span class="crh-value">${s(infos.villageNaissance)}</span></div>
    <div class="crh-field"><span class="crh-label">Sous-préfecture</span><span class="crh-value">${s(infos.sousPrefecture)}</span></div>
    <div class="crh-field"><span class="crh-label">Préfecture</span><span class="crh-value">${s(infos.prefecture)}</span></div>
    <div class="crh-field"><span class="crh-label">Contacts / Téléphones</span><span class="crh-value">${s(infos.telephones)}</span></div>
    <div class="crh-field"><span class="crh-label">Mail</span><span class="crh-value">${s(infos.mail)}</span></div>
    <div class="crh-field"><span class="crh-label">Personne de confiance</span><span class="crh-value">${s(infos.personneConfiance)}</span></div>
    <div class="crh-field"><span class="crh-label">Lien de parenté</span><span class="crh-value">${s(infos.lienParente)}</span></div>
    <div class="crh-field"><span class="crh-label">Téléphone de confiance</span><span class="crh-value">${s(infos.telephoneConfiance)}</span></div>
    <div class="crh-field"><span class="crh-label">Type de contact</span><span class="crh-value">${s(TYPE_CONTACT_LABELS[String(infos.typeContact || '')] || infos.typeContact)}</span></div>
    ${infos.typeContact === 'premier' ? `<div class="crh-field"><span class="crh-label">Si 1er contact (motif)</span><span class="crh-value">${s(PREMIER_MOTIF_LABELS[String(infos.premierContactMotif || '')] || infos.premierContactMotif)}</span></div>` : ''}
    <div class="crh-field"><span class="crh-label">Mécanisme de contact</span><span class="crh-value">${joinArr(Array.isArray(infos.mecanismeContact) ? infos.mecanismeContact : [], MECANISME_LABELS)}</span></div>
    ${Array.isArray(infos.mecanismeContact) && infos.mecanismeContact.includes('autres') ? `<div class="crh-field"><span class="crh-label">Mécanisme — autres (préciser)</span><span class="crh-value">${s(infos.mecanismeAutres)}</span></div>` : ''}
    <div class="crh-field"><span class="crh-label">Médecin/IDE d’accueil</span><span class="crh-value">${s(infos.medecinAccueil)}</span></div>
  </div>
</div>

<!-- PARAMETRES CLINIQUES -->
<div class="crh-section">
  <div class="crh-section-title">3. PARAMÈTRES CLINIQUES À L’ADMISSION</div>
  <div class="crh-section-content">
    ${buildParametresTableHtml(examenPhysique)}
  </div>
</div>

<!-- MOTIF ET PROFIL -->
<div class="crh-section">
  <div class="crh-section-title">4. MOTIF DE CONSULTATION ET PROFIL</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Motifs de consultation</span><span class="crh-value">
      ${(Array.isArray(motifProfil.motifs) ? motifProfil.motifs : []).length ? '' : '<span>—</span>'}
      <span>${check(Array.isArray(motifProfil.motifs) && motifProfil.motifs.includes('perte_poids'))} Perte de poids</span><br>
      <span>${check(Array.isArray(motifProfil.motifs) && motifProfil.motifs.includes('bilan'))} Bilan</span><br>
      <span>${check(Array.isArray(motifProfil.motifs) && motifProfil.motifs.includes('chirurgie'))} Chirurgie</span>
    </span></div>
    <div class="crh-field"><span class="crh-label">Prise de poids</span><span class="crh-value">${motifProfil.prisePoidsMois != null ? `${s(motifProfil.prisePoidsMois)} mois` : '—'}${motifProfil.prisePoidsAnnee != null ? ` / ${s(motifProfil.prisePoidsAnnee)} année` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Poids le plus bas (âge adulte)</span><span class="crh-value">${motifProfil.poidsPlusBas != null ? `${s(motifProfil.poidsPlusBas)} kg` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Poids le plus haut</span><span class="crh-value">${motifProfil.poidsPlusHaut != null ? `${s(motifProfil.poidsPlusHaut)} kg` : '—'}</span></div>
    ${Array.isArray(motifProfil.tentatives) && motifProfil.tentatives.length ? `<p class="crh-para"><strong>Tentatives de perte de poids :</strong></p>${motifProfil.tentatives.map((t: any) => `<div class="crh-field"><span class="crh-label">Tentative</span><span class="crh-value">${s(t.methode)} — ${t.resultatKg != null ? `${s(t.resultatKg)} kg` : '—'}</span></div>`).join('')}` : '<p class="crh-para">—</p>'}
  </div>
</div>

<!-- ANTECEDENTS -->
<div class="crh-section">
  <div class="crh-section-title">5. ANTÉCÉDENTS</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Antécédents médicaux</span><span class="crh-value">${joinArr(Array.isArray(modeVieAtcd.medicaux) ? modeVieAtcd.medicaux : [], MEDICAUX_LABELS)}${modeVieAtcd.medicauxAutres ? ` — ${s(modeVieAtcd.medicauxAutres)}` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Antécédents chirurgicaux</span><span class="crh-value">${s(modeVieAtcd.chirurgicaux)}</span></div>
    <div class="crh-field"><span class="crh-label">Traitements en cours</span><span class="crh-value">${joinArr(Array.isArray(modeVieAtcd.traitements) ? modeVieAtcd.traitements : [], TRAITEMENTS_LABELS)}${modeVieAtcd.traitementsAutres ? ` — ${s(modeVieAtcd.traitementsAutres)}` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Antécédents familiaux</span><span class="crh-value">${joinArr(Array.isArray(modeVieAtcd.familiaux) ? modeVieAtcd.familiaux : [], FAMILIAUX_LABELS)}${modeVieAtcd.familiauxAutres ? ` — ${s(modeVieAtcd.familiauxAutres)}` : ''}</span></div>
    ${Array.isArray(modeVieAtcd.antecedents) && modeVieAtcd.antecedents.length ? `<p class="crh-para"><strong>Antécédents :</strong><br>${modeVieAtcd.antecedents.map((a: any) => `${s(a.type || 'Antécédent')} : ${[s(a.annee), s(a.libelle)].filter((v: string) => v !== '—').join(' ')}`).join('<br>')}</p>` : ''}
    <p class="crh-para"><strong>Allergies connues :</strong><br>${allergiesHtml}</p>
    <div class="crh-field"><span class="crh-label">Addictions — Tabac</span><span class="crh-value">${yesNo(modeVieAtcd.tabac)}</span></div>
    <div class="crh-field"><span class="crh-label">Addictions — Alcool</span><span class="crh-value">${yesNo(modeVieAtcd.alcool)}${modeVieAtcd.alcoolDetail ? ` — ${s(modeVieAtcd.alcoolDetail)}` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Addictions — Autres</span><span class="crh-value">${s(modeVieAtcd.addictionsAutres)}</span></div>
  </div>
</div>

<!-- COMPORTEMENT ALIMENTAIRE -->
<div class="crh-section">
  <div class="crh-section-title">6. COMPORTEMENT ALIMENTAIRE ET ACTIVITÉ PHYSIQUE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Petit déjeuner</span><span class="crh-value">${hasText(comportement.petitDejeuner) ? sanitizeRichHtml(comportement.petitDejeuner) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Déjeuner</span><span class="crh-value">${hasText(comportement.dejeuner) ? sanitizeRichHtml(comportement.dejeuner) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Dîner</span><span class="crh-value">${hasText(comportement.diner) ? sanitizeRichHtml(comportement.diner) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Grignotage</span><span class="crh-value">${hasText(comportement.grignotage) ? sanitizeRichHtml(comportement.grignotage) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Mange vite ?</span><span class="crh-value">${yesNo(comportement.mangeVite)}</span></div>
    <div class="crh-field"><span class="crh-label">Ressent la satiété ?</span><span class="crh-value">${yesNo(comportement.satiate)}</span></div>
    <div class="crh-field"><span class="crh-label">Crises d’hyperphagie</span><span class="crh-value">${yesNo(comportement.hyperphagie)}${comportement.hyperphagieFrequenceSemaine != null ? ` — Fréquence : ${s(comportement.hyperphagieFrequenceSemaine)} / semaine` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Grignotage émotionnel</span><span class="crh-value">${yesNo(comportement.grignotageEmotionnel)}</span></div>
    <div class="crh-field"><span class="crh-label">Boissons</span><span class="crh-value">${s(comportement.boissons)}${comportement.boissonsQuantite ? ` — ${s(comportement.boissonsQuantite)}` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Compléments nutritionnels</span><span class="crh-value">${s(comportement.complementsNutritionnels)}${comportement.complementsDetail ? `<br>${hasText(comportement.complementsDetail) ? sanitizeRichHtml(comportement.complementsDetail) : s(comportement.complementsDetail)}` : ''}</span></div>
    <p class="crh-para"><strong>Apport quotidien :</strong></p>
    ${buildApportsTableHtml(comportement.apports)}
    <div class="crh-field"><span class="crh-label">Activité physique</span><span class="crh-value">${yesNo(comportement.activitePhysique)}${comportement.activiteType ? ` — ${s(comportement.activiteType)}` : ''}${comportement.activiteDureeMin != null ? ` — ${s(comportement.activiteDureeMin)} min/heure` : ''}${comportement.activiteFrequence != null ? ` — ${s(comportement.activiteFrequence)} ${s(comportement.activiteFrequenceUnite || '')}` : ''}</span></div>
  </div>
</div>

<!-- PSYCHO-SOCIAL -->
<div class="crh-section">
  <div class="crh-section-title">7. ÉVALUATION PSYCHOLOGIQUE ET SOCIALE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Ressenti du poids</span><span class="crh-value">${hasText(psySocial.ressentiPoids) ? sanitizeRichHtml(psySocial.ressentiPoids) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Consultations déjà eues</span><span class="crh-value">${joinArr(Array.isArray(psySocial.consultations) ? psySocial.consultations : [], CONSULTATIONS_LABELS)}${psySocial.consultationsAutres ? ` — ${s(psySocial.consultationsAutres)}` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Niveau de stress / anxiété / dépression</span><span class="crh-value">${psySocial.stressNiveau != null ? `${s(psySocial.stressNiveau)} / 10` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Situation professionnelle</span><span class="crh-value">${s(SITUATION_LABELS[String(psySocial.situationProfessionnelle || '')] || psySocial.situationProfessionnelle)}</span></div>
    <div class="crh-field"><span class="crh-label">Soutien à la maison</span><span class="crh-value">${s(psySocial.soutienMaison)}</span></div>
    <div class="crh-field"><span class="crh-label">Difficulté à acheter fruits/légumes ?</span><span class="crh-value">${yesNo(psySocial.difficulteAchatFruitsLegumes)}</span></div>
  </div>
</div>

<!-- OBJECTIFS -->
<div class="crh-section">
  <div class="crh-section-title">8. OBJECTIFS DE CONTRÔLE PONDÉRAL</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Poids cible</span><span class="crh-value">${objectifs.poidsCible != null ? `${s(objectifs.poidsCible)} kg` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Tour de taille cible</span><span class="crh-value">${objectifs.tourTailleCible != null ? `${s(objectifs.tourTailleCible)} cm` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Tour de hanche cible</span><span class="crh-value">${objectifs.tourHancheCible != null ? `${s(objectifs.tourHancheCible)} cm` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Délai</span><span class="crh-value">${objectifs.delaiMois != null ? `${s(objectifs.delaiMois)} mois` : '—'}${objectifs.delaiAnnee != null ? ` / ${s(objectifs.delaiAnnee)} année` : ''}</span></div>
  </div>
</div>

<!-- EXAMEN CLINIQUE -->
<div class="crh-section">
  <div class="crh-section-title">9. EXAMEN CLINIQUE</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(conclusion.examenClinique) ? sanitizeRichHtml(conclusion.examenClinique) : '—'}</div>
  </div>
</div>

<!-- CONCLUSION -->
<div class="crh-section">
  <div class="crh-section-title">10. CONCLUSION</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Type</span><span class="crh-value">${check(conclusion.typeConclusion === 'surpoids')} Surpoids — ${check(conclusion.typeConclusion === 'obesite')} Obésité — ${s(TYPE_CONCLUSION_LABELS[String(conclusion.typeConclusion || '')] || conclusion.typeConclusion)}</span></div>
    <div class="crh-field"><span class="crh-label">IMC</span><span class="crh-value">${imcConclusionDisplay != null ? `${s(imcConclusionDisplay)} kg/m²` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Origine</span><span class="crh-value">${s(conclusion.origine)}</span></div>
    <div class="crh-field"><span class="crh-label">Terrain</span><span class="crh-value">${hasText(conclusion.terrain) ? sanitizeRichHtml(conclusion.terrain) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Facteurs aggravants</span><span class="crh-value">${hasText(conclusion.facteursAggravants) ? sanitizeRichHtml(conclusion.facteursAggravants) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Commentaires</span><span class="crh-value">${hasText(conclusion.commentaires) ? sanitizeRichHtml(conclusion.commentaires) : '—'}</span></div>
  </div>
</div>

<!-- PROJET THERAPEUTIQUE -->
<div class="crh-section">
  <div class="crh-section-title">11. PROJET THÉRAPEUTIQUE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Parcours sélectionné</span><span class="crh-value">${s(NIVEAU_LABELS[String(projet.niveau ?? '')] || (projet.niveau != null ? `Niveau ${projet.niveau}` : ''))}</span></div>
    ${NIVEAUX.map((niv) => {
      const n: any = (projet.niveaux || {})[niv.key] || { etapes: [], commentaire: '' }
      const etapesArr: string[] = Array.isArray(n.etapes) ? n.etapes : []
      const etapesHtml = ETAPES_OPTIONS.map((o) => `<div><span>${check(etapesArr.includes(o.value))}</span> ${escapeHtml(ETAPES_LABELS[o.value] ?? o.label)}</div>`).join('')
      return `<div style="margin:8px 0;"><div style="font-weight:bold;">${check(projet.niveau === niv.num)} ${escapeHtml(niv.title)}</div><div style="font-style:italic;font-size:9pt;color:#555;">${escapeHtml(niv.desc)}</div>${etapesHtml}${n.commentaire ? `<div class="crh-para"><strong>Commentaire :</strong> ${hasText(n.commentaire) ? sanitizeRichHtml(n.commentaire) : s(n.commentaire)}</div>` : ''}</div>`
    }).join('')}
  </div>
</div>

<!-- CONSULTATION DE SUIVI -->
<div class="crh-section">
  <div class="crh-section-title">12. CONSULTATION DE SUIVI</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date de consultation</span><span class="crh-value">${suivi.dateConsultation ? dateFmt(suivi.dateConsultation) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Plaintes du jour</span><span class="crh-value">${hasText(suivi.plaintes) ? sanitizeRichHtml(suivi.plaintes) : '—'}</span></div>
    <p class="crh-para"><strong>Paramètres du jour :</strong></p>
    ${buildParametresTableHtml(suivi.parametres || {})}
    <div class="crh-field"><span class="crh-label">Autres</span><span class="crh-value">${hasText(suivi.autres) ? sanitizeRichHtml(suivi.autres) : '—'}</span></div>
    <p class="crh-para"><strong>Apports (suivi) :</strong></p>
    ${buildApportsTableHtml(suivi.apports)}
    <div class="crh-field"><span class="crh-label">Examen clinique du jour</span><span class="crh-value">${hasText(suivi.examenCliniqueJour) ? sanitizeRichHtml(suivi.examenCliniqueJour) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Conclusion</span><span class="crh-value">${hasText(suivi.conclusion) ? sanitizeRichHtml(suivi.conclusion) : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Contrôle pondéral</span><span class="crh-value">${s(CONTROLE_LABELS[String(suivi.controlePonderal || '')] || suivi.controlePonderal)}</span></div>
    <div class="crh-field"><span class="crh-label">Facteurs favorisants</span><span class="crh-value">${s(FACTEURS_LABELS[String(suivi.facteursFavorisants || '')] || suivi.facteursFavorisants)}${suivi.facteursDetail ? ` — ${s(suivi.facteursDetail)}` : ''}</span></div>
    <p class="crh-para"><strong>Conduite à tenir :</strong></p>
    <div class="crh-field"><span class="crh-label">Rappel éducatif sur</span><span class="crh-value">${joinArr(Array.isArray(suivi.rappelEducatif) ? suivi.rappelEducatif : [], RAPPEL_LABELS)}</span></div>
    <div class="crh-field"><span class="crh-label">Intensification thérapeutique</span><span class="crh-value">${yesNo(suivi.intensification)}${suivi.intensificationDetail ? ` — ${s(suivi.intensificationDetail)}` : ''}</span></div>
    <div class="crh-field"><span class="crh-label">Commentaires</span><span class="crh-value">${hasText(suivi.commentaires) ? sanitizeRichHtml(suivi.commentaires) : '—'}</span></div>
  </div>
</div>

<!-- EVOLUTION PONDERALE -->
<div class="crh-section">
  <div class="crh-section-title">13. ÉVOLUTION PONDÉRALE ET DE LA RÉPARTITION DE L’OBÉSITÉ</div>
  <div class="crh-section-content">
    ${codeDesireesSousSections}
  </div>
</div>

${ordonnanceHtml}

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
    <strong>Responsable</strong><br>${s(admission.interneIPANom)}
  </div>
</div>

</div>
</body></html>`
}

export function generateCrcGestaHtml(
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
  data = data ?? {}
  patient = patient ?? {}
  contact = contact ?? {}
  hospital = hospital ?? {}
  const admission = data.admission || {}
  const infos = data.informationsComplementaires || {}
  const motifConsultation = data.motifConsultation || {}
  const donneesMaternelles = data.donneesMaternelles || {}
  const pregest = donneesMaternelles.pregestationnels || {}
  const facteursRisque = Array.isArray(donneesMaternelles.facteursRisque) ? donneesMaternelles.facteursRisque : []
  const bilanInitial = data.bilanInitial || {}
  const examenPhysique = bilanInitial.examenPhysique || {}
  const diagnostic = data.diagnosticDiabete || {}
  const equilibre = data.equilibreGlycemique || {}
  const lignesEqu = equilibre.lignes || {}
  const echo = data.echoObstetricale || {}
  const complications = data.complications || {}
  const priseEnCharge = data.priseEnCharge || {}
  const protocole = priseEnCharge.protocole || {}
  const examenCliniqueTexte = data.examenCliniqueTexte ?? ''
  const conclusion = data.conclusion || {}

  // ── keep in sync with src/utils/gesta-calculations.ts ──
  // Private copies (electron bundle cannot import renderer modules).
  const calcIMCPriveGesta = (poids: number | null | undefined, taille: number | null | undefined): number | null => {
    if (poids == null || taille == null) return null
    if (poids <= 0 || taille <= 0) return null
    const tailleM = taille / 100
    return Math.round((poids / (tailleM * tailleM)) * 10) / 10
  }
  // keep in sync with src/utils/gesta-calculations.ts
  const imcPregestationnel = (poidsPregestationnel: number | null | undefined, taille: number | null | undefined): number | null => calcIMCPriveGesta(poidsPregestationnel ?? null, taille ?? null)
  // keep in sync with src/utils/gesta-calculations.ts
  const imcActuel = (poids: number | null | undefined, taille: number | null | undefined): number | null => calcIMCPriveGesta(poids ?? null, taille ?? null)
  // keep in sync with src/utils/gesta-calculations.ts
  const prisePoids = (poidsActuel: number | null | undefined, poidsPregestationnel: number | null | undefined): number | null => {
    if (poidsActuel == null || poidsPregestationnel == null) return null
    return Math.round((poidsActuel - poidsPregestationnel) * 10) / 10
  }
  // keep in sync with src/utils/gesta-calculations.ts
  const dpaDepuisDdr = (ddr: string): string => {
    if (!ddr) return ''
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ddr)
    if (!m) return ''
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (Number.isNaN(date.getTime())) return ''
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return ''
    }
    date.setUTCDate(date.getUTCDate() + 280)
    return date.toISOString().slice(0, 10)
  }
  // keep in sync with src/utils/gesta-calculations.ts
  const termeTotalJours = (termeSa: number | null | undefined, termeJours: number | null | undefined): number | null => {
    if (termeSa == null) return null
    return termeSa * 7 + (termeJours ?? 0)
  }
  // ── end keep in sync with src/utils/gesta-calculations.ts ──

  // ── keep in sync with src/types/crc-gesta.ts ──
  // Private copies (electron bundle cannot import src/ modules).
  const TYPE_CONSULTATION_LABELS: Record<string, string> = { initiale: 'Initiale', suivi: 'Suivi', post_partum: 'Post-partum' }
  // keep in sync with src/types/crc-gesta.ts
  const TENDANCE_LABELS: Record<string, string> = { normal: 'Normal', hypo: 'Hypoglycémie', hyper: 'Hyperglycémie' }
  // keep in sync with src/types/crc-gesta.ts
  const VARIANTE_LABELS: Record<string, string> = { insulatard: 'Insulatard', lente: 'Insuline lente' }
  // ── end keep in sync with src/types/crc-gesta.ts ──

  // ── keep in sync with src/utils/gesta-protocol.ts ──
  // Private copies (electron bundle cannot import renderer modules).
  const CIBLES_GLYCEMIQUES = { gaj: 0.95, pp1h: 1.4, pp2h: 1.2 } as const
  // keep in sync with src/utils/gesta-protocol.ts
  const PROTOCOLE_SEUILS: Array<{ label: string; conseil?: string }> = [
    { label: 'Inférieure à 0,60 g/L', conseil: 'Résucrage et consulter' },
    { label: 'Entre 0,60 et 0,94 g/L' },
    { label: 'Entre 0,95 et 1,49 g/L' },
    { label: 'Entre 1,50 et 1,99 g/L' },
    { label: 'Entre 2,00 et 2,49 g/L' },
    { label: 'Entre 2,50 et 2,99 g/L' },
    { label: 'Entre 3,00 et 3,50 g/L' },
    { label: 'Supérieure à 3,50 g/L', conseil: "Boire beaucoup d'eau et consulter" },
  ]
  // keep in sync with src/utils/gesta-protocol.ts
  const PROTOCOLE_INSULATARD_REGLES: string[] = [
    'Concernant votre insuline rapide Actrapid (= Novorapid) : objectif glycémique avant repas entre 0,60 g/L et 1,20 g/L.',
    'Concernant votre insuline semi-lente Insulatard : dose prescrite le matin et le soir (en UI).',
    'Objectif à jeun entre 0,60 g/L et 0,94 g/L ; avant repas inférieure à 1,20 g/L.',
    "Si la glycémie à jeun est inférieure à 0,60 g/L ou en cas d'hypoglycémie la veille, diminuez votre dose du soir de 2 UI le même jour.",
    'Si la glycémie à jeun est supérieure à 0,95 g/L pendant 3 jours consécutifs, augmentez votre dose du soir de 2 UI.',
    'Si la glycémie avant dîner est supérieure à 1,20 g/L pendant 3 jours consécutifs, augmentez votre dose du lendemain matin de 2 UI.',
  ]
  // keep in sync with src/utils/gesta-protocol.ts
  const PROTOCOLE_LENTE_REGLES: string[] = [
    'Concernant votre insuline rapide Actrapid (= Novorapid) : objectif glycémique avant repas entre 0,60 g/L et 1,20 g/L.',
    'Concernant votre insuline lente : dose prescrite le soir (en UI).',
    'Objectif à jeun entre 0,60 g/L et 0,94 g/L ; avant repas inférieure à 1,20 g/L.',
    'Si la glycémie à jeun est supérieure à 0,95 g/L pendant 2 jours consécutifs, augmentez votre dose du soir de 2 UI.',
    "Si la glycémie à jeun est inférieure à 0,60 g/L ou en cas d'hypoglycémie la veille, diminuez votre dose du soir de 2 UI le même jour.",
  ]
  // ── end keep in sync with src/utils/gesta-protocol.ts ──

  const dateFmt = (d: string) => d
    ? new Date(d.includes('T') ? d : `${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  const now = new Date()
  const printDate = now.toLocaleDateString('fr-FR')
  const printTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })

  const nomUC = (patient.nom || '').toUpperCase()
  const prenom = patient.prenom || ''
  const patientIdentity = `${nomUC} ${prenom}`.trim() || 'Patient'
  const patientAddress = [patient.adresse, patient.complement_adresse].filter(Boolean).join(' – ')
  const patientCPVille = [patient.region].filter(Boolean).join('')
  const dateNaissance = admission.dateNaissance || patient.date_naissance || ''
  const ipp = admission.ipp || patient.nip || ''
  const sexeRaw = admission.sexe || (patient.civilite === 'M' ? 'M' : patient.civilite ? 'F' : '')
  const age = dateNaissance && admission.dateEntree
    ? calculateAgeFromDates(dateNaissance, admission.dateEntree)
    : '—'
  const nda = contact?.id || '—'
  const sexeLabel = sexeRaw === 'M' ? 'Masculin' : sexeRaw === 'F' ? 'Féminin' : '—'

  const docRefPrefix = options?.docRefPrefix ?? 'CDE-CRG'
  const docRef = `${docRefPrefix}-${String(patient.id || '0').padStart(6, '0')}-${now.toISOString().slice(0, 10).replace(/-/g, '')}`
  const docTitle = options?.docTitle ?? 'DOSSIER PATIENTE EN PARCOURS DE SOINS DE DIABÈTE GESTATIONNEL / DIABÈTE & GROSSESSE'
  const signataireMedecin = signedBy || '—'

  function s(v: any): string {
    return v != null && v !== '' ? escapeHtml(String(v)) : '—'
  }
  function na(v: any): string {
    return v != null && v !== '' ? s(v) : 'Non renseigné'
  }
  const yesNo = (b: any): string => (b ? '<span class="badge-yes">Oui</span>' : '<span class="badge-no">Non</span>')
  const check = (b: boolean): string => (b ? '☑' : '☐')
  const joinArr = (vals: any[], map?: Record<string, string>): string => {
    if (!Array.isArray(vals) || vals.length === 0) return '—'
    return vals.map((v) => escapeHtml(map?.[String(v)] ?? String(v))).join(', ')
  }
  const fmtGL = (v: any): string => (v != null && v !== '' ? `${escapeHtml(String(v))} g/L` : '—')

  // ── Labels métier identité (parité avec les onglets renderer) ──
  const TYPE_CONTACT_LABELS: Record<string, string> = { ancien: 'Ancien', nouveau: 'Nouveau contact suivi', premier: '1er contact' }
  const PREMIER_MOTIF_LABELS: Record<string, string> = { diabete: 'Diabète', endocrino: 'Endocrino', obesite: 'Obésité' }
  const MECANISME_LABELS: Record<string, string> = { patient: 'Patient', clinique: 'Clinique', assurance: 'Assurance', internet: 'Internet', autres: 'Autres' }

  // ── ORDONNANCE (même pattern que generateCrcObesiteHtml) ──
  const ordonnanceData: Partial<CrhOrdonnanceData> = ordonnance ?? {}
  const renderOrdonnanceItem = (item: { nom: string; posologie: string; quantite?: number }) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    const quantite = typeof item.quantite === 'number' && Number.isFinite(item.quantite) ? ` · Qté : ${item.quantite}` : ''
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}${quantite}</div>`
  }
  const renderOrdonnanceMeta = (item: { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }): string => {
    const prescripteur = typeof item.prescripteur === 'string' ? (item.prescripteur as string).trim() : ''
    const plannedDate = typeof item.plannedDate === 'string' ? (item.plannedDate as string).trim() : ''
    const plannedHour = typeof item.plannedHour === 'number' && Number.isFinite(item.plannedHour) ? item.plannedHour : null
    const parts: string[] = []
    if (prescripteur) parts.push(`Prescrit par ${escapeHtml(prescripteur)}`)
    if (plannedDate || plannedHour != null) {
      if (plannedDate) {
        let formatted = plannedDate
        try {
          const f = dateFmt(plannedDate)
          if (f && f !== '—' && !/invalid/i.test(f)) formatted = f
        } catch { /* keep raw YYYY-MM-DD */ }
        const dateStr = escapeHtml(formatted)
        parts.push(plannedHour != null ? `Planifié le ${dateStr} (à ${String(plannedHour).padStart(2, '0')}:00)` : `Planifié le ${dateStr}`)
      } else {
        parts.push(`Planifié à ${String((plannedHour as number)).padStart(2, '0')}:00`)
      }
    }
    if (!parts.length) return ''
    return `<div style="font-size:12px;color:#444;padding-left:10px;">${parts.join(' · ')}</div>`
  }
  const renderOrdonnanceLabel = (item: { label: string; detail?: string; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }) => {
    const label = escapeHtml(item.label || '')
    const detail = item.detail
      ? sanitizeRichHtml(item.detail)
          .replace(/^<p[^>]*>\s*/i, '')
          .replace(/<\/p>\s*$/i, '')
          .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
      : ''
    if (!label && !detail) return ''
    const meta = renderOrdonnanceMeta(item)
    return `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${label}</span>${detail ? ` : ${detail}` : ''}</div>${meta}`
  }
  const renderOrdonnanceRichDetail = (html: string): string =>
    sanitizeRichHtml(html)
      .replace(/^<p[^>]*>\s*/i, '')
      .replace(/<\/p>\s*$/i, '')
      .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
  const renderOrdonnanceSoinsItem = (item: any) => {
    const nom = escapeHtml(item.nom || '')
    const posologie = escapeHtml(item.posologie || '')
    if (!nom && !posologie) return ''
    const main = `<div style="margin-bottom:2px;"><span style="font-weight:bold;">${nom}</span>${posologie ? ` : ${posologie}` : ''}</div>`
    const details: string[] = []
    if (item.nbSeances != null) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Nb séances :</span> ${escapeHtml(String(item.nbSeances))}</div>`)
    }
    if (hasText(item.objectifClinique)) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Objectif clinique :</span> ${renderOrdonnanceRichDetail(item.objectifClinique)}</div>`)
    }
    if (hasText(item.consignesSpecifiques)) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Consignes spécifiques :</span> ${renderOrdonnanceRichDetail(item.consignesSpecifiques)}</div>`)
    }
    if (item.dispositifsMedicaux) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Dispositifs &amp; Voies d’abord :</span> ${escapeHtml(item.dispositifsMedicaux)}</div>`)
    }
    if (item.professionnelCible) {
      details.push(`<div style="margin-bottom:2px;font-size:12px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Professionnel cible :</span> ${escapeHtml(item.professionnelCible)}</div>`)
    }
    return main + details.join('')
  }
  const renderOrdonnanceSubgroup = (title: string, items: Array<{ nom: string; posologie: string }>): string => {
    const itemsHtml = items.map(renderOrdonnanceItem).join('')
    if (!itemsHtml) return ''
    return `<div class="crh-ord-subtitle">${escapeHtml(title)}</div>${itemsHtml}`
  }
  const ordonnanceMedicaments = ordonnanceData.medicaments ?? []
  const medicamentsHtml =
    renderOrdonnanceSubgroup('Traitement de courte durée', ordonnanceMedicaments.filter((m: any) => (m.dureeType ?? 'courte') === 'courte')) +
    renderOrdonnanceSubgroup('Traitement de longue durée', ordonnanceMedicaments.filter((m: any) => m.dureeType === 'longue'))
  const renderExamensBlock = (examens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>): string => {
    if (!examens.length) return ''
    const hasKind = examens.some((e: any) => e.kind === 'imagerie' || e.kind === 'laboratoire')
    if (!hasKind) return examens.map(renderOrdonnanceLabel).join('')
    const sansKind = examens.filter((e: any) => e.kind !== 'imagerie' && e.kind !== 'laboratoire')
    const imagerie = examens.filter((e: any) => e.kind === 'imagerie')
    const laboratoire = examens.filter((e: any) => e.kind === 'laboratoire')
    const renderSub = (title: string, items: typeof examens): string => {
      const itemsHtml = items.map(renderOrdonnanceLabel).join('')
      if (!itemsHtml) return ''
      return `<div class="crh-ord-subtitle">${escapeHtml(title)}</div>${itemsHtml}`
    }
    return sansKind.map(renderOrdonnanceLabel).join('') + renderSub('Imagerie', imagerie) + renderSub('Laboratoire', laboratoire)
  }
  const ordonnanceBlocks = [
    { title: 'MÉDICAMENTS', items: medicamentsHtml },
    { title: 'SOINS', items: (ordonnanceData.soins ?? []).map(renderOrdonnanceSoinsItem).join('') },
    { title: 'DEMANDES D’EXAMENS', items: renderExamensBlock(ordonnanceData.examens ?? []) },
    { title: 'AVIS SPÉCIALISÉS', items: (ordonnanceData.avis ?? []).map(renderOrdonnanceLabel).join('') },
  ]
  const ordonnanceBlocksHtml = ordonnanceBlocks
    .filter((b: any) => b.items !== '')
    .map((b: any) => `<div style="margin-bottom:8px;"><div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(b.title)}</div><div style="padding-left:16px;">${b.items}</div></div>`)
    .join('')
  const ordonnanceHtml = ordonnance
    ? `
<!-- ORDONNANCE -->
<div class="crh-section">
  <div class="crh-section-title">ORDONNANCE</div>
  <div class="crh-section-content">
    ${ordonnanceBlocksHtml || '<div class="crh-para">Non renseigné</div>'}
  </div>
</div>`
    : ''

  const annexeItemsHtml = annexes.map((att: any) => {
    const isImage = (att.mime_type || '').startsWith('image/')
    const nameHtml = escapeHtml((att.display_name || '').trim())
    const description = att.description || ''
    const isPlain = !isHtml(description)
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
<!-- ANNEXES -->
<div class="crh-section">
  <div class="crh-section-title">ANNEXES</div>
  <div class="crh-section-content">
    ${annexeItemsHtml}
  </div>
</div>`
    : ''

  // ── Calculs affichés ──
  const taille = examenPhysique.taille ?? null
  const imcPreg = imcPregestationnel(pregest.poidsPregestationnel ?? null, taille)
  const imcAct = imcActuel(examenPhysique.poids ?? null, taille)
  const prisePoidsCalc = prisePoids(examenPhysique.poids ?? null, pregest.poidsPregestationnel ?? null)
  const dpaComputed = dpaDepuisDdr(pregest.ddr || '')
  const dpaDisplay = pregest.dpa || dpaComputed

  const fmtTerme = (sa: any, jours: any): string => {
    if (sa == null || sa === '') return '—'
    const j = jours ?? 0
    return `${s(sa)} SA, ${s(j)} jours`
  }
  const fmtTermeTotal = (sa: any, jours: any): string => {
    const tot = termeTotalJours(sa ?? null, jours ?? null)
    return tot != null ? ` (soit ${tot} jours au total)` : ''
  }
  const fmtImc = (v: number | null): string => (v != null ? `${s(v)} kg/m²` : '—')
  const fmtPoidsKg = (v: any): string => (v != null && v !== '' ? `${s(v)} kg` : '—')
  const fmtTailleCm = (v: any): string => (v != null && v !== '' ? `${s(v)} cm` : '—')

  const modeDiagArr: string[] = Array.isArray(diagnostic.modeDiagnostic) ? diagnostic.modeDiagnostic : []
  const traitementsArr: string[] = Array.isArray(priseEnCharge.traitements) ? priseEnCharge.traitements : []
  const suiviArr: string[] = Array.isArray(conclusion.suiviPrevu) ? conclusion.suiviPrevu : []
  const insulinesArr: any[] = Array.isArray(priseEnCharge.insulines) ? priseEnCharge.insulines : []

  const insulinesRowsHtml = insulinesArr.length
    ? insulinesArr.map((l: any) => `<tr><td>${s(l.insuline)}</td><td>${l.dose != null && l.dose !== '' ? `${s(l.dose)} UI` : '—'}</td><td>${s(l.horaire)}</td></tr>`).join('')
    : '<tr><td colspan="3">—</td></tr>'

  const protocoleRegles: string[] = protocole.variante === 'insulatard'
    ? PROTOCOLE_INSULATARD_REGLES
    : protocole.variante === 'lente'
      ? PROTOCOLE_LENTE_REGLES
      : []
  const protocoleReglesHtml = protocoleRegles.length
    ? protocoleRegles.map((r: string) => `<div style="margin-bottom:2px;">• ${escapeHtml(r)}</div>`).join('')
    : '<div class="crh-para">—</div>'
  const protocoleSeuilsHtml = PROTOCOLE_SEUILS.map((sLine: { label: string; conseil?: string }) => {
    const c = sLine.conseil ? escapeHtml(sLine.conseil) : ''
    return `<tr><td>${escapeHtml(sLine.label)}</td><td>${c}</td><td>${c}</td><td>${c}</td></tr>`
  }).join('')
  const protocoleHasContent = Boolean(protocole.variante || protocole.insulatardMatin != null || protocole.insulatardSoir != null || protocole.lenteSoir != null || protocole.dateRemise || hasText(protocole.commentaires))
  const protocoleBlockHtml = protocoleHasContent
    ? `
    <div class="crh-field"><span class="crh-label">Variante</span><span class="crh-value">${s(VARIANTE_LABELS[String(protocole.variante || '')] || protocole.variante)}</span></div>
    ${protocole.variante === 'insulatard' ? `<div class="crh-field"><span class="crh-label">Insulatard — matin</span><span class="crh-value">${protocole.insulatardMatin != null ? `${s(protocole.insulatardMatin)} UI` : '—'}</span></div><div class="crh-field"><span class="crh-label">Insulatard — soir</span><span class="crh-value">${protocole.insulatardSoir != null ? `${s(protocole.insulatardSoir)} UI` : '—'}</span></div>` : ''}
    ${protocole.variante === 'lente' ? `<div class="crh-field"><span class="crh-label">Insuline lente — soir</span><span class="crh-value">${protocole.lenteSoir != null ? `${s(protocole.lenteSoir)} UI` : '—'}</span></div>` : ''}
    <div class="crh-field"><span class="crh-label">Date de remise</span><span class="crh-value">${dateFmt(protocole.dateRemise)}</span></div>
    <p class="crh-para"><strong>Protocole d’insulinothérapie chez la femme enceinte :</strong></p>
    <p class="crh-para">Nom et Prénoms : ${escapeHtml(patientIdentity)} — Date : ${dateFmt(protocole.dateRemise)}</p>
    <p class="crh-para"><strong>Lisez ci-dessous attentivement :</strong></p>
    ${protocoleReglesHtml}
    <p class="crh-para" style="margin-top:8px;"><strong>Objectifs et seuils glycémiques :</strong></p>
    <table class="crh-table">
      <thead><tr><th>Glycémie mesurée</th><th>Petit-déjeuner</th><th>Déjeuner</th><th>Dîner</th></tr></thead>
      <tbody>${protocoleSeuilsHtml}</tbody>
    </table>
    ${hasText(protocole.commentaires) ? `<div class="crh-para"><strong>Commentaires du protocole :</strong><br><div class="crh-rich">${richHtml(protocole.commentaires)}</div></div>` : ''}
    `
    : '<div class="crh-para">—</div>'

  const ligneEquilibreHtml = (label: string, ligne: any, cible: number) => {
    const resultat = ligne?.resultat
    const tendanceRaw = ligne?.tendance
    const tendance = TENDANCE_LABELS[String(tendanceRaw || '')] || tendanceRaw
    return `<tr><td>${escapeHtml(label)}</td><td>${fmtGL(resultat)}</td><td>&lt; ${String(cible).replace('.', ',')} g/L</td><td>${s(tendance)}</td></tr>`
  }

  const logoHtml = _logoBase64
    ? `<img src="${_logoBase64}" style="height:56px;width:auto;margin-right:12px;flex-shrink:0;" alt="Logo établissement" />`
    : ''

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
    font-size: 17px;
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
    font-size: 17px;
    line-height: 1.5;
  }
  .crh-rich {
    font-size: 17px;
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
  .annexe-item { margin-bottom: 12px; }
  .annexe-img { max-width: 100%; border: 1px solid #ccc; }
  .annexe-caption { font-size: 11px; color: #555; margin-top: 4px; font-style: italic; }
  .annexe-file-name { font-weight: 600; display: block; }
  .annexe-item-name { font-weight: 600; display: block; }
  .annexe-file-meta { font-size: 11px; color: #555; }
  .tag--danger { color: #b91c1c; font-weight: 600; }
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
    <div style="display:flex;align-items:center;">
      ${logoHtml}
      <div>
        <div class="inst-name">${s(hospital.name || 'Établissement de Santé')}</div>
        <div class="inst-detail">${[hospital.address, hospital.city].filter(Boolean).join(' – ') || '—'}</div>
        <div class="inst-detail">Tél : ${s(hospital.phone)}</div>
        ${hospital.regNumber ? `<div class="inst-detail">N° agrément : ${s(hospital.regNumber)}</div>` : ''}
        <div class="sec-label"><strong>SECRÉTARIAT :</strong> ${s(hospital.phone)}${hospital.email ? ` — ${s(hospital.email)}` : ''}</div>
      </div>
    </div>
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
      ‣ ${(options?.typeLabel ?? 'CRG')} éditée le : ${printDate}<br>
      &emsp;— Réf : ${docRef}
    </div>
  </div>
</div>

<div class="crh-title-block">
  <div class="crh-title">${escapeHtml(docTitle)}</div>
</div>

<!-- 1. IDENTITE -->
<div class="crh-section">
  <div class="crh-section-title">1. IDENTITÉ</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Nom et Prénoms</span><span class="crh-value">${escapeHtml(patientIdentity)}</span></div>
    <div class="crh-field"><span class="crh-label">Âge</span><span class="crh-value">${s(age)} ans</span></div>
    <div class="crh-field"><span class="crh-label">Sexe</span><span class="crh-value">${sexeLabel}</span></div>
    <div class="crh-field"><span class="crh-label">Tél</span><span class="crh-value">${s(patient.telephone || infos.telephones)}</span></div>
    <div class="crh-field"><span class="crh-label">Quartier</span><span class="crh-value">${na(patient.adresse)}</span></div>
    <div class="crh-field"><span class="crh-label">Commune / Préfecture</span><span class="crh-value">${na(patient.region)}</span></div>
    <div class="crh-field"><span class="crh-label">Date d’admission</span><span class="crh-value">${dateFmt(admission.dateEntree)}</span></div>
  </div>
</div>

<div class="crh-section">
  <div class="crh-section-title">2. INFORMATIONS COMPLÉMENTAIRES</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Profession</span><span class="crh-value">${s(infos.profession)}</span></div>
    <div class="crh-field"><span class="crh-label">Résidence (Quartier / commune / ville)</span><span class="crh-value">${s(infos.residence)}</span></div>
    <div class="crh-field"><span class="crh-label">Village de naissance</span><span class="crh-value">${s(infos.villageNaissance)}</span></div>
    <div class="crh-field"><span class="crh-label">Sous-préfecture</span><span class="crh-value">${s(infos.sousPrefecture)}</span></div>
    <div class="crh-field"><span class="crh-label">Préfecture</span><span class="crh-value">${s(infos.prefecture)}</span></div>
    <div class="crh-field"><span class="crh-label">Contacts / Téléphones</span><span class="crh-value">${s(infos.telephones)}</span></div>
    <div class="crh-field"><span class="crh-label">Mail</span><span class="crh-value">${s(infos.mail)}</span></div>
    <div class="crh-field"><span class="crh-label">Personne de confiance</span><span class="crh-value">${s(infos.personneConfiance)}</span></div>
    <div class="crh-field"><span class="crh-label">Lien de parenté</span><span class="crh-value">${s(infos.lienParente)}</span></div>
    <div class="crh-field"><span class="crh-label">Téléphone de confiance</span><span class="crh-value">${s(infos.telephoneConfiance)}</span></div>
    <div class="crh-field"><span class="crh-label">Type de contact</span><span class="crh-value">${s(TYPE_CONTACT_LABELS[String(infos.typeContact || '')] || infos.typeContact)}</span></div>
    ${infos.typeContact === 'premier' ? `<div class="crh-field"><span class="crh-label">Si 1er contact (motif)</span><span class="crh-value">${s(PREMIER_MOTIF_LABELS[String(infos.premierContactMotif || '')] || infos.premierContactMotif)}</span></div>` : ''}
    <div class="crh-field"><span class="crh-label">Mécanisme de contact</span><span class="crh-value">${joinArr(Array.isArray(infos.mecanismeContact) ? infos.mecanismeContact : [], MECANISME_LABELS)}</span></div>
    ${Array.isArray(infos.mecanismeContact) && infos.mecanismeContact.includes('autres') ? `<div class="crh-field"><span class="crh-label">Mécanisme — autres (préciser)</span><span class="crh-value">${s(infos.mecanismeAutres)}</span></div>` : ''}
    <div class="crh-field"><span class="crh-label">Médecin/IDE d’accueil</span><span class="crh-value">${s(infos.medecinAccueil)}</span></div>
  </div>
</div>

<!-- 3. MOTIF DE CONSULTATION -->
<div class="crh-section">
  <div class="crh-section-title">3. MOTIF DE CONSULTATION</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Type de consultation</span><span class="crh-value">
      <span>${check(motifConsultation.typeConsultation === 'initiale')} Initiale</span> &nbsp;
      <span>${check(motifConsultation.typeConsultation === 'suivi')} Suivi</span> &nbsp;
      <span>${check(motifConsultation.typeConsultation === 'post_partum')} Post-partum</span>
      ${motifConsultation.typeConsultation && !TYPE_CONSULTATION_LABELS[String(motifConsultation.typeConsultation)] ? ` — ${s(motifConsultation.typeConsultation)}` : ''}
    </span></div>
    <div class="crh-para"><strong>Plaintes du jour :</strong><br>${hasText(motifConsultation.plaintes) ? sanitizeRichHtml(motifConsultation.plaintes) : '—'}</div>
  </div>
</div>

<!-- 4. DONNEES MATERNELLES ET OBSTETRICALES -->
<div class="crh-section">
  <div class="crh-section-title">4. DONNÉES MATERNELLES ET OBSTÉTRICALES</div>
  <div class="crh-section-content">
    <p class="crh-para"><strong>Paramètres prégestationnels :</strong></p>
    <div class="crh-field"><span class="crh-label">Gestité</span><span class="crh-value">${s(pregest.gestite)}</span></div>
    <div class="crh-field"><span class="crh-label">Parité</span><span class="crh-value">${s(pregest.parite)}</span></div>
    <div class="crh-field"><span class="crh-label">Césarienne</span><span class="crh-value">${s(pregest.cesarienne)}</span></div>
    <div class="crh-field"><span class="crh-label">Fausse couche</span><span class="crh-value">${s(pregest.fausseCouche)}</span></div>
    <div class="crh-field"><span class="crh-label">DDR</span><span class="crh-value">${dateFmt(pregest.ddr)}</span></div>
    <div class="crh-field"><span class="crh-label">DPA</span><span class="crh-value">${dateFmt(dpaDisplay)}</span></div>
    <div class="crh-field"><span class="crh-label">Poids prégestationnel</span><span class="crh-value">${fmtPoidsKg(pregest.poidsPregestationnel)}</span></div>
    <div class="crh-field"><span class="crh-label">Taille</span><span class="crh-value">${fmtTailleCm(taille)}</span></div>
    <div class="crh-field"><span class="crh-label">IMC prégestationnel</span><span class="crh-value">${fmtImc(imcPreg)}</span></div>
    <p class="crh-para" style="margin-top:8px;"><strong>Paramètres du jour :</strong></p>
    <div class="crh-field"><span class="crh-label">Terme</span><span class="crh-value">${fmtTerme(examenPhysique.termeSa, examenPhysique.termeJours)}${fmtTermeTotal(examenPhysique.termeSa, examenPhysique.termeJours)}</span></div>
    <div class="crh-field"><span class="crh-label">Poids actuel</span><span class="crh-value">${fmtPoidsKg(examenPhysique.poids)}</span></div>
    <div class="crh-field"><span class="crh-label">IMC actuel</span><span class="crh-value">${fmtImc(imcAct)}</span></div>
    <div class="crh-field"><span class="crh-label">Prise de poids</span><span class="crh-value">${prisePoidsCalc != null ? `${s(prisePoidsCalc)} kg` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Pression artérielle</span><span class="crh-value">${examenPhysique.taSystolique != null ? `${s(examenPhysique.taSystolique)}/${s(examenPhysique.taDiastolique ?? '?')} mmHg` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Fréquence cardiaque</span><span class="crh-value">${examenPhysique.frequenceCardiaque != null ? `${s(examenPhysique.frequenceCardiaque)} bpm` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">SatO2</span><span class="crh-value">${examenPhysique.saO2 != null ? `${s(examenPhysique.saO2)} %` : '—'}</span></div>
    <p class="crh-para" style="margin-top:8px;"><strong>Facteurs de risque :</strong></p>
    <div class="crh-field"><span class="crh-label">Facteurs de risque</span><span class="crh-value">
      <span>${check(facteursRisque.includes('age35'))} Âge ≥ 35 ans</span> &nbsp;
      <span>${check(facteursRisque.includes('surpoids_obesite'))} Surpoids/obésité</span> &nbsp;
      <span>${check(facteursRisque.includes('atcd_dg'))} Antécédent de diabète gestationnel</span><br>
      <span>${check(facteursRisque.includes('atcd_macrosomie'))} Antécédent de macrosomie</span> &nbsp;
      <span>${check(facteursRisque.includes('diabete_familial_1er'))} Diabète familial au premier degré</span> &nbsp;
      <span>${check(facteursRisque.includes('autre'))} Autres</span>
    </span></div>
    ${hasText(donneesMaternelles.facteursRisqueAutres) ? `<div class="crh-para"><strong>Facteurs de risque — autres (préciser) :</strong><br><div class="crh-rich">${richHtml(donneesMaternelles.facteursRisqueAutres)}</div></div>` : ''}
  </div>
</div>

<!-- 5. DIAGNOSTIC DU DIABETE -->
<div class="crh-section">
  <div class="crh-section-title">5. DIAGNOSTIC DU DIABÈTE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Date du diagnostic</span><span class="crh-value">${dateFmt(diagnostic.dateDiagnostic)}</span></div>
    <div class="crh-field"><span class="crh-label">Terme au diagnostic</span><span class="crh-value">${fmtTerme(diagnostic.termeSaDiagnostic, diagnostic.termeJoursDiagnostic)}${fmtTermeTotal(diagnostic.termeSaDiagnostic, diagnostic.termeJoursDiagnostic)}</span></div>
    <div class="crh-field"><span class="crh-label">Mode de diagnostic</span><span class="crh-value">
      <span>${check(modeDiagArr.includes('gaj'))} Glycémie à jeun</span> &nbsp;
      <span>${check(modeDiagArr.includes('pp'))} Glycémie en post-prandial</span> &nbsp;
      <span>${check(modeDiagArr.includes('hgpo75'))} HGPO 75 g</span>
    </span></div>
    <p class="crh-para" style="margin-top:8px;"><strong>Glycémies :</strong></p>
    <table class="crh-table">
      <thead><tr><th>Paramètre</th><th>Valeur</th></tr></thead>
      <tbody>
        <tr><td>Glycémie à jeun</td><td>${fmtGL(diagnostic.glycemieJeun)}</td></tr>
        <tr><td>Glycémie post-prandiale à 1 heure</td><td>${fmtGL(diagnostic.glycemiePost1h)}</td></tr>
        <tr><td>Glycémie post-prandiale à 2 heures</td><td>${fmtGL(diagnostic.glycemiePost2h)}</td></tr>
      </tbody>
    </table>
    <div class="crh-field"><span class="crh-label">Diagnostic retenu</span><span class="crh-value">
      <span>${check(diagnostic.diagnosticRetenu === 'diabete_grossesse')} Diabète et grossesse</span><br>
      <span>${check(diagnostic.diagnosticRetenu === 'diabete_gestationnel')} Diabète gestationnel</span><br>
      <span>${check(diagnostic.diagnosticRetenu === 'suspicion_manifeste')} Suspicion de diabète manifeste découvert pendant la grossesse</span>
    </span></div>
  </div>
</div>

<!-- 6. EQUILIBRE GLYCEMIQUE -->
<div class="crh-section">
  <div class="crh-section-title">6. ÉQUILIBRE GLYCÉMIQUE</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Autosurveillance glycémique</span><span class="crh-value">${yesNo(equilibre.autosurveillance)}</span></div>
    <p class="crh-para" style="margin-top:8px;"><strong>Autosurveillance glycémique (si oui) :</strong></p>
    <table class="crh-table">
      <thead><tr><th>Paramètre</th><th>Résultat</th><th>Cible</th><th>Tendance</th></tr></thead>
      <tbody>
        ${ligneEquilibreHtml('Glycémie à jeun', lignesEqu.gaj || {}, CIBLES_GLYCEMIQUES.gaj)}
        ${ligneEquilibreHtml('Glycémie en post-prandial à 1h', lignesEqu.pp1h || {}, CIBLES_GLYCEMIQUES.pp1h)}
        ${ligneEquilibreHtml('Glycémie en post-prandial à 2h', lignesEqu.pp2h || {}, CIBLES_GLYCEMIQUES.pp2h)}
      </tbody>
    </table>
    <p class="crh-para" style="margin-top:8px;"><strong>Situation de l’équilibre du diabète :</strong></p>
    <div class="crh-field"><span class="crh-label">Hypoglycémies</span><span class="crh-value"><span>${check(!equilibre.hypoglycemies)} Non</span> &nbsp; <span>${check(!!equilibre.hypoglycemies)} Oui</span></span></div>
    <div class="crh-field"><span class="crh-label">Hyperglycémies</span><span class="crh-value"><span>${check(!equilibre.hyperglycemies)} Non</span> &nbsp; <span>${check(!!equilibre.hyperglycemies)} Oui</span></span></div>
    <div class="crh-field"><span class="crh-label">HbA1c</span><span class="crh-value">${equilibre.hba1c != null && equilibre.hba1c !== '' ? `${s(equilibre.hba1c)} %` : '—'}</span></div>
    <div class="crh-field"><span class="crh-label">Équilibre glycémique</span><span class="crh-value"><span>${check(equilibre.equilibre === 'satisfaisant')} Satisfaisant</span> &nbsp; <span>${check(equilibre.equilibre === 'insuffisant')} Insuffisant</span></span></div>
    ${hasText(equilibre.observance) ? `<div class="crh-para"><strong>Observance / difficultés particulières :</strong><br><div class="crh-rich">${richHtml(equilibre.observance)}</div></div>` : `<div class="crh-field"><span class="crh-label">Observance / difficultés particulières</span><span class="crh-value">—</span></div>`}
  </div>
</div>

<!-- 7. ECHO OBSTETRICALE ET COMPLICATIONS -->
<div class="crh-section">
  <div class="crh-section-title">7. ÉCHOGRAPHIE OBSTÉTRICALE ET COMPLICATIONS</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Dernière échographie obstétricale</span><span class="crh-value">
      <span>${check(echo.trimestre === 'T1')} T1</span> &nbsp;
      <span>${check(echo.trimestre === 'T2')} T2</span> &nbsp;
      <span>${check(echo.trimestre === 'T3')} T3</span>
    </span></div>
    <div class="crh-para"><strong>Conclusion de la dernière échographie obstétricale :</strong><br>${hasText(echo.conclusion) ? sanitizeRichHtml(echo.conclusion) : '—'}</div>
    <p class="crh-para" style="margin-top:8px;"><strong>Complications ou signes d’alerte :</strong></p>
    <div class="crh-field"><span class="crh-label">Complications / signes d’alerte</span><span class="crh-value">
      <span>${check(!!complications.aucun)} Aucun</span> &nbsp;
      <span>${check(Array.isArray(complications.signes) && complications.signes.includes('hta_preeclampsie'))} HTA / suspicion de prééclampsie</span> &nbsp;
      <span>${check(Array.isArray(complications.signes) && complications.signes.includes('autre'))} Autre</span>
    </span></div>
    ${hasText(complications.autreDetail) ? `<div class="crh-para"><strong>Autre (préciser) :</strong><br><div class="crh-rich">${richHtml(complications.autreDetail)}</div></div>` : ''}
  </div>
</div>

<!-- 8. PRISE EN CHARGE -->
<div class="crh-section">
  <div class="crh-section-title">8. PRISE EN CHARGE THÉRAPEUTIQUE EN COURS</div>
  <div class="crh-section-content">
    <div class="crh-field"><span class="crh-label">Traitement actuel</span><span class="crh-value">
      <span>${check(traitementsArr.includes('mhd'))} Mesures hygiéno-diététiques seules</span><br>
      <span>${check(traitementsArr.includes('insuline'))} Insulinothérapie</span><br>
      <span>${check(traitementsArr.includes('ado'))} Antidiabétiques oraux</span><br>
      <span>${check(traitementsArr.includes('autre'))} Autre</span>
    </span></div>
    ${hasText(priseEnCharge.autreDetail) ? `<div class="crh-para"><strong>Autre (préciser) :</strong><br><div class="crh-rich">${richHtml(priseEnCharge.autreDetail)}</div></div>` : ''}
    ${traitementsArr.includes('insuline') ? `
    <p class="crh-para" style="margin-top:8px;"><strong>Si insulinothérapie :</strong></p>
    <table class="crh-table">
      <thead><tr><th>Insuline</th><th>Dose</th><th>Horaire</th></tr></thead>
      <tbody>${insulinesRowsHtml}</tbody>
    </table>` : ''}
    <p class="crh-para" style="margin-top:8px;"><strong>Protocole d’insulinothérapie chez la femme enceinte :</strong></p>
    ${protocoleBlockHtml}
  </div>
</div>

<!-- 9. EXAMEN PHYSIQUE -->
<div class="crh-section">
  <div class="crh-section-title">9. EXAMEN PHYSIQUE</div>
  <div class="crh-section-content">
    <div class="crh-para">${hasText(examenCliniqueTexte) ? sanitizeRichHtml(examenCliniqueTexte) : '—'}</div>
  </div>
</div>

<!-- 10. CONCLUSION ET CONDUITE A TENIR -->
<div class="crh-section">
  <div class="crh-section-title">10. CONCLUSION ET CONDUITE À TENIR</div>
  <div class="crh-section-content">
    <div class="crh-para"><strong>Synthèse clinique :</strong><br>${hasText(conclusion.syntheseClinique) ? sanitizeRichHtml(conclusion.syntheseClinique) : '—'}</div>
    <div class="crh-field"><span class="crh-label">Décision thérapeutique</span><span class="crh-value">
      <span>${check(conclusion.decision === 'maintien')} Maintien du traitement</span><br>
      <span>${check(conclusion.decision === 'adaptation')} Adaptation des doses</span><br>
      <span>${check(conclusion.decision === 'introduction_insuline')} Introduction de l’insuline</span><br>
      <span>${check(conclusion.decision === 'renforcement_mhd')} Renforcement des mesures hygiéno-diététiques</span><br>
      <span>${check(conclusion.decision === 'autre')} Autre</span>
    </span></div>
    ${hasText(conclusion.decisionAutre) ? `<div class="crh-para"><strong>Décision — autre (préciser) :</strong><br><div class="crh-rich">${richHtml(conclusion.decisionAutre)}</div></div>` : ''}
    <div class="crh-field"><span class="crh-label">Conseils nutritionnels délivrés</span><span class="crh-value"><span>${check(!!conclusion.conseilsNutritionnels)} Oui</span> &nbsp; <span>${check(!conclusion.conseilsNutritionnels)} Non</span></span></div>
    <div class="crh-field"><span class="crh-label">Activité physique adaptée abordée</span><span class="crh-value"><span>${check(!!conclusion.activitePhysique)} Oui</span> &nbsp; <span>${check(!conclusion.activitePhysique)} Non</span></span></div>
    <div class="crh-field"><span class="crh-label">Éducation à l’autosurveillance / hypo</span><span class="crh-value"><span>${check(!!conclusion.educationAutosurveillance)} Oui</span> &nbsp; <span>${check(!conclusion.educationAutosurveillance)} Non</span></span></div>
    ${hasText(conclusion.commentaires) ? `<div class="crh-para"><strong>Commentaires :</strong><br><div class="crh-rich">${richHtml(conclusion.commentaires)}</div></div>` : `<div class="crh-field"><span class="crh-label">Commentaires</span><span class="crh-value">—</span></div>`}
    <div class="crh-field"><span class="crh-label">Prochain contrôle</span><span class="crh-value">${dateFmt(conclusion.prochainControle)}</span></div>
    <div class="crh-field"><span class="crh-label">Suivi prévu</span><span class="crh-value">
      <span>${check(suiviArr.includes('diabetologie'))} Diabétologie</span> &nbsp;
      <span>${check(suiviArr.includes('obstetrique'))} Obstétrique</span> &nbsp;
      <span>${check(suiviArr.includes('dietetique'))} Diététique</span> &nbsp;
      <span>${check(suiviArr.includes('autre'))} Autre</span>
    </span></div>
    ${hasText(conclusion.suiviPrevuAutre) ? `<div class="crh-para"><strong>Suivi prévu — autre (préciser) :</strong><br><div class="crh-rich">${richHtml(conclusion.suiviPrevuAutre)}</div></div>` : ''}
  </div>
</div>

${ordonnanceHtml}

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
    <strong>Responsable</strong><br>${s(admission.interneIPANom)}
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
  soins?: Array<{ nom: string; quantiteFrequence: string; nbSeances?: number; objectifClinique?: string; consignesSpecifiques?: string; dispositifsMedicaux?: string; professionnelCible?: string }>
  examens?: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>
  avis?: Array<{ label: string; detail?: string; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }>
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
    soins, examens, avis,
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
      ? `<div style="font-weight:bold;margin-top:2px;">**** ${p.reglesConditionnelles.map(r => sanitizeRichHtml(r)).join(' \u2014 ')}</div>`
      : ''
    return `
      <div style="margin-bottom:10px;">
        <div><span style="font-weight:bold;">${nameHtml}</span> : ${posologieHtml}</div>
        ${reglesHtml}
      </div>`
  }

  const renderPrescriptionSection = (title: string, items: Array<{ nomMedicament: string; posologie: string; reglesConditionnelles?: string[]; dureeType?: 'courte' | 'longue' }>) => items.length > 0
    ? `<div style="font-weight:bold;font-size:14px;margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(title)}</div><div style="padding-left:20px;">${items.map(renderPrescriptionItem).join('')}</div>`
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

  // ── Soins HTML (détails riches) ──
  const richDetail = (html: string | undefined): string =>
    html
      ? sanitizeRichHtml(html)
          .replace(/^<p[^>]*>\s*/i, '')
          .replace(/<\/p>\s*$/i, '')
          .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
      : ''

  const renderSoinItem = (s: NonNullable<typeof soins>[number]) => {
    if (!s.nom && !s.quantiteFrequence) return ''
    const main = `<div style="margin-bottom:4px;"><span style="font-weight:bold;">${escapeHtml(s.nom)}</span> : ${escapeHtml(s.quantiteFrequence)}</div>`
    const lines: string[] = []
    if (s.nbSeances != null) {
      lines.push(`<div style="margin-bottom:2px;font-size:11px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Nb s\u00e9ances :</span> ${escapeHtml(String(s.nbSeances))}</div>`)
    }
    if (s.objectifClinique) {
      lines.push(`<div style="margin-bottom:2px;font-size:11px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Objectif clinique :</span> ${richDetail(s.objectifClinique)}</div>`)
    }
    if (s.consignesSpecifiques) {
      lines.push(`<div style="margin-bottom:2px;font-size:11px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Consignes sp\u00e9cifiques :</span> ${richDetail(s.consignesSpecifiques)}</div>`)
    }
    if (s.dispositifsMedicaux) {
      lines.push(`<div style="margin-bottom:2px;font-size:11px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Dispositifs &amp; Voies d\u2019abord :</span> ${escapeHtml(s.dispositifsMedicaux)}</div>`)
    }
    if (s.professionnelCible) {
      lines.push(`<div style="margin-bottom:2px;font-size:11px;color:#444;padding-left:10px;"><span style="font-weight:bold;">Professionnel cible :</span> ${escapeHtml(s.professionnelCible)}</div>`)
    }
    return main + lines.join('')
  }
  const soinsHtml = soins && soins.length > 0
    ? `<div style="margin-top:12px;margin-bottom:4px;font-weight:bold;font-size:14px;">SOINS</div>
       <div style="padding-left:16px;">${soins.map(renderSoinItem).join('')}</div>`
    : ''

  // ── Demandes d'examens HTML ──
  const fmtPlannedDate = (d: string): string => {
    const m = String(d).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    return String(d)
  }
  const renderOrdonnancePlanMeta = (e: { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }): string => {
    const prescripteur = typeof e.prescripteur === 'string' ? e.prescripteur.trim() : ''
    const plannedDate = typeof e.plannedDate === 'string' ? e.plannedDate.trim() : ''
    const plannedHour = typeof e.plannedHour === 'number' && Number.isFinite(e.plannedHour) ? e.plannedHour : null
    const parts: string[] = []
    if (prescripteur) parts.push(`Prescrit par ${escapeHtml(prescripteur)}`)
    if (plannedDate || plannedHour != null) {
      if (plannedDate) {
        const ds = escapeHtml(fmtPlannedDate(plannedDate))
        parts.push(plannedHour != null ? `Planifié le ${ds} (à ${String(plannedHour).padStart(2, '0')}:00)` : `Planifié le ${ds}`)
      } else {
        parts.push(`Planifié à ${String(plannedHour!).padStart(2, '0')}:00`)
      }
    }
    if (!parts.length) return ''
    return `<div style="font-size:11px;color:#444;padding-left:10px;">${parts.join(' · ')}</div>`
  }
  const renderExamenItem = (e: { label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }) => {
    const label = escapeHtml(e.label || '')
    const detail = e.detail ? richDetail(e.detail) : ''
    if (!label && !detail) return ''
    const meta = renderOrdonnancePlanMeta(e)
    return `<div style="margin-bottom:4px;"><span style="font-weight:bold;">${label}</span>${detail ? ` : ${detail}` : ''}</div>${meta}`
  }
  const renderExamensSubgroup = (title: string, items: NonNullable<typeof examens>): string => {
    const itemsHtml = items.map(renderExamenItem).join('')
    if (!itemsHtml) return ''
    return `<div style="font-weight:bold;font-size:14px;margin:8px 0 4px;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(title)}</div><div style="padding-left:16px;">${itemsHtml}</div>`
  }
  const examensHtml = examens && examens.length > 0
    ? (() => {
        const hasKind = examens.some(e => e.kind === 'imagerie' || e.kind === 'laboratoire')
        // Compat : vieux items sans kind → rendu plat historique.
        const inner = !hasKind
          ? examens.map(renderExamenItem).join('')
          : examens.filter(e => e.kind !== 'imagerie' && e.kind !== 'laboratoire').map(renderExamenItem).join('') +
            renderExamensSubgroup('Imagerie', examens.filter(e => e.kind === 'imagerie')) +
            renderExamensSubgroup('Laboratoire', examens.filter(e => e.kind === 'laboratoire'))
        if (!inner) return ''
        return `<div style="margin-top:12px;margin-bottom:4px;font-weight:bold;font-size:14px;">DEMANDES D\u2019EXAMENS</div>
       <div style="padding-left:16px;">${inner}</div>`
      })()
    : ''

  // ── Avis spécialisés HTML ──
  const avisHtml = avis && avis.length > 0
    ? `<div style="margin-top:12px;margin-bottom:4px;font-weight:bold;font-size:14px;">AVIS SP\u00c9CIALIS\u00c9S</div>
       <div style="padding-left:16px;">${avis.map(renderExamenItem).join('')}</div>`
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
      ${soinsHtml}
      ${examensHtml}
      ${avisHtml}
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

// ─── Sanitiseur de HTML riche (allowlist, sans dépendance externe) ───────────
// Les champs riches (objectif clinique, consignes spécifiques, détail
// d'examens/avis, règles conditionnelles, CRH, annexes…) sont saisis via un
// éditeur de texte riche dans le renderer puis injectés TELS QUELS dans le HTML
// généré. C'est un vecteur XSS : un libellé ou un message hostile pourrait
// injecter <script>/onerror=/etc. dans le rendu print/export. Ce sanitiseur
// déterministe reconstruit chaque tag avec une allowlist stricte.

/** Tags autorisés. Tout autre tag est retiré (le contenu texte est conservé). */
const RICH_ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'span', 'a', 'img', 'mark',
])

/** Conteneurs supprimés ENTIERS (tag + contenu) : vecteurs d'exécution de script. */
const RICH_DROP_CONTAINER_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'svg', 'math', 'template',
])

/** Attributs autorisés par tag (tous les autres — dont tous les on* — sont retirés). */
const RICH_ALLOWED_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href']),
  img: new Set(['src', 'alt', 'width', 'height']),
  span: new Set(['style']),
  mark: new Set(['style', 'data-color']),
  p: new Set(['style']),
}

const SAFE_HTTP_URL_RE = /^https?:\/\//i
const SAFE_INTEGER_RE = /^\d+$/
const RICH_TAG_RE = /^<\s*(\/?)\s*([A-Za-z][A-Za-z0-9]*)((?:\s+[^<>]*)?)\s*\/?\s*>$/
const RICH_ATTR_RE = /[A-Za-z_:][A-Za-z0-9_:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>]+))?/g

/**
 * Sanitiseur déterministe de HTML riche (main-process, zéro dépendance).
 *
 * 1. script/style/iframe/object/embed/noscript/svg/math/template → supprimés
 *    avec leur contenu (boucle jusqu'à point fixe pour l'imbrication).
 * 2. Seuls `p, br, strong, em, u, b, i, ul, ol, li, span, a, img, mark`
 *    survivent. Tout autre tag est retiré mais son contenu texte est conservé.
 * 3. `a.href` et `img.src` : protocole http/https UNIQUEMENT (javascript:,
 *    data:, vbscript: rejetés). `img.alt` conservé, `img.width/height` entiers
 *    uniquement. `span/mark/p` conservent `style` restreint à `color`,
 *    `background-color`, `font-family`, `font-size`, `text-align` (valeurs
 *    strictement validées : hex, rgb()/hsl(), familles/tailles/alignements
 *    sûrs — ni `url()`, ni `expression()`, ni `!important`). `mark`
 *    conserve aussi `data-color` (surlignage TipTap). `class` et tous les
 *    attributs `on*` sont retirés.
 * 4. `<` résiduels n'ouvrant pas un tag autorisé (ex: "a < b") → échappés.
 *    Un `img` sans `src` valide est retiré entièrement.
 * 5. Tokens dangereux résiduels (javascript:, data:, onerror=, etc.) neutralisés
 *    en sortie, même lorsqu'ils ne sont que du texte pur (défense en profondeur).
 * 6. HTML sain (p/strong/em/ul/li/br) → sortie identique à l'entrée. Sortie vide → ''.
 */
function sanitizeRichHtml(html: string | null | undefined): string {
  if (html == null) return ''
  let out = String(html)

  // 1) Conteneurs dangereux : tag + contenu, jusqu'à point fixe.
  for (const tag of RICH_DROP_CONTAINER_TAGS) {
    const openCloseRe = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi')
    const bareRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
    let prev = ''
    while (prev !== out) {
      prev = out
      out = out.replace(openCloseRe, '')
      out = out.replace(bareRe, '')
    }
  }

  // 2) Reconstruction de chaque tag.
  out = out.replace(/<[^>]*>/g, (rawTag: string): string => {
    const m = RICH_TAG_RE.exec(rawTag)
    if (!m) {
      // commentaire, doctype, PI ou balise malformée → neutralisés
      return rawTag.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    const closing = m[1] === '/'
    const tag = m[2].toLowerCase()
    if (!RICH_ALLOWED_TAGS.has(tag)) return '' // tag non autorisé : contenu conservé
    if (closing) return `</${tag}>`
    const safeAttrs = sanitizeRichAttrs(tag, m[3] ?? '')
    if (tag === 'img' && !/\bsrc="/.test(safeAttrs)) return '' // img sans src valide
    return safeAttrs ? `<${tag} ${safeAttrs}>` : `<${tag}>`
  })

  // 3) Échappe les `<` résiduels qui n'ouvrent pas un tag autorisé (ex: "a < b").
  out = out.replace(/<(?!\/?(?:a|br|b|em|i|img|li|mark|ol|p|span|strong|u|ul)\b)/gi, '&lt;')

  // 4) Neutralise les tokens de protocole/événement résiduels (texte pur compris).
  //    Les entités (#58; = :, #61; = =) garantissent l'absence du sous-ensemble
  //    littéral `javascript:` / `data:` / `onerror=` dans la sortie.
  out = out
    .replace(/javascript\s*:/gi, 'javascript&#58;')
    .replace(/vbscript\s*:/gi, 'vbscript&#58;')
    .replace(/\bdata\s*:/gi, 'data&#58;')
    .replace(/\bonerror\s*=/gi, 'onerror&#61;')

  return out
}

function sanitizeRichAttrs(tag: string, attrsRaw: string): string {
  const allowed = RICH_ALLOWED_ATTRS[tag]
  if (!allowed) return ''
  const kept: string[] = []
  RICH_ATTR_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RICH_ATTR_RE.exec(attrsRaw)) !== null) {
    const raw = m[0]
    const eq = raw.indexOf('=')
    let name: string
    let value: string
    if (eq === -1) {
      name = raw.trim().toLowerCase()
      value = ''
    } else {
      name = raw.slice(0, eq).trim().toLowerCase()
      value = raw.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
    }
    if (!name || !allowed.has(name) || name.startsWith('on')) continue
    if (name === 'style') {
      const safe = sanitizeStyleValue(value)
      if (safe) kept.push(`style="${escapeHtml(safe)}"`)
      continue
    }
    // `data-color` (surlignage TipTap) : validé comme une couleur sûre.
    if (name === 'data-color') {
      if (isSafeStyleColor(value)) kept.push(`data-color="${escapeHtml(value.trim())}"`)
      continue
    }
    if (!isSafeRichAttrValue(name, value)) continue
    kept.push(`${name}="${escapeHtml(value)}"`)
  }
  return kept.join(' ')
}

function isSafeRichAttrValue(name: string, value: string): boolean {
  const v = value.trim()
  if (name === 'href' || name === 'src') return SAFE_HTTP_URL_RE.test(v)
  if (name === 'width' || name === 'height') return SAFE_INTEGER_RE.test(v)
  return true // alt : texte libre
}

/**
 * Propriétés CSS autorisées dans `style` (éditeur TipTap : couleur du texte,
 * surlignage, police, taille, alignement). Tout le reste est retiré.
 */
const SAFE_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-family',
  'font-size',
  'text-align',
])

const SAFE_STYLE_HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const SAFE_STYLE_RGB_RE = /^rgba?\(\s*\d{1,3}\s*(,\s*\d{1,3}\s*){2}(,\s*(0|1|0?\.\d+)\s*)?\)$/
const SAFE_STYLE_HSL_RE = /^hsla?\(\s*\d{1,3}\s*(,\s*\d{1,3}%\s*){2}(,\s*(0|1|0?\.\d+)\s*)?\)$/
const SAFE_STYLE_FONT_FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9\s,'"-]*$/
const SAFE_STYLE_FONT_SIZE_RE = /^\d+(\.\d+)?(px|pt|em|rem|%)$/
const SAFE_STYLE_TEXT_ALIGN = new Set(['left', 'right', 'center', 'justify', 'start', 'end'])
const SAFE_STYLE_UNSAFE_VALUE_RE = /url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i

function isSafeStyleColor(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (v === 'inherit' || v === 'transparent') return true
  return SAFE_STYLE_HEX_RE.test(v) || SAFE_STYLE_RGB_RE.test(v) || SAFE_STYLE_HSL_RE.test(v)
}

/**
 * Filtre une valeur d'attribut `style` : ne conserve que les déclarations
 * sûres (`color`, `background-color`, `font-family`, `font-size`,
 * `text-align` avec valeurs strictement validées). Retourne '' si rien
 * ne subsiste. Bloque notamment `url(javascript:…)`, `expression(…)`,
 * `behavior:` et `!important`.
 */
function sanitizeStyleValue(raw: string): string {
  const out: string[] = []
  for (const decl of String(raw ?? '').split(';')) {
    const colon = decl.indexOf(':')
    if (colon === -1) continue
    const prop = decl.slice(0, colon).trim().toLowerCase()
    const val = decl.slice(colon + 1).trim()
    if (!SAFE_STYLE_PROPS.has(prop) || !val) continue
    if (val.includes('!') || SAFE_STYLE_UNSAFE_VALUE_RE.test(val)) continue
    let ok = false
    if (prop === 'color' || prop === 'background-color') {
      ok = isSafeStyleColor(val)
    } else if (prop === 'font-family') {
      ok = SAFE_STYLE_FONT_FAMILY_RE.test(val)
    } else if (prop === 'font-size') {
      ok = SAFE_STYLE_FONT_SIZE_RE.test(val)
    } else if (prop === 'text-align') {
      ok = SAFE_STYLE_TEXT_ALIGN.has(val.toLowerCase())
    }
    if (ok) out.push(`${prop}: ${val}`)
  }
  return out.join('; ')
}

function richHtml(v: string | null | undefined): string {
  return hasText(v) ? sanitizeRichHtml(v) : ''
}


export interface BonCommandeLigneTemplate {
  designation: string
  forme?: string | null
  dosage?: string | null
  conditionnement?: string | null
  unite?: string | null
  cmm?: number | null
  stockRestant?: number | null
  quantiteCommandee: number
  quantiteLivree?: number | null
}

export interface BonCommandeTemplateData {
  numero: string
  dateCommande: string
  datePrevue?: string | null
  periode?: string | null
  urgence?: boolean
  statut?: string | null
  fournisseurNom?: string | null
  notes?: string | null
  lignes: BonCommandeLigneTemplate[]
}

function frDate(value: string | null | undefined): string {
  if (!value) return '—'
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : value
}

function num(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('fr-FR')
}

/**
 * Bon de commande pharmacie — document sans aucun prix ni montant.
 * Les colonnes sont volontairement limitées aux quantités et aux indicateurs
 * de consommation (CMM / stock restant).
 */
export function generateBonCommandeHtml(params: {
  commande: BonCommandeTemplateData
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string }
  logoBase64: string | null
  generatedAt?: string
}): string {
  const { commande, hospital, logoBase64 } = params
  const generatedAt = params.generatedAt
    ?? new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

  const totalCommandee = commande.lignes.reduce((sum, l) => sum + Number(l.quantiteCommandee ?? 0), 0)

  const rows = commande.lignes.map((l, index) => `
    <tr${index % 2 === 1 ? ' class="alt"' : ''}>
      <td class="center">${index + 1}</td>
      <td><strong>${escapeHtml(l.designation)}</strong></td>
      <td>${escapeHtml(l.forme || '—')}</td>
      <td>${escapeHtml(l.dosage || '—')}</td>
      <td>${escapeHtml(l.conditionnement || '—')}</td>
      <td class="center">${escapeHtml(l.unite || '—')}</td>
      <td class="center strong">${num(l.quantiteCommandee)}</td>
    </tr>`).join('')

  const urgence = commande.urgence
    ? '<span class="badge badge--urgent">URGENT</span>'
    : '<span class="badge badge--normal">NORMAL</span>'

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Bon de commande ${escapeHtml(commande.numero)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 12mm 18mm 12mm;
    @bottom-center { content: "— Page " counter(page) " / " counter(pages) " —"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #888; } }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 10px; color: #222; line-height: 1.4; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Aperçu écran : l'iframe n'applique pas les marges @page (impression
     uniquement) → sans ce padding, le contenu touche les bords et les textes
     alignés à droite sont rognés. */
  @media screen { body { padding: 12mm 12mm 18mm; } }
  .republique { text-align: center; margin-bottom: 4px; }
  .rep-devise { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; color: #0b3b6b; }
  .rep-devise-sub { font-size: 10px; font-weight: 600; color: #555; letter-spacing: .8px; }
  .separator { text-align: center; font-size: 11px; color: #999; margin: 4px 0; }
  .header { display: flex; align-items: center; margin: 6px 0 4px; }
  .header-text { flex: 1; }
  .institution-name { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .institution-addr, .institution-contact, .institution-reg { font-size: 10px; color: #555; margin-top: 1px; }
  .doc-title-block { margin: 8px 0 10px; display: flex; justify-content: space-between; align-items: baseline; }
  .doc-title { font-size: 16px; font-weight: 800; color: #0b3b6b; letter-spacing: 1.5px; }
  .doc-meta { text-align: right; font-size: 9px; color: #777; line-height: 1.6; }
  .doc-ref { display: block; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #555; }
  .doc-date { display: block; }
  .recipient { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; border: 1px solid #cfd9e6; background: #f4f7fb; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; font-size: 9.5px; }
  .recipient__label { font-size: 8px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #6b7280; }
  .recipient__name { font-weight: 800; color: #0b3b6b; }
  .meta { display: flex; gap: 8px; margin-bottom: 10px; }
  .meta__box { flex: 1; min-width: 0; border: 1px solid #cfd9e6; border-radius: 6px; padding: 6px 9px; }
  .meta__label { font-size: 8px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: #6b7280; }
  .meta__value { margin-top: 2px; font-size: 10px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-weight: 700; font-size: 8.5px; }
  .badge--urgent { background: #fee2e2; color: #991b1b; }
  .badge--normal { background: #dcfce7; color: #166534; }
  table.doc-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 2px; }
  .doc-table thead { display: table-header-group; }
  .doc-table th { background: #0b3b6b; color: #fff; font-size: 8.5px; font-weight: 700; line-height: 1.25; letter-spacing: .2px; text-transform: uppercase; text-align: left; vertical-align: middle; padding: 6px 4px; border: 1px solid #0a2f55; overflow-wrap: anywhere; }
  .doc-table td { padding: 6px 5px; border: 1px solid #d7dee8; vertical-align: middle; font-size: 9.5px; overflow-wrap: anywhere; }
  .doc-table tbody tr.alt td { background: #f5f8fc; }
  .doc-table .center { text-align: center; }
  .doc-table .right { text-align: right; }
  .doc-table .strong { font-weight: 700; }
  .doc-table tfoot td { padding: 6px 5px; background: #eef4fb; border: 1px solid #d7dee8; font-weight: 700; }
  .notes { margin-top: 10px; border: 1px solid #cfd9e6; border-radius: 6px; padding: 7px 10px; min-height: 34px; font-size: 9.5px; }
  .notes__label { margin-bottom: 3px; font-size: 8px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #6b7280; }
  .signatures { display: flex; justify-content: space-between; gap: 20px; margin-top: 26px; }
  .signature { flex: 1; text-align: center; font-size: 9px; }
  .signature__line { margin-top: 30px; padding-top: 4px; border-top: 1px solid #374151; font-weight: 700; color: #111827; }
  .signature__stamp { margin-top: 6px; font-size: 8px; font-style: italic; color: #6b7280; }
  .footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #ddd; text-align: center; font-size: 8px; color: #aaa; }
  .generated { margin-top: 6px; text-align: right; font-size: 8px; color: #888; }
  @media print { body { margin: 0; padding: 0; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  ${generateMedicalHeader(hospital, logoBase64, 'BON DE COMMANDE', commande.numero)}

  <div class="recipient">
    <span class="recipient__label">Destinataire</span>
    <span class="recipient__name">${escapeHtml(commande.fournisseurNom || '—')}</span>
  </div>

  <div class="meta">
    <div class="meta__box"><div class="meta__label">Date de commande</div><div class="meta__value">${frDate(commande.dateCommande)}</div></div>
    <div class="meta__box"><div class="meta__label">Date prévue</div><div class="meta__value">${frDate(commande.datePrevue)}</div></div>
    <div class="meta__box"><div class="meta__label">Période</div><div class="meta__value">${escapeHtml(commande.periode || '—')}</div></div>
    <div class="meta__box"><div class="meta__label">Priorité</div><div class="meta__value">${urgence}</div></div>
    <div class="meta__box"><div class="meta__label">Statut</div><div class="meta__value">${escapeHtml(commandeStatutLabel(commande.statut))}</div></div>
  </div>

  <table class="doc-table">
    <colgroup>
      <col style="width:5%" />
      <col style="width:29%" />
      <col style="width:12%" />
      <col style="width:12%" />
      <col style="width:20%" />
      <col style="width:8%" />
      <col style="width:14%" />
    </colgroup>
    <thead>
      <tr>
        <th class="center">N°</th>
        <th>DCI</th>
        <th>Forme</th>
        <th>Dosage</th>
        <th>Conditionnement</th>
        <th class="center">Unité</th>
        <th class="center">Quantité commandée</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" class="center" style="padding:14px;color:#6b7280;">Aucune ligne</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" class="right">TOTAUX</td>
        <td class="center">${num(totalCommandee)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="notes">
    <div class="notes__label">Observations</div>
    <div>${escapeHtml(commande.notes || '—')}</div>
  </div>

  <div class="signatures">
    <div class="signature">
      <div class="signature__line">Pharmacien chef</div>
    </div>
    <div class="signature">
      <div class="signature__line">Directeur de l’établissement</div>
    </div>
    <div class="signature">
      <div class="signature__line">Visa DPS-DCS</div>
      <div class="signature__stamp">Cachet et signature</div>
    </div>
  </div>

  ${generateFooter()}
  <div class="generated">Document généré le ${escapeHtml(generatedAt)}</div>
</body>
</html>`
}

export interface BonReceptionLigneTemplate {
  designation: string
  forme?: string | null
  dosage?: string | null
  conditionnement?: string | null
  unite?: string | null
  /** Consommation moyenne mensuelle figée au moment de la commande. */
  cmm?: number | null
  /** Stock restant au moment de la commande. */
  stockRestant?: number | null
  quantiteCommandee?: number | null
  /** Quantité livrée cumulée sur la ligne du bon de commande. */
  quantiteLivree?: number | null
  quantiteRecue?: number | null
  numeroLot?: string | null
  datePeremption?: string | null
}

export interface BonReceptionTemplateData {
  /** Référence du document, ex. `BR-BC-20261024-0001`. */
  reference: string
  commandeNumero?: string | null
  dateCommande?: string | null
  dateReception: string
  refBl?: string | null
  fournisseurNom?: string | null
  notes?: string | null
  /** Noms des pièces jointes (BL, facture…) — jamais leur contenu. */
  attachments?: string[]
  lignes: BonReceptionLigneTemplate[]
}

/**
 * Bon de réception pharmacie — second document du bon de commande.
 *
 * Il détaille chaque ligne réellement reçue (lot, péremption, quantités) et
 * reprend le socle visuel commun des documents CDE (en-tête, pied de page).
 */
export function generateBonReceptionHtml(params: {
  reception: BonReceptionTemplateData
  hospital: { name?: string; address?: string; phone?: string; email?: string; regNumber?: string; city?: string }
  logoBase64: string | null
  generatedAt?: string
}): string {
  const { reception, hospital, logoBase64 } = params
  const generatedAt = params.generatedAt
    ?? new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

  const totalCommandee = reception.lignes.reduce((sum, l) => sum + Number(l.quantiteCommandee ?? 0), 0)
  const totalLivree = reception.lignes.reduce((sum, l) => sum + Number(l.quantiteLivree ?? 0), 0)
  const totalRecue = reception.lignes.reduce((sum, l) => sum + Number(l.quantiteRecue ?? 0), 0)

  const rows = reception.lignes.map((l, index) => `
    <tr${index % 2 === 1 ? ' class="alt"' : ''}>
      <td class="center">${index + 1}</td>
      <td><strong>${escapeHtml(l.designation)}</strong></td>
      <td>${escapeHtml(l.forme || '—')}</td>
      <td>${escapeHtml(l.dosage || '—')}</td>
      <td>${escapeHtml(l.conditionnement || '—')}</td>
      <td class="center">${escapeHtml(l.unite || '—')}</td>
      <td class="center">${num(l.cmm)}</td>
      <td class="center">${num(l.stockRestant)}</td>
      <td class="center">${num(l.quantiteCommandee)}</td>
      <td class="center">${num(l.quantiteLivree)}</td>
      <td class="center strong">${num(l.quantiteRecue)}</td>
      <td class="center">${escapeHtml(l.numeroLot || '—')}</td>
      <td class="center">${escapeHtml(frDate(l.datePeremption))}</td>
    </tr>`).join('')

  const attachmentsHtml = (reception.attachments ?? []).length > 0
    ? `<div class="notes"><div class="notes__label">Pièces jointes</div><div>${reception.attachments!.map((name) => escapeHtml(name)).join(' · ')}</div></div>`
    : ''

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Bon de réception ${escapeHtml(reception.reference)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 12mm 18mm 12mm;
    @bottom-center { content: "— Page " counter(page) " / " counter(pages) " —"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #888; } }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 10px; color: #222; line-height: 1.4; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* L'iframe d'aperçu n'applique pas les marges @page (impression) : sans ce
     padding écran, le contenu touche les bords et les textes sont rognés. */
  @media screen { body { padding: 12mm 12mm 18mm; } }
  .republique { text-align: center; margin-bottom: 4px; }
  .rep-devise { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; color: #0b3b6b; }
  .rep-devise-sub { font-size: 10px; font-weight: 600; color: #555; letter-spacing: .8px; }
  .separator { text-align: center; font-size: 11px; color: #999; margin: 4px 0; }
  .header { display: flex; align-items: center; margin: 6px 0 4px; }
  .header-text { flex: 1; }
  .institution-name { font-size: 16px; font-weight: 700; color: #0b3b6b; }
  .institution-addr, .institution-contact, .institution-reg { font-size: 10px; color: #555; margin-top: 1px; }
  .doc-title-block { margin: 8px 0 10px; display: flex; justify-content: space-between; align-items: baseline; }
  .doc-title { font-size: 16px; font-weight: 800; color: #0b3b6b; letter-spacing: 1.5px; }
  .doc-meta { text-align: right; font-size: 9px; color: #777; line-height: 1.6; }
  .doc-ref { display: block; font-family: 'Courier New', Courier, monospace; font-weight: 600; color: #555; }
  .doc-date { display: block; }
  .meta { display: flex; gap: 8px; margin-bottom: 10px; }
  .meta__box { flex: 1; min-width: 0; border: 1px solid #cfd9e6; border-radius: 6px; padding: 6px 9px; }
  .meta__label { font-size: 8px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: #6b7280; }
  .meta__value { margin-top: 2px; font-size: 10px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  table.doc-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 2px; }
  .doc-table thead { display: table-header-group; }
  .doc-table th { background: #0b3b6b; color: #fff; font-size: 8.5px; font-weight: 700; line-height: 1.25; letter-spacing: .2px; text-transform: uppercase; text-align: left; vertical-align: middle; padding: 6px 4px; border: 1px solid #0a2f55; overflow-wrap: anywhere; }
  .doc-table td { padding: 6px 5px; border: 1px solid #d7dee8; vertical-align: middle; font-size: 9.5px; overflow-wrap: anywhere; }
  .doc-table tbody tr.alt td { background: #f5f8fc; }
  .doc-table .center { text-align: center; }
  .doc-table .right { text-align: right; }
  .doc-table .strong { font-weight: 700; }
  .doc-table tfoot td { padding: 6px 5px; background: #eef4fb; border: 1px solid #d7dee8; font-weight: 700; }
  .notes { margin-top: 10px; border: 1px solid #cfd9e6; border-radius: 6px; padding: 7px 10px; min-height: 34px; font-size: 9.5px; }
  .notes__label { margin-bottom: 3px; font-size: 8px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #6b7280; }
  .signatures { display: flex; justify-content: space-between; gap: 20px; margin-top: 26px; }
  .signature { flex: 1; text-align: center; font-size: 9px; }
  .signature__line { margin-top: 30px; padding-top: 4px; border-top: 1px solid #374151; font-weight: 700; color: #111827; }
  .signature__stamp { margin-top: 6px; font-size: 8px; font-style: italic; color: #6b7280; }
  .footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #ddd; text-align: center; font-size: 8px; color: #aaa; }
  .generated { margin-top: 6px; text-align: right; font-size: 8px; color: #888; }
  @media print { body { margin: 0; padding: 0; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  ${generateMedicalHeader(hospital, logoBase64, 'BON DE RÉCEPTION', reception.reference)}

  <div class="meta">
    <div class="meta__box"><div class="meta__label">Date de réception</div><div class="meta__value">${frDate(reception.dateReception)}</div></div>
    <div class="meta__box"><div class="meta__label">Bon de commande</div><div class="meta__value">${escapeHtml(reception.commandeNumero || '—')}</div></div>
    <div class="meta__box"><div class="meta__label">Fournisseur</div><div class="meta__value">${escapeHtml(reception.fournisseurNom || '—')}</div></div>
    <div class="meta__box"><div class="meta__label">Référence BL</div><div class="meta__value">${escapeHtml(reception.refBl || '—')}</div></div>
    <div class="meta__box"><div class="meta__label">Quantités reçues</div><div class="meta__value">${num(totalRecue)} / ${num(totalCommandee)}</div></div>
  </div>

  <table class="doc-table">
    <colgroup>
      <col style="width:4%" />
      <col style="width:18%" />
      <col style="width:8%" />
      <col style="width:8%" />
      <col style="width:11%" />
      <col style="width:5%" />
      <col style="width:5%" />
      <col style="width:5%" />
      <col style="width:7%" />
      <col style="width:7%" />
      <col style="width:7%" />
      <col style="width:8%" />
      <col style="width:7%" />
    </colgroup>
    <thead>
      <tr>
        <th class="center">N°</th>
        <th>DCI</th>
        <th>Forme</th>
        <th>Dosage</th>
        <th>Conditionnement</th>
        <th class="center">Unité</th>
        <th class="center">CMM</th>
        <th class="center">SR</th>
        <th class="center">Qté commandée</th>
        <th class="center">Qté livrée</th>
        <th class="center">Qté reçue</th>
        <th class="center">N° lot</th>
        <th class="center">Péremption</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="13" class="center" style="padding:14px;color:#6b7280;">Aucune ligne reçue</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" class="right">TOTAUX</td>
        <td class="center"></td>
        <td class="center"></td>
        <td class="center">${num(totalCommandee)}</td>
        <td class="center">${num(totalLivree)}</td>
        <td class="center">${num(totalRecue)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>

  <div class="notes">
    <div class="notes__label">Observations</div>
    <div>${escapeHtml(reception.notes || '—')}</div>
  </div>

  ${attachmentsHtml}

  <div class="signatures">
    <div class="signature">
      <div class="signature__line">Réceptionné par — Pharmacien chef</div>
    </div>
    <div class="signature">
      <div class="signature__line">Livreur / Fournisseur</div>
    </div>
    <div class="signature">
      <div class="signature__line">Visa DPS-DCS</div>
      <div class="signature__stamp">Cachet et signature</div>
    </div>
  </div>

  ${generateFooter()}
  <div class="generated">Document généré le ${escapeHtml(generatedAt)}</div>
</body>
</html>`
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


