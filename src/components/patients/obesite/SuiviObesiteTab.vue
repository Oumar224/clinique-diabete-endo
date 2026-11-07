<!-- eslint-disable vue/no-mutating-props -- Les sections Consultation / Paramètres du jour / Apports mutent en place l'objet partagé data (et vitalSignsHistory via sync) puis émettent 'change' explicitement -->
<template>
  <el-form label-position="top" class="tab-form">
    <!-- Consultation de suivi -->
    <CollapsibleSection :ref="setCollapsibleRef('consultation')" title="Consultation de suivi" :default-open="true">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="Date de consultation">
            <el-date-picker
              v-model="data.dateConsultation"
              type="date"
              value-format="YYYY-MM-DD"
              format="DD/MM/YYYY"
              style="width:100%"
              :disabled="props.readonly"
              @change="emit('change')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="16">
          <el-form-item label="Plaintes de jour">
            <el-input v-model="data.plaintes" type="textarea" :rows="3" placeholder="Plaintes de jour…" :disabled="props.readonly" @change="emit('change')" />
          </el-form-item>
        </el-col>
      </el-row>
    </CollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Consultation de suivi"
        variant="compact"
        :hide-header="true"
        :fields="consultationPreviewFields"
        @edit="() => openSection('consultation')"
      />
    </div>

    <!-- Paramètres du jour -->
    <CollapsibleSection :ref="setCollapsibleRef('parametres')" title="Paramètres du jour" :default-open="true">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="Glycémie à jeun (g/L)">
            <el-input-number v-model="data.parametres.glycemieJeun" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Glycémie post-prandiale (g/L)">
            <el-input-number v-model="data.parametres.glycemiePostPrandiale" :min="0" :max="8" :step="0.01" :precision="2" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Cétonémie (mmol/L)">
            <el-input-number v-model="data.parametres.cetonemie" :min="0" :max="30" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Cétonurie">
            <el-select v-model="data.parametres.cetonurie" placeholder="—" clearable style="width:100%" :disabled="props.readonly" @change="onParamChange">
              <el-option label="+" value="+" />
              <el-option label="++" value="++" />
              <el-option label="+++ ou plus" value="+++" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="Glycosurie">
            <el-select v-model="data.parametres.glycosurie" placeholder="—" clearable style="width:100%" :disabled="props.readonly" @change="onParamChange">
              <el-option label="+" value="+" />
              <el-option label="++" value="++" />
              <el-option label="+++ ou plus" value="+++" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="TA Systolique (mmHg)">
            <el-input-number v-model="data.parametres.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="TA Diastolique (mmHg)">
            <el-input-number v-model="data.parametres.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Fréquence cardiaque (bpm)">
            <el-input-number v-model="data.parametres.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="Température (°C)">
            <el-input-number v-model="data.parametres.temperature" :min="32" :max="42" :step="0.1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="SaO₂ (%)">
            <el-input-number v-model="data.parametres.saO2" :min="0" :max="100" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Poids (kg)">
            <el-input-number v-model="data.parametres.poids" :min="0" :max="300" :step="0.1" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Taille (cm)">
            <el-input-number v-model="data.parametres.taille" :min="0" :max="250" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="IMC (kg/m²)">
            <el-input :model-value="imcDisplay" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Tour de taille (cm)">
            <el-input-number v-model="data.parametres.tourTaille" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Tour de hanche (cm)">
            <el-input-number v-model="data.parametres.tourHanche" :min="0" :max="300" :step="0.5" :precision="1" controls-position="right" style="width:100%" :disabled="props.readonly" @change="onParamChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Ratio TT/TH">
            <el-input :model-value="ratioDisplay" disabled />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="Autres">
            <el-input v-model="data.autres" placeholder="Autres paramètres…" :disabled="props.readonly" @change="emit('change')" />
          </el-form-item>
        </el-col>
      </el-row>
    </CollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Paramètres du jour"
        variant="compact"
        :hide-header="true"
        :fields="parametresPreviewFields"
        @edit="() => openSection('parametres')"
      />
    </div>

    <!-- Apports -->
    <CollapsibleSection title="Apports" :default-open="true">
      <ApportsTable :lignes="data.apports.lignes" v-model:objectif-jour-kcal="data.apports.objectifJourKcal" :readonly="props.readonly" @change="emit('change')" />
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Apport énergétique quotidien (Kcal)">
            <el-input :model-value="apportKcalLabel" disabled />
          </el-form-item>
        </el-col>
      </el-row>
    </CollapsibleSection>

    <!-- Examen / Conclusion / CAT -->
    <StagedCollapsibleSection
      :ref="setSectionRef('examen')"
      title="Examen, conclusion et conduite à tenir"
      :keys="['examenCliniqueJour', 'conclusion', 'controlePonderal', 'facteursFavorisants', 'facteursDetail', 'rappelEducatif', 'intensification', 'intensificationDetail', 'commentaires']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Examen clinique du jour">
              <el-input v-model="draft.examenCliniqueJour" type="textarea" :rows="3" placeholder="Examen clinique du jour…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Conclusion">
              <el-input v-model="draft.conclusion" type="textarea" :rows="3" placeholder="Conclusion de la consultation…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Contrôle pondéral">
              <el-radio-group v-model="draft.controlePonderal" :disabled="props.readonly">
                <el-radio value="non_ameliore">Non amélioré</el-radio>
                <el-radio value="en_cours">En cours d’amélioration</el-radio>
                <el-radio value="ameliore_stable">Amélioré et stable</el-radio>
                <el-radio value="reprise">Reprise de poids</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Facteurs favorisants si poids non contrôlé">
              <el-radio-group v-model="draft.facteursFavorisants" :disabled="props.readonly">
                <el-radio value="non_identifie">Non identifié</el-radio>
                <el-radio value="identifie">Identifié</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col v-if="draft.facteursFavorisants === 'identifie'" :span="12">
            <el-form-item label="Détail des facteurs favorisants">
              <el-input v-model="draft.facteursDetail" placeholder="Préciser les facteurs favorisants…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Rappel éducatif sur">
              <el-checkbox-group v-model="draft.rappelEducatif" :disabled="props.readonly">
                <el-checkbox value="activite_physique">Activité physique adaptée</el-checkbox>
                <el-checkbox value="alimentation">Alimentation</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Intensification thérapeutique">
              <el-switch v-model="draft.intensification" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col v-if="draft.intensification" :span="16">
            <el-form-item label="Détail de l’intensification">
              <el-input v-model="draft.intensificationDetail" placeholder="Détailler l’intensification thérapeutique…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Commentaires">
              <el-input v-model="draft.commentaires" type="textarea" :rows="2" placeholder="Commentaires…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Examen, conclusion et conduite à tenir"
        variant="compact"
        :hide-header="true"
        :fields="examenPreviewFields"
        @edit="() => openSection('examen')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Écritures volontaires dans l'objet réactif partagé data et vitalSignsHistory (sync) déclenchées par émission explicite de 'change' */
