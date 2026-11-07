<template>
  <el-dialog
    v-model="visible"
    title="Réceptionner le bon de commande"
    width="880px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div
      v-if="commande"
      class="cde-summary-lines reception__meta"
    >
      <div class="cde-kv">
        <span class="cde-kv__label">Bon</span>
        <span class="cde-kv__value">{{ commande.numero || `#${commande.id}` }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Fournisseur</span>
        <span class="cde-kv__value">{{ commande.fournisseurNom || '—' }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Reste à livrer</span>
        <span class="cde-kv__value cde-kv__value--strong">{{ totalReste }} unité(s)</span>
      </div>
    </div>

    <el-alert
      v-if="submitError"
      class="cde-alert cde-alert--danger"
      type="error"
      :closable="false"
      show-icon
      :title="submitError"
    />

    <el-form
      label-position="top"
      @submit.prevent
    >
      <el-row :gutter="12">
        <el-col
          :xs="24"
          :sm="8"
        >
          <el-form-item
            label="Date de réception"
            required
          >
            <el-date-picker
              v-model="dateReception"
              type="date"
              value-format="YYYY-MM-DD"
              :clearable="false"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="8"
        >
          <el-form-item label="Réf. BL">
            <el-input
              v-model="refBl"
              maxlength="100"
              placeholder="Ex : BL-2026-001"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="8"
        >
          <el-form-item label="Notes">
            <el-input
              v-model="notes"
              maxlength="300"
              placeholder="Observation de livraison"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Quantités reçues
        </h2>
        <div class="reception__head-actions">
          <span class="cde-section-meta">{{ lignesRecues.length }} ligne(s)</span>
          <el-button
            text
            size="small"
            @click="fillAll"
          >
            Tout recevoir
          </el-button>
        </div>
      </div>
      <div class="cde-table-wrap">
        <el-table
          v-loading="loading"
          :data="lignes"
          size="small"
          style="width: 100%"
          aria-label="Lignes à réceptionner"
        >
          <el-table-column
            label="Article"
            min-width="210"
          >
            <template #default="{ row }">
              <div class="reception__article">
                {{ row.designation }}
              </div>
              <div
                v-if="row.unite"
                class="reception__unit"
              >
                Unité : {{ row.unite }}
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="Commandé"
            width="90"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.quantiteCommandee }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Déjà livré"
            width="95"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.quantiteLivree }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Reste"
            width="80"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.resteALivrer }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Reçu"
            width="140"
            align="right"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantiteRecue"
                :min="0"
                :max="row.resteALivrer"
                :step="1"
                :precision="0"
                controls-position="right"
                size="small"
                style="width: 112px"
                :aria-label="`Quantité reçue pour ${row.designation}`"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="N° lot reçu"
            width="150"
          >
            <template #default="{ row }">
              <el-input
                v-model="row.numeroLot"
                maxlength="100"
                size="small"
                placeholder="Auto"
                :aria-label="`Numéro de lot pour ${row.designation}`"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="Péremption"
            width="140"
          >
            <template #default="{ row }">
              <el-date-picker
                v-model="row.datePeremption"
                type="date"
                value-format="YYYY-MM-DD"
                size="small"
                placeholder="Optionnelle"
                style="width: 100%"
                :aria-label="`Date de péremption pour ${row.designation}`"
              />
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucune ligne à recevoir sur ce bon.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Pièces jointes (BL, facture…)
        </h2>
        <span class="cde-section-meta">{{ piecesJointes.length }} fichier(s)</span>
      </div>
      <div class="reception__files">
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept=".pdf,image/jpeg,image/png,image/webp"
          class="reception__input"
          @change="onFilesChange"
        >
        <el-button
          size="small"
          :icon="Upload"
          @click="triggerFileInput"
        >
          Ajouter un fichier
        </el-button>
        <span class="reception__hint">PDF, JPEG, PNG ou WebP — 10 Mo maximum par fichier.</span>
      </div>
      <ul
        v-if="piecesJointes.length > 0"
        class="reception__file-list"
      >
        <li
          v-for="(file, index) in piecesJointes"
          :key="`${file.fileName}-${index}`"
          class="reception__file-item"
        >
          <span class="reception__file-name">{{ file.fileName }}</span>
          <span class="reception__file-size">{{ formatSize(file.fileSize) }}</span>
          <el-button
            text
            size="small"
            type="danger"
            title="Retirer le fichier"
            @click="removeFile(index)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </li>
      </ul>
    </section>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="lignesRecues.length === 0"
        @click="submit"
      >
        Enregistrer la réception
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Upload } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import {
  readFileAsDataUri,
  validateAttachmentFile,
} from '@/composables/useStockLotAttachments'
import {
  useCommandes,
  type CommandeDto,
  type CommandeLigneDto,
  type CommandeReceptionAttachmentInputDto,
} from '@/composables/useCommandes'

/** Ligne de réception éditable. */
interface ReceptionDraft {
  commandeLigneId: number
  designation: string
  unite: string
  quantiteCommandee: number
  quantiteLivree: number
  resteALivrer: number
  quantiteRecue: number
  numeroLot: string
  datePeremption: string
}

const emit = defineEmits<{
  saved: [commande: CommandeDto]
}>()

const { user } = useAuth()
const { fetchCommande, receptionnerCommande, saving, error } = useCommandes()

