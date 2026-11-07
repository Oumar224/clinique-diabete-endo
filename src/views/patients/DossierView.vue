<template>
  <div class="dossier-view cde">
    <!-- Patient Info Sheet (shown when activePatient exists) -->
    <div v-if="patient" class="dossier-view__patient-info">
      <!-- Fieldset: Identite -->
      <section class="dossier-view__section">
        <h2 class="dossier-view__section-title">Identite</h2>
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
      </section>

      <!-- Fieldset: Contact & Residence -->
      <section class="dossier-view__section">
        <h2 class="dossier-view__section-title">Contact &amp; Residence</h2>
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
      </section>

      <!-- Fieldset: Informations Medicales -->
      <section class="dossier-view__section">
        <h2 class="dossier-view__section-title">Informations Medicales</h2>
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
                <span
                  v-for="(a, i) in normalizeAllergies(patient.allergies)"
                  :key="i"
                  class="dossier-view__allergy-chip"
                  :style="{ background: allergyTypeColors(a.type).bg, color: allergyTypeColors(a.type).text, borderColor: allergyTypeColors(a.type).border }"
                ><span class="dossier-view__allergy-type">{{ a.type }}</span> {{ a.libelle }}</span>
              </span>
            </span>
          </div>
        </div>
      </section>

      <!-- Fieldset: Personne de confiance (conditional) -->
      <section v-if="trustedPerson?.has_trusted" class="dossier-view__section">
        <h2 class="dossier-view__section-title">Personne de confiance</h2>
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
      </section>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useLocalites } from '@/composables/useLocalites'
import { useTrustedPerson, type TrustedPersonDto } from '@/composables/useTrustedPerson'
import { formatDate } from '@/utils/date'
import { getCiviliteSymbol } from '@/utils/civilite'
import { ipcInvoke } from '@/utils/ipc'
import { normalizeAllergies, allergyTypeColors } from '@/utils/allergy-helpers'
const { activePatient, age } = usePatientContext()
const { localites, fetchLocalites } = useLocalites()
const { getTrustedPerson } = useTrustedPerson()
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dossier-view__grid-2col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 32px;
  min-width: 0;
  max-width: 100%;
}
.dossier-view__grid-2col > * {
  min-width: 0;
}

/* ── Section card ── */
.dossier-view__section {
  background: var(--cde-bg);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 10px 14px 12px;
}

.dossier-view__section-title {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cde-muted);
  padding-bottom: 6px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--cde-border-soft);
}

.dossier-view__field {
  display: flex;
  gap: 12px;
  padding: 3px 0;
  align-items: baseline;
}

.dossier-view__label {
  min-width: 140px;
  font-size: 12px;
  color: var(--cde-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.dossier-view__value {
  font-size: 12.5px;
  color: var(--cd-gray-900);
  font-weight: 500;
  min-width: 0;
  overflow-wrap: anywhere;
}

.dossier-view__allergies-tags {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.dossier-view__allergy-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
  border: 1px solid;
}
.dossier-view__allergy-type {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
</style>
