<template>
  <div class="dashboard">
    <SideBar />
    <div class="dashboard__main-area">
      <TopBar />
      <main
        ref="mainEl"
        class="dashboard__main"
      >
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { providePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { restoreSession } = useAuth()

const mainEl = ref<HTMLElement | null>(null)

/**
 * Le shell conserve le même conteneur défilant d'une route à l'autre. Sans
 * remise à zéro, arriver sur un écran depuis une page déjà défilée laisse
 * l'en-tête (titre + sous-titre) au-dessus du viewport. On réinitialise donc
 * la position après chaque navigation, une fois le nouveau contenu monté.
 */
watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    if (!mainEl.value) return
    mainEl.value.scrollTop = 0
    mainEl.value.scrollLeft = 0
  },
)

providePatientContext()

onErrorCaptured((err) => {
  console.error('[Dashboard] Unhandled error:', err)
  ElMessage.error(`Erreur: ${(err as Error).message}`)
  return false
})

onMounted(() => {
  if (!restoreSession()) {
    router.push('/login')
  }
})
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: row;
  background: var(--cd-page-bg);
  font-family: var(--cd-font-sans);
  overflow: hidden;
  max-width: 100%;
}

.dashboard__main-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard__main {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  /* Évite le recalcul de position de défilement quand la matrice se remplit
     après le chargement : le titre et le sous-titre restent visibles. */
  overflow-anchor: none;
  display: flex;
  flex-direction: column;
  padding: var(--cd-space-4) var(--cd-space-6);
}

/* Chaîne min-width:0 — tout contenu routé ne doit jamais forcer un scroll-X */
.dashboard__main > * {
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

@media (max-width: 768px) {
  .dashboard__main {
    padding: var(--cd-space-4);
  }
}

@media print {
  .dashboard__main {
    padding: 0;
    overflow: visible;
  }
}
</style>
