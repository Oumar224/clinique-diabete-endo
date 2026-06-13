import { ref, computed } from 'vue'

const _collapsed = ref(false)

export function useSidebar() {
  const isCollapsed = computed(() => _collapsed.value)
  const sidebarWidth = computed(() => _collapsed.value ? '64px' : '220px')

  function toggle() { _collapsed.value = !_collapsed.value }
  function expand() { _collapsed.value = false }
  function collapse() { _collapsed.value = true }

  return { isCollapsed, sidebarWidth, toggle, collapse, expand }
}
