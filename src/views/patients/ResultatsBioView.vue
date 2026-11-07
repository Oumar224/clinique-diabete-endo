<template>
  <div class="rb" v-loading="loading">
    <div class="rb__header">
      <div class="rb__actions">
        <el-input
          v-model="searchQuery"
          placeholder="Rechercher une analyse…"
          clearable
          size="small"
          style="width: 220px"
          class="rb__search"
        />
        <el-select
          v-model="filters.typeId"
          placeholder="Type d'examen"
          clearable
          size="small"
          style="width: 180px"
          @change="onFilterChange"
        >
          <el-option v-for="t in examTypes" :key="t.id" :label="t.label" :value="t.id!" />
        </el-select>
        <el-select
          v-model="filters.examId"
          placeholder="Examen"
          clearable
          size="small"
          style="width: 180px"
          @change="onFilterChange"
        >
          <el-option v-for="e in filteredExams" :key="e.id" :label="e.label" :value="e.id!" />
        </el-select>
        <el-button-group>
          <el-button :icon="ArrowLeft" @click="goToNewerWindow" />
          <el-button class="rb__week-label">{{ weekLabel }}</el-button>
          <el-button :icon="ArrowRight" @click="goToOlderWindow" />
        </el-button-group>
        <el-button :icon="Refresh" :loading="refreshing" @click="loadData">
          Actualiser
        </el-button>
      </div>
    </div>

    <BioMatrixTable
      :groups="filteredMatrixGroups"
      :date-columns="weekDateColumns"
      :hour-slots="EXAM_GRID_HOURS"
      :empty-text="emptyText"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ArrowLeft, ArrowRight, Refresh } from '@element-plus/icons-vue'
import {
  useExamResults,
  EXAM_GRID_HOURS,
  type MatrixGroup,
} from '@/composables/useExamResults'
import { type ExamTypeDto } from '@/composables/useExamTypes'
import { usePatientContext } from '@/composables/usePatientContext'
import { ipcInvoke } from '@/utils/ipc'
import BioMatrixTable from '@/components/patients/BioMatrixTable.vue'

/* ------------------------------------------------------------------ */
/*  Context & composables                                              */
/* ------------------------------------------------------------------ */

const { activePatient } = usePatientContext()
const { loading, results, fetchByPatient, buildMatrix } = useExamResults()

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const refreshing = ref(false)
const examTypes = ref<ExamTypeDto[]>([])
const allExams = ref<ExamTypeDto[]>([])

const filters = reactive({
  typeId: null as number | null,
  examId: null as number | null,
})

const matrixGroups = ref<MatrixGroup[]>([])

const searchQuery = ref('')

/** Longueur de la fenêtre glissante (identique à l'ancienne semaine). */
const WINDOW_DAYS = 7

/**
 * Dernier jour (le plus récent) de la fenêtre affichée. Par défaut : aujourd'hui.
 * La grille se lit de gauche (jour le plus récent) vers la droite (jours
 * antérieurs) : la chronologie est donc strictement décroissante.
 */
const windowEnd = ref(startOfDay(new Date()))

/* ------------------------------------------------------------------ */
/*  Window helpers (rolling window ending on `windowEnd`)              */
/* ------------------------------------------------------------------ */

