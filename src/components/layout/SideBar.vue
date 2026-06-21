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
      <img :src="logoUrl" alt="CDE" class="sidebar__logo" />
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
          <el-menu-item index="patient-list">
            <el-icon><List /></el-icon>
            <template #title>Liste des patients</template>
          </el-menu-item>
          <template v-if="hasActivePatient && activePatient">
            <el-menu-item index="patient-infos">
              <el-icon><InfoFilled /></el-icon>
              <template #title>Fiche patient</template>
            </el-menu-item>
            <el-menu-item index="patient-consultations">
              <el-icon><Document /></el-icon>
              <template #title>Consultations</template>
            </el-menu-item>
            <el-menu-item index="patient-ordonnances">
              <el-icon><Document /></el-icon>
              <template #title>Ordonnances</template>
            </el-menu-item>
            <el-menu-item index="patient-factures">
              <el-icon><Money /></el-icon>
              <template #title>Factures</template>
            </el-menu-item>
            <el-menu-item index="patient-close">
              <el-icon><Close /></el-icon>
              <template #title>Fermer le dossier</template>
            </el-menu-item>
          </template>
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
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Odometer, Calendar, User, Tickets, Money, UserFilled, Tools, Fold, Expand, ArrowDown, Close, List, InfoFilled, Document } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { getUserDisplayName } from '@/composables/useUsers'
import { useSidebar } from '@/composables/useSidebar'
import { useLogo } from '@/composables/useLogo'
import { usePatientContext } from '@/composables/usePatientContext'
import type { Component } from 'vue'

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

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()
const { isCollapsed, sidebarWidth, toggle } = useSidebar()
const { logoUrl } = useLogo()
const { activePatient, hasActivePatient, clearPatient } = usePatientContext()

const activeRoute = computed(() => {
  if (route.name === 'patient-detail') return 'patient-infos'
  if (route.name === 'patient-factures') return 'patient-factures'
  if (route.name === 'patients') return 'patient-list'

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
  if (index.startsWith('patient-')) {
    if (index === 'patient-list') {
      clearPatient()
      router.push('/app/patients')
    } else if (index === 'patient-close') {
      clearPatient()
      router.push('/app/patients')
    } else if (index === 'patient-infos' || index === 'patient-consultations' || index === 'patient-ordonnances') {
      if (activePatient.value) {
        router.push(`/app/patients/${activePatient.value.id}`)
      }
    } else if (index === 'patient-factures') {
      if (activePatient.value) {
        router.push(`/app/patients/${activePatient.value.id}/factures`)
      }
    }
  } else {
    router.push(index)
  }
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

</style>
