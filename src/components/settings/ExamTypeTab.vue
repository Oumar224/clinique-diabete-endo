<template>
  <div class="et cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Examens
        </h1>
        <p class="cde-page-sub">
          Catégories, types d'examen et paramètres de référence
        </p>
      </div>
    </header>

    <el-alert
      v-if="error"
      class="cde-alert cde-alert--danger"
      type="error"
      :title="error"
      :closable="true"
      @close="error = null"
    />

    <div class="et__split">
      <aside class="et__sidebar">
        <div v-loading="loading" class="et__sidebar-list">
          <div
            v-for="cat in categories"
            :key="cat.code"
            class="et__sidebar-item"
            :class="{ 'is-active': selectedCategory?.code === cat.code }"
            @click="selectCategory(cat)"
          >
            <div class="et__sidebar-item-name">{{ cat.label }}</div>
            <div class="et__sidebar-item-code">{{ cat.code }}</div>
          </div>

          <div v-if="!loading && categories.length === 0" class="cde-empty et__sidebar-empty">
            Aucune catégorie.
          </div>
        </div>
      </aside>

      <main class="et__detail">
        <div v-if="!selectedCategory" class="cde-empty et__empty-state">
          Sélectionnez une catégorie.
        </div>

        <template v-else>
          <div class="et__detail-header">
            <h2 class="et__detail-title">{{ selectedCategory.label }}</h2>
            <el-button type="primary" size="small" :icon="Plus" @click="openCreateType">
              Nouveau type
            </el-button>
          </div>

          <div v-if="showCreateTypeForm" class="cde-toolbar et__create-row">
            <div class="cde-filters">
              <div class="cde-filter cde-toolbar__search">
                <span class="cde-filter__label">Libellé</span>
                <el-input
                  v-model="createForm.label"
                  placeholder="Type d'examen"
                  size="small"
                  @keyup.enter="submitCreateType"
                />
              </div>
              <div class="cde-filter">
                <span class="cde-filter__label">Prix (GNF)</span>
                <el-input-number
                  v-model="createForm.prix"
                  :min="0"
                  :step="500"
                  size="small"
                  controls-position="right"
                  style="width: 140px"
                  @keyup.enter="submitCreateType"
                />
              </div>
            </div>
            <div class="cde-toolbar__actions">
              <el-button type="primary" size="small" @click="submitCreateType">OK</el-button>
              <el-button size="small" @click="cancelCreateType">Annuler</el-button>
            </div>
          </div>

          <div class="cde-table-card">
            <el-table
              v-loading="typesLoading"
              :data="types"
              size="small"
              style="width: 100%"
              row-key="id"
              empty-text=""
            >
              <el-table-column type="expand" width="36">
                <template #default="{ row }">
                  <div class="et__children">
                    <div class="et__children-header">
                      <span class="et__children-title">Examens</span>
                      <el-button size="small" :icon="Plus" @click="openCreateExam(row)">
                        Ajouter
                      </el-button>
                    </div>

                    <div
                      v-if="showCreateExamForm && createExamParentId === row.id"
                      class="cde-toolbar et__create-row"
                    >
                      <div class="cde-filters">
                        <div class="cde-filter cde-toolbar__search">
                          <span class="cde-filter__label">Libellé</span>
                          <el-input
                            v-model="createExamForm.label"
                            placeholder="Examen"
                            size="small"
                            @keyup.enter="submitCreateExam"
                          />
                        </div>
                        <div class="cde-filter">
                          <span class="cde-filter__label">Prix (GNF)</span>
                          <el-input-number
                            v-model="createExamForm.prix"
                            :min="0"
                            :step="500"
                            size="small"
                            controls-position="right"
                            style="width: 140px"
                            @keyup.enter="submitCreateExam"
                          />
                        </div>
                      </div>
                      <div class="cde-toolbar__actions">
                        <el-button type="primary" size="small" @click="submitCreateExam">OK</el-button>
                        <el-button size="small" @click="cancelCreateExam">Annuler</el-button>
                      </div>
                    </div>

                    <el-table
                      v-loading="childrenLoading[row.id!]"
                      :data="childrenMap[row.id!] || []"
                      size="small"
                      style="width: 100%"
                      empty-text=""
                    >
                      <el-table-column label="Libellé" min-width="250">
                        <template #default="{ row: child }">
                          <template v-if="editingChildId === child.id">
                            <div class="et__inline-edit">
                              <el-input v-model="editLabel" size="small" @keyup.enter="saveEditChild(child)" @keyup.escape="cancelEdit" />
                              <el-button type="primary" size="small" @click="saveEditChild(child)">OK</el-button>
                              <el-button size="small" @click="cancelEdit">Annuler</el-button>
                            </div>
                          </template>
                          <template v-else>
                            <span class="et__label-text" @dblclick="startEditChild(child)">{{ child.label }}</span>
                          </template>
                        </template>
                      </el-table-column>
                      <el-table-column label="Actif" width="70" align="center">
                        <template #default="{ row: child }">
                          <span class="cde-badge" :class="child.is_active ? 'cde-badge--success' : 'cde-badge--danger'">
                            {{ child.is_active ? 'Oui' : 'Non' }}
                          </span>
                        </template>
                      </el-table-column>
                      <el-table-column label="Prix (GNF)" width="150" align="right">
                        <template #default="{ row: child }">
                          <el-input-number
                            :model-value="child.prix ?? 0"
                            :min="0"
                            :step="500"
                            size="small"
                            controls-position="right"
                            style="width: 130px"
                            @change="(value: number | undefined) => onPrixChange(child, value)"
                          />
                        </template>
                      </el-table-column>
                      <el-table-column label="Actions" width="130" align="center">
                        <template #default="{ row: child }">
                          <el-button text type="info" size="small" :icon="Setting" title="Paramètres" @click.stop="openParamsForExam(child)" />
                          <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="startEditChild(child)" />
                          <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(child)" />
                        </template>
                      </el-table-column>
                    </el-table>

                    <div
                      v-if="!childrenLoading[row.id!] && (!childrenMap[row.id!] || childrenMap[row.id!].length === 0)"
                      class="cde-empty"
                    >
                      Aucun examen.
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="Type" min-width="250">
                <template #default="{ row }">
                  <template v-if="editingTypeId === row.id">
                    <div class="et__inline-edit">
                      <el-input v-model="editLabel" size="small" @keyup.enter="saveEditType(row)" @keyup.escape="cancelEdit" />
                      <el-button type="primary" size="small" @click="saveEditType(row)">OK</el-button>
                      <el-button size="small" @click="cancelEdit">Annuler</el-button>
                    </div>
                  </template>
                  <template v-else>
                    <span class="et__label-text" @dblclick="startEditType(row)">{{ row.label }}</span>
                  </template>
                </template>
              </el-table-column>

              <el-table-column label="Actif" width="80" align="center">
                <template #default="{ row }">
                  <span class="cde-badge" :class="row.is_active ? 'cde-badge--success' : 'cde-badge--danger'">
                    {{ row.is_active ? 'Oui' : 'Non' }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column label="Prix (GNF)" width="150" align="right">
                <template #default="{ row }">
                  <el-input-number
                    :model-value="row.prix ?? 0"
                    :min="0"
                    :step="500"
                    size="small"
                    controls-position="right"
                    style="width: 130px"
                    @change="(value: number | undefined) => onPrixChange(row, value)"
                  />
                </template>
              </el-table-column>

              <el-table-column label="Actions" width="150" align="center">
                <template #default="{ row }">
                  <el-button text type="info" size="small" :icon="Setting" title="Paramètres" @click.stop="openParams(row)" />
                  <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="startEditType(row)" />
                  <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(row)" />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="!typesLoading && types.length === 0" class="cde-empty">
            Aucun type d'examen.
          </div>

          <div class="cde-footer">
            <span class="cde-muted">{{ types.length }} type(s) d'examen</span>
          </div>

          <ExamParameterPanel
            v-if="selectedParamOwner"
            :owner-id="selectedParamOwner.id"
            :owner-type="selectedParamOwner.type"
            :owner-label="selectedParamOwner.label"
            @close="selectedParamOwner = null"
          />
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus, Edit, Delete, Setting } from '@element-plus/icons-vue'
import ExamParameterPanel from './ExamParameterPanel.vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useExamTypes, type ExamCategoryDto, type ExamTypeDto } from '@/composables/useExamTypes'
import { ipcInvoke } from '@/utils/ipc'

