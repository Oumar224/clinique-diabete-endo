<template>
  <div class="profil">
    <div class="profil__header">
      <el-icon :size="22"><UserFilled /></el-icon>
      <span>Mon profil</span>
    </div>

    <el-skeleton :loading="loading" animated>
      <template #default>
        <div v-if="profile" class="profil__body">
          <div class="profil__profile-header">
            <el-avatar :size="72" :src="profile.photo || undefined" shape="circle">
              {{ initials }}
            </el-avatar>
            <div class="profil__identity">
              <span class="profil__name">{{ displayName }}</span>
              <el-tag :type="roleColor(profile.role!)" size="small">
                {{ roleLabel(profile.role!) }}
              </el-tag>
            </div>
          </div>

          <el-descriptions :column="2" border class="profil__descriptions">
            <el-descriptions-item label="Nom">{{ profile.nom || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Prénom">{{ profile.prenom || '—' }}</el-descriptions-item>

            <el-descriptions-item label="Email" :span="2">
              <el-tag type="primary" size="small">{{ profile.email || '—' }}</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="Téléphone" :span="2">
              {{ profile.telephone ? (profile.telephone_country_code || '') + ' ' + profile.telephone : '—' }}
            </el-descriptions-item>

            <el-descriptions-item label="Fonction" :span="2">
              {{ getFonctionName(profile.fonction_id) || '—' }}
            </el-descriptions-item>

            <el-descriptions-item label="Tâche">
              <el-tag :type="roleColor(profile.role!)" size="small">{{ roleLabel(profile.role!) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Spécialités">
              <template v-if="profile.specialties?.length">
                <el-tag
                  v-for="s in profile.specialties"
                  :key="s.id"
                  size="small"
                  style="margin: 2px"
                >
                  {{ [s.title_prefix, s.name].filter(Boolean).join(' ') }}
                </el-tag>
              </template>
              <span v-else>—</span>
            </el-descriptions-item>

            <el-descriptions-item label="Services">
              <template v-if="profile.services?.length">
                <el-tag v-for="s in profile.services" :key="s.id" size="small" style="margin: 2px">
                  {{ s.name }}
                </el-tag>
              </template>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="Sites">
              <template v-if="profile.sites?.length">
                <el-tag v-for="s in profile.sites" :key="s.id" size="small" style="margin: 2px">
                  {{ s.name }}
                </el-tag>
              </template>
              <span v-else>—</span>
            </el-descriptions-item>

            <el-descriptions-item label="Unités médicales" :span="2">
              <template v-if="profile.medical_units?.length">
                <el-tag v-for="m in profile.medical_units" :key="m.id" size="small" style="margin: 2px">
                  {{ m.code }} — {{ m.name }}
                </el-tag>
              </template>
              <span v-else>—</span>
            </el-descriptions-item>

            <el-descriptions-item label="Type de contrat">
              <el-tag v-if="profile.type_contrat" size="small" type="info">
                {{ profile.type_contrat }}
              </el-tag>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="Statut contrat">
              <el-tag
                v-if="profile.statut_contrat"
                :type="statutContratType"
                size="small"
              >
                {{ profile.statut_contrat }}
              </el-tag>
              <span v-else>—</span>
            </el-descriptions-item>

            <el-descriptions-item label="Date début contrat">
              {{ profile.date_debut_contrat || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="Date fin contrat">
              {{ profile.date_fin_contrat || '—' }}
            </el-descriptions-item>

            <el-descriptions-item label="Statut compte">
              <el-tag :type="profile.is_validated ? 'success' : 'warning'" size="small">
                {{ profile.is_validated ? 'Actif' : 'En attente' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { getUserDisplayName, roleColor, roleLabel } from '@/composables/useUsers'
import { useFonctions } from '@/composables/useFonctions'
import { ipcInvoke } from '@/utils/ipc'
import type { UserDto, SpecialtyRef, ServiceRef, SiteRef, MedicalUnitRef } from '@/composables/useUsers'

const { user } = useAuth()
const { fonctions, fetchFonctions } = useFonctions()

const loading = ref(true)
const profile = ref<UserDto | null>(null)

const initials = computed(() => {
  if (!profile.value) return ''
  const p = profile.value.prenom?.charAt(0).toUpperCase() || ''
  const n = profile.value.nom?.charAt(0).toUpperCase() || ''
  return `${p}${n}`
})

const displayName = computed(() => {
  if (!profile.value) return ''
  return getUserDisplayName(profile.value)
})

const statutContratType = computed(() => {
  if (!profile.value?.statut_contrat) return 'info'
  const types: Record<string, 'success' | 'danger' | 'warning'> = {
    Actif: 'success',
    Expiré: 'danger',
    Résilié: 'warning',
  }
  return types[profile.value.statut_contrat] || 'info'
})

function getFonctionName(fonctionId?: number | null): string {
  if (!fonctionId) return ''
  const f = fonctions.value.find(fn => fn.id === fonctionId)
  return f?.name || ''
}

async function loadProfile() {
  if (!user.value?.id) {
    loading.value = false
    return
  }
  try {
    const u = await ipcInvoke<UserDto>('users:get', { id: user.value.id })
    if (!u) {
      loading.value = false
      return
    }
    const rels = await ipcInvoke<{
      specialties: SpecialtyRef[]
      services: ServiceRef[]
      sites: SiteRef[]
      medical_units: MedicalUnitRef[]
      statut_contrat?: 'Actif' | 'Expiré' | 'Résilié'
    }>('users:get-relations', { id: user.value.id })
    profile.value = { ...u, ...rels }
  } catch {
    profile.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFonctions(true)
  loadProfile()
})
</script>

<style scoped>
.profil {
  max-width: 760px;
  margin: 0 auto;
}

.profil__header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0E5C5B;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 24px;
}

.profil__profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  margin-bottom: 24px;
  background: #F8FAFB;
  border-radius: 12px;
  border: 1px solid #E5EDF0;
}

.profil__identity {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profil__name {
  font-size: 20px;
  font-weight: 700;
  color: #1A2E2D;
}

:deep(.profil__descriptions .el-descriptions__title) {
  font-size: 14px;
  font-weight: 600;
  color: #0E5C5B;
}

:deep(.profil__descriptions .el-descriptions__label) {
  font-weight: 600;
  color: #4A6B6A;
  background: #F8FAFB;
  width: 130px;
}

:deep(.profil__descriptions .el-descriptions__content) {
  color: #1A2E2D;
}
</style>
