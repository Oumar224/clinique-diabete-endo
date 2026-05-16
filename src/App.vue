<template>
  <el-config-provider :locale="fr">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import fr from 'element-plus/dist/locale/fr.mjs'
</script>
