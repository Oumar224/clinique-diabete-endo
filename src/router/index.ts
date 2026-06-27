import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/validate-password',
    name: 'validate-password',
    component: () => import('@/views/ValidatePasswordView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/app',
    component: () => import('@/views/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardHome.vue'),
      },
      {
        path: 'planning',
        name: 'planning',
        component: () => import('@/views/PlanningView.vue'),
      },
      {
        path: 'patients',
        name: 'patients',
        component: () => import('@/views/PatientsListView.vue'),
      },
      {
        path: 'patients/:id',
        component: () => import('@/views/patients/PatientLayout.vue'),
        children: [
          {
            path: '',
            redirect: { name: 'patient-dossier' },
          },
          {
            path: 'dossier',
            name: 'patient-dossier',
            component: () => import('@/views/patients/DossierView.vue'),
          },
          {
            path: 'labo',
            name: 'patient-labo',
            component: () => import('@/views/patients/LaboView.vue'),
          },
          {
            path: 'prescription',
            name: 'patient-prescription',
            component: () => import('@/views/patients/PrescriptionView.vue'),
            meta: { roles: ['MEDECIN', 'ADMIN'] },
          },
          {
            path: 'examens',
            name: 'patient-examens',
            component: () => import('@/views/patients/ExamensView.vue'),
            meta: { roles: ['MEDECIN', 'ADMIN'] },
          },
          {
            path: 'actes',
            name: 'patient-actes',
            component: () => import('@/views/patients/ActesView.vue'),
          },
          {
            path: 'soins',
            name: 'patient-soins',
            component: () => import('@/views/patients/SoinsView.vue'),
            meta: { roles: ['MEDECIN', 'INFIRMIER', 'ADMIN'] },
          },
          {
            path: 'sejour',
            name: 'patient-sejour',
            component: () => import('@/views/patients/SejourView.vue'),
          },
          {
            path: 'rdv',
            name: 'patient-rdv',
            component: () => import('@/views/patients/RendezVousView.vue'),
          },
          {
            path: 'factures',
            name: 'patient-factures',
            component: () => import('@/views/PatientFacturesView.vue'),
          },
        ],
      },
      {
        path: 'pharmacie',
        name: 'pharmacie',
        component: () => import('@/views/PharmacieView.vue'),
      },
      {
        path: 'facturation',
        name: 'facturation',
        component: () => import('@/views/FacturationView.vue'),
      },
      {
        path: 'utilisateurs',
        name: 'users',
        component: () => import('@/views/UsersView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'parametres',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
      {
        path: 'profil',
        name: 'profil',
        component: () => import('@/views/ProfilView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuth()

  if (!from.name) {
    let restored = false
    try {
      restored = await auth.restoreSession()
    } catch (e) {
      console.error('Session restoration failed:', e)
    }
    if (!restored && to.meta.requiresAuth) {
      return next({ name: 'login' })
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return next({ name: 'login' })
  }

  if (auth.isAuthenticated.value && to.meta.requiresAuth) {
    auth.refreshActivity()
  }

  if (to.name === 'validate-password' && auth.isAuthenticated.value && !auth.mustChangePassword.value) {
    return next({ name: 'dashboard' })
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.user.value && !roles.includes(auth.user.value.role)) {
    return next({ name: 'dashboard' })
  }

  if (auth.mustChangePassword.value && to.name !== 'validate-password') {
    return next({ name: 'validate-password' })
  }

  if (to.name === 'login' && auth.isAuthenticated.value && !auth.mustChangePassword.value) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