const visible = ref(false)
const loading = ref(false)
const commande = ref<CommandeDto | null>(null)
const dateReception = ref(todayIso())
const refBl = ref('')
const notes = ref('')
const lignes = ref<ReceptionDraft[]>([])
const piecesJointes = ref<CommandeReceptionAttachmentInputDto[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const submitError = ref('')

const lignesRecues = computed(() => lignes.value.filter((line) => line.quantiteRecue > 0))
const totalReste = computed(() => lignes.value.reduce((sum, line) => sum + line.resteALivrer, 0))

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Ouvre le dialogue pour un bon envoyé ou partiellement reçu.
 *
 * @param target - Bon à réceptionner.
 */
async function open(target: CommandeDto) {
  if (target.id == null) return
  submitError.value = ''
  refBl.value = ''
  notes.value = ''
  dateReception.value = todayIso()
  piecesJointes.value = []
  visible.value = true
  loading.value = true
  try {
    const full = await fetchCommande(target.id)
    commande.value = full ?? target
    lignes.value = buildDrafts(commande.value)
  } finally {
    loading.value = false
  }
}

/**
 * Construit les lignes éditables à partir du bon.
 *
 * @param commande - Bon de commande chargé.
 */
function buildDrafts(commande: CommandeDto | null): ReceptionDraft[] {
  return (commande?.lignes ?? [])
    .filter((ligne: CommandeLigneDto) => (ligne.resteALivrer ?? 0) > 0)
    .map((ligne: CommandeLigneDto) => ({
      commandeLigneId: Number(ligne.id ?? 0),
      designation: ligne.designation ?? `Ligne #${ligne.id ?? '?'}`,
      unite: ligne.unite ?? '',
      quantiteCommandee: ligne.quantiteCommandee ?? 0,
      quantiteLivree: ligne.quantiteLivree ?? 0,
      resteALivrer: Math.max(0, ligne.resteALivrer ?? 0),
      quantiteRecue: Math.max(0, ligne.resteALivrer ?? 0),
      numeroLot: '',
      datePeremption: '',
    }))
}

/** Renseigne toutes les quantités reçues au reste à livrer. */
function fillAll() {
  for (const line of lignes.value) line.quantiteRecue = line.resteALivrer
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

/**
 * Lit et ajoute les fichiers sélectionnés.
 *
 * @param event - Événement de changement de l'input fichier.
 */
async function onFilesChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  for (const file of files) {
    const issue = validateAttachmentFile(file)
    if (issue) {
      ElMessage.error(`${file.name} : ${issue}`)
      continue
    }
    try {
      const fileData = await readFileAsDataUri(file)
      piecesJointes.value.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData,
      })
    } catch (e) {
      ElMessage.error(`${file.name} : ${(e as Error).message}`)
    }
  }
  input.value = ''
}

/**
 * Retire une pièce jointe de la réception.
 *
 * @param index - Position du fichier.
 */
function removeFile(index: number) {
  piecesJointes.value.splice(index, 1)
}

/** Enregistre la réception et les lots de stock associés. */
async function submit() {
  if (commande.value?.id == null) return
  submitError.value = ''
  if (!dateReception.value) {
    submitError.value = 'La date de réception est requise.'
    return
  }
  if (lignesRecues.value.length === 0) {
    submitError.value = 'Saisissez au moins une quantité reçue.'
    return
  }
  const overflow = lignesRecues.value.find((line) => line.quantiteRecue > line.resteALivrer)
  if (overflow) {
    submitError.value = `La quantité reçue dépasse le reste à livrer pour « ${overflow.designation} ».`
    return
  }

  const updated = await receptionnerCommande(commande.value.id, {
    dateReception: dateReception.value,
    refBl: refBl.value.trim() || undefined,
    notes: notes.value.trim() || undefined,
    lignes: lignesRecues.value.map((line) => ({
      commandeLigneId: line.commandeLigneId,
      quantiteRecue: line.quantiteRecue,
      numeroLot: line.numeroLot.trim() || undefined,
      datePeremption: line.datePeremption || undefined,
    })),
    attachments: piecesJointes.value.length > 0 ? piecesJointes.value : undefined,
    createdBy: user.value?.id,
  })

  if (!updated) {
    submitError.value = error.value || 'Enregistrement de la réception impossible.'
    return
  }
  ElMessage.success('Réception enregistrée')
  emit('saved', updated)
  visible.value = false
}

/**
 * Taille lisible en Ko / Mo.
 *
 * @param size - Taille en octets.
 */
function formatSize(size: number | undefined): string {
  if (size == null) return '—'
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function onClosed() {
  commande.value = null
  lignes.value = []
  piecesJointes.value = []
  submitError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

defineExpose({ open })
</script>

<style scoped>
.reception__meta {
  margin-bottom: 10px;
}

.reception__head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reception__article {
  font-weight: 500;
}

.reception__unit {
  font-size: 11px;
  color: var(--cde-muted);
}

.reception__files {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0 4px;
}

.reception__input {
  display: none;
}

.reception__hint {
  font-size: 11px;
  color: var(--cde-muted);
}

.reception__file-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.reception__file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--cde-border);
}

.reception__file-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reception__file-size {
  font-size: 11px;
  color: var(--cde-muted);
  font-variant-numeric: tabular-nums;
}
</style>
