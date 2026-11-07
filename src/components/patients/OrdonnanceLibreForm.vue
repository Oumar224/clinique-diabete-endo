<template>
  <div class="ordonnance-libre-form">
    <el-alert
      v-if="readonly"
      title="Ce document est verrouillé en lecture seule."
      type="warning"
      show-icon
      :closable="false"
      class="ordonnance-libre-form__alert"
    />

    <!-- Document header -->
    <div class="ordonnance-libre-form__header">
      <div class="ordonnance-libre-form__header-left">
        <h3 class="ordonnance-libre-form__title">Ordonnance Libre</h3>
        <el-tag
          :type="document?.status === 'signed' ? 'success' : 'warning'"
          size="small"
          effect="light"
        >
          {{ document?.status === 'signed' ? 'Signé' : 'Brouillon' }}
        </el-tag>
      </div>
    </div>

    <!-- Section: Nouvelle ordonnance (OrdonnanceSortieTab gère les 4 groupes de prescriptions) -->
    <SectionHeader label="Ordonnance" level="secondary" class="ordonnance-libre-form__section">
      <template #badge>{{ ordonnanceItems.length }}</template>

      <!-- OrdonnanceSortieTab : cartes, édition, modes (médicaments, soins, examens, avis) -->
      <OrdonnanceSortieTab
        :data="ordonnanceItems"
        :readonly="readonly"
        :patient-id="patientId"
        @change="handleOrdonnanceChange"
      />
    </SectionHeader>

    <!-- Footer actions -->
    <div v-if="!readonly" class="ordonnance-libre-form__footer">
      <el-button :loading="saving" :disabled="saving || signing" @click="handleSaveDraft">
        Enregistrer Brouillon
      </el-button>
      <el-button
        type="primary"
        :loading="signing"
        :disabled="saving || signing"
        @click="handleSign"
      >
        {{ document?.status === 'signed' ? 'Resigner' : 'Signer' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import SectionHeader from '@/components/common/SectionHeader.vue'
import OrdonnanceSortieTab from '@/components/patients/OrdonnanceSortieTab.vue'
import type { PrescriptionSortie } from '@/types/crh-diabete'
import { usePatientContext } from '@/composables/usePatientContext'

const props = defineProps<{
  document: { id: string; contactId: string; status: string; formData: Record<string, any> | null; createdAt?: string; createdBy?: string; signedAt?: string; signedBy?: string } | null
  documentType: { id: string; code: string; label: string } | null
  readonly: boolean
  contactDisplay?: string
}>()

const emit = defineEmits<{
  save: [formData: Record<string, any>]
  sign: []
  close: []
}>()

const { activePatient } = usePatientContext()

const saving = ref(false)
const signing = ref(false)

/** Prescriptions du document (4 groupes : médicaments, soins, examens, avis). */
const ordonnanceItems = ref<PrescriptionSortie[]>([])

/**
 * ID patient pour le pré-remplissage d'OrdonnanceSortieTab. Déduit du contexte
 * patient ; 'null' si indisponible (le composant gère l'absence : pas de
 * pré-remplissage automatique).
 */
const patientId = computed<number | null>(() => activePatient.value?.id ?? null)

/** OrdonnanceSortieTab mute `data` puis émet `change` ; on marque simplement le formulaire touché. */
function handleOrdonnanceChange() {
  // Le tableau ordonnanceItems est muté en place par le composant enfant ; rien
  // d'autre à faire ici — buildFormData() le sérialisera au moment du save.
}

function buildFormData(): Record<string, any> {
  return {
    ordonnanceSortie: JSON.parse(JSON.stringify(ordonnanceItems.value)),
    title: 'Ordonnance Libre',
  }
}

async function handleSaveDraft() {
  if (!props.document) return
  saving.value = true
  emit('save', buildFormData())
  saving.value = false
}

async function handleSign() {
  if (!props.document) return

  try {
    const resigning = props.document?.status === 'signed'
    await ElMessageBox.confirm(
      resigning
        ? 'Resigner ce document ? L\'ancienne signature sera écrasée.'
        : 'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
      resigning ? 'Re-signature' : 'Confirmation de signature',
      {
        confirmButtonText: resigning ? 'Resigner' : 'Signer',
        cancelButtonText: 'Annuler',
        type: 'warning',
      },
    )
    signing.value = true
    emit('save', buildFormData())
    await new Promise(r => setTimeout(r, 100))
    emit('sign')
    signing.value = false
  } catch {
    // User cancelled
  }
}

// Initialize from document formData : charger ordonnanceSortie si présent.
// Pour un vieux doc n'ayant que inlinePrescriptions/linkedPrescriptionIds, on
// laisse ordonnanceItems = [] (l'aperçu legacy le rend encore).
watch(
  () => props.document,
  (doc) => {
    if (!doc) return
    const fd = doc.formData
    if (fd && Array.isArray(fd.ordonnanceSortie)) {
      ordonnanceItems.value = JSON.parse(JSON.stringify(fd.ordonnanceSortie))
    } else {
      ordonnanceItems.value = []
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.ordonnance-libre-form {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ordonnance-libre-form__alert {
  margin-bottom: 16px;
}

.ordonnance-libre-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ordonnance-libre-form__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ordonnance-libre-form__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.ordonnance-libre-form__section {
  flex: 1;
  min-height: 0;
}

.ordonnance-libre-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--cde-border);
  margin-top: 12px;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  background: var(--cde-surface);
  z-index: 10;
}
</style>
