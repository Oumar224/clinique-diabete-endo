import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import { ElTableColumn } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './style.css'

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
