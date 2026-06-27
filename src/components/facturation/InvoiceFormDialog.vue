<template>
  <el-dialog v-model="visible" title="Nouvelle facture" width="700px" @closed="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="Patient" prop="patient_id">
        <el-select
          v-model="form.patient_id"
          filterable
          remote
          :remote-method="searchPatients"
          :loading="searching"
          placeholder="Rechercher un patient..."
          style="width: 100%"
          @visible-change="onPatientDropdown"
        >
          <el-option
            v-for="p in patientOptions"
            :key="p.id"
            :label="`${getCiviliteLabel(p.civilite)} ${p.prenom} ${p.nom} — ${p.nir}`"
            :value="p.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Date" prop="date">
        <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>

      <el-divider content-position="left">Lignes de facturation</el-divider>

      <div class="invoice-items">
        <div v-for="(item, index) in form.items" :key="index" class="invoice-items__row">
          <el-select v-model="item.type" style="width:140px" @change="(v:string)=>onItemTypeChange(index, v)">
            <el-option label="Consultation" value="consultation" />
            <el-option label="Acte" value="acte" />
            <el-option label="Médicament" value="medicament" />
            <el-option label="Autre" value="autre" />
          </el-select>
          <el-input v-model="item.libelle" placeholder="Libellé" style="width:200px" />
          <el-input-number v-model="item.quantite" :min="1" style="width:80px" @change="() => recalcItem(index)" />
          <el-input-number v-model="item.prix_unitaire" :min="0" :precision="0" style="width:120px" @change="() => recalcItem(index)" />
          <span class="invoice-items__montant">{{ item.montant.toLocaleString() }} {{ currencyDef.symbol }}</span>
          <el-button text type="danger" :icon="Delete" @click="removeItem(index)" />
        </div>
      </div>

      <el-button type="primary" text :icon="Plus" @click="addItem">Ajouter une ligne</el-button>

      <el-divider />
      <div class="invoice-total">
        <strong>Total : {{ totalItems.toLocaleString() }} {{ currencyDef.symbol }}</strong>
      </div>

      <el-form-item label="Notes">
        <el-input v-model="form.notes" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="saving" @click="submit">Créer la facture</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrency } from '@/currency/useCurrency'
import type { InvoiceItem } from '@/composables/useInvoices'
import { getCiviliteLabel } from '@/utils/civilite'

const emit = defineEmits<{ created: [] }>()

const { currencyDef } = useCurrency()

const visible = ref(false)
const saving = ref(false)
const searching = ref(false)
const formRef = ref<any>(null)
const patientOptions = ref<any[]>([])

const form = reactive({
  patient_id: null as number | null,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  items: [] as InvoiceItem[],
})

const rules = {
  patient_id: [{ required: true, message: 'Veuillez sélectionner un patient', trigger: 'change' }],
  date: [{ required: true, message: 'Veuillez sélectionner une date', trigger: 'change' }],
}

const totalItems = computed(() => form.items.reduce((s, i) => s + i.montant, 0))

function addItem() {
  form.items.push({
    libelle: '',
    quantite: 1,
    prix_unitaire: 0,
    montant: 0,
    type: 'consultation',
  })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

function recalcItem(index: number) {
  const item = form.items[index]
  item.montant = item.quantite * item.prix_unitaire
}

function onItemTypeChange(index: number, type: string) {
  const item = form.items[index]
  const defaults: Record<string, { libelle: string; prix_unitaire: number }> = {
    consultation: { libelle: 'Consultation', prix_unitaire: 0 },
    acte: { libelle: '', prix_unitaire: 0 },
    medicament: { libelle: '', prix_unitaire: 0 },
    autre: { libelle: '', prix_unitaire: 0 },
  }
  const d = defaults[type] || defaults.autre
  if (!item.libelle || item.libelle === defaults.consultation.libelle || item.libelle === '') {
    item.libelle = d.libelle
  }
  item.prix_unitaire = d.prix_unitaire
  recalcItem(index)
}

async function searchPatients(query: string) {
  if (!query) return
  searching.value = true
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.invoke('patients:list', { search: query }) as { success: boolean; data: any[] }
      patientOptions.value = result.data
    }
  } finally {
    searching.value = false
  }
}

async function onPatientDropdown(open: boolean) {
  if (open && patientOptions.value.length === 0) {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('patients:list', {}) as { success: boolean; data: any[] }
        patientOptions.value = result.data
      }
    } catch {}
  }
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.items.length === 0) {
    ElMessage.warning('Ajoutez au moins une ligne de facturation')
    return
  }

  saving.value = true
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.invoke('invoices:create', {
        patient_id: form.patient_id,
        date: form.date,
        notes: form.notes || undefined,
        items: form.items,
      }) as { success: boolean; data: any }
      if (result.success) {
        ElMessage.success('Facture créée avec succès')
        visible.value = false
        emit('created')
      }
    }
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.patient_id = null
  form.date = new Date().toISOString().slice(0, 10)
  form.notes = ''
  form.items = []
  formRef.value?.resetFields()
}

function open() {
  visible.value = true
  if (form.items.length === 0) addItem()
}

defineExpose({ open })
</script>

<style scoped>
.invoice-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.invoice-items__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-items__montant {
  min-width: 100px;
  text-align: right;
  font-weight: 600;
  font-size: 14px;
}

.invoice-total {
  text-align: right;
  font-size: 16px;
  margin-bottom: 16px;
}
</style>
