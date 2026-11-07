<template>
  <div class="login">
    <div class="login__brand">
      <div class="login__brand-content">
        <img :src="logoUrl" alt="CDE" class="login__brand-logo" />
        <h2 class="login__brand-title">CDE</h2>
        <p class="login__brand-desc">
          Solution de gestion clinique sécurisée. <br />
          Connectez-vous pour accéder à votre espace.
        </p>
      </div>
    </div>
    <div class="login__panel">
      <LoginForm
        :loading="loading"
        :error="error"
        @submit-action="handleLoginSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
import type { LoginCommand } from '@/components/auth/LoginForm.vue'
import { useAuth } from '@/composables/useAuth'
import { useLogo } from '@/composables/useLogo'
import type { FormInstance } from 'element-plus'

const { login, loading, error } = useAuth()
const { logoUrl } = useLogo()

async function handleLoginSubmit(formRef: FormInstance | undefined, form: LoginCommand) {
  if (!formRef) return
  const valid = await formRef.validate().catch(() => false)
  if (!valid) return
  await login(form.email, form.password, form.rememberMe)
}
</script>

<style scoped>
.login {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 100vh;
  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
}

.login__brand {
  background: linear-gradient(135deg, #1A5276 0%, #0E3A54 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login__brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 50%, rgba(167, 218, 214, 0.15) 0%, transparent 60%);
}

.login__brand-content {
  text-align: center;
  color: white;
  position: relative;
  z-index: 1;
  padding: 40px;
}

.login__brand-logo {
  width: 110px;
  height: 110px;
  margin-bottom: 24px;
  object-fit: contain;
}

.login__brand-title {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.login__brand-desc {
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.8;
  max-width: 300px;
  margin: 0 auto;
}

.login__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cd-widget-bg);
}

@media (max-width: 768px) {
  .login__brand {
    display: none;
  }
  .login {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
