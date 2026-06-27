<template>
  <nav id="main-nav" aria-label="Navigation principale" class="sidebar" :style="{ width: sidebarWidth }">
    <div class="sidebar__brand">
      <el-button
        text
        @click="toggle"
        :aria-expanded="!isCollapsed"
        aria-controls="main-nav"
        aria-label="Basculer le menu"
        class="sidebar__toggle-btn"
      >
        <el-icon><Fold v-if="!isCollapsed" /><Expand v-else /></el-icon>
      </el-button>
      <img v-if="!logoError" :src="logoUrl" alt="CDE" class="sidebar__logo" @error="onLogoError" />
      <svg v-else class="sidebar__logo" viewBox="0 0 34 34" aria-label="CDE" role="img">
        <rect width="34" height="34" rx="7" fill="var(--cd-primary, #409eff)" />
        <text x="17" y="22" text-anchor="middle" fill="white" font-size="11" font-weight="700" font-family="system-ui, -apple-system, sans-serif">CDE</text>
      </svg>
      <span v-show="!isCollapsed" class="sidebar__title">CDE</span>
    </div>

    <el-menu
      :default-active="activeRoute"
      mode="vertical"
      :collapse="isCollapsed"
      :collapse-transition="false"
      :default-openeds="defaultOpeneds"
      @select="onSelect"
    >
      <template v-for="item in navItems" :key="item.index">
        <!-- Patients sub-menu -->
        <el-sub-menu v-if="item.index === '/app/patients'" index="patients">
          <template #title>
            <el-icon><User /></el-icon>
            <span>Patients</span>
          </template>
          <!-- Submenu search input -->
          <el-menu-item
            v-show="!isCollapsed"
            index="__submenu_search__"
            class="submenu-search-item"
          >
            <el-icon @click.stop><Search /></el-icon>
            <template #title>
              <el-input
                v-model="submenuSearch"
                placeholder="Rechercher..."
                :prefix-icon="Search"
                size="small"
                clearable
                @click.stop
              />
            </template>
          </el-menu-item>
          <!-- Filtered submenu items -->
          <template v-for="subItem in filteredPatientSubmenuItems" :key="subItem.index">
            <el-menu-item
              v-if="!subItem.requiresActivePatient || (hasActivePatient && activePatient)"
              :index="subItem.index"
            >
              <el-icon><component :is="subItem.icon" /></el-icon>
              <template #title>{{ subItem.label }}</template>
            </el-menu-item>
          </template>
          <!-- No-results placeholder when search yields no matches -->
          <el-menu-item
            v-if="submenuSearch && filteredPatientSubmenuItems.length === 0"
            index="__no_results__"
            class="submenu-no-results"
            disabled
          >
            <template #title>Aucun résultat</template>
          </el-menu-item>
        </el-sub-menu>
        <!-- Other items with role-gating -->
        <el-menu-item
          v-else-if="!item.roles || (user && item.roles.includes(user.role))"
          :index="item.index"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </template>
    </el-menu>

    <!-- ════════════════════════════════════════════
         Patients ouverts — quick access
         ════════════════════════════════════════════ -->
    <div v-if="openPatients.length > 0" class="sidebar__open-patients">
      <div v-show="!isCollapsed" class="sidebar__open-patients-header">
        <el-icon :size="14"><FolderOpened /></el-icon>
        <span class="sidebar__open-patients-title">Patients ouverts</span>
        <span class="sidebar__open-patients-count">{{ openPatients.length }}</span>
      </div>
      <div v-show="!isCollapsed" class="sidebar__open-patients-list">
        <div
          v-for="entry in openPatients"
          :key="entry.patient.id"
          class="sidebar__open-patients-item"
          :class="{ 'sidebar__open-patients-item--active': activePatient?.id === entry.patient.id }"
          @click="onOpenPatientClick(entry.patient)"
          @click.middle="onRemovePatient(entry.patient.id)"
          :title="`${getCiviliteSymbol(entry.patient.civilite)} ${entry.patient.prenom} ${entry.patient.nom}`"
        >
          <el-avatar
            :size="24"
            shape="circle"
            class="sidebar__open-patients-avatar"
            :class="'sidebar__open-patients-avatar--' + (entry.patient.civilite === 'M' ? 'male' : entry.patient.civilite === 'Mme' || entry.patient.civilite === 'Mlle' ? 'female' : 'none')"
          >
            {{ getCiviliteSymbol(entry.patient.civilite) }}
          </el-avatar>
          <span class="sidebar__open-patients-name">
            {{ entry.patient.prenom }} {{ entry.patient.nom }}
          </span>
          <el-icon
            class="sidebar__open-patients-close"
            :size="12"
            @click.stop="onRemovePatient(entry.patient.id)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
      <!-- When collapsed: icon with badge -->
      <div v-show="isCollapsed" class="sidebar__open-patients-collapsed">
        <el-icon :size="18"><FolderOpened /></el-icon>
        <span class="sidebar__open-patients-badge">{{ openPatients.length }}</span>
      </div>
    </div>

    <div class="sidebar__profile">
      <el-dropdown trigger="click" @command="onProfileCommand">
        <span class="sidebar__user">
          <el-avatar :size="32" class="sidebar__avatar">
            {{ userInitials }}
          </el-avatar>
          <span v-if="user && !isCollapsed" class="sidebar__user-name">
            {{ getUserDisplayName(user) }}
          </span>
          <el-icon v-show="!isCollapsed"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">Mon profil</el-dropdown-item>
            <el-dropdown-item divided command="logout">Déconnexion</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Odometer, Calendar, User, Tickets, Money, UserFilled, Tools, Fold, Expand, ArrowDown, Close, List, FolderOpened, Search, DataAnalysis, Aim, HomeFilled } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { getUserDisplayName } from '@/composables/useUsers'
