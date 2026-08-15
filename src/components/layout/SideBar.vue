<template>
  <nav id="main-nav" aria-label="Navigation principale" class="sidebar" :class="{'sidebar--collapsed': isCollapsed}" :style="{ width: sidebarWidth }">
    <div class="sidebar__brand">
      <img v-if="!logoError" :src="logoUrl" alt="CDE" class="sidebar__logo" @error="onLogoError" />
      <svg v-else class="sidebar__logo" viewBox="0 0 34 34" aria-label="CDE" role="img">
        <rect width="34" height="34" rx="2" fill="#2E86C1" />
        <text x="17" y="22" text-anchor="middle" fill="white" font-size="11" font-weight="700">CDE</text>
      </svg>
      <span v-show="!isCollapsed" class="sidebar__title">CDE</span>
      <button class="sidebar__toggle-btn" @click="toggle" :aria-expanded="!isCollapsed" aria-controls="main-nav" :title="isCollapsed ? 'Étendre' : 'Réduire'">
        <svg v-if="!isCollapsed" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 3L4 6L8 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 3L8 6L4 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="sidebar__section-header" v-show="!isCollapsed">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="white" stroke-width="0.8" fill="white" fill-opacity="0.2"/><path d="M3 4.5H9" stroke="white" stroke-width="0.8" stroke-linecap="round"/><path d="M3 6.5H9" stroke="white" stroke-width="0.8" stroke-linecap="round"/><path d="M3 8.5H7" stroke="white" stroke-width="0.8" stroke-linecap="round"/></svg>
      <span>Navigation</span>
    </div>

    <div class="sidebar__nav">
      <div class="sidebar__menu">

        <!-- Accueil -->
        <div class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app'}" @click="router.push('/app')">
          <span class="sidebar__menu-item-icon">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 7.5L7.5 1.5L13.5 7.5V13C13.5 13.2761 13.2761 13.5 13 13.5H9.5V9H5.5V13.5H2C1.72386 13.5 1.5 13.2761 1.5 13V7.5Z" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/></svg>
          </span>
          <span class="sidebar__menu-item-label">Accueil</span>
        </div>

        <!-- Planning -->
        <div class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app/planning'}" @click="router.push('/app/planning')">
          <span class="sidebar__menu-item-icon">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4.5 1V4" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M10.5 1V4" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M2 6H13" stroke="currentColor" stroke-width="0.9"/><rect x="4" y="7.5" width="2.5" height="2" rx="0.3" fill="currentColor" fill-opacity="0.4"/><rect x="8" y="7.5" width="2.5" height="2" rx="0.3" fill="currentColor" fill-opacity="0.4"/></svg>
          </span>
          <span class="sidebar__menu-item-label">Planning</span>
        </div>

        <!-- Pharmacie -->
        <div class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app/pharmacie'}" @click="router.push('/app/pharmacie')">
          <span class="sidebar__menu-item-icon">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="4" y="1.5" width="7" height="5" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M7.5 1V0.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M5.5 6V12.5C5.5 13.0523 5.94772 13.5 6.5 13.5H8.5C9.05228 13.5 9.5 13.0523 9.5 12.5V6" stroke="currentColor" stroke-width="0.9"/><path d="M5 9.5H10" stroke="currentColor" stroke-width="0.9"/></svg>
          </span>
          <span class="sidebar__menu-item-label">Pharmacie</span>
        </div>

        <!-- Facturation -->
        <div class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app/facturation'}" @click="router.push('/app/facturation')">
          <span class="sidebar__menu-item-icon">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M3.5 5H11.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3.5 7.5H8.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3.5 10H6.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>
          </span>
          <span class="sidebar__menu-item-label">Facturation</span>
        </div>

        <!-- Patients (dossier pliable) -->
        <div class="sidebar__folder" v-show="!isCollapsed">
          <div class="sidebar__folder-header" :class="{'sidebar__folder-header--expanded': patientsExpanded, 'sidebar__folder-header--active': isPatientRoute}" @click="patientsExpanded = !patientsExpanded">
            <span class="sidebar__folder-arrow">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M3 2L5 4L3 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="sidebar__folder-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4.5C2 3.94772 2.44772 3.5 3 3.5H6.5L7.5 4.5H13C13.5523 4.5 14 4.94772 14 5.5V11.5C14 12.0523 13.5523 12.5 13 12.5H3C2.44772 12.5 2 12.0523 2 11.5V4.5Z" fill="#F9E154" stroke="#D4A017" stroke-width="0.8"/></svg>
            </span>
            <span class="sidebar__folder-label">Patients</span>
          </div>
          <div v-if="patientsExpanded" class="sidebar__folder-children">

            <div class="sidebar__search">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="sidebar__search-icon"><circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="0.8"/><path d="M7.5 7.5L10.5 10.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>
              <input v-model="submenuSearch" placeholder="Rechercher..." class="sidebar__search-input" @click.stop />
              <button v-if="submenuSearch" class="sidebar__search-clear" @click.stop="submenuSearch = ''">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>
              </button>
            </div>

            <div v-for="subItem in patientSubmenuItems" :key="subItem.index"
              v-show="matchesSearch(subItem.label, subItem.index)"
              class="sidebar__menu-item sidebar__menu-item--sub"
              :class="{'sidebar__menu-item--active': activeRoute === subItem.index}"
              @click="onSubItemClick(subItem)">
              <span class="sidebar__menu-item-icon" v-html="subItem.svg"></span>
              <span class="sidebar__menu-item-label">{{ subItem.label }}</span>
            </div>
            <div v-if="submenuSearch && noResults" class="sidebar__no-results">Aucun résultat</div>

          </div>
        </div>

        <!-- Administration section -->
        <template v-if="showAdminSection">
          <div class="sidebar__menu-separator" />

          <!-- Paramètres -->
          <div class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app/parametres'}" @click="router.push('/app/parametres')">
            <span class="sidebar__menu-item-icon">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" stroke-width="0.9"/><path d="M7.5 1V3" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M7.5 12V14" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3.5 3.5L5 5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M10 10L11.5 11.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M1 7.5H3" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M12 7.5H14" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3.5 11.5L5 10" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M10 5L11.5 3.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>
            </span>
            <span class="sidebar__menu-item-label">Paramètres</span>
          </div>

          <!-- Configuration Clinic -->
          <div class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app/configuration-clinic'}" @click="router.push('/app/configuration-clinic')">
            <span class="sidebar__menu-item-icon">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="2" y="1.5" width="11" height="12" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/>
                <path d="M7.5 4.5V11" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>
                <path d="M4.5 7.5H10.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="sidebar__menu-item-label">Configuration Clinic</span>
          </div>

          <!-- Utilisateurs (ADMIN only) -->
          <div v-if="user?.role === 'ADMIN'" class="sidebar__menu-item" :class="{'sidebar__menu-item--active': activeRoute === '/app/utilisateurs'}" @click="router.push('/app/utilisateurs')">
            <span class="sidebar__menu-item-icon">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6" cy="4.5" r="2.5" stroke="currentColor" stroke-width="0.9"/><path d="M1 13C1 10 3 8.5 6 8.5C9 8.5 11 10 11 13" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M10.5 3.5C11.5 3.5 13 4.8 13 6" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M14 13C14 11 12.5 9 11 8.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>
            </span>
            <span class="sidebar__menu-item-label">Utilisateurs</span>
          </div>
        </template>

      </div>
    </div>

    <div v-if="openPatients.length > 0" class="sidebar__section-header sidebar__section-header--patients" v-show="!isCollapsed">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3.5C1 2.94772 1.44772 2.5 2 2.5H4.5L5.5 3.5H10.5C11.0523 3.5 11.5 3.94772 11.5 4.5V9C11.5 9.55228 11.0523 10 10.5 10H2C1.44772 10 1 9.55228 1 9V3.5Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="0.8"/></svg>
      <span>Patients ouverts</span>
      <span class="sidebar__section-badge">{{ openPatients.length }}</span>
      <button class="sidebar__section-clear" @click="clearAll" title="Tout effacer">Tout effacer</button>
    </div>

    <div v-if="openPatients.length > 0" class="sidebar__open-patients" v-show="!isCollapsed">
      <div v-for="entry in openPatients" :key="entry.patient.id"
        class="sidebar__open-patient"
        :class="{'sidebar__open-patient--active': activePatient?.id === entry.patient.id}"
        @click="onOpenPatientClick(entry.patient)"
        :title="`${getCiviliteSymbol(entry.patient.civilite)} ${entry.patient.prenom} ${entry.patient.nom}`">
        <span class="sidebar__open-patient-avatar" :class="'sidebar__open-patient-avatar--' + (entry.patient.civilite === 'M' ? 'male' : entry.patient.civilite === 'Mme' || entry.patient.civilite === 'Mlle' ? 'female' : 'none')">{{ getCiviliteSymbol(entry.patient.civilite) }}</span>
        <span class="sidebar__open-patient-name">{{ entry.patient.prenom }} {{ entry.patient.nom }}</span>
        <button class="sidebar__open-patient-close" @click.stop="onRemovePatient(entry.patient.id)" title="Fermer">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>

    <SyncStatusIndicator />

    <div class="sidebar__profile">
      <div class="sidebar__user" :title="user ? getUserDisplayName(user) : ''">
        <span class="sidebar__user-avatar">{{ userInitials }}</span>
        <span v-if="user && !isCollapsed" class="sidebar__user-name">{{ getUserDisplayName(user) }}</span>
        <div class="sidebar__user-actions" v-show="!isCollapsed">
          <button class="sidebar__user-action-btn" title="Mon profil" @click="router.push('/app/profil')">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" stroke-width="0.8"/><path d="M1.5 11C1.5 8.5 3.5 7 6 7C8.5 7 10.5 8.5 10.5 11" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>
          </button>
          <button class="sidebar__user-action-btn sidebar__user-action-btn--logout" title="Déconnexion" @click="logout">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 1.5H2C1.72386 1.5 1.5 1.72386 1.5 2V10C1.5 10.2761 1.72386 10.5 2 10.5H4.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/><path d="M7.5 8.5L10 6L7.5 3.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6H3.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '@/composables/useAuth'
