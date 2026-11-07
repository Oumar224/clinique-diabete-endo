<template>
    <div class="plan-distribution cde" v-loading="(planLoading && !loadingTimeout) || gridLoading">
    <div v-if="error" class="plan-distribution__error cde-alert cde-alert--danger">
      <el-alert :title="error" type="error" show-icon :closable="true" @close="error = null" />
    </div>

    <div v-if="insulinBlocked" class="plan-distribution__insulin-block cde-alert">
      <el-alert
        title="Veuillez saisir la glycémie dans l'onglet Vital Check avant d'administrer l'insuline"
        type="warning"
        show-icon
        :closable="false"
      />
    </div>

    <div class="cde-page-toolbar">
      <div class="cde-page-actions">
        <span class="plan-distribution__range-label">{{ rangeLabel }}</span>
        <el-button :icon="Refresh" :loading="gridLoading" @click="onRefresh">
          Actualiser
        </el-button>
        <el-button :icon="InfoFilled" @click="diagnosticCheck" title="Diagnostic — vérifier les données du jour">
        </el-button>
        <el-button type="primary" @click="showPrescriptionDialog = true">
          + Prescrire
        </el-button>
      </div>
    </div>

    <div class="plan-distribution__grid-wrapper">
      <div class="plan-distribution__grid" :style="{ gridTemplateColumns: gridColumns }">
        <!-- HEADER ROW: each day is a single spanning cell with date+hours inside -->
        <div class="plan-distribution__med-header" style="grid-row: 1; grid-column: 1">Prescriptions</div>
        <div class="plan-distribution__type-header" style="grid-row: 1; grid-column: 2">Type</div>
        <div
          v-for="(day, di) in displayDays"
          :key="'d-' + di"
          class="plan-distribution__date-header"
          :class="{ 'plan-distribution__date-header--today': day.isToday }"
          :data-date="day.dateKey"
          :style="{ gridRow: 1, gridColumn: `${3 + di * hours.length} / ${3 + (di + 1) * hours.length}` }"
        >
          <div class="plan-distribution__date-text">
            {{ day.weekday }} <span class="plan-distribution__date-text-date">{{ day.dateLabel }}</span>
          </div>
          <div class="plan-distribution__date-hours-row">
            <span
              v-for="hour in hours"
              :key="hour"
              class="plan-distribution__date-hour"
              :class="{ 'plan-distribution__date-hour--now': day.isToday && hour === currentHour }"
            >
              {{ String(hour).padStart(2, '0') }}:00
            </span>
          </div>
        </div>

        <!-- DATA ROWS -->
        <template v-for="(row, ri) in medicationGrid" :key="row.prescriptionId ? `${row.medicament}__rx${row.prescriptionId}` : row.medicament">
          <div
            class="plan-distribution__med-cell"
            :class="`plan-distribution__med-cell--${row.prescriptionType}`"
          >
            <span
              v-if="row.prescriptionId"
              class="plan-distribution__prescription-action"
              :class="`plan-distribution__prescription-action--${row.statut === 'suspendu' ? 'play' : 'pause'}`"
              :title="row.statut === 'suspendu' ? 'Reprendre toute la prescription' : 'Suspendre toute la prescription'"
              @click.stop="onTogglePrescription(row)"
            >
              {{ row.statut === 'suspendu' ? '▶' : '‖' }}
            </span>
            <div
              class="plan-distribution__prescription-card"
              :class="`plan-distribution__prescription-card--${row.cardStatut}`"
              :style="row.cardStatut === 'en_cours' ? { '--rx-progress': `${row.pctValide}%` } : {}"
            >
              <div class="plan-distribution__prescription-card-row">
                <span
                  class="plan-distribution__type-dot"
                  :class="`plan-distribution__type-dot--${row.prescriptionType}`"
                />
                <div class="plan-distribution__prescription-info">
                  <span class="plan-distribution__med-name">{{ row.medicament }}</span>
                  <span v-if="row.dosage" class="plan-distribution__med-dosage">{{ row.dosage }}</span>
                  <span
                    class="plan-distribution__type-badge"
                    :class="`plan-distribution__type-badge--${row.prescriptionType}`"
                  >
                    {{ row.prescriptionType === 'medicament' ? 'Médicament' : 'Soin' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="plan-distribution__voie-cell" :class="`plan-distribution__voie-cell--${row.prescriptionType}`">
            <span class="plan-distribution__voie-text">{{ row.voie }}</span>
          </div>
          <div
            v-for="slot in row.slots"
            :key="`cell-${ri}-${slot.dateIndex}-${slot.hour}`"
            class="plan-distribution__cell"
            :class="{
              'plan-distribution__cell--now': isCurrentTimeSlot(slot.dateIndex, slot.hour),
              'plan-distribution__cell--empty': !slot.soin,
            }"
            :data-row="row.medicament"
            :data-date="displayDays[slot.dateIndex]?.dateKey"
            :data-hour="slot.hour"
          >
            <div
              v-if="slot.soin"
              class="plan-distribution__rdv"
              :class="[
                `plan-distribution__rdv--${statusClass(slot.soin.statut)}`,
                `plan-distribution__rdv--type-${slot.soin.prescriptionType ?? 'medicament'}`,
              ]"
              @click="onShowDetail(slot.soin)"
            >
              <div class="plan-distribution__rdv-row">
                <span class="plan-distribution__rdv-dosage">{{ slot.soin.dosage }}</span>
                <span class="plan-distribution__rdv-voie-tag">{{ slot.soin.voie }}</span>
                <span v-if="slot.soin.prescriptionId" class="plan-distribution__rx-badge" title="Modifier la prescription" @click.stop="onEditPrescription(slot.soin.prescriptionId!)">℞</span>
                <div v-if="slot.soin.statut === 'en_attente'" class="plan-distribution__rdv-actions">
                  <span class="plan-distribution__rdv-icon-btn plan-distribution__rdv-icon-btn--ok" :class="{ 'plan-distribution__rdv-icon-btn--disabled': isInsulin(slot.soin.medicament) && insulinBlocked }" @click.stop="onValider(slot.soin, slot.dateIndex)" title="Valider">✓</span>
                  <span class="plan-distribution__rdv-icon-btn plan-distribution__rdv-icon-btn--pause" @click.stop="onSuspendre(slot.soin, slot.dateIndex)" title="Suspendre">‖</span>
                </div>
              </div>
              <div v-if="slot.soin.statut === 'valide'" class="plan-distribution__rdv-status-line">
                <span class="plan-distribution__rdv-status-icon">✓</span>
                <span class="plan-distribution__rdv-status-text">{{ slot.soin.validePar || '' }} {{ slot.soin.valideA || '' }}</span>
              </div>
              <div v-else-if="slot.soin.statut === 'suspendu'" class="plan-distribution__rdv-status-line">
                <span class="plan-distribution__rdv-status-icon">⛔</span>
                <span class="plan-distribution__rdv-reprendre-btn" @click.stop="onReprendre(slot.soin, slot.dateIndex)" title="Reprendre">▶</span>
              </div>
            </div>
            <span v-else class="plan-distribution__cell-empty" aria-hidden="true">—</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Empty legend: the grid (rows + headers) always renders above. -->
    <div v-if="!gridLoading && !hasDistributionData" class="plan-distribution__empty-caption">
      Aucune distribution enregistrée pour ce patient
    </div>

    <!-- Prescription dialog -->
    <el-dialog v-model="showPrescriptionDialog" :title="isEditing ? 'Modifier la prescription' : 'Nouvelle prescription'" width="500px">
      <el-form ref="prescriptionFormRef" :model="prescriptionForm" label-position="top" :rules="prescriptionRules">
        <el-row :gutter="16">
          <el-col :span="10">
            <el-form-item label="Médicaments et soins" prop="medicament">
              <el-select v-model="prescriptionForm.medicament" filterable allow-create style="width:100%">
                <el-option v-for="m in medicamentOptions" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Quantité" prop="dosage">
              <el-input v-model="prescriptionForm.dosage" placeholder="ex: 1" />
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="Unité" prop="unite">
              <el-select v-model="prescriptionForm.unite" style="width:100%">
                <el-option label="cp" value="cp" />
                <el-option label="UI" value="UI" />
                <el-option label="mg" value="mg" />
                <el-option label="g" value="g" />
                <el-option label="mL" value="mL" />
                <el-option label="ampoule" value="ampoule" />
                <el-option label="sachet" value="sachet" />
                <el-option label="cuillère" value="cuillère" />
                <el-option label="goutte" value="goutte" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="Voie" prop="voie">
              <el-select v-model="prescriptionForm.voie" style="width:100%">
                <el-option v-for="v in VOIE_OPTIONS" :key="v.code" :label="v.label" :value="v.code" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Durée (jours)" prop="duree">
              <el-input-number v-model="prescriptionForm.duree" :min="1" :max="90" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Au besoin (PRN)">
              <el-switch v-model="prescriptionForm.prn" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Fréquence" prop="frequence">
          <el-select v-model="prescriptionForm.frequence" multiple placeholder="Sélectionnez les fréquences" collapse-tags collapse-tags-tooltip style="width:100%">
            <el-option v-for="opt in FREQUENCE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Instructions">
          <RichTextEditor v-model="prescriptionForm.instructions" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPrescriptionDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="prescribing" @click="onPrescrire">{{ isEditing ? 'Enregistrer' : 'Prescrire' }}</el-button>
      </template>
    </el-dialog>

    <!-- Detail soin dialog -->
    <el-dialog v-model="showDetailDialog" title="Détail du soin" width="420px">
      <template v-if="detailSoin">
        <div class="plan-distribution__detail">
          <div class="plan-distribution__detail-row">
            <span class="plan-distribution__detail-label">Médicaments et soins</span>
            <span class="plan-distribution__detail-value">{{ detailSoin.medicament }}</span>
          </div>
          <div class="plan-distribution__detail-row">
            <span class="plan-distribution__detail-label">Quantité</span>
            <span class="plan-distribution__detail-value">{{ detailSoin.dosage?.split(' ').slice(0, -1).join(' ') || detailSoin.dosage }}</span>
          </div>
          <div class="plan-distribution__detail-row">
            <span class="plan-distribution__detail-label">Unité</span>
            <span class="plan-distribution__detail-value">{{ detailSoin.dosage?.split(' ').slice(-1)[0] || '—' }}</span>
          </div>
          <div class="plan-distribution__detail-row">
            <span class="plan-distribution__detail-label">Voie</span>
            <span class="plan-distribution__detail-value">{{ detailSoin.voie }}</span>
          </div>
          <div class="plan-distribution__detail-row">
            <span class="plan-distribution__detail-label">Statut</span>
            <span class="cde-badge" :class="detailBadgeClass(detailSoin)">{{ detailStatutLabel(detailSoin) }}</span>
          </div>
          <template v-if="detailSoin.validePar">
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Validé par</span>
              <span class="plan-distribution__detail-value">{{ detailSoin.validePar }}</span>
            </div>
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">À</span>
              <span class="plan-distribution__detail-value">{{ detailSoin.valideA }}</span>
            </div>
          </template>
          <template v-if="detailMotifSuspension">
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Motif suspension</span>
              <span class="plan-distribution__detail-value">{{ detailMotifSuspension }}</span>
            </div>
          </template>
          <el-divider v-if="detailPrescription" />
          <template v-if="detailPrescription">
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Prescrit par</span>
              <span class="plan-distribution__detail-value">{{ detailPrescription.prescripteurNom || '—' }}</span>
            </div>
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Rôle</span>
              <span class="plan-distribution__detail-value">{{ detailPrescription.prescripteurRole || '—' }}</span>
            </div>
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Date prescription</span>
              <span class="plan-distribution__detail-value">{{ formatDateTime(detailPrescription.createdAt) }}</span>
            </div>
            <div v-if="!isRichTextEmpty(detailPrescription.instructions)" class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Instructions</span>
              <span class="plan-distribution__detail-value" v-html="detailPrescription.instructions"></span>
            </div>
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Durée</span>
              <span class="plan-distribution__detail-value">{{ detailPrescription.duree }} jours</span>
            </div>
            <div class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">Fréquence</span>
              <span class="plan-distribution__detail-value">{{ (detailPrescription.frequence || []).join(', ') }}</span>
            </div>
            <div v-if="detailPrescription.prn" class="plan-distribution__detail-row">
              <span class="plan-distribution__detail-label">PRN</span>
              <span class="plan-distribution__detail-value">Au besoin</span>
            </div>
          </template>
          <div v-if="!detailPrescription && detailSoin.prescriptionId" class="plan-distribution__detail-loading">
            Chargement...
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, watchEffect, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { usePlanSoins, isInsulin, getPlanSoins, reprendreSoin, suspendrePrescription, reprendrePrescription } from '@/composables/usePlanSoins'
import { useMedicaments, medicamentShortLabel } from '@/composables/useMedicaments'
import { usePrescriptions, type PrescriptionRecord } from '@/composables/usePrescriptions'
import { useAuth } from '@/composables/useAuth'
import { FREQUENCE_OPTIONS } from '@/utils/constants'
import { formatDateTime } from '@/utils/date'
import { isRichTextEmpty } from '@/utils/rich-text'
import {
  ROLLING_WINDOW_DAYS,
  buildRollingDays,
  startOfLocalDay,
  toLocalDateKey,
  type RollingDay,
} from '@/utils/rolling-week'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import type { SoinItem, StatutSoin, BlocHoraire, VoieAdministration } from '@/types/soins'
import { VOIE_OPTIONS, normalizeVoie, VOIE_ERROR_MESSAGE } from '@/constants/voies'

