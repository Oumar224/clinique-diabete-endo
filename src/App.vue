<template>
  <el-config-provider :locale="fr">
    <router-view />
    <UpdateNotifier />
  </el-config-provider>
</template>

<script setup lang="ts">
import fr from 'element-plus/dist/locale/fr.mjs'
import UpdateNotifier from '@/components/update-notifier.vue'
</script>