import { getUserDisplayName } from '@/composables/useUsers'
import { useSidebar } from '@/composables/useSidebar'
import { useLogo } from '@/composables/useLogo'
import { usePatientContext } from '@/composables/usePatientContext'
import { useOpenPatients } from '@/composables/useOpenPatients'
import { usePatients } from '@/composables/usePatients'
import { getCiviliteSymbol } from '@/utils/civilite'
import SyncStatusIndicator from '@/components/layout/SyncStatusIndicator.vue'
import type { Patient } from '@/composables/usePatientContext'

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()
const { getPatient } = usePatients()
const { isCollapsed, sidebarWidth, toggle } = useSidebar()
const { logoUrl } = useLogo()
const logoError = ref(false)
const submenuSearch = ref('')
const patientsExpanded = ref(false)

watch(() => route.path, (path) => {
  if (path.startsWith('/app/patients') || path === '/app') {
    patientsExpanded.value = true
  }
}, { immediate: true })

function onLogoError() { logoError.value = true }
watch(logoUrl, () => { logoError.value = false })

const { activePatient, clearPatient, setActivePatient } = usePatientContext()
const { openPatients, removePatient, clearAll } = useOpenPatients()

interface SubmenuItem {
  index: string
  label: string
  svg: string
}

const patientSubmenuItems: SubmenuItem[] = [
  { index: 'patient-list', label: 'Liste des patients', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4.5 5H10.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 7.5H10.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 10H8" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-dossier', label: 'Fiche Patient', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 3C2 2.44772 2.44772 2 3 2H6.5L7.5 3H12.5C13.0523 3 13.5 3.44772 13.5 4V12C13.5 12.5523 13.0523 13 12.5 13H3C2.44772 13 2 12.5523 2 12V3Z" fill="#F9E154" stroke="#D4A017" stroke-width="0.9"/><path d="M5 6H10" stroke="#D4A017" stroke-width="0.9" stroke-linecap="round"/><path d="M5 8H8.5" stroke="#D4A017" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-dossier-clinic', label: 'Dossier Clinic', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="12" height="12" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4.5 4.5H10.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 7H9" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 9.5H7.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },

  { index: 'patient-prescription', label: 'Prescriptions, Soins & Médicaments', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2H13V13H2V2Z" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4 4.5H11" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4 7H8.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4 9.5H7" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M10.5 7.5L11.5 8.5" stroke="#27AE60" stroke-width="0.9" stroke-linecap="round"/><path d="M11.5 7.5L10.5 8.5" stroke="#27AE60" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-ordonnances', label: 'Ordonnances', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2H13V13H2V2Z" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4.5 4.5H10.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 7H9" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 9.5H7.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-examens', label: 'Demande Examens', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="0.9"/><path d="M10 10L13.5 13.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-labo', label: 'Résultats Bio', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1.5" width="11" height="12" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4.5 4.5H10.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 7.5H9" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M4.5 10.5H6" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M9 10.5L10 11.5L12 8.5" stroke="#27AE60" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { index: 'patient-actes', label: 'Actes, Soins & Médicaments', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M5.5 5V10" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M7.5 5V10" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M9.5 5V10" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-soins', label: 'Administration Soins & Médicaments', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5C5.5 1.5 3.5 3.5 3.5 5.5C3.5 8.5 7.5 12.5 7.5 12.5C7.5 12.5 11.5 8.5 11.5 5.5C11.5 3.5 9.5 1.5 7.5 1.5Z" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><circle cx="7.5" cy="5.5" r="1.5" stroke="currentColor" stroke-width="0.9"/></svg>' },
  { index: 'patient-contact', label: 'Contacts', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M7.5 1V3" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M5 6.5H10V11H5V6.5Z" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round"/></svg>' },
  { index: 'patient-sejour', label: 'Patient & Séjour', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M7.5 1V3" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M5 6.5H10V11H5V6.5Z" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round"/></svg>' },
  { index: 'patient-rdv', label: 'Rendez-vous', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M4.5 1V3.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M10.5 1V3.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3 6.5H12" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-factures', label: 'Factures', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="11" rx="1" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.1"/><path d="M3.5 4.5H11.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3.5 7H11.5" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/><path d="M3.5 9.5H7" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>' },
  { index: 'patient-close', label: 'Fermer le dossier', svg: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 3L12 12M12 3L3 12" stroke="#C0392B" stroke-width="0.9" stroke-linecap="round"/></svg>' },
]

function matchesSearch(label: string, index: string): boolean {
  if (PATIENT_ROUTES.has(index) && !activePatient.value) return false
  if (index === 'patient-close' && !activePatient.value) return false
  if (!submenuSearch.value) return true
  return label.toLowerCase().includes(submenuSearch.value.toLowerCase().trim())
}

const noResults = computed(() => {
  if (!submenuSearch.value) return false
  return !patientSubmenuItems.some(item => matchesSearch(item.label, item.index))
})

const PATIENT_ROUTES = new Set([
  'patient-dossier', 'patient-dossier-clinic', 'patient-prescription', 'patient-ordonnances', 'patient-examens', 'patient-labo',
  'patient-actes', 'patient-soins', 'patient-contact', 'patient-sejour', 'patient-rdv', 'patient-factures',
])

const isPatientRoute = computed(() =>
  typeof route.name === 'string' && PATIENT_ROUTES.has(route.name)
)

const activeRoute = computed(() => {
  const name = route.name as string
  if (name === 'patients') return 'patient-list'
  if (PATIENT_ROUTES.has(name)) return name
  if (name === 'patient-detail') return 'patient-dossier'
  const path = route.path
  if (path.startsWith('/app')) return path
  return path
})

const showAdminSection = computed(() => {
  return user.value?.role === 'ADMIN'
})

const userInitials = computed(() => {
  if (!user.value) return '?'
  return `${user.value.prenom[0]}${user.value.nom[0]}`
})

function onSubItemClick(item: { index: string; label?: string }) {
  submenuSearch.value = ''
  if (item.index === 'patient-list' || item.index === 'patient-close') {
    if (item.index === 'patient-close' && activePatient.value) {
      removePatient(activePatient.value.id)
    }
    clearPatient()
    patientsExpanded.value = false
    router.push('/app/patients')
  } else if (PATIENT_ROUTES.has(item.index)) {
    if (activePatient.value) {
      router.push(`/app/patients/${activePatient.value.id}/${item.index.replace(/^patient-/, '')}`)
    } else {
      router.push('/app/patients')
    }
  }
}

async function onOpenPatientClick(patient: Patient) {
  try {
    const p = await getPatient(patient.id)  // verify from DB
    if (p) {
      setActivePatient(p)
      router.push(`/app/patients/${patient.id}`)
    } else {
      ElMessage.error(`Le patient "${patient.prenom} ${patient.nom}" n'existe plus`)
      removePatient(patient.id)  // remove from open patients
    }
  } catch {
    ElMessage.error('Erreur lors de la vérification du patient')
  }
}

function onRemovePatient(patientId: number) {
  removePatient(patientId)
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--cd-sidebar-bg);
  border-right: 1px solid var(--cd-gray-300);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  transition: width 0.2s ease;
  user-select: none;
}

.sidebar--collapsed .sidebar__menu-item {
  justify-content: center;
  padding: 4px;
}

.sidebar--collapsed .sidebar__menu-item-label {
  display: none;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  min-height: 36px;
  background: var(--cd-sidebar-header-bg);
  flex-shrink: 0;
}

.sidebar__logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--cd-sidebar-header-text);
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.sidebar__toggle-btn {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
}

.sidebar__toggle-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.sidebar__section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--cd-sidebar-header-bg);
  color: var(--cd-sidebar-header-text);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  min-height: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.sidebar__section-header--patients {
  border-top: 1px solid var(--cd-gray-300);
}

.sidebar__section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  margin-left: auto;
}

.sidebar__section-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  font-weight: 500;
  padding: 1px 4px;
  margin-left: 4px;
  border-radius: 2px;
  line-height: 1.4;
  white-space: nowrap;
}

.sidebar__section-clear:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.sidebar__nav {
  overflow-x: hidden;
  padding: 2px 0;
}

.sidebar__menu {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 4px;
}

.sidebar__menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--cd-sidebar-item);
  border-radius: 2px;
  min-height: 26px;
  transition: none;
}

