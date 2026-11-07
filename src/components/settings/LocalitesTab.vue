<template>
  <div class="lt cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Localités
        </h1>
        <p class="cde-page-sub">
          Régions, préfectures, communes et sous-préfectures
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

    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="searchQuery"
            placeholder="Nom ou code…"
            clearable
            size="small"
            @input="onSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-radio-group v-model="filterActive" size="small">
            <el-radio-button :label="''">Tous</el-radio-button>
            <el-radio-button :label="'active'">Actifs</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          v-if="hasLocalites"
          :loading="importing"
          size="small"
          :icon="Refresh"
          @click="handleImport"
        >
          Actualiser
        </el-button>
        <el-button
          v-else
          :loading="importing"
          type="primary"
          size="small"
          :icon="Download"
          @click="handleImport"
        >
          Importer les localités de Guinée
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        v-loading="loading"
        :data="paginatedTree"
        style="width: 100%"
        size="small"
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
        empty-text=""
      >
        <el-table-column label="Nom" min-width="220">
          <template #default="{ row }">
            {{ row.name }}
          </template>
        </el-table-column>
        <el-table-column prop="code" label="Code" width="130" />
        <el-table-column label="Type" width="150" align="center">
          <template #default="{ row }">
            <span
              class="cde-badge"
              :class="'cde-badge--' + typeBadgeVariant(row.type)"
            >{{ typeLabel(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Région" width="160">
          <template #default="{ row }">
            <span v-if="row.type === 'region'" class="cde-muted lt__capital">(capitale)</span>
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
              text
              :type="row.is_active ? 'warning' : 'success'"
              size="small"
              @click="handleToggle(row)"
            >
              {{ row.is_active ? 'Désactiver' : 'Activer' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && filteredTree.length === 0" class="cde-empty">
      Aucune localité. Cliquez sur « Importer » pour charger les données de la Guinée.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredTree.length }} localité(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredTree.length"
      />
    </div>

    <section class="cde-panel lt__custom-import">
      <header class="cde-panel__head">
        <h2 class="cde-panel__title">
          Importer un fichier personnalisé
        </h2>
      </header>
      <div class="cde-toolbar lt__custom-import-row">
        <div class="cde-filters">
          <div class="cde-filter">
            <span class="cde-filter__label">Code pays</span>
            <el-input
              v-model="customCountry"
              placeholder="SN"
              size="small"
              maxlength="2"
              :disabled="importingCustom"
            />
          </div>
          <span class="cde-toolbar__meta lt__file-info">{{ selectedFileName || 'Aucun fichier sélectionné' }}</span>
        </div>
        <div class="cde-toolbar__actions">
          <el-button
            size="small"
            :disabled="importingCustom"
            @click="triggerFilePicker"
          >
            Choisir un fichier JSON
          </el-button>
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedFile || !customCountry"
            :loading="importingCustom"
            @click="handleCustomImport"
          >
            Importer
          </el-button>
        </div>
      </div>
      <p class="cde-muted lt__custom-import-hint">
        Le fichier JSON doit contenir un tableau de préfectures avec leurs communes/sous-préfectures.
        <a href="#" @click.prevent="showFormatHelp">Voir le format attendu</a>
      </p>
    </section>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      hidden
      @change="onFileSelected"
    >
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

function typeBadgeVariant(type: string): 'info' | 'success' | 'warning' | 'muted' {
  switch (type) {
    case 'region':
      return 'info'
    case 'prefecture':
      return 'success'
    case 'commune':
      return 'warning'
    case 'sous_prefecture':
      return 'muted'
    default:
      return 'muted'
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
.lt {
  min-width: 0;
  max-width: 100%;
}

.lt__custom-import {
  margin-top: 4px;
}

.lt__custom-import-row {
  padding: 10px 12px 4px;
}

.lt__file-info {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lt__custom-import-hint {
  margin: 0;
  padding: 0 12px 10px;
  font-size: 11px;
}

.lt__custom-import-hint a {
  color: var(--cde-accent);
  text-decoration: underline;
}

.lt__capital {
  font-style: italic;
}
</style>
