<template>
  <div class="login-form">
    <div class="login-form__header">
      <img :src="logoSrc" alt="CDE" class="login-form__logo" />
      <h1 class="login-form__title">Connexion CDE</h1>
      <p class="login-form__subtitle">Clinique Diabète & Endocrinologie</p>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <el-form-item label="Email professionnel" prop="email">
        <el-input
          v-model="form.email"
          placeholder="prenom.nom@clinique.fr"
          size="large"
          :prefix-icon="Message"
        />
      </el-form-item>

      <el-form-item label="Mot de passe" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="••••••••"
          size="large"
          show-password
          :prefix-icon="Lock"
        />
      </el-form-item>

      <el-form-item>
        <el-checkbox v-model="form.rememberMe">Se souvenir de moi</el-checkbox>
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="login-form__btn"
          @click="onSubmit(form as LoginCommand)"
        >
          Se connecter
        </el-button>
      </el-form-item>

      <p v-if="error" class="login-form__error">
        <el-icon><WarningFilled /></el-icon>
        {{ error }}
      </p>
    </el-form>

    <p class="login-form__footer">
      Application sécurisée — accès réservé au personnel de la clinique.
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Message, Lock, WarningFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import logoSrc from '@/assets/cde.png'

export interface LoginCommand {
  email: string
  password: string
  rememberMe: boolean
}

defineProps<{ loading?: boolean; error?: string | null }>()

const formRef = ref<FormInstance>()
const form = reactive<LoginCommand>({
  email: '',
  password: '',
  rememberMe: false,
})

const rules: FormRules = {
  email: [
    { required: true, message: 'L\'email est requis', trigger: 'blur' },
    { type: 'email', message: 'Format email invalide', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Le mot de passe est requis', trigger: 'blur' },
    { min: 4, message: 'Minimum 4 caractères', trigger: 'blur' },
  ],
}

function onSubmit(formData: LoginCommand) {
  emits('submitAction', formRef.value, formData)
}

const emits = defineEmits<{
  (e: 'submitAction', formRef: FormInstance | undefined, form: LoginCommand): void
}>()
</script>

<style scoped>
.login-form {
  width: 100%;
  max-width: 400px;
  padding: 48px 32px;
}

.login-form__header {
  text-align: center;
  margin-bottom: 36px;
}

.login-form__logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  object-fit: contain;
}

.login-form__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 4px;
}

.login-form__subtitle {
  font-size: 14px;
  color: var(--cd-gray-400);
}

.login-form__btn {
  width: 100%;
}

.login-form__error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--cd-secondary);
  font-size: 13px;
  margin-top: -12px;
}

.login-form__footer {
  margin-top: 32px;
  text-align: center;
  font-size: 12px;
  color: var(--cd-gray-400);
}
</style>
