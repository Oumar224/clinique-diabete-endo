import { ElLoading } from 'element-plus'

export function showLoader(text = 'Chargement...') {
  return ElLoading.service({
    lock: true,
    text,
    background: 'rgba(0, 0, 0, 0.7)',
  })
}

export function hideLoader(instance: any) {
  instance?.close()
}
