<template>
  <div class="lt">
    <div class="lt__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher par nom ou code..."
        clearable
        style="width: 280px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-radio-group v-model="filterActive" size="small">
        <el-radio-button :label="''">Tous</el-radio-button>
        <el-radio-button :label="'active'">Actifs</el-radio-button>
      </el-radio-group>
      <el-button
        v-if="hasLocalites"
        :loading="importing"
        :icon="Refresh"
        @click="handleImport"
      >
        Actualiser
      </el-button>
      <el-button
        v-else
        :loading="importing"
        type="primary"
        :icon="Download"
        @click="handleImport"
      >
        Importer les localités de Guinée
      </el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      closable
      @close="error = null"
      style="margin-bottom: 16px"
    />

    <el-table
      v-loading="loading"
      :data="paginatedTree"
      style="width: 100%"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
      row-key="id"
      :tree-props="{ children: 'children' }"
      default-expand-all
    >
      <el-table-column label="Nom" min-width="220">
        <template #default="{ row }">
          <span>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="code" label="Code" width="130" />
      <el-table-column label="Type" width="150" align="center">
        <template #default="{ row }">
          <el-tag :type="typeBadgeType(row.type)" size="small" effect="plain">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Région" width="160">
        <template #default="{ row }">
          <span v-if="row.type === 'region'" style="color: var(--cd-gray-400); font-style: italic;">(capitale)</span>
          <span v-else>{{ row.region || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="90" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.is_active"
            size="small"
            @change="handleToggle(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="110" align="center">
        <template #default="{ row }">
          <el-button
            v-if="row.is_active"
            text
            type="warning"
            size="small"
            @click="handleToggle(row)"
          >
            Désactiver
          </el-button>
          <el-button
            v-else
            text
            type="success"
            size="small"
            @click="handleToggle(row)"
          >
            Activer
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && filteredTree.length === 0"
      description="Aucune localité. Cliquez sur 'Importer' pour charger les données de la Guinée."
    />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        background
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredTree.length"
      />
    </el-row>

    <el-divider />

    <div class="lt__custom-import">
      <h3 class="lt__custom-import-title">Importer un fichier personnalisé</h3>
      <div class="lt__custom-import-row">
        <el-input
          v-model="customCountry"
          placeholder="Code pays (ex: SN)"
          style="width: 160px"
          maxlength="2"
          :disabled="importingCustom"
        />
        <span class="lt__file-info">{{ selectedFileName || 'Aucun fichier sélectionné' }}</span>
        <el-button
          :disabled="importingCustom"
          @click="triggerFilePicker"
        >
          Choisir un fichier JSON
        </el-button>
        <el-button
          type="primary"
          :disabled="!selectedFile || !customCountry"
          :loading="importingCustom"
          @click="handleCustomImport"
        >
          Importer
        </el-button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        hidden
        @change="onFileSelected"
      />
      <p class="lt__custom-import-hint">
        Le fichier JSON doit contenir un tableau de préfectures avec leurs communes/sous-préfectures.
        <a href="#" @click.prevent="showFormatHelp">Voir le format attendu</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Download, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLocalites, type LocaliteDto } from '@/composables/useLocalites'

const { treeData, loading, error, getTree, importLocalites, importLocalitesData, toggleLocalite } = useLocalites()

const searchQuery = ref('')
const filterActive = ref('')
const importing = ref(false)

const selectedFile = ref<File | null>(null)
const selectedFileName = ref('')
const customCountry = ref('')
const importingCustom = ref(false)
const fileInput = ref<HTMLInputElement>()

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await getTree()
})

const hasLocalites = computed(() => treeData.value.length > 0)

const filteredTree = computed(() => {
  let result = treeData.value

  // Filter by active status — only top-level check for tree mode
  if (filterActive.value === 'active') {
    result = result.filter(n => n.is_active)
  }

  // Filter by search query on name or code
  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    result = result.filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.code.toLowerCase().includes(q)
    )
  }

  return result
})

