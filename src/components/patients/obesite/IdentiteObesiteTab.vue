<!-- IdentiteObesiteTab — CRC Obésité : identité & admission & contacts (pattern AdmissionTab :
  StagedCollapsibleSection `draft` par `keys` + FormPreview ; `save` -> `change`).
  Identité lecture seule via usePatientContext().activePatient (Nom/Prénoms, Âge via
  calcAge, Sexe via `civilite`, Tél, Quartier=`complement_adresse`, Commune/Préfecture
  via `residence_code`+useLocalites). Mécanisme de contact : pont `contactModel`
  getters/setters vers `infos` et `data` pour garder un seul draft sans perte. -->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection :ref="setSectionRef('identite')" title="Identité" :keys="[]" :model-value="infos" :readonly="true" :hide-footer="true">
      <template #default>
        <p class="readonly-note">Lecture seule depuis le contexte patient — modifier via la fiche patient.</p>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="Nom / Prénoms"><el-input :model-value="displayName" disabled /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="Âge"><el-input :model-value="ageLabel" disabled /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="Sexe"><el-input :model-value="sexeLabel" disabled /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="Tél"><el-input :model-value="telephoneLabel" disabled /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="Quartier"><el-input :model-value="quartierLabel" disabled /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="Commune / Préfecture"><el-input :model-value="residenceLabel" disabled /></el-form-item></el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>
    <div class="section-preview"><FormPreview title="Identité" variant="compact" :fields="identitePreviewFields" @edit="() => openSection('identite')" /></div>

    <StagedCollapsibleSection :ref="setSectionRef('sejour')" title="Détails / date d'admission" :keys="['dateEntree', 'serviceAccueil']" :model-value="data" :readonly="readonly" @save="emit('change')">
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="Date d'entrée"><el-date-picker v-model="draft.dateEntree" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width: 100%" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="Service d'accueil"><el-input :model-value="draft.serviceAccueil" :disabled="true" /></el-form-item></el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>
    <div class="section-preview"><FormPreview title="Détails / date d'admission" variant="compact" :fields="sejourPreviewFields" @edit="() => openSection('sejour')" /></div>

    <StagedCollapsibleSection :ref="setSectionRef('infos')" title="Informations complémentaires" :keys="['profession', 'residence', 'villageNaissance', 'sousPrefecture', 'prefecture', 'telephones', 'mail']" :model-value="infos" :readonly="readonly" @save="emit('change')">
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="Profession"><el-input v-model="draft.profession" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="16"><el-form-item label="Résidence (Quartier/commune/ville)"><el-input v-model="draft.residence" :disabled="readonly" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="Nom du village de naissance"><el-input v-model="draft.villageNaissance" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="Sous-préfecture"><el-input v-model="draft.sousPrefecture" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="Préfecture"><el-input v-model="draft.prefecture" :disabled="readonly" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="Téléphones"><el-input v-model="draft.telephones" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="Mail"><el-input v-model="draft.mail" :disabled="readonly" /></el-form-item></el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>
    <div class="section-preview"><FormPreview title="Informations complémentaires" variant="compact" :fields="infosPreviewFields" @edit="() => openSection('infos')" /></div>

    <StagedCollapsibleSection :ref="setSectionRef('confiance')" title="Personne de confiance" :keys="['personneConfiance', 'lienParente', 'telephoneConfiance']" :model-value="infos" :readonly="readonly" @save="emit('change')">
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="Personne de confiance"><el-input v-model="draft.personneConfiance" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="Lien de parenté"><el-input v-model="draft.lienParente" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="Téléphone"><el-input v-model="draft.telephoneConfiance" :disabled="readonly" /></el-form-item></el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>
    <div class="section-preview"><FormPreview title="Personne de confiance" variant="compact" :fields="confiancePreviewFields" @edit="() => openSection('confiance')" /></div>

    <StagedCollapsibleSection :ref="setSectionRef('contact')" title="Mécanisme de contact" :keys="['typeContact', 'premierContactMotif', 'mecanismeContact', 'mecanismeAutres', 'medecinAccueil', 'medecinTraitantNom', 'interneIPANom']" :model-value="contactModel" :readonly="readonly" @save="emit('change')">
      <template #default="{ draft }">
        <el-row :gutter="16"><el-col :span="24">
          <el-form-item label="Type de contact">
            <el-radio-group v-model="draft.typeContact" :disabled="readonly">
              <el-radio value="ancien">Ancien</el-radio>
              <el-radio value="nouveau">Nouveau contact suivi</el-radio>
              <el-radio value="premier">1er contact</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col></el-row>
        <el-row v-if="draft.typeContact === 'premier'" :gutter="16"><el-col :span="24">
          <el-form-item label="Si 1er contact, précisez :">
            <el-radio-group v-model="draft.premierContactMotif" :disabled="readonly">
              <el-radio value="diabete">Diabète</el-radio>
              <el-radio value="endocrino">Endocrino</el-radio>
              <el-radio value="obesite">Obésité</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col></el-row>
        <el-row :gutter="16"><el-col :span="24">
          <el-form-item label="Mécanisme de contact">
            <el-checkbox-group v-model="draft.mecanismeContact" :disabled="readonly">
              <el-checkbox value="patient">Patient</el-checkbox>
              <el-checkbox value="clinique">Clinique</el-checkbox>
              <el-checkbox value="assurance">Assurance</el-checkbox>
              <el-checkbox value="internet">Internet</el-checkbox>
              <el-checkbox value="autres">Autres</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-col></el-row>
        <el-row v-if="draft.mecanismeContact?.includes('autres')" :gutter="16"><el-col :span="24">
          <el-form-item label="Autres (préciser)"><el-input v-model="draft.mecanismeAutres" :disabled="readonly" /></el-form-item>
        </el-col></el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="Médecin/IDE d'accueil"><el-input v-model="draft.medecinAccueil" :disabled="readonly" /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="Médecin référent">
              <el-select v-model="draft.medecinTraitantNom" filterable clearable placeholder="Choisir un médecin" style="width:100%" :disabled="readonly">
                <el-option v-for="doc in doctors" :key="doc.id" :label="formatDocLabel(doc)" :value="formatDocLabel(doc)" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="Responsable"><el-input :model-value="draft.interneIPANom || '—'" disabled /></el-form-item></el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>
    <div class="section-preview"><FormPreview title="Mécanisme de contact" variant="compact" :fields="contactPreviewFields" @edit="() => openSection('contact')" /></div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { ipcInvoke } from '@/utils/ipc'
