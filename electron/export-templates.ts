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

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    MEDECIN: 'Médecin',
    SECRETAIRE: 'Secrétaire',
    PHARMACIEN: 'Pharmacien',
    COMPTABLE: 'Comptable',
    ADMIN: 'Administrateur',
    INFIRMIER: 'Infirmier d\'État',
  }
  return labels[role] || role
}