const route = useRoute()

const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const { loading: planLoading, error, insulinBlocked, valider, suspendre } = usePlanSoins(patientId)
const { prescriptions, fetchPrescriptions, createPrescription, updatePrescription, getPrescription } = usePrescriptions()

// Force loading to false after 10s to prevent permanent loading overlay
const loadingTimeout = ref(false)
watchEffect(() => {
  if (planLoading.value) {
    const timer = setTimeout(() => { loadingTimeout.value = true }, 10000)
    return () => clearTimeout(timer)
  } else {
    loadingTimeout.value = false
  }
})

/* ── Fenêtre glissante de 7 jours (convention « Résultats Bio ») ──
 *
 * Les colonnes vont du jour le plus récent (index 0, aujourd'hui) vers le plus
 * ancien. La grille est toujours rendue, même sans distribution : les lignes de
 * prescriptions remplissent alors des cellules vides.
 */

/** Créneaux horaires de la grille — mêmes valeurs que `EXAM_GRID_HOURS`. */
const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]

/** Dernier jour (le plus récent) de la fenêtre affichée. */
const windowEnd = ref(startOfLocalDay(new Date()))

const displayDays = computed<RollingDay[]>(() => buildRollingDays(windowEnd.value))

const rangeLabel = computed(() => {
  const newest = displayDays.value[0]
  const oldest = displayDays.value[displayDays.value.length - 1]
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `${fmt(newest.fullDate)} — ${fmt(oldest.fullDate)} · ${ROLLING_WINDOW_DAYS} jours`
})

