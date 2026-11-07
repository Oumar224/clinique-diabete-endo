<template>
  <el-dialog
    v-model="visible"
    title="Entrée de stock"
    width="480px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item label="Article">
        <el-input
          :model-value="articleLabel"
          disabled
        />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item
            label="Quantité"
            prop="quantite"
          >
            <el-input-number
              v-model="form.quantite"
              :min="1"
              :step="1"
              :precision="0"
              style="width:100%"
            />
            <div class="entree-dialog__hint">
              Quantité entière requise ≥1 (les décimaux sont refusés)
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            label="N° de lot"
            prop="numeroLot"
          >
            <el-input
              v-model="form.numeroLot"
              placeholder="Auto si vide"
              maxlength="100"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item
            label="Péremption"
            prop="datePeremption"
          >
            <el-date-picker
              v-model="form.datePeremption"
              type="date"
              value-format="YYYY-MM-DD"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            label="Date d'entrée"
            prop="dateEntree"
          >
            <el-date-picker
              v-model="form.dateEntree"
              type="date"
              value-format="YYYY-MM-DD"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item
            label="Fournisseur"
            prop="fournisseurId"
          >
            <div class="fournisseur-row">
              <el-select
                v-model="form.fournisseurId"
                filterable
                clearable
                placeholder="Choisir..."
                style="width:100%"
              >
                <el-option
                  v-for="opt in fournisseurOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-button
                circle
                title="Nouveau fournisseur"
                @click="quickAddFournisseur"
              >
                +
              </el-button>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            label="Prix d'achat (lot)"
            prop="prixAchat"
          >
            <el-input-number
              v-model="form.prixAchat"
              :min="0"
              :step="0.01"
              :precision="2"
              style="width:100%"
              placeholder="Optionnel"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item
            label="Réf. BL"
            prop="refBl"
          >
            <el-input
              v-model="form.refBl"
              placeholder="Ex : BL-2026-001"
              maxlength="100"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            label="Réf. facture"
            prop="refFacture"
          >
            <el-input
              v-model="form.refFacture"
              placeholder="Ex : FAC-2026-001"
              maxlength="100"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="Pièce jointe (BL / facture)">
        <input
          ref="attachmentInputRef"
          type="file"
          class="entree-dialog__file-input"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          @change="onAttachmentChange"
        >
        <div class="entree-dialog__attachment">
          <el-button
            size="small"
            :icon="Paperclip"
            @click="attachmentInputRef?.click()"
          >
            Choisir un fichier
          </el-button>
          <span
            v-if="attachmentFile"
            class="cde-muted entree-dialog__file-name"
          >
            {{ attachmentFile.name }} · {{ formatSize(attachmentFile.size) }}
          </span>
          <el-button
            v-if="attachmentFile"
            size="small"
            text
            type="danger"
            @click="clearAttachment"
          >
            Retirer
          </el-button>
        </div>
        <div class="entree-dialog__hint">
          PDF, JPEG, PNG ou WebP · 10 Mo max.
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="submit"
      >
        Confirmer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Paperclip } from '@element-plus/icons-vue'
import { useStock } from '@/composables/useStock'
import {
  readFileAsDataUri,
  useStockLotAttachments,
  validateAttachmentFile,
} from '@/composables/useStockLotAttachments'
import { useAuth } from '@/composables/useAuth'
import { useMedicaments } from '@/composables/useMedicaments'
import { useFournisseurs } from '@/composables/useFournisseurs'

const emit = defineEmits<{
  saved: []
}>()

const { entreeStock } = useStock()
const { addAttachment, error: attachmentError } = useStockLotAttachments()
const { user } = useAuth()
const { medicaments, getMedicament } = useMedicaments()
const { fournisseurs, fournisseurOptions, fetchFournisseurs, saveFournisseur, error: fournisseurError } = useFournisseurs()

const visible = ref(false)
const submitting = ref(false)
const medicamentId = ref<number | null>(null)
const articleLabel = ref('')
const formRef = ref<FormInstance>()
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const attachmentFile = ref<File | null>(null)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const form = reactive({
  quantite: 1 as number | null,
  numeroLot: '',
  datePeremption: '',
  dateEntree: todayIso(),
  fournisseurId: null as number | null,
  prixAchat: null as number | null,
  refBl: '',
  refFacture: '',
})

function prixValidator(_rule: unknown, value: number | null, callback: (err?: Error) => void) {
  if (value == null) return callback()
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return callback(new Error('Le prix doit être ≥ 0'))
  }
  callback()
}

const rules: FormRules = {
  quantite: [
    { required: true, message: 'La quantité est requise', trigger: 'change' },
    {
      validator: (_r, v, cb) => {
        if (v == null) return cb()
        if (!Number.isInteger(v) || v < 1) return cb(new Error('Quantité entière ≥ 1 requise'))
        cb()
      },
      trigger: 'change',
    },
  ],
  prixAchat: [{ validator: prixValidator, trigger: 'change' }],
}

