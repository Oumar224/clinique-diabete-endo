<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('clotureMedicale')"
      title="Clôture Médicale"
      :keys="['conclusionSortie']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Conclusion de sortie">
              <RichTextEditor v-model="draft.conclusionSortie" :rows="4" placeholder="Résumé de sortie indispensable pour le médecin référent..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Clôture Médicale"
        variant="compact"
        :fields="clotureMedicalePreviewFields"
        @edit="() => openSection('clotureMedicale')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('clotureAdmin')"
      title="Clôture Administrative"
      :keys="['dateSortie', 'destinationSortie', 'destinationPrecision', 'infoPatientFamille', 'produitsSanguins', 'bmrBhre']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Date de sortie">
              <el-date-picker v-model="draft.dateSortie" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Destination de sortie">
              <el-select v-model="draft.destinationSortie" placeholder="Sélectionner" style="width:100%" clearable @change="onDestinationChange(draft)">
                <el-option label="Retour à domicile" value="Retour à domicile" />
                <el-option label="Transférée (à préciser)" value="Transférée (à préciser)" />
                <el-option label="Hospitalisation à domicile" value="Hospitalisation à domicile" />
                <el-option label="Autre (à préciser)" value="Autre (à préciser)" />
                <el-option label="Décédée" value="Décédée" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="draft.destinationSortie === 'Transférée (à préciser)'" label="Précisez le service / établissement">
              <el-input v-model="draft.destinationPrecision" placeholder="Ex: Cardiologie CHU..." />
            </el-form-item>
            <el-form-item v-if="draft.destinationSortie === 'Autre (à préciser)'" label="Précisez">
              <el-input v-model="draft.destinationPrecision" placeholder="Précisez la destination..." />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Information du patient / famille">
              <el-checkbox v-model="draft.infoPatientFamille">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Administration de produits sanguins">
              <el-checkbox v-model="draft.produitsSanguins">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Porteur / Contact BMR ou BHRe">
              <el-checkbox v-model="draft.bmrBhre">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Clôture Administrative"
        variant="compact"
        :fields="clotureAdminPreviewFields"
        @edit="() => openSection('clotureAdmin')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('suivi')"
      title="Suivi et Planification des Soins"
      :keys="['rdvSuivi']"
      :model-value="data"
      :readonly="readonly"
      :badge="rdvCount > 0 ? rdvCount : undefined"
      :hide-footer="true"
      :pending="hasRdvPendingContent"
      @save="onRdvSectionSave"
      @cancel="onRdvSectionCancel"
    >
      <template #default="{ draft }">
        <div
          v-for="rdv in [activeRdvOf(draft)]"
          :key="rdv._key"
          class="rdv-card"
        >
          <div class="rdv-card__header">
            <span class="rdv-card__title">{{ activeRdvKey ? 'Modifier le RDV' : 'Nouveau RDV de suivi' }}</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="5">
              <el-form-item label="Date du RDV">
                <el-date-picker v-model="rdv.date" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Heure">
                <el-time-picker v-model="rdv.heure" value-format="HH:mm" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Intitulé / Spécialité">
                <el-input v-model="rdv.intitule" placeholder="BCH CONSULT CHIR VASC TH" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Lieu / Praticien">
                <el-input v-model="rdv.lieuPraticien" placeholder="Bichat / LRB HDJ Centre Diabète" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="rdv-card__actions">
            <el-button
              size="small"
              :disabled="readonly"
              @click="cancelRdv"
            >
              Annuler
            </el-button>
            <el-button
              type="primary"
              size="small"
              :disabled="readonly"
              @click="saveRdvEntry(draft)"
            >
              Enregistrer
            </el-button>
          </div>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Suivi et Planification des Soins"
        variant="compact"
        :fields="rdvPreviewFields"
        empty-text="Aucun RDV de suivi planifié"
        :deletable="true"
        @edit="onRdvEdit"
        @delete="deleteRdvPreview"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, reactive } from 'vue'
import type { SortieData, RdvSuivi } from '@/types/crh-diabete'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { formatDate } from '@/utils/date'

const FIELD_PREFIX = 'sortie'

const props = withDefaults(defineProps<{
  data: SortieData
  fieldMeta?: Record<string, string>
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  change: []
}>()

// Un draft antérieur à l'introduction du champ peut ne pas porter `rdvSuivi`.
// Matérialiser un tableau vide permet à la section staged et au commit de pousser sans garde.
type MutableSortieData = SortieData & { rdvSuivi: RdvSuivi[] }
const dataWithRdvs = props.data as MutableSortieData
dataWithRdvs.rdvSuivi = Array.isArray(props.data.rdvSuivi) ? props.data.rdvSuivi : []

function metaFor(key: string): string | null {
  return props.fieldMeta?.[key] ?? null
}

const sectionRefs = ref<Record<string, InstanceType<typeof StagedCollapsibleSection> | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as InstanceType<typeof StagedCollapsibleSection> | null
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

function onDestinationChange(draft: Record<string, any>) {
  if (draft.destinationSortie !== 'Transférée (à préciser)' && draft.destinationSortie !== 'Autre (à préciser)') {
    draft.destinationPrecision = ''
  }
}

function destinationDisplay(): string {
  const dest = props.data.destinationSortie
  if (!dest) return ''
  const precision = (props.data as SortieData).destinationPrecision
  return precision ? `${dest} — ${precision}` : dest
}

const clotureAdminPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Date de sortie', value: props.data.dateSortie ? formatDate(props.data.dateSortie) : '', key: `${FIELD_PREFIX}.dateSortie`, updatedAt: metaFor(`${FIELD_PREFIX}.dateSortie`), tracked: !!props.fieldMeta },
  { label: 'Destination de sortie', value: destinationDisplay(), key: `${FIELD_PREFIX}.destinationSortie`, updatedAt: metaFor(`${FIELD_PREFIX}.destinationSortie`), tracked: !!props.fieldMeta },
  { label: 'Information du patient / famille', value: props.data.infoPatientFamille ? 'Oui' : 'Non', key: `${FIELD_PREFIX}.infoPatientFamille`, updatedAt: metaFor(`${FIELD_PREFIX}.infoPatientFamille`), tracked: !!props.fieldMeta },
  { label: 'Administration de produits sanguins', value: props.data.produitsSanguins ? 'Oui' : 'Non', key: `${FIELD_PREFIX}.produitsSanguins`, updatedAt: metaFor(`${FIELD_PREFIX}.produitsSanguins`), tracked: !!props.fieldMeta },
  { label: 'Porteur / Contact BMR ou BHRe', value: props.data.bmrBhre ? 'Oui' : 'Non', key: `${FIELD_PREFIX}.bmrBhre`, updatedAt: metaFor(`${FIELD_PREFIX}.bmrBhre`), tracked: !!props.fieldMeta },
])

const clotureMedicalePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Conclusion de sortie', value: props.data.conclusionSortie, key: `${FIELD_PREFIX}.conclusionSortie`, updatedAt: metaFor(`${FIELD_PREFIX}.conclusionSortie`), tracked: !!props.fieldMeta, rich: true },
])

// ── RDV logic ──────────────────────────────────────────────────────────────

const rdvCount = computed(() => dataWithRdvs.rdvSuivi.length)

const activeRdvKey = ref<string | null>(null)

const creatingRdv = reactive<RdvSuivi>({
  _key: crypto.randomUUID(),
  date: '',
  heure: '',
  intitule: '',
  lieuPraticien: '',
})

function resetCreatingRdv() {
  creatingRdv._key = crypto.randomUUID()
  creatingRdv.date = ''
  creatingRdv.heure = ''
  creatingRdv.intitule = ''
  creatingRdv.lieuPraticien = ''
}

/** Renvoie le RDV actif : la brouillon local en mode création, sinon le RDV du draft en cours d'édition. */
function activeRdvOf(draft: Record<string, unknown>): RdvSuivi {
  if (activeRdvKey.value === null) return creatingRdv
  const list = (draft.rdvSuivi ?? []) as RdvSuivi[]
  const found = list.find(r => r._key === activeRdvKey.value)
  return found ?? creatingRdv
}

const hasRdvPendingContent = computed(() =>
  activeRdvKey.value === null &&
  (creatingRdv.date !== '' || creatingRdv.heure !== '' || creatingRdv.intitule !== '' || creatingRdv.lieuPraticien !== ''),
)

/** Tri stable par date puis heure — utilisé pour l'aperçu externe. */
function sortedRdvs(rdvs: RdvSuivi[]): RdvSuivi[] {
  return [...rdvs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.heure || '').localeCompare(b.heure || '')
  })
}

/** Commit du RDV : en mode création on l'ajoute au draft ; le footer de la carte déclenche save(). */
function saveRdvEntry(draft: Record<string, unknown>) {
  if (activeRdvKey.value === null) {
    const entry: RdvSuivi = { ...creatingRdv }
    ;(draft.rdvSuivi as RdvSuivi[]).push(entry)
  }
  sectionRefs.value.suivi?.save()
}

function cancelRdv() {
  if (activeRdvKey.value === null) {
    resetCreatingRdv()
  } else {
    activeRdvKey.value = null
    sectionRefs.value.suivi?.syncDraft()
  }
}

function onRdvSectionSave() {
  activeRdvKey.value = null
  resetCreatingRdv()
  emit('change')
}

function onRdvSectionCancel() {
  activeRdvKey.value = null
  resetCreatingRdv()
}

/** Réouvre la section sur le RDV éditée (via le bouton Modifier de l'aperçu externe). */
function onRdvEdit(key: string) {
  const rdvKey = key.split('.').pop() ?? ''
  activeRdvKey.value = rdvKey || null
  resetCreatingRdv()
  void openSection('suivi')
}

function deleteRdvPreview(key: string) {
  const rdvKey = key.split('.').pop() ?? ''
  const idx = dataWithRdvs.rdvSuivi.findIndex(r => r._key === rdvKey)
  if (idx !== -1) dataWithRdvs.rdvSuivi.splice(idx, 1)
  if (activeRdvKey.value === rdvKey) {
    activeRdvKey.value = null
    resetCreatingRdv()
  }
  if (sectionRefs.value.suivi?.isOpen()) sectionRefs.value.suivi.removeFromDraft('rdvSuivi', rdvKey)
  emit('change')
}

const rdvPreviewFields = computed<FormPreviewField[]>(() =>
  sortedRdvs(dataWithRdvs.rdvSuivi)
    .map((rdv, index) => {
      const label = [formatDate(rdv.date), rdv.heure].filter(Boolean).join(' ') || `RDV #${index + 1}`
      const value = [rdv.intitule, rdv.lieuPraticien].filter(Boolean).join(' — ') || undefined
      if (value === undefined) return null
      return {
        label,
        value,
        rich: false,
        key: `${FIELD_PREFIX}.rdvSuivi.${rdv._key}`,
        updatedAt: metaFor(`${FIELD_PREFIX}.rdvSuivi`),
        tracked: !!props.fieldMeta,
      } as FormPreviewField
    })
    .filter((field): field is FormPreviewField => field !== null),
)
</script>

<style scoped>
.rdv-card {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--cde-surface);
  border-left: 3px solid var(--cde-info);
}
.rdv-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.rdv-card__title {
  font-weight: 600;
  font-size: 13px;
}
.rdv-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--cde-border-soft);
}
.section-preview {
  margin: 8px 0 16px;
}
</style>