const currentHour = computed(() => {
  const h = new Date().getHours()
  return [...hours].reverse().find(hr => hr <= h) ?? hours[0]
})

function isCurrentTimeSlot(dayIdx: number, hour: number): boolean {
  return displayDays.value[dayIdx]?.isToday && hour === currentHour.value
}

/* ── Blocs par jour — une requête bornée par jour de la fenêtre ── */

const dateBlocs = ref<Record<string, BlocHoraire[]>>({})
const gridLoading = ref(false)
let fetchId = 0

/** Vrai dès qu'au moins un créneau contient une administration. */
const hasDistributionData = computed(() =>
  Object.values(dateBlocs.value).some(blocs =>
    blocs.some(bloc => bloc.soins.length > 0),
  ),
)

async function fetchDisplayData(pid: number) {
  error.value = null
  const id = ++fetchId
  gridLoading.value = true
  const newBlocs: Record<string, BlocHoraire[]> = {}
  const days = displayDays.value

  await Promise.all([
    fetchPrescriptions(pid),
    ...days.map(async (day) => {
      try {
        const record = await getPlanSoins(pid, day.dateKey)
        if (record?.blocs) newBlocs[day.dateKey] = record.blocs
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        error.value = `Erreur de chargement pour ${day.dateKey}: ${msg}`
      }
    }),
  ])

  if (id === fetchId) {
    dateBlocs.value = newBlocs
    gridLoading.value = false
  }
}