import { ref, computed, nextTick } from 'vue'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import { imcAuto, ratioTTTH, totauxApports } from '@/utils/apports-alimentaires'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import ApportsTable from '@/components/patients/obesite/ApportsTable.vue'

const props = withDefaults(defineProps<{
  data: CrcObesiteFormData['suivi']
  vitalSignsHistory: CrcObesiteFormData['bilanInitial']['vitalSignsHistory']
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{ change: [] }>()

type SectionExpose = InstanceType<typeof StagedCollapsibleSection> | InstanceType<typeof CollapsibleSection>
const sectionRefs = ref<Record<string, SectionExpose | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as SectionExpose | null
  }
}

function setCollapsibleRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as SectionExpose | null
  }
}

async function openSection(key: string) {
  const section = sectionRefs.value[key]
  if (section && typeof section.open === 'function') {
    section.open()
  }
  await nextTick()
  sectionRefs.value[key]?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const imcDisplay = computed(() => {
  const v = imcAuto(props.data.parametres.poids, props.data.parametres.taille)
  return v != null ? String(v) : '—'
})

const ratioDisplay = computed(() => {
  const v = ratioTTTH(props.data.parametres.tourTaille, props.data.parametres.tourHanche)
  return v != null ? String(v) : '—'
})

const apportKcal = computed(() => totauxApports(props.data.apports.lignes).kcal)
const apportKcalLabel = computed(() => `${apportKcal.value} Kcal`)

/**
 * Upsert dans vitalSignsHistory : une entrée par date de consultation,
 * _key stable `suivi-${dateConsultation}` (pas de doublon au 2e changement).
 * Ne crée pas d'entrée si la date est vide.
 */
function syncHistory() {
  if (props.readonly) return
  const date = props.data.dateConsultation
  if (!date) return
  if (!props.vitalSignsHistory) return
  const key = `suivi-${date}`
  const snapshot = { ...props.data.parametres }
  const idx = props.vitalSignsHistory.findIndex((e) => e._key === key)
  if (idx !== -1) {
    Object.assign(props.vitalSignsHistory[idx], snapshot, { _key: key, date })
  } else {
    props.vitalSignsHistory.push({ _key: key, date, ...snapshot })
  }
  emit('change')
}

function onParamChange() {
  syncHistory()
}

const consultationPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Date de consultation', value: props.data.dateConsultation || null, key: 'suivi.dateConsultation' },
  { label: 'Plaintes de jour', value: props.data.plaintes || null, key: 'suivi.plaintes' },
])