.sidebar__menu-item:hover {
  background: var(--cd-sidebar-item-hover);
  color: var(--cd-primary-dark);
}

.sidebar__menu-item--active {
  background: var(--cd-accent-orange) !important;
  color: #fff !important;
  font-weight: 700;
}

.sidebar__menu-item--active .sidebar__menu-item-icon {
  color: #fff !important;
}

.sidebar__menu-item--sub {
  padding-left: 30px;
  font-size: 11px;
}

.sidebar__menu-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--cd-sidebar-item);
  opacity: 0.85;
}

.sidebar__menu-item--active .sidebar__menu-item-icon {
  opacity: 1;
}

.sidebar__menu-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__menu-separator {
  height: 1px;
  background: var(--cd-gray-300);
  margin: 4px 4px;
}

.sidebar__folder {
  display: flex;
  flex-direction: column;
}

.sidebar__folder-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--cd-sidebar-item);
  border-radius: 2px;
  min-height: 26px;
}

.sidebar__folder-header:hover {
  background: var(--cd-sidebar-item-hover);
  color: var(--cd-primary-dark);
}

.sidebar__folder-header--active {
  font-weight: 600;
}

.sidebar__folder-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  color: var(--cd-sidebar-item);
  transition: transform 0.15s ease;
}

.sidebar__folder-header--expanded .sidebar__folder-arrow {
  transform: rotate(90deg);
}

