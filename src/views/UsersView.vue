<template>
  <div class="users">
    <div class="users__header">
      <h1 class="users__title">Utilisateurs</h1>
      <div class="users__actions">
        <el-input
          v-model="searchText"
          placeholder="Rechercher..."
          clearable
          style="width: 280px"
        >
          <template #prepend><el-icon><Search /></el-icon></template>
        </el-input>
        <el-dropdown @command="handleExport">
          <el-button :loading="exportingPdf || exportingExcel">
            Exporter
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="list-pdf" :disabled="exportingPdf">
                <el-icon><Document /></el-icon> Liste des utilisateurs (PDF)
              </el-dropdown-item>
              <el-dropdown-item command="list-excel" :disabled="exportingExcel">
                <el-icon><Document /></el-icon> Liste des utilisateurs (Excel)
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button @click="handlePrint">
          <el-icon><Printer /></el-icon> Imprimer
        </el-button>

        <el-button type="primary" :icon="Plus" @click="userFormRef?.open()">
          Nouvel utilisateur
        </el-button>
      </div>
    </div>

    <user-form
      title="Nouvel utilisateur"
      ref="userFormRef"
      @submit-action="createUser"
    />
    <user-form
      title="Modifier l'utilisateur"
      ref="editUserFormRef"
      @submit-action="updateUser"
    />
    <user-detail-dialog ref="userDetailDialogRef" />

    <el-table
      :data="filteredList"
      style="width: 100%"
      v-loading="loading"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
      @row-click="viewUser"
    >
      <el-table-column label="Photo + Nom" width="220">
        <template #default="{ row }">
          <div class="user-name-cell">
            <el-avatar :size="24" :src="row.photo || undefined">
              {{ (row.prenom?.[0] || '').toUpperCase() }}
            </el-avatar>
            <span>{{ getUserDisplayName(row) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Fonction" width="140">
        <template #default="{ row }">
          {{ getFonctionName(row.fonction_id) || roleLabel(row.role || '') }}
        </template>
      </el-table-column>
      <el-table-column prop="email" label="Email" />
      <el-table-column label="Téléphone" width="150">
        <template #default="{ row }">
          {{ row.telephone ? (row.telephone_country_code || '') + ' ' + row.telephone : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="Spécialités" width="180">
        <template #default="{ row }">
          <div class="specialties-cell">
            <el-tag
              v-for="spec in (row.specialties || []).slice(0, 2)"
              :key="spec.id"
              size="small"
            >
              {{ spec.name }}
            </el-tag>
            <el-tag
              v-if="(row.specialties?.length || 0) > 2"
              size="small"
              type="info"
            >
              +{{ (row.specialties?.length || 0) - 2 }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Contrat" width="140">
        <template #default="{ row }">
          <div class="contract-cell">
            <el-tag v-if="row.type_contrat" size="small" type="info">
              {{ row.type_contrat }}
            </el-tag>
            <el-tag
              v-if="row.statut_contrat"
              :type="row.statut_contrat === 'Actif' ? 'success' : row.statut_contrat === 'Expiré' ? 'danger' : 'warning'"
              size="small"
            >
              {{ row.statut_contrat }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.is_validated" type="success" size="small">Actif</el-tag>
          <el-tag v-else type="warning" size="small">En attente</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="120" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click.stop="editUser(row)" />
          <el-button
            text
            type="danger"
            :icon="Delete"
            size="small"
            @click.stop="deleteUser(row.id!)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        @current-change="(v:number)=>paginator.currPage=v"
        :current-page="paginator.currPage"
        background
        layout="prev, pager, next"
        :page-size="paginator.pageSize"
        :page-count="paginator.totalPage"
      />
    </el-row>

    <UserPrintDialog v-model="printDialogVisible" :users="filteredUsers" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Edit, Delete, Search, ArrowDown, Document, Printer } from '@element-plus/icons-vue'
import {
  users,
  userFormRef,
  editUserFormRef,
  loadUsers,
  createUser,
  updateUser,
  deleteUser,
  roleLabel,
  getUserDisplayName,
} from '@/composables/useUsers'
import type { UserDto } from '@/composables/useUsers'
import { useSpecialties } from '@/composables/useSpecialties'
import { useFonctions } from '@/composables/useFonctions'
import UserForm from '@/components/users/UserForm.vue'
import UserDetailDialog from '@/components/users/UserDetailDialog.vue'
import UserPrintDialog from '@/components/users/UserPrintDialog.vue'
import { useExport } from '@/composables/useExport'

const { exportingPdf, exportingExcel, exportUsersListPdf, exportUsersListExcel } = useExport()
const printDialogVisible = ref(false)

const { fetchSpecialties } = useSpecialties()
const { fonctions, fetchFonctions } = useFonctions()
fetchFonctions(true)

function getFonctionName(fonctionId?: number | null): string {
  if (!fonctionId) return ''
  const f = fonctions.value.find(f => f.id === fonctionId)
  return f?.name || ''
}
const loading = ref(true)
const userDetailDialogRef = ref()
const searchText = ref('')

const paginator = reactive({ totalPage: 0, currPage: 1, pageSize: 7 })

const filteredUsers = computed(() => {
  return (
    users.value?.filter((item: UserDto) =>
      Object.keys(item).some((key) =>
        String((item as any)[key])?.toLowerCase().includes(searchText.value.toLowerCase()),
      ),
    ) || []
  )
})

const filteredList = computed(() => {
  const result = filteredUsers.value
  paginator.totalPage = Math.ceil(result.length / paginator.pageSize)
  return result.slice(
    (paginator.currPage - 1) * paginator.pageSize,
    paginator.currPage * paginator.pageSize,
  )
})

async function handleExport(command: string) {
  if (command === 'list-pdf') await exportUsersListPdf()
  else if (command === 'list-excel') await exportUsersListExcel()
}

function handlePrint() {
  printDialogVisible.value = true
}

function viewUser(user: UserDto) {
  userDetailDialogRef.value?.open(user)
}

function editUser(user: UserDto) {
  editUserFormRef.value?.open(user)
}

onMounted(async () => {
  try {
    await Promise.all([loadUsers(), fetchSpecialties()])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.users__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.users__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.users__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.specialties-cell {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
}

.contract-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}
</style>