function fmtNum(value: number | null, unit: string): string | null {
  return value == null ? null : `${value} ${unit}`
}

const parametresPreviewFields = computed<FormPreviewField[]>(() => {
  const p = props.data.parametres
  return [
    { label: 'Glycémie à jeun', value: fmtNum(p.glycemieJeun, 'g/L'), key: 'suivi.parametres.glycemieJeun' },
    { label: 'Glycémie post-prandiale', value: fmtNum(p.glycemiePostPrandiale, 'g/L'), key: 'suivi.parametres.glycemiePostPrandiale' },
    { label: 'Cétonémie', value: fmtNum(p.cetonemie, 'mmol/L'), key: 'suivi.parametres.cetonemie' },
    { label: 'Cétonurie', value: p.cetonurie || null, key: 'suivi.parametres.cetonurie' },
    { label: 'Glycosurie', value: p.glycosurie || null, key: 'suivi.parametres.glycosurie' },
    { label: 'TA Systolique', value: fmtNum(p.taSystolique, 'mmHg'), key: 'suivi.parametres.taSystolique' },
    { label: 'TA Diastolique', value: fmtNum(p.taDiastolique, 'mmHg'), key: 'suivi.parametres.taDiastolique' },
    { label: 'Fréquence cardiaque', value: fmtNum(p.frequenceCardiaque, 'bpm'), key: 'suivi.parametres.frequenceCardiaque' },
    { label: 'Température', value: fmtNum(p.temperature, '°C'), key: 'suivi.parametres.temperature' },
    { label: 'SaO₂', value: fmtNum(p.saO2, '%'), key: 'suivi.parametres.saO2' },
    { label: 'Poids', value: fmtNum(p.poids, 'kg'), key: 'suivi.parametres.poids' },
    { label: 'Taille', value: fmtNum(p.taille, 'cm'), key: 'suivi.parametres.taille' },
    { label: 'Autres', value: props.data.autres || null, key: 'suivi.autres' },
  ]
})

const CONTROLE_LABELS: Record<string, string> = {
  non_ameliore: 'Non amélioré',
  en_cours: 'En cours d’amélioration',
  ameliore_stable: 'Amélioré et stable',
  reprise: 'Reprise de poids',
}

const FACTEURS_LABELS: Record<string, string> = {
  non_identifie: 'Non identifié',
  identifie: 'Identifié',
}

const RAPPEL_LABELS: Record<string, string> = {
  activite_physique: 'Activité physique adaptée',
  alimentation: 'Alimentation',
}

const examenPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Examen clinique du jour', value: props.data.examenCliniqueJour || null, key: 'suivi.examenCliniqueJour' },
  { label: 'Conclusion', value: props.data.conclusion || null, key: 'suivi.conclusion' },
  {
    label: 'Contrôle pondéral',
    value: props.data.controlePonderal ? (CONTROLE_LABELS[props.data.controlePonderal] ?? props.data.controlePonderal) : null,
    key: 'suivi.controlePonderal',
  },
  {
    label: 'Facteurs favorisants',
    value: props.data.facteursFavorisants ? (FACTEURS_LABELS[props.data.facteursFavorisants] ?? props.data.facteursFavorisants) : null,
    key: 'suivi.facteursFavorisants',
  },
  { label: 'Détail facteurs favorisants', value: props.data.facteursDetail || null, key: 'suivi.facteursDetail' },
  {
    label: 'Rappel éducatif sur',
    value: props.data.rappelEducatif?.length ? props.data.rappelEducatif.map((r) => RAPPEL_LABELS[r] ?? r).join(', ') : null,
    key: 'suivi.rappelEducatif',
  },
  { label: 'Intensification thérapeutique', value: props.data.intensification ? 'Oui' : null, key: 'suivi.intensification' },
  { label: 'Détail intensification', value: props.data.intensificationDetail || null, key: 'suivi.intensificationDetail' },
  { label: 'Commentaires', value: props.data.commentaires || null, key: 'suivi.commentaires' },
])
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
</style>
