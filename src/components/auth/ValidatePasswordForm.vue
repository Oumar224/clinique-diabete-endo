<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="onSubmit(form)"
  >
    <el-form-item label="Mot de passe actuel" prop="oldPassword">
      <el-input
        v-model="form.oldPassword"
        type="password"
        placeholder="Mot de passe provisoire"
        size="large"
        show-password
      />
    </el-form-item>

    <el-form-item label="Nouveau mot de passe" prop="newPassword">
      <el-input
        v-model="form.newPassword"
        type="password"
        placeholder="Minimum 6 caractères"
        size="large"
        show-password
      />
    </el-form-item>

    <el-form-item label="Confirmer le mot de passe" prop="confirmPassword">
      <el-input
        v-model="form.confirmPassword"
        type="password"
        placeholder="Confirmer"
        size="large"
        show-password
      />
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        size="large"
        :loading="loading"
        native-type="submit"
        class="validate-password__btn"
      >
        {{ loading ? 'Validation...' : 'Activer mon compte' }}
      </el-button>
    </el-form-item>

    <p v-if="error" class="validate-password__error">
      <el-icon><WarningFilled /></el-icon> {{ error }}
    </p>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

export interface ValidatePasswordCommand {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

defineProps<{ loading?: boolean; error?: string | null }>()

const formRef = ref<FormInstance>()
const form = reactive<ValidatePasswordCommand>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const rules: FormRules = {
  oldPassword: [
    { required: true, message: 'Requis', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: 'Requis', trigger: 'blur' },
    { min: 6, message: 'Minimum 6 caractères', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Requis', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.newPassword) {
          callback(new Error('Les mots de passe ne correspondent pas'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

function onSubmit(formData: ValidatePasswordCommand) {
  emits('submitAction', formRef.value, formData)
}

const emits = defineEmits<{
  (e: 'submitAction', formRef: FormInstance | undefined, form: ValidatePasswordCommand): void
}>()

defineExpose({ formRef })
</script>

<style scoped>
.validate-password__btn {
  width: 100%;
}

.validate-password__error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--cd-secondary);
  font-size: 13px;
  margin-top: -12px;
}
</style>