const paginatedTree = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredTree.value.slice(start, start + paginator.pageSize)
})

function typeBadgeType(type: string): 'primary' | 'success' | 'warning' | 'info' {
  switch (type) {
    case 'region':
      return 'primary'
    case 'prefecture':
      return 'success'
    case 'commune':
      return 'warning'
    case 'sous_prefecture':
      return 'info'
    default:
      return 'info'
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'region':
      return 'Région'
    case 'prefecture':
      return 'Préfecture'
    case 'commune':
      return 'Commune'
    case 'sous_prefecture':
      return 'Sous-préfecture'
    default:
      return type
  }
}

function onSearch() {
  paginator.currPage = 1
}

async function handleImport() {
  importing.value = true
  try {
    const count = await importLocalites()
    if (count > 0) {
      ElMessage.success(`${count} localités importées avec succès`)
      await getTree()
    } else {
      ElMessage.info('Aucune nouvelle localité. Les données sont peut-être déjà en base.')
    }
  } catch {
    // L'erreur est déjà affichée via :
    // 1. Le toast ElMessage.error() de ipcInvoke()
    // 2. Le composant <el-alert> lié à error (useLocalites)
  } finally {
    importing.value = false
  }
}

async function handleToggle(row: LocaliteDto) {
  const updated = await toggleLocalite(row.id!, !row.is_active)
  if (updated) {
    ElMessage.success(
      updated.is_active
        ? `« ${updated.name} » activée`
        : `« ${updated.name} » désactivée`
    )
  }
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    selectedFileName.value = target.files[0].name
  }
}

function showFormatHelp() {
  ElMessageBox.alert(
    `[
  {
    "code": "XX-R",
    "name": "Nom de la région",
    "type": "region",
    "children": [
      {
        "code": "XX-REG",
        "name": "Nom de la préfecture",
        "type": "prefecture",
        "region": "Nom de la région",
        "children": [
          {
            "code": "XX-REG-COM",
            "name": "Nom de la commune",
            "type": "commune",
            "region": "Nom de la région"
          }
        ]
      }
    ]
  }
]`,
    'Format JSON attendu',
    { confirmButtonText: 'OK', dangerouslyUseHTMLString: false }
  )
}

async function handleCustomImport() {
  if (!selectedFile.value) {
    ElMessage.warning('Veuillez sélectionner un fichier JSON')
    return
  }
  if (!customCountry.value || customCountry.value.trim().length < 2) {
    ElMessage.warning('Le code pays doit contenir au moins 2 caractères')
    return
  }

  importingCustom.value = true
  try {
    const text = await selectedFile.value.text()
    const count = await importLocalitesData(text, customCountry.value.trim().toUpperCase())
    if (count > 0) {
      ElMessage.success(`${count} localités importées pour ${customCountry.value.trim().toUpperCase()}`)
      await getTree()
    } else {
      ElMessage.info('Aucune nouvelle localité (déjà importées)')
    }
    // Reset
    selectedFile.value = null
    selectedFileName.value = ''
    customCountry.value = ''
    if (fileInput.value) fileInput.value.value = ''
  } catch (e: any) {
    ElMessage.error(e.message || "Erreur lors de l'importation")
  } finally {
    importingCustom.value = false
  }
}
</script>

<style scoped>
.lt__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.lt__custom-import {
  margin-top: 8px;
}

.lt__custom-import-title {
  font-size: 15px;
  font-weight: 600;
  color: #0E5C5B;
  margin-bottom: 12px;
}

.lt__custom-import-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.lt__file-info {
  font-size: 13px;
  color: #6B8A89;
}

.lt__custom-import-hint {
  font-size: 12px;
  color: #8CA5A4;
  margin-top: 8px;
}

.lt__custom-import-hint a {
  color: #0E5C5B;
  text-decoration: underline;
}
</style>