const {
  categories,
  types,
  loading,
  typesLoading,
  error,
  fetchCategories,
  fetchTypesByCategory,
  createType,
  updateType,
  deleteType,
} = useExamTypes()

const selectedCategory = ref<ExamCategoryDto | null>(null)

const editingTypeId = ref<number | null>(null)
const editingChildId = ref<number | null>(null)
const editLabel = ref('')

const showCreateTypeForm = ref(false)
const createForm = reactive({ label: '', prix: 0 })

const showCreateExamForm = ref(false)
const createExamParentId = ref<number | null>(null)
const createExamForm = reactive({ label: '', prix: 0 })

const childrenMap = ref<Record<number, ExamTypeDto[]>>({})
const childrenLoading = ref<Record<number, boolean>>({})
const childrenErrors = ref<Record<number, string | null>>({})

const selectedParamOwner = ref<{ id: number; type: 'type' | 'exam'; label: string } | null>(null)

onMounted(async () => {
  await fetchCategories()
})

async function selectCategory(cat: ExamCategoryDto) {
  selectedCategory.value = cat
  cancelEdit()
  showCreateTypeForm.value = false
  showCreateExamForm.value = false
  childrenMap.value = {}
  await fetchTypesByCategory(cat.code)
}

/* ─── Type editing ─── */
function startEditType(type: ExamTypeDto) {
  showCreateTypeForm.value = false
  showCreateExamForm.value = false
  editingTypeId.value = type.id ?? null
  editLabel.value = type.label
}

