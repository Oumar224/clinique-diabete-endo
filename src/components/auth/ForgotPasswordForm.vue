<template>
  <div class="forgot-password-form">
    <el-card v-if="!submitted" shadow="never" class="forgot-password-form__card">
      <div class="forgot-password-form__header">
        <h1 class="forgot-password-form__title">Mot de passe oublié</h1>
        <p class="forgot-password-form__subtitle">
          Saisissez votre email pour recevoir un nouveau mot de passe temporaire
        </p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="Email professionnel" prop="email">
          <el-input
            v-model="form.email"
            type="email"
            placeholder="prenom.nom@clinique.fr"
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="forgot-password-form__btn"
            @click="handleSubmit"
          >
            Envoyer
          </el-button>
        </el-form-item>
      </el-form>

      <p class="forgot-password-form__footer">
        <router-link to="/">Retour à la connexion</router-link>
      </p>
    </el-card>

    <el-card v-else shadow="never" class="forgot-password-form__card">
      <div class="forgot-password-form__success">
        <el-icon :size="48" color="#0E5C5B"><CircleCheckFilled /></el-icon>
        <h2 class="forgot-password-form__success-title">Email envoyé</h2>
        <p class="forgot-password-form__success-message">
          Si un compte existe avec cet email, un message vous a été envoyé avec les instructions.
        </p>
        <el-button
          type="primary"
          size="large"
          class="forgot-password-form__btn"
          @click="$router.push('/')"
        >
          Retour à la connexion
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Message, CircleCheckFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitted = ref(false)

const form = reactive({
  email: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: "L'email est requis", trigger: 'blur' },
    { type: 'email', message: 'Format email invalide', trigger: 'blur' },
  ],
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await ipcInvoke('auth:send-reset-password', { email: form.email })
    submitted.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-password-form {
  width: 100%;
}

.forgot-password-form__card {
  border-radius: 8px;
  padding: 32px 24px;
}

.forgot-password-form__header {
  text-align: center;
  margin-bottom: 32px;
}

.forgot-password-form__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900, #1a1a2e);
  margin-bottom: 8px;
}

.forgot-password-form__subtitle {
  font-size: 14px;
  color: var(--cd-gray-400, #8e8e9a);
  line-height: 1.5;
}

.forgot-password-form__btn {
  width: 100%;
}

.forgot-password-form__footer {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
}

.forgot-password-form__footer a {
  color: #0E5C5B;
  text-decoration: none;
}

.forgot-password-form__footer a:hover {
  text-decoration: underline;
}

.forgot-password-form__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
  text-align: center;
}

.forgot-password-form__success-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--cd-gray-900, #1a1a2e);
  margin: 0;
}

.forgot-password-form__success-message {
  font-size: 14px;
  color: var(--cd-gray-400, #8e8e9a);
  line-height: 1.5;
  max-width: 320px;
  margin: 0;
}
</style>