import { formatDate } from '@/utils/date'
import { usePatientContext } from '@/composables/usePatientContext'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import { useLocalites } from '@/composables/useLocalites'

interface DoctorOption { id: number; nom: string; prenom: string }

const props = withDefaults(defineProps<{
  data: CrcObesiteFormData['admission']
  infos: CrcObesiteFormData['informationsComplementaires']
  dateEntree: string
  readonly?: boolean
}>(), { readonly: false })

const emit = defineEmits<{ change: [] }>()
const { activePatient } = usePatientContext()
const { calcAge } = useCrhDiabeteCalculations()
const { localites, fetchLocalites } = useLocalites()
const sectionRefs = ref<Record<string, InstanceType<typeof StagedCollapsibleSection> | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => { sectionRefs.value[key] = el as InstanceType<typeof StagedCollapsibleSection> | null }
}
async function openSection(key: string) {
  const section = sectionRefs.value[key]
  if (section && typeof section.open === 'function') section.open()
  await nextTick()
  sectionRefs.value[key]?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

// Pont infos+admission pour garder un seul draft Médecin (getters/setters délégués).
const contactModel: Record<string, unknown> = {}
for (const key of ['typeContact', 'premierContactMotif', 'mecanismeContact', 'mecanismeAutres', 'medecinAccueil'] as const) {
  Object.defineProperty(contactModel, key, {
    enumerable: true, configurable: true,
    get: () => (props.infos as unknown as Record<string, unknown>)[key],
    set: (v: unknown) => { (props.infos as unknown as Record<string, unknown>)[key] = v },
  })
}
for (const key of ['medecinTraitantNom', 'interneIPANom'] as const) {
  Object.defineProperty(contactModel, key, {
    enumerable: true, configurable: true,
    get: () => (props.data as unknown as Record<string, unknown>)[key],
    set: (v: unknown) => { (props.data as unknown as Record<string, unknown>)[key] = v },
  })
}

const displayName = computed(() => {
  const p = activePatient.value
  if (!p) return '—'
  return `${p.nom || ''} ${p.prenom || ''}`.trim() || '—'
})
const patientAge = computed<number | null>(() => {
  const p = activePatient.value
  if (!p?.date_naissance) return null
  const refDate = props.dateEntree || props.data.dateEntree
  if (!refDate) return null
  return calcAge(p.date_naissance, refDate)
})
const ageLabel = computed(() => (patientAge.value != null ? `${patientAge.value} ans` : '—'))
const sexeLabel = computed(() => {
  const c = activePatient.value?.civilite
  if (c === 'M') return 'Masculin'
  if (c === 'Mme' || c === 'Mlle') return 'Féminin'
  return '—'
})
const telephoneLabel = computed(() => activePatient.value?.telephone || '—')
const quartierLabel = computed(() => activePatient.value?.complement_adresse || '—')
const residenceLabel = computed(() => {
  const code = activePatient.value?.residence_code
  if (code) {
    const found = localites.value.find(l => l.code === code)
    return found?.name ?? code
  }
  const region = activePatient.value?.region
  if (region) {
    const found = localites.value.find(l => l.code === region)
    return found?.name ?? region
  }
  return '—'
})

const doctors = ref<DoctorOption[]>([])
function formatDocLabel(doc: DoctorOption): string { return `${doc.prenom} ${doc.nom}` }

const identitePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Nom / Prénoms', value: displayName.value },
  { label: 'Âge', value: ageLabel.value },
  { label: 'Sexe', value: sexeLabel.value },
  { label: 'Tél', value: telephoneLabel.value },
  { label: 'Quartier', value: quartierLabel.value },
  { label: 'Commune / Préfecture', value: residenceLabel.value },
])
const sejourPreviewFields = computed<FormPreviewField[]>(() => [
  { label: "Date d'entrée", value: props.data.dateEntree ? formatDate(props.data.dateEntree) : '' },
  { label: "Service d'accueil", value: props.data.serviceAccueil },
])
const infosPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Profession', value: props.infos.profession },
  { label: 'Résidence', value: props.infos.residence },
  { label: 'Village de naissance', value: props.infos.villageNaissance },
  { label: 'Sous-préfecture', value: props.infos.sousPrefecture },
  { label: 'Préfecture', value: props.infos.prefecture },
  { label: 'Téléphones', value: props.infos.telephones },
  { label: 'Mail', value: props.infos.mail },
])
const confiancePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Personne de confiance', value: props.infos.personneConfiance },
  { label: 'Lien de parenté', value: props.infos.lienParente },
  { label: 'Téléphone de confiance', value: props.infos.telephoneConfiance },
])