function startEditChild(child: ExamTypeDto) {
  showCreateTypeForm.value = false
  showCreateExamForm.value = false
  editingChildId.value = child.id ?? null
  editLabel.value = child.label
}

function cancelEdit() {
  editingTypeId.value = null
  editingChildId.value = null
  editLabel.value = ''
}

async function saveEditType(type: ExamTypeDto) {
  const trimmed = editLabel.value.trim()
  if (!trimmed) { ElMessage.warning('Le libellé ne peut pas être vide'); return }
  if (type.id == null) return
  const updated = await updateType(type.id, { label: trimmed })
  if (updated && selectedCategory.value) await fetchTypesByCategory(selectedCategory.value.code)
  cancelEdit()
}

async function saveEditChild(child: ExamTypeDto) {
  const trimmed = editLabel.value.trim()
  if (!trimmed) { ElMessage.warning('Le libellé ne peut pas être vide'); return }
  if (child.id == null) return
  const updated = await updateType(child.id, { label: trimmed })
  if (updated && child.parent_id) await loadChildren(child.parent_id)
  cancelEdit()
}

/** Enregistre le tarif d'un type ou d'un examen (GNF). */
async function onPrixChange(item: ExamTypeDto, value: number | undefined) {
  if (item.id == null) return
  const prix = Math.max(0, Number(value ?? 0))
  const previous = item.prix ?? 0
  if (prix === previous) return
  const updated = await updateType(item.id, { prix })
  if (updated) {
    item.prix = updated.prix ?? prix
    ElMessage.success('Prix enregistré')
  } else {
    item.prix = previous
  }
}

/* ─── Type creation ─── */
function openCreateType() {
  cancelEdit()
  showCreateExamForm.value = false
  showCreateTypeForm.value = true
  createForm.label = ''
  createForm.prix = 0
}

function cancelCreateType() {
  showCreateTypeForm.value = false
  createForm.label = ''
  createForm.prix = 0
}

async function submitCreateType() {
  if (!selectedCategory.value || selectedCategory.value.id == null) {
    ElMessage.error('Catégorie invalide'); return
  }
  const label = createForm.label.trim()
  if (!label) { ElMessage.warning('Le libellé est requis'); return }
  const created = await createType({
    label,
    category_id: selectedCategory.value.id,
    prix: createForm.prix ?? 0,
  })
  if (created) {
    ElMessage.success('Type créé')
    showCreateTypeForm.value = false
    createForm.label = ''
    createForm.prix = 0
    if (selectedCategory.value) await fetchTypesByCategory(selectedCategory.value.code)
  }
}

