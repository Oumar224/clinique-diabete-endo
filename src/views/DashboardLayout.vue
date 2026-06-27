<template>
  <div class="dashboard">
    <SideBar />
    <div class="dashboard__main-area">
      <TopBar />
      <main class="dashboard__main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { providePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { restoreSession } = useAuth()

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
  background: var(--cd-gray-50);
}

.dashboard__main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard__main {
  flex: 1;
  overflow: auto;
  padding: 24px;
}


</style>
