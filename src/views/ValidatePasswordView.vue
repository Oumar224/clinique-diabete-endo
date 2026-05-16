<template>
  <div class="validate-password">
    <div class="validate-password__card">
      <img :src="logoSrc" alt="CDE" class="validate-password__logo" />
      <h1 class="validate-password__title">Première connexion</h1>
      <p class="validate-password__subtitle">
        Veuillez définir un nouveau mot de passe pour activer votre compte.
      </p>

      <validate-password-form
        ref="validatePasswordFormRef"
        :loading="loading"
        :error="error"
        @submit-action="handleValidatePassword"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { FormInstance } from 'element-plus'
import ValidatePasswordForm from '@/components/auth/ValidatePasswordForm.vue'
import type { ValidatePasswordCommand } from '@/components/auth/ValidatePasswordForm.vue'
import logoSrc from '@/assets/cde.png'

const { validatePassword, loading, error } = useAuth()
const validatePasswordFormRef = ref()

async function handleValidatePassword(formRef: FormInstance | undefined, form: ValidatePasswordCommand) {
  if (!formRef) return
  const valid = await formRef.validate().catch(() => false)
  if (!valid) return
  const success = await validatePassword(form.oldPassword, form.newPassword)
  if (success) {
    formRef.resetFields()
  }
}
</script>

<style scoped>
.validate-password {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--cd-gray-50);
  padding: 24px;
}

.validate-password__card {
  width: 100%;
  max-width: 420px;
  background: var(--cd-white);
  border-radius: 16px;
  padding: 40px 32px;
  border: 1px solid var(--cd-gray-200);
  text-align: center;
}

.validate-password__logo {
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
}

.validate-password__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 6px;
}

.validate-password__subtitle {
  font-size: 14px;
  color: var(--cd-gray-400);
  margin-bottom: 28px;
}
</style>
