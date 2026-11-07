<template>
  <el-dialog
    v-model="visible"
    title="Bon de commande"
    width="900px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div
      v-if="commande"
      v-loading="loading"
      class="commande-detail"
    >
      <div class="cde-summary-lines commande-detail__meta">
        <div class="cde-kv">
          <span class="cde-kv__label">Numéro</span>
          <span class="cde-kv__value">{{ commande.numero || `#${commande.id}` }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Fournisseur</span>
          <span class="cde-kv__value">{{ commande.fournisseurNom || '—' }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Statut</span>
          <span :class="badgeClass(statutTone(commande.statut))">
            {{ statutLabel(commande.statut) }}
          </span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Date de commande</span>
          <span class="cde-kv__value">{{ formatDate(commande.dateCommande) }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Date prévue</span>
          <span class="cde-kv__value">{{ formatDate(commande.datePrevue) }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Urgence</span>
          <span class="cde-kv__value">{{ commande.urgence ? 'Oui' : 'Non' }}</span>
        </div>
        <div class="cde-kv">
          <span class="cde-kv__label">Quantités</span>
          <span class="cde-kv__value">
            {{ commande.totalQuantiteLivree ?? 0 }} / {{ commande.totalQuantiteCommandee ?? 0 }} livrée(s)
          </span>
        </div>
        <div
          v-if="commande.notes"
          class="cde-kv cde-kv--full"
        >
          <span class="cde-kv__label">Notes</span>
          <span class="cde-kv__value">{{ commande.notes }}</span>
        </div>
      </div>

      <section class="cde-section">
        <div class="cde-section-head">
          <h2 class="cde-section-title">
            Lignes
          </h2>
          <span class="cde-section-meta">{{ commande.lignes?.length ?? 0 }} ligne(s)</span>
        </div>
        <div class="cde-table-wrap">
          <el-table
            :data="commande.lignes ?? []"
            size="small"
            style="width: 100%"
            aria-label="Lignes du bon de commande"
          >
            <el-table-column
              label="Article"
              min-width="220"
            >
              <template #default="{ row }">
                {{ row.designation }}
              </template>
            </el-table-column>
            <el-table-column
              label="Commandé"
              width="95"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ row.quantiteCommandee ?? 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Unité"
              width="90"
            >
              <template #default="{ row }">
                {{ row.unite || '—' }}
              </template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">
                Aucune ligne.
              </div>
            </template>
          </el-table>
        </div>
      </section>

      <section class="cde-section">
        <div class="cde-section-head">
          <h2 class="cde-section-title">
            Réceptions
          </h2>
          <span class="cde-section-meta">{{ commande.receptions?.length ?? 0 }} réception(s)</span>
        </div>

        <div
          v-if="(commande.receptions?.length ?? 0) === 0"
          class="cde-empty"
        >
          Aucune réception enregistrée.
        </div>

        <div
          v-for="reception in commande.receptions ?? []"
          :key="reception.id"
          class="commande-detail__reception"
        >
          <div class="commande-detail__reception-head">
            <span class="commande-detail__reception-date">
              {{ formatDate(reception.dateReception) }}
            </span>
            <span
              v-if="reception.refBl"
              class="cde-muted"
            >
              BL {{ reception.refBl }}
            </span>
            <span
              v-if="reception.notes"
              class="cde-muted"
            >
              {{ reception.notes }}
            </span>
            <el-button
              class="commande-detail__reception-doc"
              size="small"
              text
              type="primary"
              :icon="Document"
              :disabled="reception.id == null"
              @click="openReceptionPreview(reception.id)"
            >
              Bon de réception
            </el-button>
          </div>

          <ul class="commande-detail__lines">
            <li
              v-for="ligne in reception.lignes ?? []"
              :key="ligne.id"
            >
              <span>{{ ligne.designation || `Ligne #${ligne.commandeLigneId}` }}</span>
              <span class="cde-num">+{{ ligne.quantiteRecue ?? 0 }}</span>
            </li>
          </ul>

          <div
            v-if="(reception.attachments?.length ?? 0) > 0"
            class="commande-detail__attachments"
          >
            <el-button
              v-for="attachment in reception.attachments ?? []"
              :key="attachment.id"
              size="small"
              text
              type="primary"
              :title="`Télécharger ${attachment.fileName}`"
              @click="downloadAttachment(attachment.id, reception.id)"
            >
              {{ attachment.fileName }}
            </el-button>
          </div>
          <div
            v-else
            class="cde-muted commande-detail__no-attachment"
          >
            Aucune pièce jointe.
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <el-button
        :icon="Document"
        :disabled="commande?.id == null"
        @click="openPreview"
      >
        Aperçu / PDF
      </el-button>
      <el-button @click="visible = false">
        Fermer
      </el-button>
    </template>

    <HtmlPreviewDialog
      ref="previewRef"
      title="Bon de commande"
      channel="export:commande-preview"
      download-channel="export:commande-pdf"
      orientation="landscape"
      :params="previewParams"
    />
    <HtmlPreviewDialog
      ref="receptionPreviewRef"
      title="Bon de réception"
      channel="export:reception-preview"
      download-channel="export:reception-pdf"
      orientation="landscape"
      :params="receptionPreviewParams"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { formatDate } from '@/utils/date'
import HtmlPreviewDialog from '@/components/common/HtmlPreviewDialog.vue'
import {
  COMMANDE_STATUT_LABEL,
  COMMANDE_STATUT_TONE,
  useCommandes,
  type CommandeStatut,
} from '@/composables/useCommandes'

const { commande, loading, fetchCommande, downloadReceptionAttachment, error } = useCommandes()

const visible = ref(false)
const previewRef = ref<InstanceType<typeof HtmlPreviewDialog> | null>(null)
const receptionPreviewRef = ref<InstanceType<typeof HtmlPreviewDialog> | null>(null)
const receptionPreviewTarget = ref<{ commandeId: number; receptionId: number }>({
  commandeId: 0,
  receptionId: 0,
})

const previewParams = computed(() => ({ id: commande.value?.id ?? 0 }))
const receptionPreviewParams = computed(() => ({ ...receptionPreviewTarget.value }))

/**
 * Ouvre la fiche complète d'un bon.
 *
 * @param id - Identifiant du bon.
 */
async function open(id: number) {
  visible.value = true
  await fetchCommande(id)
}

/**
 * Libellé d'un statut.
 *
 * @param statut - Statut éventuellement absent.
 */
function statutLabel(statut: CommandeStatut | undefined): string {
  return statut ? COMMANDE_STATUT_LABEL[statut] : '—'
}

/**
 * Ton de badge d'un statut.
 *
 * @param statut - Statut éventuellement absent.
 */
function statutTone(statut: CommandeStatut | undefined): string {
  return statut ? COMMANDE_STATUT_TONE[statut] : 'muted'
}

/**
 * Classe CSS d'un badge.
 *
 * @param tone - Ton du badge.
 */
function badgeClass(tone: string): string {
  const allowed = ['success', 'warning', 'danger', 'info', 'muted']
  return `cde-badge cde-badge--${allowed.includes(tone) ? tone : 'muted'}`
}

/**
 * Télécharge une pièce jointe de réception.
 *
 * La réception parente est transmise pour que le backend vérifie
 * l'appartenance de la pièce jointe (défense en profondeur contre un
 * identifiant forgé).
 *
 * @param id - Identifiant de la pièce jointe.
 * @param receptionId - Réception à laquelle la pièce jointe doit appartenir.
 */
async function downloadAttachment(id: number | undefined, receptionId: number | undefined) {
  if (id == null || receptionId == null) return
  const full = await downloadReceptionAttachment(id, receptionId)
  if (!full?.fileData) {
    ElMessage.error(error.value || 'Téléchargement impossible')
    return
  }
  const anchor = document.createElement('a')
  anchor.href = full.fileData
  anchor.download = full.fileName || 'piece-jointe'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function openPreview() {
  if (commande.value?.id == null) return
  previewRef.value?.open()
}

/**
 * Ouvre le bon de réception d'une réception du bon courant.
 *
 * @param receptionId - Réception à imprimer.
 */
function openReceptionPreview(receptionId?: number) {
  const commandeId = commande.value?.id
  if (commandeId == null || receptionId == null) return
  receptionPreviewTarget.value = { commandeId, receptionId }
  receptionPreviewRef.value?.open()
}

function onClosed() {
  commande.value = null
}

defineExpose({ open })
</script>

<style scoped>
.commande-detail__meta {
  margin-bottom: 6px;
}

.commande-detail__reception {
  border: 1px solid var(--cde-border);
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: var(--cde-surface);
}

.commande-detail__reception-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.commande-detail__reception-date {
  font-weight: 600;
}

.commande-detail__reception-doc {
  margin-left: auto;
}

.commande-detail__lines {
  margin: 6px 0;
  padding-left: 18px;
  font-size: 12px;
}

.commande-detail__lines li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 1px 0;
}

.commande-detail__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.commande-detail__no-attachment {
  font-size: 11px;
}
</style>