async function onRefresh() {
  if (patientId.value) {
    await fetchDisplayData(patientId.value)
  }
}

function scrollToCurrentTime() {
  nextTick(() => {
    const wrapper = document.querySelector('.plan-distribution__grid-wrapper')
    if (!wrapper) return
    // Most recent (today when present) is at the left; scroll there.
    const idx = displayDays.value.findIndex(d => d.isToday)
    const hourIdx = hours.indexOf(currentHour.value)
    if (hourIdx < 0) return
    const targetIdx = Math.max(idx, 0) * hours.length + hourIdx
    const target = wrapper.querySelectorAll('.plan-distribution__date-hour')[targetIdx] as HTMLElement
    target?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  })
}

/**
 * Diagnostic tool: verify that plan_soins exists for today's date.
 * Helps debug "prescription not appearing" issues.
 */
async function diagnosticCheck() {
  if (!patientId.value) return
  const todayStr = toLocalDateKey(new Date())
  try {
    const record = await getPlanSoins(patientId.value, todayStr)
    if (!record) {
      ElMessage.warning(`Aucun plan de soins pour aujourd'hui (${todayStr}). Vérifiez que la prescription a bien été créée.`)
    } else {
      const totalItems = record.blocs.reduce((sum, b) => sum + b.soins.length, 0)
      ElMessage.success(`Plan de soins trouvé pour ${todayStr}: ${record.blocs.length} créneaux, ${totalItems} administration(s)`)
    }
  } catch (e) {
    ElMessage.error(`Erreur diagnostic: ${(e as Error).message}`)
  }
}

watch(patientId, async (pid) => {
  if (pid) {
    await fetchDisplayData(pid)
  } else {
    dateBlocs.value = {}
  }
}, { immediate: true })

watch(gridLoading, (loading) => {
  if (!loading) {
    scrollToCurrentTime()
  }
})

/* ── Medication grid — all days ── */

interface MedicationGridSlot {
  dateIndex: number
  hour: number
  soin: SoinItem | null
}

interface MedicationGridRow {
  medicament: string
  dosage: string
  voie: VoieAdministration
  prescriptionId?: number
  prescriptionType: 'medicament' | 'soins'
  statut: StatutSoin
  cardStatut: 'valide' | 'en_cours' | 'non_administre' | 'suspendu'
  pctValide: number
  slots: MedicationGridSlot[]
}

const medicationGrid = computed((): MedicationGridRow[] => {
  const rowsMap = new Map<string, MedicationGridRow>()

  for (let dayIdx = 0; dayIdx < displayDays.value.length; dayIdx++) {
    const day = displayDays.value[dayIdx]
    const dateStr = day.dateKey
    const blocs = dateBlocs.value[dateStr] ?? []

    for (const bloc of blocs) {
      for (const soin of bloc.soins) {
        const key = soin.prescriptionId != null
          ? `${soin.medicament}__rx${soin.prescriptionId}`
          : `${soin.medicament}__orphan`
        if (!rowsMap.has(key)) {
          rowsMap.set(key, {
            medicament: soin.medicament,
            dosage: soin.dosage,
            voie: soin.voie,
            prescriptionId: soin.prescriptionId,
            prescriptionType: soin.prescriptionType ?? 'medicament',
            statut: 'suspendu',
            cardStatut: 'non_administre',
            pctValide: 0,
            slots: emptySlots(),
          })
        }
        const row = rowsMap.get(key)!
        row.voie = soin.voie
        if (soin.statut === 'valide') {
          row.statut = 'valide'
        } else if (soin.statut === 'en_attente' && row.statut !== 'valide') {
          row.statut = 'en_attente'
        }
        const hourNum = parseInt(bloc.heure)
        const hourIdx = hours.indexOf(hourNum)
        if (hourIdx >= 0) {
          const slotIdx = dayIdx * hours.length + hourIdx
          row.slots[slotIdx].soin = soin
        }
      }
    }
  }

  // Post-process: compute cardStatut from filled soins
  for (const row of rowsMap.values()) {
    const filled = row.slots.filter(s => s.soin !== null).map(s => s.soin!.statut)
    if (filled.length === 0) {
      row.cardStatut = 'non_administre'
      row.pctValide = 0
    } else if (filled.every(s => s === 'valide')) {
      row.cardStatut = 'valide'
      row.pctValide = 100
    } else if (filled.every(s => s === 'suspendu')) {
      row.cardStatut = 'suspendu'
      row.pctValide = 0
    } else if (filled.every(s => s === 'en_attente')) {
      row.cardStatut = 'non_administre'
      row.pctValide = 0
    } else {
      row.cardStatut = 'en_cours'
      row.pctValide = Math.round((filled.filter(s => s === 'valide').length / filled.length) * 100)
    }
  }

  // Aucune distribution sur la fenêtre : les lignes restent les prescriptions
  // du patient, avec toutes les cellules vides (la grille est toujours rendue).
  const distributionRows = Array.from(rowsMap.values())
  if (distributionRows.length > 0) return distributionRows
  return prescriptions.value
    .filter(p => p.statut !== 'stopped')
    .map(prescriptionToGridRow)
})

