<template>
  <div v-loading="!hasData" class="systab cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Système
        </h1>
        <p class="cde-page-sub">
          Informations techniques, sauvegardes et configuration email
        </p>
      </div>
    </header>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Informations de l'application
        </h2>
      </div>
      <div class="cde-panel">
        <div class="cde-summary-lines systab__body">
          <div class="cde-kv">
            <span class="cde-kv__label">Version de l'application</span>
            <span class="cde-kv__value">{{ systemInfo.app?.app_version || '—' }}</span>
          </div>
          <div class="cde-kv">
            <span class="cde-kv__label">Version d'Electron</span>
            <span class="cde-kv__value">{{ systemInfo.app?.electron_version || '—' }}</span>
          </div>
          <div class="cde-kv">
            <span class="cde-kv__label">Version de Node.js</span>
            <span class="cde-kv__value">{{ systemInfo.app?.node_version || '—' }}</span>
          </div>
          <div class="cde-kv">
            <span class="cde-kv__label">Version SQLite</span>
            <span class="cde-kv__value">{{ systemInfo.app?.sqlite_version || '—' }}</span>
          </div>
          <div class="cde-kv">
            <span class="cde-kv__label">Plateforme</span>
            <span class="cde-kv__value">{{ systemInfo.app?.platform || '—' }}</span>
          </div>
          <div class="cde-kv">
            <span class="cde-kv__label">Architecture</span>
            <span class="cde-kv__value">{{ systemInfo.app?.platform_arch || '—' }}</span>
          </div>
          <div class="cde-kv">
            <span class="cde-kv__label">Chemin de la base</span>
            <span class="cde-kv__value">{{ dbPath }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Statistiques
        </h2>
      </div>
      <section class="cde-summary">
        <div class="cde-summary__item">
          <span class="cde-summary__label">Patients</span>
          <span class="cde-summary__value cde-num">{{ getCount('patient') }}</span>
        </div>
        <div class="cde-summary__item">
          <span class="cde-summary__label">Consultations</span>
          <span class="cde-summary__value cde-num">{{ getCount('appointment') }}</span>
        </div>
        <div class="cde-summary__item">
          <span class="cde-summary__label">Factures</span>
          <span class="cde-summary__value cde-num">{{ getCount('invoice') }}</span>
        </div>
        <div class="cde-summary__item">
          <span class="cde-summary__label">Services</span>
          <span class="cde-summary__value cde-num">{{ getCount('services') }}</span>
        </div>
      </section>
      <div class="cde-footer systab__footer">
        <span class="cde-muted">Taille de la base : {{ systemInfo.stats?.db_size_human || '—' }}</span>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Sauvegarde et restauration
        </h2>
      </div>
      <div class="cde-panel">
        <div class="systab__body systab__backup">
          <p class="cde-muted">
            Dernière sauvegarde : {{ systemInfo.lastBackup ? formatDate(systemInfo.lastBackup) : 'Aucune' }}
          </p>
          <div class="cde-toolbar__actions">
            <el-button
              type="primary"
              size="small"
              :icon="Download"
              :loading="backingUp"
              @click="handleBackup"
            >
              Effectuer une sauvegarde
            </el-button>
            <el-button
              type="warning"
              size="small"
              :icon="Upload"
              :loading="restoring"
              @click="handleRestore"
            >
              Restaurer une sauvegarde
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Configuration Email
        </h2>
        <span
          class="cde-badge"
          :class="emailConfig?.is_configured ? 'cde-badge--success' : 'cde-badge--muted'"
        >{{ emailConfig?.is_configured ? 'Configuré' : 'Non configuré' }}</span>
      </div>
      <div class="cde-panel">
        <div class="systab__body">
          <el-collapse class="systab__collapse">
            <el-collapse-item title="Instructions" name="instructions">
              <div class="cde-muted systab__instructions">
                <p><strong>Gmail :</strong> Utilisez un mot de passe d'application (App Password). Activez d'abord l'authentification à 2 facteurs dans votre compte Google, puis générez un mot de passe d'application.</p>
                <p><strong>SendGrid :</strong> Créez une clé API SendGrid avec les permissions « Mail Send ». Utilisez « apikey » comme nom d'utilisateur et la clé API comme mot de passe.</p>
                <p><strong>Général :</strong> Contactez votre administrateur réseau pour les paramètres SMTP de votre organisation. Paramètres courants : serveur smtp.votredomaine.com, port 587 (STARTTLS) ou 465 (SSL).</p>
              </div>
            </el-collapse-item>
          </el-collapse>

          <el-form label-position="top" :model="emailForm" class="systab__form">
            <div class="systab__form-grid">
              <el-form-item label="SMTP Host">
                <el-input v-model="emailForm.smtp_host" placeholder="smtp.gmail.com" />
              </el-form-item>
              <el-form-item label="SMTP Port">
                <el-input-number
                  v-model="emailForm.smtp_port"
                  :min="1"
                  :max="65535"
                  controls-position="right"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="SMTP Utilisateur">
                <el-input v-model="emailForm.smtp_user" placeholder="utilisateur" />
              </el-form-item>
              <el-form-item label="Mot de passe SMTP">
                <el-input v-model="emailForm.smtp_pass" type="password" show-password placeholder="Mot de passe ou clé API" />
              </el-form-item>
              <el-form-item label="Email expéditeur">
                <el-input v-model="emailForm.sender_email" placeholder="noreply@clinique.com" />
              </el-form-item>
              <el-form-item label="Nom expéditeur (optionnel)">
                <el-input v-model="emailForm.sender_name" placeholder="Clinique" />
              </el-form-item>
            </div>
          </el-form>

          <div class="cde-toolbar__actions systab__email-actions">
            <el-button size="small" :loading="testing" @click="handleTestEmail">
              Tester la configuration
            </el-button>
            <el-button type="primary" size="small" :loading="saving" @click="handleSaveEmail">
              Enregistrer
            </el-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted, watch } from 'vue'
import { Download, Upload } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useSystemInfo } from '@/composables/useSystemInfo'
import { useEmailConfig } from '@/composables/useEmailConfig'
import { formatDate } from '@/utils/date'

const { systemInfo, backingUp, restoring, fetchInfo, triggerBackup, triggerRestore } = useSystemInfo()
const { emailConfig, testing, saving, loadConfig, saveConfig, testEmail } = useEmailConfig()

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
.systab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}

.systab__body {
  padding: 10px 12px;
}

.systab__footer {
  padding: 4px 0 0;
}

.systab__backup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.systab__backup p {
  margin: 0;
  font-size: 12px;
}

.systab__collapse {
  margin-bottom: 10px;
  border-top: 1px solid var(--cde-border);
  border-bottom: 1px solid var(--cde-border);
}

.systab__instructions {
  font-size: 11.5px;
  line-height: 1.55;
}

.systab__instructions p {
  margin: 0 0 6px;
}

.systab__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.systab__email-actions {
  margin-top: 4px;
}

@media (max-width: 760px) {
  .systab__form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
