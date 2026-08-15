<template>
  <div class="et">
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      show-icon
      closable
      style="margin-bottom: 12px"
    />

    <div class="et__split">
      <aside class="et__sidebar">
        <div class="et__sidebar-list" v-loading="loading">
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

          <el-empty
            v-if="!loading && categories.length === 0"
            :image-size="60"
            description="Aucune catégorie"
          />
        </div>
      </aside>

      <main class="et__detail">
        <div v-if="!selectedCategory" class="et__empty-state">
          <el-icon :size="40" color="var(--cd-gray-300)"><FolderOpened /></el-icon>
          <p>Sélectionnez une catégorie</p>
        </div>

        <template v-else>
          <div class="et__detail-header">
            <h2 class="et__detail-title">{{ selectedCategory.label }}</h2>
            <el-button type="primary" :icon="Plus" @click="openCreateType">
              Nouveau type
            </el-button>
          </div>

          <div v-if="showCreateTypeForm" class="et__create-row">
            <el-input
              v-model="createForm.label"
              placeholder="Libellé du type d'examen"
              size="small"
              style="width: 300px"
              @keyup.enter="submitCreateType"
            />
            <el-button type="primary" size="small" @click="submitCreateType">OK</el-button>
            <el-button size="small" @click="cancelCreateType">Annuler</el-button>
          </div>

          <el-table
            v-loading="typesLoading"
            :data="types"
            size="small"
            style="width: 100%"
            border
            row-key="id"
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

                  <div v-if="showCreateExamForm && createExamParentId === row.id" class="et__create-row" style="margin-bottom:8px">
                    <el-input
                      v-model="createExamForm.label"
                      placeholder="Libellé de l'examen"
                      size="small"
                      style="width: 280px"
                      @keyup.enter="submitCreateExam"
                    />
                    <el-button type="primary" size="small" @click="submitCreateExam">OK</el-button>
                    <el-button size="small" @click="cancelCreateExam">Annuler</el-button>
                  </div>

                  <el-table
                    v-loading="childrenLoading[row.id!]"
                    :data="childrenMap[row.id!] || []"
                    size="small"
                    style="width: 100%"
                    border
                    :show-header="false"
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
                        <el-tag :type="child.is_active ? 'success' : 'danger'" size="small">
                          {{ child.is_active ? 'Oui' : 'Non' }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="Actions" width="130" align="center">
                      <template #default="{ row: child }">
                        <el-button text type="info" :icon="Setting" size="small" @click.stop="openParamsForExam(child)" title="Paramètres" />
                        <el-button text type="primary" :icon="Edit" size="small" @click="startEditChild(child)" />
                        <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(child)" />
                      </template>
                    </el-table-column>
                  </el-table>

                  <el-empty
                    v-if="!childrenLoading[row.id!] && (!childrenMap[row.id!] || childrenMap[row.id!].length === 0)"
                    description="Aucun examen"
                    :image-size="40"
                  />
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
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                  {{ row.is_active ? 'Oui' : 'Non' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="Actions" width="150" align="center">
              <template #default="{ row }">
                <el-button text type="info" :icon="Setting" size="small" @click.stop="openParams(row)" title="Paramètres" />
                <el-button text type="primary" :icon="Edit" size="small" @click="startEditType(row)" />
                <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(row)" />
              </template>
            </el-table-column>
          </el-table>

          <ExamParameterPanel
            v-if="selectedParamOwner"
            :owner-id="selectedParamOwner.id"
            :owner-type="selectedParamOwner.type"
            :owner-label="selectedParamOwner.label"
            @close="selectedParamOwner = null"
          />

          <el-empty v-if="!typesLoading && types.length === 0" description="Aucun type d'examen" />
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus, Edit, Delete, FolderOpened, Setting } from '@element-plus/icons-vue'
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
const createForm = reactive({ label: '' })

const showCreateExamForm = ref(false)
const createExamParentId = ref<number | null>(null)
const createExamForm = reactive({ label: '' })

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

/* ─── Type creation ─── */
function openCreateType() {
  cancelEdit()
  showCreateExamForm.value = false
  showCreateTypeForm.value = true
  createForm.label = ''
}

function cancelCreateType() {
  showCreateTypeForm.value = false
  createForm.label = ''
}

async function submitCreateType() {
  if (!selectedCategory.value || selectedCategory.value.id == null) {
    ElMessage.error('Catégorie invalide'); return
  }
  const label = createForm.label.trim()
  if (!label) { ElMessage.warning('Le libellé est requis'); return }
  const created = await createType({ label, category_id: selectedCategory.value.id })
  if (created) {
    ElMessage.success('Type créé')
    showCreateTypeForm.value = false
    createForm.label = ''
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
}

function cancelCreateExam() {
  showCreateExamForm.value = false
  createExamParentId.value = null
  createExamForm.label = ''
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
  })
  if (created) {
    ElMessage.success('Examen créé')
    showCreateExamForm.value = false
    createExamForm.label = ''
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
.et__split {
  display: flex;
  height: calc(100vh - 280px);
  min-height: 400px;
  border: 1px solid var(--cd-gray-200);
  border-radius: 4px;
  overflow: hidden;
}
.et__sidebar {
  width: 280px;
  min-width: 220px;
  max-width: 400px;
  background: var(--cd-white);
  border-right: 1px solid var(--cd-gray-200);
  overflow-y: auto;
  flex-shrink: 0;
}
.et__sidebar-list { height: 100%; }
.et__sidebar-item {
  padding: 10px 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.1s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.et__sidebar-item:hover { background: var(--cd-gray-100); }
.et__sidebar-item.is-active {
  background: var(--cd-primary-light-9);
  border-left-color: var(--cd-primary);
}
.et__sidebar-item-name { font-size: 13px; font-weight: 600; color: var(--cd-gray-900); }
.et__sidebar-item-code { font-size: 11px; color: var(--cd-gray-500); }
.et__detail {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--cd-white);
}
.et__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--cd-gray-400);
  font-size: 13px;
}
.et__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cd-gray-200);
}
.et__detail-title { font-size: 16px; font-weight: 700; color: var(--cd-gray-900); }
.et__create-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--cd-primary-light-9);
  border: 1px solid var(--cd-primary-light-5);
  border-radius: 4px;
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
  transition: background-color 0.1s;
}
.et__label-text:hover { background-color: var(--cd-gray-100); }
.et__children {
  padding: 8px 12px 8px 24px;
  background: var(--cd-gray-50);
}
.et__children-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.et__children-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-700);
}
</style>