function emptySlots(): MedicationGridSlot[] {
  const slots: MedicationGridSlot[] = []
  for (let di = 0; di < displayDays.value.length; di++) {
    for (const h of hours) {
      slots.push({ dateIndex: di, hour: h, soin: null })
    }
  }
  return slots
}

function prescriptionToGridRow(p: PrescriptionRecord): MedicationGridRow {
  return {
    medicament: p.medicament,
    dosage: p.dosage,
    voie: normalizeVoie(p.voie) ?? p.voie,
    prescriptionId: p.id,
    prescriptionType: p.type ?? 'medicament',
    statut: p.statut === 'suspendu' ? 'suspendu' : 'en_attente',
    cardStatut: 'non_administre',
    pctValide: 0,
    slots: emptySlots(),
  }
}

const gridColumns = computed(() => {
  return `200px 70px repeat(${displayDays.value.length * hours.length}, minmax(80px, 1fr))`
})

/* ── Data mapping ── */

function statusClass(statut: StatutSoin): string {
  const map: Record<StatutSoin, string> = {
    valide: 'confirmed',
    en_attente: 'pending',
    suspendu: 'cancelled',
  }
  return map[statut]
}

/* ── Actions ── */

async function onValider(soin: SoinItem, dateIndex: number) {
  await valider(soin)
  const day = displayDays.value[dateIndex]
  if (day && patientId.value) {
    const dateStr = day.dateKey
    try {
      const record = await getPlanSoins(patientId.value, dateStr)
      if (record?.blocs) {
        dateBlocs.value[dateStr] = record.blocs
      } else {
        delete dateBlocs.value[dateStr]
      }
    } catch {
      delete dateBlocs.value[dateStr]
    }
  }
}

async function onSuspendre(soin: SoinItem, dateIndex: number) {
  await suspendre(soin)
  const day = displayDays.value[dateIndex]
  if (day && patientId.value) {
    const dateStr = day.dateKey
    try {
      const record = await getPlanSoins(patientId.value, dateStr)
      if (record?.blocs) {
        dateBlocs.value[dateStr] = record.blocs
      } else {
        delete dateBlocs.value[dateStr]
      }
    } catch {
      delete dateBlocs.value[dateStr]
    }
  }
}

async function onReprendre(soin: SoinItem, dateIndex: number) {
  try {
    await reprendreSoin(soin.id)
    const day = displayDays.value[dateIndex]
    if (day && patientId.value) {
      const dateStr = day.dateKey
      try {
        const record = await getPlanSoins(patientId.value, dateStr)
        if (record?.blocs) {
          dateBlocs.value[dateStr] = record.blocs
        } else {
          delete dateBlocs.value[dateStr]
        }
      } catch {
        delete dateBlocs.value[dateStr]
      }
    }
    ElMessage.success(`${soin.medicament} repris`)
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  }
}

/**
 * Refresh all displayed days from the backend.
 * Used after prescription-level suspend/resume to update every day's grid.
 */
async function refreshAllDays() {
  if (!patientId.value) return
  const newBlocs: Record<string, BlocHoraire[]> = {}
  for (const day of displayDays.value) {
    const dateStr = day.dateKey
    try {
      const record = await getPlanSoins(patientId.value, dateStr)
      if (record?.blocs) {
        newBlocs[dateStr] = record.blocs
      }
    } catch {
      // skip days that fail to load
    }
  }
  dateBlocs.value = newBlocs
}

/**
 * Toggle the entire prescription between active and suspended.
 * Shows a pause icon when the prescription is active (any soin has en_attente or valide statut),
 * and a play icon when fully suspended.
 */
async function onTogglePrescription(row: MedicationGridRow) {
  if (!row.prescriptionId) return
  const isSuspended = row.statut === 'suspendu'
  try {
    if (isSuspended) {
      await reprendrePrescription(row.prescriptionId)
      ElMessage.success(`${row.medicament} — prescription reprise`)
    } else {
      const { value: motif } = await ElMessageBox.prompt(
        'Motif de suspension de la prescription',
        'Suspendre la prescription',
        { confirmButtonText: 'Suspendre', cancelButtonText: 'Annuler' }
      )
      await suspendrePrescription(row.prescriptionId, motif)
      ElMessage.success(`${row.medicament} — prescription suspendue`)
    }
    await refreshAllDays()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(`Erreur: ${msg}`)
  }
}

/* ── Prescription dialog ── */

const FALLBACK_MEDICAMENTS = ['Insuline NOVORAPID', 'Insuline LANTUS', 'Insuline TOUJEO', 'Metformine', 'Furosémide', 'Paracétamol', 'Amlodipine', 'Atorvastatin']
const { medicaments: catalogueMedicaments, fetchMedicaments } = useMedicaments()
const medicamentOptions = computed(() =>
  catalogueMedicaments.value.length > 0
    ? catalogueMedicaments.value.map(medicamentShortLabel)
    : FALLBACK_MEDICAMENTS,
)

onMounted(() => {
  void fetchMedicaments({ actif: true })
})
const { user } = useAuth()