import { useSidebar } from '@/composables/useSidebar'
import { useLogo } from '@/composables/useLogo'
import { usePatientContext } from '@/composables/usePatientContext'
import { useOpenPatients } from '@/composables/useOpenPatients'
import { getCiviliteSymbol } from '@/utils/civilite'
import type { Component } from 'vue'
import type { Patient } from '@/composables/usePatientContext'

interface NavItem {
  label: string
  index: string
  icon: Component
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Accueil', index: '/app', icon: Odometer },
  { label: 'Patients', index: '/app/patients', icon: User },
  { label: 'Planning', index: '/app/planning', icon: Calendar },
  { label: 'Pharmacie', index: '/app/pharmacie', icon: Tickets },
  { label: 'Facturation', index: '/app/facturation', icon: Money },
  { label: 'Paramètres', index: '/app/parametres', icon: Tools },
  { label: 'Utilisateurs', index: '/app/utilisateurs', icon: UserFilled, roles: ['ADMIN'] },
]

interface PatientSubmenuItem {
  label: string
  index: string
  icon: Component
  requiresActivePatient?: boolean
}

const patientSubmenuItems: PatientSubmenuItem[] = [
  { label: 'Liste des patients', index: 'patient-list', icon: List },
  { label: 'Dossier Patient', index: 'patient-dossier', icon: FolderOpened, requiresActivePatient: true },
  { label: 'Résultats Bio', index: 'patient-labo', icon: DataAnalysis, requiresActivePatient: true },
  { label: 'Prescription / Soins', index: 'patient-prescription', icon: Tickets, requiresActivePatient: true },
  { label: 'Demande Examens', index: 'patient-examens', icon: Search, requiresActivePatient: true },
  { label: 'Actes / Soins', index: 'patient-actes', icon: List, requiresActivePatient: true },
  { label: 'Administration Soins', index: 'patient-soins', icon: Aim, requiresActivePatient: true },
  { label: 'Patient & Séjour', index: 'patient-sejour', icon: HomeFilled, requiresActivePatient: true },
  { label: 'Rendez-vous', index: 'patient-rdv', icon: Calendar, requiresActivePatient: true },
  { label: 'Factures', index: 'patient-factures', icon: Money, requiresActivePatient: true },
  { label: 'Fermer le dossier', index: 'patient-close', icon: Close, requiresActivePatient: true },
]

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()
const { isCollapsed, sidebarWidth, toggle } = useSidebar()
const { logoUrl } = useLogo()
const logoError = ref(false)
function onLogoError() {
  logoError.value = true
}
// Reset error if logoUrl changes (e.g. IPC eventually resolves)
watch(logoUrl, () => {
  logoError.value = false
})
const { activePatient, hasActivePatient, clearPatient, setActivePatient } = usePatientContext()
const { openPatients, removePatient } = useOpenPatients()

const submenuSearch = ref('')

const filteredPatientSubmenuItems = computed(() => {
  const q = submenuSearch.value.toLowerCase().trim()
  if (!q) return patientSubmenuItems
  return patientSubmenuItems.filter(item =>
    item.label.toLowerCase().includes(q)
  )
})

const PATIENT_ROUTES = new Set<string>([
  'patient-dossier', 'patient-labo', 'patient-prescription', 'patient-examens',
  'patient-actes', 'patient-soins', 'patient-sejour', 'patient-rdv', 'patient-factures',
])

const activeRoute = computed(() => {
  const name = route.name as string
  if (name === 'patients') return 'patient-list'
  if (PATIENT_ROUTES.has(name)) return name
  if (name === 'patient-detail') return 'patient-dossier'

  const path = route.path
  const matched = navItems.reduce((best, item) =>
    path.startsWith(item.index) && item.index.length > best.length
      ? item.index
      : best
  , '')
  return matched || path
})

const defaultOpeneds = computed(() => {
  return route.path.startsWith('/app/patients') || hasActivePatient.value ? ['patients'] : []
})