.sidebar__folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.sidebar__folder-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.sidebar__folder-children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-left: 4px;
  padding-left: 4px;
  border-left: 1px solid var(--cd-gray-300);
}

.sidebar__search {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin: 2px 0 2px 6px;
  background: #fff;
  border: 1px solid var(--cd-gray-300);
  border-radius: 2px;
}

.sidebar__search-icon {
  color: var(--cd-gray-400);
  flex-shrink: 0;
}

.sidebar__search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 11px;
  color: var(--cd-gray-900);
  font-family: inherit;
  min-width: 0;
  padding: 2px 0;
}

.sidebar__search-input::placeholder {
  color: var(--cd-gray-400);
}

.sidebar__search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cd-gray-400);
  padding: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
}

.sidebar__search-clear:hover {
  color: var(--cd-gray-600);
  background: var(--cd-gray-200);
}

.sidebar__no-results {
  padding: 6px 10px 6px 14px;
  font-size: 11px;
  color: var(--cd-gray-500);
  font-style: italic;
}

.sidebar__open-patients {
  padding: 2px 0 4px;
}

.sidebar__open-patient {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  cursor: pointer;
  position: relative;
  font-size: 12px;
  color: var(--cd-sidebar-item);
  min-height: 24px;
}

.sidebar__open-patient:hover {
  background: var(--cd-sidebar-item-hover);
}