const showPrescriptionDialog = ref(false)
const prescribing = ref(false)
const prescriptionFormRef = ref<FormInstance>()
const editingPrescriptionId = ref<number | null>(null)
const isEditing = computed(() => editingPrescriptionId.value !== null)

const prescriptionForm = reactive({
  type: 'medicament' as 'medicament' | 'soins',
  medicament: '',
  dosage: '',
  unite: '',
  voie: '',
  duree: 7,
  frequence: [] as string[],
  prn: false,
  instructions: '',
})

const prescriptionRules: FormRules = {
  medicament: [{ required: true, message: 'Choisissez un médicament ou soin', trigger: 'change' }],
  dosage: [{ required: true, message: 'La quantité est requise', trigger: 'blur' }],
  voie: [
    { required: true, message: 'La voie est requise', trigger: 'change' },
    {
      validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
        if (!value) { callback(); return }
        if (!normalizeVoie(value)) callback(new Error(VOIE_ERROR_MESSAGE))
        else callback()
      },
      trigger: 'change',
    },
  ],
  frequence: [{ required: true, message: 'Sélectionnez au moins une fréquence', trigger: 'change' }],
}

async function onEditPrescription(prescriptionId: number) {
  const p = await getPrescription(prescriptionId)
  if (!p) return
  editingPrescriptionId.value = p.id
  const parts = p.dosage.split(' ')
  prescriptionForm.type = p.type
  prescriptionForm.dosage = parts.slice(0, -1).join(' ')
  prescriptionForm.unite = parts.length > 1 ? parts[parts.length - 1] : ''
  prescriptionForm.medicament = p.medicament
  // Normalise les voies legacy ('VO', labels longs) vers l'allowlist backend.
  prescriptionForm.voie = normalizeVoie(p.voie) ?? (p.voie as string)
  prescriptionForm.duree = p.duree
  prescriptionForm.frequence = [...p.frequence]
  prescriptionForm.prn = p.prn
  prescriptionForm.instructions = p.instructions || ''
  showPrescriptionDialog.value = true
}

async function onPrescrire() {
  if (!patientId.value || patientId.value <= 0) {
    ElMessage.error('Patient non valide')
    return
  }
  const valid = await prescriptionFormRef.value?.validate().catch(() => false)
  if (!valid) return
  // Normalise vers l'allowlist backend (VO→PO, labels longs) avec message clair.
  const normalizedVoie = normalizeVoie(prescriptionForm.voie)
  if (!normalizedVoie) {
    ElMessage.error(VOIE_ERROR_MESSAGE)
    return
  }

  prescribing.value = true
  try {
    const prescripteurId = user.value?.id ?? 0
    const combinedDosage = `${prescriptionForm.dosage} ${prescriptionForm.unite}`.trim()
    if (editingPrescriptionId.value) {
      const result = await updatePrescription(editingPrescriptionId.value, {
        type: prescriptionForm.type,
        medicament: prescriptionForm.medicament,
        dosage: combinedDosage,
        voie: normalizedVoie,
        duree: prescriptionForm.duree,
        frequence: prescriptionForm.frequence,
        prn: prescriptionForm.prn,
        instructions: prescriptionForm.instructions || null,
      })
      if (!result) { ElMessage.error('Erreur de mise à jour'); return }
      console.log(`[onPrescrire] 📝 UPDATE result itemsGenerated=${result.itemsGenerated} prescriptionId=${result.prescription.id}`, JSON.parse(JSON.stringify(result)))
      ElMessage.success(`Prescription modifiée — ${result.itemsGenerated} administration(s) générée(s)`)
    } else {
      const result = await createPrescription(patientId.value, {
        type: prescriptionForm.type,
        medicament: prescriptionForm.medicament,
        dosage: combinedDosage,
        voie: normalizedVoie,
        duree: prescriptionForm.duree,
        frequence: prescriptionForm.frequence,
        prn: prescriptionForm.prn,
        instructions: prescriptionForm.instructions || null,
        prescripteurId,
      })
      if (!result) { ElMessage.error('Erreur de création'); return }
      console.log(`[onPrescrire] 🆕 CREATE result itemsGenerated=${result.itemsGenerated} prescriptionId=${result.prescription.id}`, JSON.parse(JSON.stringify(result)))
      ElMessage.success(`Prescription créée — ${result.itemsGenerated} administration(s) générée(s)`)
    }
    showPrescriptionDialog.value = false
    editingPrescriptionId.value = null
    resetPrescriptionForm()
    console.log(`[onPrescrire] 🔄 About to call fetchDisplayData(${patientId.value})`)
    await fetchDisplayData(patientId.value)
    console.log(`[onPrescrire] ✅ fetchDisplayData complete`)
  } catch (e) {
    console.error(`[onPrescrire] ❌ ERROR:`, e)
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  }
  prescribing.value = false
}

function resetPrescriptionForm() {
  editingPrescriptionId.value = null
  prescriptionForm.type = 'medicament'
  prescriptionForm.medicament = ''
  prescriptionForm.dosage = ''
  prescriptionForm.unite = ''
  prescriptionForm.voie = ''
  prescriptionForm.duree = 7
  prescriptionForm.frequence = []
  prescriptionForm.prn = false
  prescriptionForm.instructions = ''
  prescriptionFormRef.value?.clearValidate()
}

/* ── Detail soin dialog ── */

const showDetailDialog = ref(false)
const detailSoin = ref<SoinItem | null>(null)
const detailPrescription = ref<PrescriptionRecord | null>(null)

