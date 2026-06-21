<template>
  <el-dialog v-model="dialogVisible" width="720px" top="5vh" destroy-on-close>
    <template #header>
      <div class="detail-header">
        <el-icon :size="20"><User /></el-icon>
        <span>Détail de l'utilisateur</span>
      </div>
    </template>

    <div v-if="currUser" class="detail-body">
      <!-- Profile header -->
      <div class="detail-profile">
        <el-avatar :size="64" :src="currUser.photo || undefined" shape="circle">
          {{ initials }}
        </el-avatar>
        <div class="detail-identity">
          <span class="detail-name">{{ displayName }}</span>
          <el-tag :type="roleColor(currUser.role!)" size="small">
            {{ currUser.role }}
          </el-tag>
        </div>
      </div>

      <!-- Details -->
      <el-descriptions :column="2" border class="detail-descriptions">
        <el-descriptions-item label="Nom">{{ currUser.nom || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Prénom">{{ currUser.prenom || '—' }}</el-descriptions-item>

        <el-descriptions-item label="Email" :span="2">
          <el-tag type="primary" size="small">{{ currUser.email || '—' }}</el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="Téléphone" :span="2">
          {{ currUser.telephone ? (currUser.telephone_country_code || '') + ' ' + currUser.telephone : '—' }}
        </el-descriptions-item>

        <el-descriptions-item label="Sites">
          <template v-if="currUser.sites?.length">
            <el-tag
              v-for="s in currUser.sites"
              :key="s.id"
              size="small"
              style="margin: 2px"
            >
              {{ s.name }}
            </el-tag>
          </template>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="Services">
          <template v-if="currUser.services?.length">
            <el-tag
              v-for="s in currUser.services"
              :key="s.id"
              size="small"
              style="margin: 2px"
            >
              {{ s.name }}
            </el-tag>
          </template>
          <span v-else>—</span>
        </el-descriptions-item>

        <el-descriptions-item label="Unités médicales" :span="2">
          <template v-if="currUser.medical_units?.length">
            <el-tag
              v-for="m in currUser.medical_units"
              :key="m.id"
              size="small"
              style="margin: 2px"
            >
              {{ m.code }} — {{ m.name }}
            </el-tag>
          </template>
          <span v-else>—</span>
        </el-descriptions-item>

        <el-descriptions-item label="Fonction" :span="2">
          {{ getFonctionName(currUser.fonction_id) || '—' }}
        </el-descriptions-item>

        <el-descriptions-item label="Tâche">
          <el-tag :type="roleColor(currUser.role!)" size="small">{{ currUser.role }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Spécialités">
          <template v-if="currUser.specialties?.length">
            <el-tag
              v-for="s in currUser.specialties"
              :key="s.id"
              size="small"
              style="margin: 2px"
            >
              {{ [s.title_prefix, s.name].filter(Boolean).join(' ') }}
            </el-tag>
          </template>
          <span v-else>—</span>
        </el-descriptions-item>

        <el-descriptions-item label="Type de contrat">
          <el-tag v-if="currUser.type_contrat" size="small" type="info">
            {{ currUser.type_contrat }}
          </el-tag>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="Statut contrat">
          <el-tag
            v-if="currUser.statut_contrat"
            :type="statutContratType"
            size="small"
          >
            {{ currUser.statut_contrat }}
          </el-tag>
          <span v-else>—</span>
        </el-descriptions-item>

        <el-descriptions-item label="Date début contrat">
          {{ currUser.date_debut_contrat || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Date fin contrat">
          {{ currUser.date_fin_contrat || '—' }}
        </el-descriptions-item>

        <el-descriptions-item label="Actions contrat">
          <el-button
            v-if="currUser.statut_contrat === 'Actif' || currUser.statut_contrat === 'Expiré'"
            type="danger"
            size="small"
            @click="showTerminateDialog = true"
          >
            Résilier le contrat
          </el-button>
          <el-button
            v-if="currUser.statut_contrat === 'Résilié'"
            type="primary"
            size="small"
            @click="handleReactivate"
          >
            Réactiver le contrat
          </el-button>
        </el-descriptions-item>

        <el-descriptions-item label="Statut compte">
          <el-tag
            :type="currUser.is_validated ? 'success' : 'warning'"
            size="small"
          >
            {{ currUser.is_validated ? 'Actif' : 'En attente' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Compte validé">
          <el-tag
            :type="currUser.is_validated ? 'success' : 'danger'"
            size="small"
          >
            {{ currUser.is_validated ? 'Oui' : 'Non' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <!-- Motif résiliation (only if statut_contrat === 'Résilié') -->
      <el-alert
        v-if="currUser.statut_contrat === 'Résilié' && currUser.motif_resiliation"
        type="warning"
        :title="'Motif de résiliation : ' + currUser.motif_resiliation"
        show-icon
        style="margin-top: 16px"
        :closable="false"
      />
    </div>

    <!-- ==================== Pièces jointes ==================== -->
    <el-divider />
    <UserAttachmentsSection v-if="currUser?.id" :userId="currUser.id" />

    <template #footer>
      <el-button @click="exportPdf" :loading="exportingPdf">
        <el-icon><Document /></el-icon> PDF
      </el-button>
      <el-button @click="exportExcel" :loading="exportingExcel">
        <el-icon><Document /></el-icon> Excel
      </el-button>
      <el-button @click="dialogVisible = false" class="detail-footer-btn">Fermer</el-button>
    </template>
  </el-dialog>

  <!-- Termination dialog -->
  <el-dialog v-model="showTerminateDialog" title="Résilier le contrat" width="400px" :close-on-click-modal="false">
    <el-form>
      <el-form-item label="Motif de résiliation" prop="motif">
        <el-input
          v-model="terminateMotif"
          type="textarea"
          :rows="3"
          placeholder="Raison de la résiliation..."
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showTerminateDialog = false">Annuler</el-button>
      <el-button type="danger" :loading="terminating" @click="handleTerminate">
        Confirmer la résiliation
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { User, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UserDto } from '@/composables/useUsers'
import { roleColor, getUserDisplayName, terminateContract, reactivateContract } from '@/composables/useUsers'
import { useFonctions } from '@/composables/useFonctions'
import { useExport } from '@/composables/useExport'

const emit = defineEmits<{
  saved: []
}>()

const currUser = ref<UserDto>()
const dialogVisible = ref(false)

const { fonctions, fetchFonctions: fetchFonctionsList } = useFonctions()
const { exportingPdf, exportingExcel, exportUserProfilePdf, exportUserProfileExcel } = useExport()

const showTerminateDialog = ref(false)
const terminateMotif = ref('')
const terminating = ref(false)

const displayName = computed(() => {
  if (!currUser.value) return ''
  return getUserDisplayName(currUser.value)
})

const initials = computed(() => {
  if (!currUser.value) return ''
  const p = currUser.value.prenom?.charAt(0).toUpperCase() || ''
  const n = currUser.value.nom?.charAt(0).toUpperCase() || ''
  return `${p}${n}`
})

const statutContratType = computed(() => {
  if (!currUser.value?.statut_contrat) return 'info'
  const types: Record<string, 'success' | 'danger' | 'warning'> = {
    Actif: 'success',
    Expiré: 'danger',
    Résilié: 'warning',
  }
  return types[currUser.value.statut_contrat] || 'info'
})

function getFonctionName(fonctionId?: number | null): string {
  if (!fonctionId) return ''
  const f = fonctions.value.find(f => f.id === fonctionId)
  return f?.name || ''
}

function open(user: UserDto) {
  currUser.value = user
  dialogVisible.value = true
  fetchFonctionsList(true)
}

function close() {
  dialogVisible.value = false
}

async function exportPdf() {
  if (currUser.value?.id) await exportUserProfilePdf(currUser.value.id)
}

async function exportExcel() {
  if (currUser.value?.id) await exportUserProfileExcel(currUser.value.id)
}

async function handleTerminate() {
  if (!terminateMotif.value.trim()) {
    ElMessage.warning('Veuillez saisir un motif de résiliation')
    return
  }
  if (!currUser.value?.id) return
  terminating.value = true
  try {
    await terminateContract(currUser.value.id, terminateMotif.value.trim())
    ElMessage.success('Contrat résilié')
    showTerminateDialog.value = false
    terminateMotif.value = ''
    emit('saved')
  } finally {
    terminating.value = false
  }
}

async function handleReactivate() {
  if (!currUser.value?.id) return
  try {
    await reactivateContract(currUser.value.id)
    ElMessage.success('Contrat réactivé')
    emit('saved')
  } catch {}
}

defineExpose({ open, close })
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0E5C5B;
  font-size: 17px;
  font-weight: 600;
}

.detail-body {
  padding: 0 4px;
}

.detail-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 24px;
  background: #F8FAFB;
  border-radius: 12px;
  border: 1px solid #E5EDF0;
}

.detail-identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-name {
  font-size: 18px;
  font-weight: 700;
  color: #1A2E2D;
}

:deep(.detail-descriptions .el-descriptions__title) {
  font-size: 14px;
  font-weight: 600;
  color: #0E5C5B;
}

:deep(.detail-descriptions .el-descriptions__label) {
  font-weight: 600;
  color: #4A6B6A;
  background: #F8FAFB;
  width: 130px;
}

:deep(.detail-descriptions .el-descriptions__content) {
  color: #1A2E2D;
}

.detail-footer-btn {
  min-width: 100px;
}
</style>