/* ─── Exam (child) creation ─── */
function openCreateExam(type: ExamTypeDto) {
  cancelEdit()
  showCreateTypeForm.value = false
  showCreateExamForm.value = true
  createExamParentId.value = type.id ?? null
  createExamForm.label = ''
  createExamForm.prix = 0
}

function cancelCreateExam() {
  showCreateExamForm.value = false
  createExamParentId.value = null
  createExamForm.label = ''
  createExamForm.prix = 0
}

async function submitCreateExam() {
  if (!selectedCategory.value || selectedCategory.value.id == null) {
    ElMessage.error('Catégorie invalide'); return
  }
  if (createExamParentId.value == null) { ElMessage.error('Type parent invalide'); return }
  const label = createExamForm.label.trim()
  if (!label) { ElMessage.warning('Le libellé est requis'); return }
  const created = await createType({
    label,
    category_id: selectedCategory.value.id,
    parent_id: createExamParentId.value,
    prix: createExamForm.prix ?? 0,
  })
  if (created) {
    ElMessage.success('Examen créé')
    showCreateExamForm.value = false
    createExamForm.label = ''
    createExamForm.prix = 0
    await loadChildren(createExamParentId.value)
  }
}

/* ─── Children loading (on expand) ─── */
async function loadChildren(typeId: number) {
  childrenLoading.value[typeId] = true
  childrenErrors.value[typeId] = null
  try {
    const result = await ipcInvoke<ExamTypeDto[]>('exam-types:list-by-type', { type_id: typeId })
    childrenMap.value[typeId] = Array.isArray(result) ? result : []
  } catch (e) {
    childrenErrors.value[typeId] = (e as Error).message
    childrenMap.value[typeId] = []
  } finally {
    childrenLoading.value[typeId] = false
  }
}

/* ─── Parameter panel ─── */
function openParams(type: ExamTypeDto) {
  selectedParamOwner.value = { id: type.id!, type: 'type', label: type.label }
}

function openParamsForExam(exam: ExamTypeDto) {
  selectedParamOwner.value = { id: exam.id!, type: 'exam', label: exam.label }
}

/* ─── Delete ─── */
async function handleDelete(item: ExamTypeDto) {
  if (item.id == null) { ElMessage.error('Identifiant manquant'); return }
  try {
    await ElMessageBox.confirm(
      `Supprimer « ${item.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    const ok = await deleteType(item.id)
    if (ok) {
      ElMessage.success('Supprimé')
      if (selectedCategory.value) {
        await fetchTypesByCategory(selectedCategory.value.code)
      }
      childrenMap.value = {}
    }
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.et {
  min-width: 0;
  max-width: 100%;
}

.et__split {
  display: flex;
  height: calc(100vh - 300px);
  min-height: 360px;
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  overflow: hidden;
}

.et__sidebar {
  width: 260px;
  min-width: 200px;
  max-width: 380px;
  background: var(--cde-bg);
  border-right: 1px solid var(--cde-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.et__sidebar-list {
  height: 100%;
}

.et__sidebar-item {
  padding: 9px 12px;
  cursor: pointer;
  border-left: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.et__sidebar-item:hover {
  background: var(--cd-gray-50);
}

.et__sidebar-item.is-active {
  background: var(--cd-gray-50);
  border-left-color: var(--cde-accent);
}

.et__sidebar-item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.et__sidebar-item-code {
  font-size: 11px;
  color: var(--cde-muted);
}

.et__sidebar-empty {
  padding: 12px;
}

.et__detail {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--cde-bg);
  min-width: 0;
}

.et__empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.et__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cde-border);
}

.et__detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.et__create-row {
  margin: 0;
  padding: 0;
}

.et__inline-edit {
  display: flex;
  align-items: center;
  gap: 6px;
}

.et__label-text {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
}

.et__label-text:hover {
  background-color: var(--cd-gray-100);
}

.et__children {
  padding: 8px 12px 8px 20px;
  background: var(--cd-gray-50);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.et__children-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.et__children-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cde-muted);
}

@media (max-width: 760px) {
  .et__split {
    flex-direction: column;
    height: auto;
  }

  .et__sidebar {
    width: 100%;
    max-width: none;
    border-right: 0;
    border-bottom: 1px solid var(--cde-border);
    max-height: 220px;
  }
}
</style>