const detailMotifSuspension = computed(() => {
  return detailSoin.value?.motifSuspension ?? null
})

function detailBadgeClass(soin: SoinItem) {
  switch (soin.statut) {
    case 'valide': return 'cde-badge--success'
    case 'suspendu': return 'cde-badge--danger'
    default: return 'cde-badge--info'
  }
}

function detailStatutLabel(soin: SoinItem) {
  switch (soin.statut) {
    case 'valide': return 'Validé'
    case 'suspendu': return 'Suspendu'
    default: return 'En attente'
  }
}

async function onShowDetail(soin: SoinItem) {
  detailSoin.value = soin
  detailPrescription.value = null
  showDetailDialog.value = true
  if (soin.prescriptionId) {
    try {
      const p = await getPrescription(soin.prescriptionId)
      detailPrescription.value = p
    } catch {
      detailPrescription.value = null
    }
  }
}
</script>

<style scoped>
.plan-distribution__error {
  margin-bottom: 16px;
}
.plan-distribution__insulin-block {
  margin-bottom: 16px;
}

.plan-distribution__range-label {
  font-size: 12px;
  color: var(--cde-muted);
  white-space: nowrap;
}

.plan-distribution__grid-wrapper {
  overflow: auto;
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  background: var(--cd-widget-bg);
  max-height: calc(100vh - 260px);
}

.plan-distribution__grid {
  display: grid;
  background: var(--cd-widget-bg);
  min-width: max-content;
}

.plan-distribution__med-header,
.plan-distribution__type-header {
  padding: 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  background: #AEB6BF;
  color: #1C2833;
  border-bottom: 1px solid #95A5A6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 4;
}

.plan-distribution__med-header {
  left: 0;
  text-align: left;
  padding-left: 12px;
}

.plan-distribution__type-header {
  left: 200px;
}

.plan-distribution__date-header {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 40px;
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-gray-200);
  border-right: 1px solid var(--cd-gray-200);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.plan-distribution__date-text {
  padding: 6px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: #1C2833;
  text-align: left;
  line-height: 1.2;
  white-space: nowrap;
}

.plan-distribution__date-text-date {
  color: var(--cd-gray-500);
  font-weight: 400;
}

.plan-distribution__date-hours-row {
  display: flex;
  border-top: 1px solid var(--cd-gray-300);
}

.plan-distribution__date-hour {
  flex: 1;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  color: var(--cd-gray-600);
  border-right: 1px solid var(--cd-gray-200);
}

.plan-distribution__date-hour:last-child {
  border-right: none;
}

.plan-distribution__date-hour--now {
  background: #A04000;
  color: #F9E79F;
  font-weight: 700;
  border-left: 1px solid #D35400;
  border-right-color: #D35400;
}

.plan-distribution__date-header--today {
  background: var(--cd-primary);
  color: white;
}

.plan-distribution__date-header--today .plan-distribution__date-text {
  color: white;
}

.plan-distribution__date-header--today .plan-distribution__date-text-date {
  color: rgba(255, 255, 255, 0.85);
}

.plan-distribution__date-header--today .plan-distribution__date-hours-row {
  border-top-color: rgba(255, 255, 255, 0.3);
}

.plan-distribution__date-header--today .plan-distribution__date-hour {
  color: rgba(255, 255, 255, 0.9);
  border-right-color: rgba(255, 255, 255, 0.2);
}

.plan-distribution__med-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #BDC3C7;
  padding: 8px 10px;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  min-height: 60px;
}

.plan-distribution__voie-cell {
  position: sticky;
  left: 200px;
  z-index: 1;
  background: #BDC3C7;
  padding: 8px 6px;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

/* ── Med-cell type coloring ── */
.plan-distribution__med-cell--medicament {
  border-left: 3px solid var(--cd-info-blue);
}
.plan-distribution__med-cell--soins {
  border-left: 3px solid var(--cd-success);
}
.plan-distribution__med-cell:hover {
  background: var(--cde-hover);
}

/* ── Voie-cell type coloring ── */
.plan-distribution__voie-cell--medicament {
  border-left: 3px solid var(--cd-info-blue);
}
.plan-distribution__voie-cell--soins {
  border-left: 3px solid var(--cd-success);
}

/* ── Prescription info layout ── */
.plan-distribution__prescription-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

/* ── Type badge ── */
.plan-distribution__type-badge {
  display: inline-block;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 1px 5px;
  border-radius: 3px;
  line-height: 1.4;
  margin-top: 2px;
  width: fit-content;
}
.plan-distribution__type-badge--medicament {
  color: var(--cd-info-blue);
  background: var(--cd-info-bg);
}
.plan-distribution__type-badge--soins {
  color: var(--cd-success);
  background: var(--cd-success-bg);
}

/* ── Type indicator dot ── */
.plan-distribution__type-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.plan-distribution__type-dot--medicament {
  background: var(--cd-info-blue);
}
.plan-distribution__type-dot--soins {
  background: var(--cd-success);
}

/* ── RDV slot type coloring ── */
.plan-distribution__rdv--type-medicament {
  border-left-color: var(--cd-info-blue);
}
.plan-distribution__rdv--type-soins {
  border-left-color: var(--cd-success);
}

.plan-distribution__type-header::after,
.plan-distribution__voie-cell::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--cde-border);
  pointer-events: none;
}

.plan-distribution__cell--now {
  background: var(--cd-primary-lighter);
}

