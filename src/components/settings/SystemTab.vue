<template>
  <div v-loading="!hasData" class="systab">
    <!-- Application Info -->
    <div class="systab__section">
      <h2 class="systab__section-title">Informations de l'application</h2>
      <div class="systab__card">
        <SystemInfoRow label="Version de l'application" :value="systemInfo.app?.app_version" />
        <SystemInfoRow label="Version d'Electron" :value="systemInfo.app?.electron_version" />
        <SystemInfoRow label="Version de Node.js" :value="systemInfo.app?.node_version" />
        <SystemInfoRow label="Version SQLite" :value="systemInfo.app?.sqlite_version" />
        <SystemInfoRow label="Plateforme" :value="systemInfo.app?.platform" />
        <SystemInfoRow label="Architecture" :value="systemInfo.app?.platform_arch" />
        <SystemInfoRow label="Chemin de la base" :value="dbPath" />
      </div>
    </div>

    <!-- Statistics -->
    <div class="systab__section">
      <h2 class="systab__section-title">Statistiques</h2>
      <div class="systab__stats-grid">
        <DatabaseStatsCard
          :icon="User"
          :count="getCount('patient')"
          label="Patients"
        />
        <DatabaseStatsCard
          :icon="Calendar"
          :count="getCount('appointment')"
          label="Consultations"
        />
        <DatabaseStatsCard
          :icon="Money"
          :count="getCount('invoice')"
          label="Factures"
        />
        <DatabaseStatsCard
          :icon="Tools"
          :count="getCount('services')"
          label="Services"
        />
      </div>
      <div class="systab__db-size">
        Taille de la base : <strong>{{ systemInfo.stats?.db_size_human || '—' }}</strong>
      </div>
    </div>

    <!-- Backup & Restore -->
    <div class="systab__section">
      <h2 class="systab__section-title">Sauvegarde et restauration</h2>
      <div class="systab__backup-info">
        <p>
          Dernière sauvegarde :
          <strong>{{ systemInfo.lastBackup ? formatDate(systemInfo.lastBackup) : 'Aucune' }}</strong>
        </p>
      </div>
      <div class="systab__backup-actions">
        <el-button
          type="primary"
          :icon="Download"
          :loading="backingUp"
          @click="handleBackup"
        >
          Effectuer une sauvegarde
        </el-button>
        <el-button
          type="warning"
          :icon="Upload"
          :loading="restoring"
          @click="handleRestore"
        >
          Restaurer une sauvegarde
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { User, Calendar, Money, Tools, Download, Upload } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useSystemInfo } from '@/composables/useSystemInfo'

const { systemInfo, backingUp, restoring, fetchInfo, triggerBackup, triggerRestore } = useSystemInfo()

const dbPath = computed(() => {
  if (!systemInfo.value.app?.platform) return '—'
  return `userData/cde-clinique.db`
})

const hasData = computed(() => !!systemInfo.value.app)

onMounted(async () => {
  await fetchInfo()
})

function getCount(table: string): number {
  return systemInfo.value.stats?.record_counts?.[table] ?? 0
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleBackup() {
  await triggerBackup()
}

async function handleRestore() {
  try {
    const result = await ElMessageBox.prompt(
      'Entrez le chemin complet du fichier de sauvegarde (.db).\n' +
      'Exemple : C:\\Users\\nom\\Backups\\cde-clinique-2025-06-13.db (Windows)\n' +
      'ou /home/user/Backups/cde-clinique-2025-06-13.db (Linux/Mac)',
      'Restaurer une sauvegarde',
      {
        confirmButtonText: 'Restaurer',
        cancelButtonText: 'Annuler',
        inputPattern: /.+\.db$/,
        inputErrorMessage: 'Le fichier doit avoir l\'extension .db',
      }
    )
    if (result.value) {
      await triggerRestore(result.value)
    }
  } catch {
    // cancelled
  }
}
</script>

<style scoped>
.systab__section {
  margin-bottom: 28px;
}

.systab__section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 12px;
}

.systab__card {
  background: var(--cd-white);
  border-radius: 10px;
  border: 1px solid var(--cd-gray-200);
  padding: 4px 16px;
}

.systab__stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.systab__db-size {
  font-size: 13px;
  color: var(--cd-gray-600);
  margin-top: 8px;
}

.systab__db-size strong {
  color: var(--cd-gray-900);
}

.systab__backup-info {
  font-size: 14px;
  color: var(--cd-gray-600);
  margin-bottom: 12px;
}

.systab__backup-info strong {
  color: var(--cd-gray-900);
}

.systab__backup-actions {
  display: flex;
  gap: 12px;
}
</style>
