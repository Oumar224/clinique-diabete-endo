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

    <!-- Configuration Email -->
    <div class="systab__section">
      <h2 class="systab__section-title">Configuration Email</h2>
      <div class="systab__card" style="padding: 16px">
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 14px; color: var(--cd-gray-600);">Statut :</span>
          <el-tag v-if="emailConfig?.is_configured" type="success" size="small">Configuré</el-tag>
          <el-tag v-else type="info" size="small">Non configuré</el-tag>
        </div>

        <el-collapse style="margin-bottom: 16px;">
          <el-collapse-item title="Instructions" name="instructions">
            <div style="padding: 8px 0; font-size: 13px; line-height: 1.6;">
              <p><strong>Gmail :</strong> Utilisez un mot de passe d'application (App Password). Activez d'abord l'authentification à 2 facteurs dans votre compte Google, puis générez un mot de passe d'application.</p>
              <p style="margin-top: 8px;"><strong>SendGrid :</strong> Créez une clé API SendGrid avec les permissions 'Mail Send'. Utilisez 'apikey' comme nom d'utilisateur et la clé API comme mot de passe.</p>
              <p style="margin-top: 8px;"><strong>Général :</strong> Contactez votre administrateur réseau pour les paramètres SMTP de votre organisation. Les paramètres courants sont : Serveur: smtp.votredomaine.com, Port: 587 (STARTTLS) ou 465 (SSL).</p>
            </div>
          </el-collapse-item>
        </el-collapse>

        <el-form label-position="top" :model="emailForm">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="SMTP Host">
                <el-input v-model="emailForm.smtp_host" placeholder="smtp.gmail.com" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="SMTP Port">
                <el-input-number
                  v-model="emailForm.smtp_port"
                  :min="1"
                  :max="65535"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="SMTP Utilisateur">
                <el-input v-model="emailForm.smtp_user" placeholder="utilisateur" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Mot de passe SMTP">
                <el-input v-model="emailForm.smtp_pass" type="password" show-password placeholder="Mot de passe ou clé API" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Email expéditeur">
                <el-input v-model="emailForm.sender_email" placeholder="noreply@clinique.com" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Nom expéditeur (optionnel)">
                <el-input v-model="emailForm.sender_name" placeholder="Clinique" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <el-button :loading="testing" @click="handleTestEmail">Tester la configuration</el-button>
          <el-button type="primary" :loading="saving" @click="handleSaveEmail">Enregistrer</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted, watch } from 'vue'
import { User, Calendar, Money, Tools, Download, Upload } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useSystemInfo } from '@/composables/useSystemInfo'
import {
  emailConfig,
  testing,
  saving,
  loadConfig,
  saveConfig,
  testEmail,
} from '@/composables/useEmailConfig'
import { formatDate } from '@/utils/date'

const { systemInfo, backingUp, restoring, fetchInfo, triggerBackup, triggerRestore } = useSystemInfo()

const dbPath = computed(() => {
  if (!systemInfo.value.app?.platform) return '—'
  return `userData/cde-clinique.db`
})

const hasData = computed(() => !!systemInfo.value.app)

const emailForm = reactive({
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  sender_email: '',
  sender_name: '',
})

watch(emailConfig, (cfg) => {
  if (cfg) {
    emailForm.smtp_host = cfg.smtp_host
    emailForm.smtp_port = cfg.smtp_port
    emailForm.smtp_user = cfg.smtp_user
    emailForm.sender_email = cfg.sender_email
    emailForm.sender_name = cfg.sender_name
  }
}, { immediate: true })

onMounted(async () => {
  await Promise.all([fetchInfo(), loadConfig()])
})

function getCount(table: string): number {
  return systemInfo.value.stats?.record_counts?.[table] ?? 0
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

async function handleTestEmail() {
  await testEmail()
}

async function handleSaveEmail() {
  await saveConfig({
    smtp_host: emailForm.smtp_host,
    smtp_port: emailForm.smtp_port,
    smtp_user: emailForm.smtp_user,
    smtp_pass: emailForm.smtp_pass,
    sender_email: emailForm.sender_email,
    sender_name: emailForm.sender_name,
    is_configured: emailConfig.value?.is_configured ?? false,
  })
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