function startOfDay(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, days: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/*
 * Navigation spatiale : la grille va du plus récent (gauche) au plus ancien
 * (droite). `‹` remonte donc vers les dates plus récentes, `›` vers les dates
 * plus anciennes, par pas d'une fenêtre complète.
 */
function goToNewerWindow() {
  windowEnd.value = addDays(windowEnd.value, WINDOW_DAYS)
  loadData()
}

function goToOlderWindow() {
  windowEnd.value = addDays(windowEnd.value, -WINDOW_DAYS)
  loadData()
}

/* ------------------------------------------------------------------ */
/*  Computed                                                           */
/* ------------------------------------------------------------------ */

/** Indexé par `Date.getDay()` : 0 = dimanche. */
const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const currentHour = computed(() => {
  const h = new Date().getHours()
  return [...EXAM_GRID_HOURS].reverse().find(hr => hr <= h) ?? EXAM_GRID_HOURS[0]
})

const weekDays = computed(() => {
  const today = startOfDay(new Date())
  return Array.from({ length: WINDOW_DAYS }, (_, i) => {
    // i = 0 → jour le plus récent (aujourd'hui par défaut), puis J-1, J-2…
    const d = addDays(windowEnd.value, -i)
    const dateKey = formatDateKey(d)
    const dateLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`
    return {
      name: dayNames[d.getDay()],
      dateKey,
      dateLabel,
      isToday: d.getTime() === today.getTime(),
      fullDate: d,
    }
  })
})

const weekDateColumns = computed(() =>
  weekDays.value.map((day) => ({
    key: day.dateKey,
    name: day.name,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
  })),
)

/** Libellé aligné sur l'ordre visuel : plus récent (gauche) → plus ancien (droite). */
const weekLabel = computed(() => {
  const newest = weekDays.value[0]
  const oldest = weekDays.value[WINDOW_DAYS - 1]
  return `${newest.dateLabel} — ${oldest.dateLabel}`
})

const weekDateRange = computed(() => {
  const newest = weekDays.value[0]
  const oldest = weekDays.value[WINDOW_DAYS - 1]
  return { dateFrom: oldest.dateKey, dateTo: newest.dateKey }
})

const filteredExams = computed(() => {
  if (!filters.typeId) return allExams.value
  return allExams.value.filter(
    (e) => e.parent_id === filters.typeId || e.id === filters.typeId,
  )
})

/** Message d'état vide : masqué pendant le chargement (loading). */
const emptyText = computed(() => {
  if (loading.value) return ''
  return searchQuery.value
    ? 'Aucun résultat ne correspond à la recherche'
    : 'Aucun résultat disponible pour cette semaine'
})

/**
 * Groupes de la matrice filtrés côté client par la recherche libre.
 * Filtre les LIGNES sur `parameterName` (et `examName` du groupe),
 * insensible à la casse ; les groupes devenus vides sont masqués.
 */
const filteredMatrixGroups = computed<MatrixGroup[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return matrixGroups.value
  return matrixGroups.value
    .map((group) => {
      const examName = (group.examName ?? '').toLowerCase()
      return {
        ...group,
        rows: group.rows.filter(
          (row) =>
            row.parameterName.toLowerCase().includes(q) ||
            examName.includes(q),
        ),
      }
    })
    .filter((group) => group.rows.length > 0)
})

/* ------------------------------------------------------------------ */
/*  Data loading                                                       */
/* ------------------------------------------------------------------ */

async function loadData() {
  if (!activePatient.value?.id) return
  refreshing.value = true
  try {
    const patientFilters: Record<string, unknown> = {
      dateFrom: weekDateRange.value.dateFrom,
      dateTo: weekDateRange.value.dateTo,
    }
    if (filters.typeId) patientFilters.typeId = filters.typeId
    if (filters.examId) patientFilters.examId = filters.examId

    await fetchByPatient(activePatient.value.id, patientFilters)

    const { matrixGroups: groups } = buildMatrix(results.value)
    matrixGroups.value = groups
    scrollToCurrentTime()
  } finally {
    refreshing.value = false
  }
}

function onFilterChange() {
  searchQuery.value = ''
  loadData()
}

function scrollToCurrentTime() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const wrapper = document.querySelector('.rb__grid-wrapper')
      if (!wrapper) return
      const dayIdx = weekDays.value.findIndex(d => d.isToday)
      if (dayIdx < 0) return
      const hourIdx = EXAM_GRID_HOURS.indexOf(currentHour.value)
      if (hourIdx < 0) return
      const targetHourEls = wrapper.querySelectorAll('.rb__date-hour')
      const targetIdx = dayIdx * EXAM_GRID_HOURS.length + hourIdx
      const target = targetHourEls[targetIdx] as HTMLElement
      if (target) {
        target.scrollIntoView({ inline: 'center', block: 'nearest' })
      }
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  try {
    const typesResult = await ipcInvoke<ExamTypeDto[]>(
      'exam-types:list-by-category',
      { category_code: 'laboratoire' },
    )
    examTypes.value = Array.isArray(typesResult) ? typesResult : []
    const allResult = await ipcInvoke<ExamTypeDto[]>(
      'exam-types:list-all-by-category',
      { category_code: 'laboratoire' },
    )
    allExams.value = Array.isArray(allResult) ? allResult : []
  } catch {
    /* silent */
  }
  await loadData()
})
</script>

<style scoped>
.rb {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rb__header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.rb__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rb__week-label {
  min-width: 140px;
  font-weight: 600;
}
</style>