const userInitials = computed(() => {
  if (!user.value) return '?'
  return `${user.value.prenom[0]}${user.value.nom[0]}`
})

function onSelect(index: string) {
  if (index.startsWith('__')) return
  submenuSearch.value = ''

  if (index.startsWith('patient-')) {
    if (index === 'patient-list' || index === 'patient-close') {
      clearPatient()
      router.push('/app/patients')
    } else if (PATIENT_ROUTES.has(index)) {
      if (activePatient.value) {
        router.push(`/app/patients/${activePatient.value.id}/${index.replace(/^patient-/, '')}`)
      }
    }
  } else {
    router.push(index)
  }
}

function onOpenPatientClick(patient: Patient) {
  setActivePatient(patient)
  router.push(`/app/patients/${patient.id}`)
}

function onRemovePatient(patientId: number) {
  removePatient(patientId)
}

function onProfileCommand(cmd: string) {
  if (cmd === 'profile') router.push('/app/profil')
  if (cmd === 'logout') logout()
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--cd-white);
  border-right: 1px solid var(--cd-gray-200);
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.3s ease;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--cd-gray-200);
  min-height: 56px;
}

.sidebar__logo {
  width: 34px;
  height: 34px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--cd-primary);
  white-space: nowrap;
}

.sidebar .el-menu {
  flex: 1;
  border-right: none;
}

.sidebar__toggle-btn {
  font-size: 18px;
  flex-shrink: 0;
}

.sidebar__profile {
  padding: 8px;
  border-top: 1px solid var(--cd-gray-200);
  display: flex;
  justify-content: center;
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
  width: 100%;
}

.sidebar__user:hover {
  background: var(--cd-gray-100);
}

.sidebar__avatar {
  background: var(--cd-primary-light);
  color: var(--cd-primary);
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.sidebar__user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ════════════════════════════════════════════
   Patients ouverts section
   ════════════════════════════════════════════ */

.sidebar__open-patients {
  border-top: 1px solid var(--cd-gray-200);
  padding: 8px;
}

.sidebar__open-patients-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-bottom: 4px;
  color: var(--cd-gray-600);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sidebar__open-patients-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__open-patients-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--cd-primary);
  color: var(--cd-white);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.sidebar__open-patients-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__open-patients-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;
}

.sidebar__open-patients-item:hover {
  background: var(--cd-gray-100);
}

.sidebar__open-patients-item--active {
  background: var(--cd-primary-light);
  color: var(--cd-primary);
}

.sidebar__open-patients-avatar {
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  color: white;
}

.sidebar__open-patients-avatar--male {
  background: var(--el-color-primary, #409eff) !important;
}

.sidebar__open-patients-avatar--female {
  background: var(--el-color-danger, #f56c6c) !important;
}

.sidebar__open-patients-avatar--none {
  background: var(--el-color-info, #909399) !important;
}

.sidebar__open-patients-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.sidebar__open-patients-close {
  opacity: 0;
  color: var(--cd-gray-400);
  flex-shrink: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
  border-radius: 4px;
  padding: 2px;
}

.sidebar__open-patients-item:hover .sidebar__open-patients-close {
  opacity: 1;
}

.sidebar__open-patients-close:hover {
  color: var(--cd-secondary);
  background: var(--cd-gray-200);
}

/* Collapsed state: just an icon with badge */
.sidebar__open-patients-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  color: var(--cd-gray-500);
  position: relative;
  cursor: default;
}

.sidebar__open-patients-badge {
  position: absolute;
  top: 2px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--cd-secondary);
  color: var(--cd-white);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

/* ════════════════════════════════════════════
   Submenu search
   ════════════════════════════════════════════ */

.submenu-search-item {
  cursor: default !important;
  padding: 4px 12px !important;
  margin-bottom: 2px;
  border-bottom: 1px solid var(--cd-gray-200);
}

.submenu-search-item:hover,
.submenu-search-item.is-active {
  background-color: transparent !important;
  color: inherit !important;
}

.submenu-search-item .el-input--small {
  width: 100%;
}

.submenu-search-item .el-input__wrapper {
  background-color: var(--cd-gray-100);
  border-radius: 6px;
  box-shadow: none !important;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.submenu-search-item .el-input__wrapper:hover {
  background-color: var(--cd-gray-200);
}

.submenu-search-item .el-input__wrapper.is-focus {
  background-color: var(--cd-white);
  box-shadow: 0 0 0 1px var(--cd-primary) inset !important;
}

.submenu-search-item .el-input__inner {
  font-size: 13px;
}

/* No-results placeholder */
.submenu-no-results {
  cursor: default !important;
  opacity: 0.5;
  font-style: italic;
  font-size: 13px;
}

.submenu-no-results:hover,
.submenu-no-results.is-active {
  background-color: transparent !important;
  color: var(--cd-gray-500) !important;
}

</style>
