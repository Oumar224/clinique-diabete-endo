<template>
  <div class="dossier-view">
    <!-- Patient Info Sheet (shown when activePatient exists) -->
    <div v-if="patient" class="dossier-view__patient-info">
      <!-- Fieldset: Identite -->
      <div class="form-group form-group--identite">
        <div class="form-group__legend">Identite</div>
        <div class="dossier-view__grid-2col">
          <div class="dossier-view__field">
            <span class="dossier-view__label">Civilite</span>
            <span class="dossier-view__value">{{ getCiviliteSymbol(patient.civilite) }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Date de naissance</span>
            <span class="dossier-view__value">{{ formatDate(patient.date_naissance) }} ({{ age }} ans)</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Lieu de naissance</span>
            <span class="dossier-view__value">{{ patient.lieu_naissance || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Profession</span>
            <span class="dossier-view__value">{{ patient.profession || '\u2014' }}</span>
          </div>
        </div>
      </div>

      <!-- Fieldset: Contact & Residence -->
      <div class="form-group form-group--contact">
        <div class="form-group__legend">Contact &amp; Residence</div>
        <div class="dossier-view__grid-2col">
          <div class="dossier-view__field">
            <span class="dossier-view__label">Telephone</span>
            <span class="dossier-view__value">{{ patient.telephone }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Region</span>
            <span class="dossier-view__value">{{ patient.region || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Email</span>
            <span class="dossier-view__value">{{ patient.email || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Commune</span>
            <span class="dossier-view__value">{{ residenceDisplay }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Complement adresse</span>
            <span class="dossier-view__value">{{ patient.complement_adresse || '\u2014' }}</span>
          </div>
        </div>
      </div>

      <!-- Fieldset: Informations Medicales -->
      <div class="form-group form-group--medical">
        <div class="form-group__legend">Informations Medicales</div>
        <div class="dossier-view__grid-2col">
          <div class="dossier-view__field">
            <span class="dossier-view__label">N&deg; SS/Assurance</span>
            <span class="dossier-view__value">{{ patient.nir }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Site</span>
            <span class="dossier-view__value">{{ siteName }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Assurance / Mutuelle</span>
            <span class="dossier-view__value">{{ patient.assuranceMutuelle || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Consentement etudes</span>
            <span class="dossier-view__value">{{ consentementLabel }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Medecin referent</span>
            <span class="dossier-view__value">{{ patient.medecin_traitant || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Allergies</span>
            <span class="dossier-view__value">
              <template v-if="!patient.allergies || patient.allergies.length === 0">Aucune</template>
              <span v-else class="dossier-view__allergies-tags">
                <el-tag v-for="a in patient.allergies" :key="a" type="danger" size="small">{{ a }}</el-tag>
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Fieldset: Personne de confiance (conditional) -->
      <div v-if="trustedPerson?.has_trusted" class="form-group form-group--trusted">
        <div class="form-group__legend">Personne de confiance</div>
        <div class="dossier-view__grid-2col">
          <div class="dossier-view__field">
            <span class="dossier-view__label">Nom</span>
            <span class="dossier-view__value">{{ trustedPerson.nom || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Prenom</span>
            <span class="dossier-view__value">{{ trustedPerson.prenom || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Profession</span>
            <span class="dossier-view__value">{{ trustedPerson.profession || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Telephone</span>
            <span class="dossier-view__value">{{ trustedPerson.telephone || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Email</span>
            <span class="dossier-view__value">{{ trustedPerson.email || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Residence</span>
            <span class="dossier-view__value">{{ trustedPersonDisplayResidence }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Complement</span>
            <span class="dossier-view__value">{{ trustedPerson.complement_adresse || '\u2014' }}</span>
          </div>
          <div class="dossier-view__field">
            <span class="dossier-view__label">Lien de parente</span>
            <span class="dossier-view__value">{{ trustedPerson.lien_parente || '\u2014' }}</span>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useLocalites } from '@/composables/useLocalites'
import { getTrustedPerson, type TrustedPersonDto } from '@/composables/useTrustedPerson'
import { formatDate } from '@/utils/date'
import { getCiviliteSymbol } from '@/utils/civilite'
import { ipcInvoke } from '@/utils/ipc'
const { activePatient, age } = usePatientContext()
const { localites, fetchLocalites } = useLocalites()
const trustedPerson = ref<TrustedPersonDto | null>(null)
const sites = ref<Array<{ id: number; name: string }>>([])

const patient = computed(() => activePatient.value)

const residenceDisplay = computed(() => {
  const p = patient.value
  if (!p?.residence_code) return '\u2014'
  if (!localites.value) return p.residence_code
  const leaf = localites.value.find(l => l.code === p.residence_code)
  if (!leaf) return p.residence_code
  return leaf.name
})

const siteName = computed(() => {
  if (!patient.value?.site_id) return '\u2014'
  const site = sites.value.find(s => s.id === patient.value!.site_id)
  return site?.name ?? '\u2014'
})

const consentementLabel = computed(() => {
  if (!patient.value?.consentementEtude) return '\u2014'
  const labels: Record<string, string> = { oui: 'Oui', non: 'Non', non_precise: 'Non precise' }
  return labels[patient.value.consentementEtude] || patient.value.consentementEtude
})

const trustedPersonDisplayResidence = computed(() => {
  const tp = trustedPerson.value
  if (!tp) return '\u2014'
  if (tp.residence_code) {
    if (!localites.value) return tp.residence_code
    const leaf = localites.value.find(l => l.code === tp.residence_code)
    if (leaf) return leaf.name
    return tp.residence_code
  }
  return tp.residence || '\u2014'
})

onMounted(async () => {
  await fetchLocalites(false)
  if (patient.value?.id) {
    try {
      trustedPerson.value = await getTrustedPerson(patient.value.id)
    } catch { trustedPerson.value = null }
    try {
      sites.value = await ipcInvoke<Array<{ id: number; name: string }>>('sites:list')
    } catch { sites.value = [] }
  }
})
</script>

<style scoped>
.dossier-view__patient-info {
  margin-bottom: 8px;
}

.dossier-view__grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

/* Section card styling */
.form-group {
  border-radius: 10px;
  padding: 16px 20px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.form-group--identite {
  background: #EBF2FA;
}

.form-group--contact {
  background: #EBFAF2;
}

.form-group--medical {
  background: #F5EBFA;
}

.form-group--trusted {
  background: #FAF5EB;
}

.form-group__legend {
  font-size: 15px;
  font-weight: 700;
  color: var(--cd-gray-800, #2c3e50);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
  letter-spacing: 0.3px;
}

.dossier-view__field {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  align-items: baseline;
}

.dossier-view__label {
  min-width: 120px;
  font-size: 13px;
  color: var(--cd-gray-600);
  font-weight: 600;
  flex-shrink: 0;
}

.dossier-view__value {
  font-size: 14px;
  color: var(--cd-gray-900);
  font-weight: 500;
}

.dossier-view__allergies-tags {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* ── Responsive: single column on mobile ─────────────────── */
@media (max-width: 767px) {
  .dossier-view__grid-2col {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .form-group {
    padding: 12px 14px 16px;
  }

  .dossier-view__label {
    min-width: 100px;
    font-size: 12px;
  }

  .dossier-view__value {
    font-size: 13px;
  }

  .form-group__legend {
    font-size: 14px;
  }
}

/* ── Larger screens: more generous spacing ───────────────── */
@media (min-width: 1400px) {
  .dossier-view__grid-2col {
    gap: 14px 32px;
  }

  .form-group {
    padding: 20px 28px 24px;
  }

  .dossier-view__label {
    min-width: 130px;
    font-size: 14px;
  }

  .dossier-view__value {
    font-size: 15px;
  }

  .form-group__legend {
    font-size: 16px;
    margin-bottom: 16px;
  }
}
</style>
