<template>
  <header class="topbar">
    <div class="topbar__left">
      <div class="topbar__brand">
        <img :src="logoSrc" alt="CDE" class="topbar__logo" />
        <span class="topbar__title">CDE</span>
      </div>

      <el-menu
        :default-active="activeRoute"
        mode="horizontal"
        :ellipsis="false"
        class="topbar__menu"
        @select="onSelect"
      >
        <el-menu-item index="/app">
          <el-icon><Odometer /></el-icon>
          Accueil
        </el-menu-item>
        <el-menu-item index="/app/planning">
          <el-icon><Calendar /></el-icon>
          Planning
        </el-menu-item>
        <el-menu-item index="/app/patients">
          <el-icon><User /></el-icon>
          Patients
        </el-menu-item>
        <el-menu-item index="/app/pharmacie">
          <el-icon><Tickets /></el-icon>
          Pharmacie
        </el-menu-item>
        <el-menu-item index="/app/facturation">
          <el-icon><Money /></el-icon>
          Facturation
        </el-menu-item>
        <el-menu-item v-if="user?.role === 'ADMIN'" index="/app/utilisateurs">
          <el-icon><UserFilled /></el-icon>
          Utilisateurs
        </el-menu-item>
      </el-menu>
    </div>

    <div class="topbar__right">
      <el-dropdown trigger="click" @command="onCommand">
        <span class="topbar__user">
          <el-avatar :size="32" class="topbar__avatar">
            {{ userInitials }}
          </el-avatar>
          <span class="topbar__user-name" v-if="user">
            {{ user.prenom }} {{ user.nom }}
          </span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">Mon profil</el-dropdown-item>
            <el-dropdown-item command="settings">Paramètres</el-dropdown-item>
            <el-dropdown-item divided command="logout">Déconnexion</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Odometer,
  Calendar,
  User,
  Tickets,
  Money,
  UserFilled,
  ArrowDown,
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import logoSrc from '@/assets/cde.png'

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()

const activeRoute = computed(() => route.path)

const userInitials = computed(() => {
  if (!user.value) return '?'
  return `${user.value.prenom[0]}${user.value.nom[0]}`
})

function onSelect(index: string) {
  router.push(index)
}

function onCommand(cmd: string) {
  if (cmd === 'logout') logout()
  if (cmd === 'settings') router.push('/app/parametres')
}
</script>

<style scoped>
.topbar {
  height: 56px;
  background: var(--cd-white);
  border-bottom: 1px solid var(--cd-gray-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.topbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.topbar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 16px;
  border-right: 1px solid var(--cd-gray-200);
  margin-right: 8px;
}

.topbar__logo {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.topbar__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--cd-primary);
}

.topbar__menu {
  flex: 1;
  border-bottom: none !important;
}

.topbar__menu .el-menu-item {
  height: 56px;
  line-height: 56px;
  font-size: 14px;
  padding: 0 14px;
}

.topbar__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.topbar__user:hover {
  background: var(--cd-gray-100);
}

.topbar__avatar {
  background: var(--cd-primary-light);
  color: var(--cd-primary);
  font-weight: 600;
  font-size: 13px;
}

.topbar__user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--cd-gray-900);
}
</style>