.sidebar__open-patient--active {
  background: var(--cd-accent-orange) !important;
  color: #fff !important;
}

.sidebar__open-patient-avatar {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.sidebar__open-patient-avatar--male { background: var(--cd-primary); }
.sidebar__open-patient-avatar--female { background: var(--cd-secondary); }
.sidebar__open-patient-avatar--none { background: var(--cd-gray-400); }

.sidebar__open-patient-name {
  flex: 1;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.sidebar__open-patient--active .sidebar__open-patient-name {
  color: #fff;
}

.sidebar__open-patient-close {
  opacity: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cd-gray-400);
  padding: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
  transition: opacity 0.1s ease;
}

.sidebar__open-patient:hover .sidebar__open-patient-close {
  opacity: 1;
}

.sidebar__open-patient-close:hover {
  color: var(--cd-secondary);
  background: var(--cd-gray-200);
}

.sidebar__profile {
  padding: 3px 8px;
  border-top: 1px solid var(--cd-gray-300);
  background: var(--cd-sidebar-bg);
  flex-shrink: 0;
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 2px;
  border-radius: 2px;
  width: 100%;
}

.sidebar__user-avatar {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  background: var(--cd-sidebar-header-bg);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.sidebar__user-name {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--cd-sidebar-item);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__user-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.sidebar__user-action-btn {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--cd-sidebar-item);
  opacity: 0.7;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
}

.sidebar__user-action-btn:hover {
  opacity: 1;
  background: var(--cd-sidebar-item-hover);
  border-color: var(--cd-gray-300);
}

.sidebar__user-action-btn--logout:hover {
  color: var(--cd-secondary);
}

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--cd-gray-300); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--cd-gray-400); }
</style>
