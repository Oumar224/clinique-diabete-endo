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
      <img :src="logoSrc" alt="CDE" class="sidebar__logo" />
      <span v-show="!isCollapsed" class="sidebar__title">CDE</span>
    </div>

    <el-menu
      :default-active="activeRoute"
      mode="vertical"
      :collapse="isCollapsed"
      :collapse-transition="false"
      @select="onSelect"
    >
      <template v-for="item in filteredNavItems" :key="item.index">
        <el-menu-item :index="item.index">
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
          <span v-show="!isCollapsed" class="sidebar__user-name" v-if="user">
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
import { Odometer, Calendar, User, Tickets, Money, UserFilled, Tools, Fold, Expand, ArrowDown } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { getUserDisplayName } from '@/composables/useUsers'
import { useSidebar } from '@/composables/useSidebar'
import logoSrc from '@/assets/cde.png'
import type { Component } from 'vue'

interface NavItem {
  label: string
  index: string
  icon: Component
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Accueil', index: '/app', icon: Odometer },
  { label: 'Planning', index: '/app/planning', icon: Calendar },
  { label: 'Patients', index: '/app/patients', icon: User },
  { label: 'Pharmacie', index: '/app/pharmacie', icon: Tickets },
  { label: 'Facturation', index: '/app/facturation', icon: Money },
  { label: 'Paramètres', index: '/app/parametres', icon: Tools },
  { label: 'Utilisateurs', index: '/app/utilisateurs', icon: UserFilled, roles: ['ADMIN'] },
]

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()
const { isCollapsed, sidebarWidth, toggle } = useSidebar()

const activeRoute = computed(() => {
  const path = route.path
  const matched = navItems.reduce((best, item) =>
    path.startsWith(item.index) && item.index.length > best.length
      ? item.index
      : best
  , '')
  return matched || path
})

const filteredNavItems = computed(() =>
  navItems.filter((item) => {
    if (!item.roles) return true
    return user.value && item.roles.includes(user.value.role)
  })
)

const userInitials = computed(() => {
  if (!user.value) return '?'
  return `${user.value.prenom[0]}${user.value.nom[0]}`
})

function onSelect(index: string) {
  router.push(index)
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
