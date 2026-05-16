<template>
  <div class="dashboard">
    <TopBar />
    <PatientBar />
    <main class="dashboard__main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import PatientBar from '@/components/layout/PatientBar.vue'
import { providePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { restoreSession } = useAuth()

providePatientContext()

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
  flex-direction: column;
  background: var(--cd-gray-50);
}

.dashboard__main {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
</style>