const TYPE_CONTACT_LABELS: Record<string, string> = { ancien: 'Ancien', nouveau: 'Nouveau contact suivi', premier: '1er contact' }
const PREMIER_MOTIF_LABELS: Record<string, string> = { diabete: 'Diabète', endocrino: 'Endocrino', obesite: 'Obésité' }
const MECANISME_LABELS: Record<string, string> = { patient: 'Patient', clinique: 'Clinique', assurance: 'Assurance', internet: 'Internet', autres: 'Autres' }

const contactPreviewFields = computed<FormPreviewField[]>(() => {
  const fields: FormPreviewField[] = [
    { label: 'Type de contact', value: props.infos.typeContact ? (TYPE_CONTACT_LABELS[props.infos.typeContact] ?? props.infos.typeContact) : '' },
  ]
  if (props.infos.typeContact === 'premier') {
    fields.push({ label: 'Premier contact (motif)', value: props.infos.premierContactMotif ? (PREMIER_MOTIF_LABELS[props.infos.premierContactMotif] ?? props.infos.premierContactMotif) : '' })
  }
  fields.push(
    { label: 'Mécanisme de contact', value: props.infos.mecanismeContact?.length ? props.infos.mecanismeContact.map(m => MECANISME_LABELS[m] ?? m).join(', ') : '' },
    { label: 'Mécanisme (autres)', value: props.infos.mecanismeContact?.includes('autres') ? props.infos.mecanismeAutres : '' },
    { label: "Médecin/IDE d'accueil", value: props.infos.medecinAccueil },
    { label: 'Médecin référent', value: props.data.medecinTraitantNom },
    { label: 'Responsable', value: props.data.interneIPANom },
  )
  return fields
})

onMounted(async () => {
  try { doctors.value = await ipcInvoke<DoctorOption[]>('doctors:list-by-site', {}) } catch { doctors.value = [] }
  try { await fetchLocalites() } catch { /* fallback: code brut de résidence */ }
})
</script>

<style scoped>
.section-preview { margin: 8px 0 16px; }
.readonly-note { margin: 0 0 12px; font-size: 12px; color: var(--cde-muted); font-style: italic; }
</style>
