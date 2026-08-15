const BUS_PREFIX = 'cde:'

export function emit(event: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(BUS_PREFIX + event, { detail }))
}

export function on(event: string, handler: (detail: unknown) => void) {
  const listener = (e: Event) => handler((e as CustomEvent).detail)
  window.addEventListener(BUS_PREFIX + event, listener)
  return () => window.removeEventListener(BUS_PREFIX + event, listener)
}
