import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import { ElTableColumn } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './style.css'
import './styles/cde-ui.css'

// Apply CSS variable overrides after all stylesheets are loaded.
// This prevents Vite's CSS optimizer from deduplicating our custom
// --el-color-primary-rgb (and similar) when merging :root blocks.
;(function ensureThemeColors(): void {
  const root = document.documentElement
  root.style.setProperty('--el-color-primary-rgb', '14, 124, 123')
  root.style.setProperty('--el-color-danger-rgb', '192, 57, 43')
  root.style.setProperty('--el-color-warning-rgb', '183, 149, 11')
})()

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Enable show-overflow-tooltip by default on all el-table-column instances.
// Combined with CSS truncation on .el-table td.el-table__cell, this ensures
// all table cells render on a single line with ellipsis, and the full
// content appears in a tooltip on hover when it overflows.
try {
  const prop = ElTableColumn.props?.showOverflowTooltip
  if (prop && typeof prop === 'object') {
    prop.default = true
  }
} catch {
  // Silently ignore — fallback is CSS-only truncation without tooltips
}

app.use(ElementPlus, { size: 'default', zIndex: 2000 })
app.use(router)
app.mount('#app')