.plan-distribution__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 60px;
  padding: 4px 6px;
  background: #E5E7E9;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.plan-distribution__cell:hover {
  background: #D5D8DC;
  box-shadow: inset 0 0 0 1px var(--cd-primary);
  z-index: 1;
}

.plan-distribution__cell-empty {
  color: var(--cd-gray-300);
  font-size: 12px;
  user-select: none;
}

.plan-distribution__empty-caption {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  margin-top: 4px;
  color: var(--cd-gray-500);
  font-style: italic;
  font-size: 13px;
}

.plan-distribution__rdv {
  padding: 3px 5px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid var(--cde-border);
  transition: border-color 0.15s ease;
}

.plan-distribution__rdv:hover {
  border-color: var(--cd-primary);
}

.plan-distribution__rdv--pending {
  background: var(--cd-warning-bg);
  color: var(--cd-warning);
  border-left: 3px solid var(--cd-warning);
}

.plan-distribution__rdv--confirmed {
  background: var(--cd-success-bg);
  color: var(--cd-success);
  border-left: 3px solid var(--cd-success);
}

.plan-distribution__rdv--cancelled {
  background: var(--cd-danger-bg);
  color: var(--cd-alert-red);
  border-left: 3px solid var(--cd-alert-red);
}

.plan-distribution__rdv-dosage {
  font-size: 11px;
  font-weight: 600;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-distribution__rx-badge {
  font-size: 11px;
  cursor: pointer;
  opacity: 0.7;
  line-height: 1;
  color: var(--cd-primary);
  font-weight: 700;
  flex-shrink: 0;
  margin-left: auto;
}
.plan-distribution__rx-badge:hover {
  opacity: 1;
}

.plan-distribution__med-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--cd-gray-900);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-distribution__prescription-card {
  background: var(--cd-gray-50);
  padding: 4px;
  border-radius: 3px;
  border: 2px solid transparent;
}

.plan-distribution__prescription-card-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.plan-distribution__prescription-card--valide {
  border-color: var(--cd-primary);
}

.plan-distribution__prescription-card--en_cours {
  border: 2px solid;
  border-image: linear-gradient(
    135deg,
    var(--cd-primary) var(--rx-progress, 0%),
    var(--cd-warning) var(--rx-progress, 0%)
  ) 1;
}

.plan-distribution__prescription-card--non_administre {
  border-color: var(--cd-warning);
}

.plan-distribution__prescription-card--suspendu {
  border-color: var(--cd-alert-red);
}

.plan-distribution__prescription-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid var(--cde-border);
  background: var(--cde-bg);
  color: var(--cde-muted);
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.plan-distribution__prescription-action:hover {
  background: var(--cde-hover);
  border-color: var(--cd-gray-400);
}

.plan-distribution__prescription-action--pause {
  color: var(--cd-warning);
  border-color: var(--cd-warning);
}

.plan-distribution__prescription-action--pause:hover {
  background: var(--cd-warning-bg);
}

.plan-distribution__prescription-action--play {
  color: var(--cd-info-blue);
  border-color: var(--cd-info-blue);
}

.plan-distribution__prescription-action--play:hover {
  background: var(--cd-info-bg);
}

.plan-distribution__med-dosage {
  font-size: 11px;
  color: var(--cde-muted);
  line-height: 1.3;
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-distribution__voie-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--cd-gray-600);
}

.plan-distribution__rdv-row {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: nowrap;
}

.plan-distribution__rdv-voie-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--cd-gray-600);
  background: var(--cd-gray-100);
  padding: 0 3px;
  border-radius: 2px;
  line-height: 1.4;
  white-space: nowrap;
}

.plan-distribution__rdv-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid var(--cde-border);
  background: var(--cde-bg);
  color: var(--cde-muted);
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.plan-distribution__rdv-icon-btn:hover {
  background: var(--cde-hover);
  border-color: var(--cd-gray-400);
}

.plan-distribution__rdv-icon-btn--ok {
  color: var(--cd-success);
  border-color: var(--cd-success);
}

.plan-distribution__rdv-icon-btn--ok:hover {
  background: var(--cd-success-bg);
}

.plan-distribution__rdv-icon-btn--pause {
  color: var(--cd-warning);
  border-color: var(--cd-warning);
}

.plan-distribution__rdv-icon-btn--pause:hover {
  background: var(--cd-warning-bg);
}

.plan-distribution__rdv-icon-btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.plan-distribution__rdv-status-line {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
  padding-top: 2px;
  border-top: 1px solid var(--cde-border-soft);
}

.plan-distribution__rdv-status-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.plan-distribution__rdv-status-text {
  font-size: 9px;
  color: var(--cde-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-distribution__rdv-reprendre-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  background: var(--cde-bg);
  color: var(--cd-info-blue);
  border: 1px solid var(--cd-info-blue);
  line-height: 1;
  margin-left: auto;
}

.plan-distribution__rdv-reprendre-btn:hover {
  background: var(--cd-info-bg);
}

.plan-distribution__detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.plan-distribution__detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.plan-distribution__detail-label {
  font-size: 12px;
  color: var(--cd-gray-500);
  font-weight: 500;
}
.plan-distribution__detail-value {
  font-size: 13px;
  color: var(--cd-gray-900);
  font-weight: 600;
  text-align: right;
}
.plan-distribution__detail-loading {
  font-size: 12px;
  color: var(--cd-gray-400);
  text-align: center;
  padding: 12px;
}
</style>
