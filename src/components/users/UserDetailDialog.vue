<template>
  <el-dialog v-model="dialogVisible" width="640" top="5vh" destroy-on-close>
    <template #header>
      <div class="detail-header">
        <el-icon :size="20"><User /></el-icon>
        <span>Détail de l'utilisateur</span>
      </div>
    </template>

    <div v-if="currUser" class="detail-body">
      <div class="detail-profile">
        <div class="detail-avatar">{{ initials }}</div>
        <div class="detail-identity">
          <span class="detail-name">{{ currUser.prenom }} {{ currUser.nom }}</span>
          <el-tag :type="roleColor(currUser.role!)" size="small">{{ currUser.role }}</el-tag>
        </div>
      </div>

      <el-descriptions :column="2" border class="detail-descriptions">
        <el-descriptions-item label="Nom" :span="1">{{ currUser.nom }}</el-descriptions-item>
        <el-descriptions-item label="Prénom" :span="1">{{ currUser.prenom }}</el-descriptions-item>
        <el-descriptions-item label="Email" :span="2">
          <el-tag type="primary" size="small">{{ currUser.email }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Rôle" :span="1">
          <el-tag :type="roleColor(currUser.role!)" size="small">{{ currUser.role }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Service" :span="1">
          {{ currUser.service || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Statut" :span="1">
          <el-tag v-if="currUser.is_validated" type="success" size="small">Actif</el-tag>
          <el-tag v-else type="warning" size="small">En attente</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Compte validé" :span="1">
          <el-tag :type="currUser.is_validated ? 'success' : 'danger'" size="small">
            {{ currUser.is_validated ? 'Oui' : 'Non' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false" class="detail-footer-btn">Fermer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { User } from '@element-plus/icons-vue'
import type { UserDto } from '@/composables/useUsers'
import { roleColor } from '@/composables/useUsers'

const currUser = ref<UserDto>()
const dialogVisible = ref(false)

const initials = computed(() => {
  if (!currUser.value) return ''
  const p = currUser.value.prenom?.charAt(0).toUpperCase() || ''
  const n = currUser.value.nom?.charAt(0).toUpperCase() || ''
  return `${p}${n}`
})

function open(user: UserDto) {
  currUser.value = user
  dialogVisible.value = true
}

function close() {
  dialogVisible.value = false
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

.detail-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #0E5C5B;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  flex-shrink: 0;
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