async function open(params: {
  medicamentId: number
  label: string
  fournisseurPrincipalId?: number | null
  prixAchat?: number | null
}) {
  medicamentId.value = params.medicamentId
  articleLabel.value = params.label
  form.quantite = 1
  form.numeroLot = ''
  form.datePeremption = ''
  form.dateEntree = todayIso()
  form.fournisseurId = params.fournisseurPrincipalId ?? null
  form.prixAchat = params.prixAchat ?? null
  form.refBl = ''
  form.refFacture = ''
  clearAttachment()

  // Complète depuis le catalogue si l'appelant n'a pas fourni les défauts.
  if (form.fournisseurId == null || form.prixAchat == null) {
    const cached = medicaments.value.find((m) => m.id === params.medicamentId)
    if (cached) {
      if (form.fournisseurId == null) form.fournisseurId = cached.fournisseurPrincipalId ?? null
      if (form.prixAchat == null) form.prixAchat = cached.prixAchat ?? null
    } else {
      const med = await getMedicament(params.medicamentId).catch(() => null)
      if (med) {
        if (form.fournisseurId == null) form.fournisseurId = med.fournisseurPrincipalId ?? null
        if (form.prixAchat == null) form.prixAchat = med.prixAchat ?? null
      }
    }
  }
  if (fournisseurs.value.length === 0) {
    fetchFournisseurs().catch(() => undefined)
  }
  visible.value = true
}

function close() {
  visible.value = false
}

/**
 * Valide le fichier choisi et le mémorise (envoi différé après l'entrée).
 *
 * @param event - Événement de sélection de fichier.
 */
function onAttachmentChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const validationError = validateAttachmentFile(file)
  if (validationError) {
    ElMessage.error(validationError)
    input.value = ''
    return
  }
  attachmentFile.value = file
}

/** Retire la pièce jointe sélectionnée. */
function clearAttachment() {
  attachmentFile.value = null
  if (attachmentInputRef.value) attachmentInputRef.value.value = ''
}

/**
 * Formate une taille de fichier.
 *
 * @param size - Taille en octets.
 */
function formatSize(size: number): string {
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

async function quickAddFournisseur() {
  let nom = ''
  try {
    const result = await ElMessageBox.prompt('Nom du fournisseur', 'Nouveau fournisseur', {
      confirmButtonText: 'Créer',
      cancelButtonText: 'Annuler',
      inputPattern: /\S/,
      inputErrorMessage: 'Le nom est requis',
    })
    nom = typeof result === 'string' ? result : (result as { value?: string }).value ?? ''
  } catch {
    return
  }
  nom = nom.trim()
  if (!nom) return
  const saved = await saveFournisseur({ nom })
  if (saved?.id != null) {
    form.fournisseurId = saved.id
    ElMessage.success('Fournisseur créé')
  } else {
    ElMessage.error(fournisseurError.value || 'Création fournisseur impossible')
  }
}

async function submit() {
  if (!formRef.value || medicamentId.value == null) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.quantite == null) return
  submitting.value = true
  try {
    const lot = await entreeStock({
      medicamentId: medicamentId.value,
      quantite: form.quantite,
      numeroLot: form.numeroLot.trim() || undefined,
      datePeremption: form.datePeremption || undefined,
      dateEntree: form.dateEntree || undefined,
      fournisseurId: form.fournisseurId,
      prixAchat: form.prixAchat,
      refBl: form.refBl.trim() || undefined,
      refFacture: form.refFacture.trim() || undefined,
      userId: user.value?.id,
    })
    if (lot) {
      if (attachmentFile.value && lot.id != null) {
        const file = attachmentFile.value
        try {
          const fileData = await readFileAsDataUri(file)
          const created = await addAttachment({
            stockLotId: lot.id,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData,
          })
          if (!created) {
            ElMessage.warning(
              `Entrée enregistrée, mais la pièce jointe n'a pas pu être ajoutée : ${attachmentError.value ?? 'erreur inconnue'}`,
            )
          }
        } catch (e) {
          ElMessage.warning(`Entrée enregistrée, mais la pièce jointe n'a pas pu être ajoutée : ${(e as Error).message}`)
        }
      }
      ElMessage.success('Entrée de stock enregistrée')
      emit('saved')
      visible.value = false
    }
  } finally {
    submitting.value = false
  }
}

function onClosed() {
  medicamentId.value = null
  clearAttachment()
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>

<style scoped>
.entree-dialog__hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.fournisseur-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.fournisseur-row .el-select {
  flex: 1;
}

.entree-dialog__file-input {
  display: none;
}

.entree-dialog__attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.entree-dialog__file-name {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  white-space: nowrap;
}
</style>
