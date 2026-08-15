<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('clotureAdmin')"
      title="Clôture Administrative"
      :keys="['dateSortie', 'destinationSortie']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Date de sortie" data-history-path="sortie.dateSortie">
              <el-date-picker v-model="draft.dateSortie" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Destination de sortie" data-history-path="sortie.destinationSortie">
              <el-select v-model="draft.destinationSortie" placeholder="Sélectionner" style="width:100%">
                <el-option label="Retour domicile" value="Retour domicile" />
                <el-option label="Autre site AP-HP" value="Autre site AP-HP" />
                <el-option label="HAD" value="HAD" />
              </el-select>
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
      :ref="setSectionRef('suivi')"
      title="Suivi et Planification des Soins"
      :keys="['rdvSuivi']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div v-for="(rdv, idx) in sortedRdvs(draft.rdvSuivi)" :key="rdv._key" class="rdv-card">
          <div class="rdv-card__header">
            <span class="rdv-card__title">RDV #{{ idx + 1 }}</span>
            <el-button
              text
              type="danger"
              size="small"
              class="rdv-card__delete"
              :aria-label="`Supprimer RDV #${idx + 1}`"
              :title="`Supprimer RDV #${idx + 1}`"
              @click="removeRdv(draft.rdvSuivi, rdv)"
            >
              <Delete class="rdv-card__delete-icon" aria-hidden="true" />
            </el-button>
          </div>
          <el-row :gutter="16">
            <el-col :span="5">
              <el-form-item label="Date du RDV">
                <el-date-picker v-model="rdv.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
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
        </div>
        <el-button type="primary" text size="small" @click="addRdv(draft.rdvSuivi)">
          + Ajouter un RDV de suivi
        </el-button>
      </template>
    </StagedCollapsibleSection>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import type { SortieData } from '@/types/crh-diabete'
import type { RdvSuivi } from '@/types/crh-diabete'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { htmlToPlainText } from '@/utils/rich-text'

const FIELD_PREFIX = 'sortie'

const props = defineProps<{
  data: SortieData
  fieldMeta?: Record<string, string>
}>()

const emit = defineEmits<{
  change: []
}>()

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

const clotureAdminPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Date de sortie', value: props.data.dateSortie, key: `${FIELD_PREFIX}.dateSortie`, updatedAt: metaFor(`${FIELD_PREFIX}.dateSortie`), tracked: !!props.fieldMeta },
  { label: 'Destination de sortie', value: props.data.destinationSortie, key: `${FIELD_PREFIX}.destinationSortie`, updatedAt: metaFor(`${FIELD_PREFIX}.destinationSortie`), tracked: !!props.fieldMeta },
])

const clotureMedicalePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Conclusion de sortie', value: htmlToPlainText(props.data.conclusionSortie), key: `${FIELD_PREFIX}.conclusionSortie`, updatedAt: metaFor(`${FIELD_PREFIX}.conclusionSortie`), tracked: !!props.fieldMeta },
])

// ── RDV logic ──────────────────────────────────────────────────────────────

function sortedRdvs(rdvs: RdvSuivi[]): RdvSuivi[] {
  return [...rdvs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.heure || '').localeCompare(b.heure || '')
  })
}

function addRdv(rdvs: RdvSuivi[]) {
  rdvs.push({
    _key: crypto.randomUUID(),
    date: '',
    heure: '',
    intitule: '',
    lieuPraticien: '',
  })
}

function removeRdv(rdvs: RdvSuivi[], rdv: { _key: string }) {
  const idx = rdvs.findIndex(r => r._key === rdv._key)
  if (idx !== -1) {
    rdvs.splice(idx, 1)
  }
}
</script>

<style scoped>
.rdv-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
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
.rdv-card__delete {
  padding: 4px;
}
.rdv-card__delete-icon {
  width: 14px;
  height: 14px;
}
.section-preview {
  margin: 8px 0 16px;
}

.el-form-item[data-history-path]:hover {
  cursor: default;
}
</style>
