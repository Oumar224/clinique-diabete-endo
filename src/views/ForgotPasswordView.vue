<template>
  <div class="forgot-password-view">
    <div class="forgot-password-view__card">
      <ForgotPasswordForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm.vue'
import { useAuth } from '@/composables/useAuth'

useAuth()
</script>

<style scoped>
.forgot-password-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--cd-gray-50, #f5f7fa);
}

.forgot-password-view__card {
  width: 100%;
  max-width: 400px;
  padding: 0 16px;
}
</style>
