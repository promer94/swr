const isWindowEventTarget =
  typeof window !== 'undefined' &&
  window.addEventListener &&
  document.addEventListener

function isOnline(): boolean {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine !== 'undefined'
  ) {
    return navigator.onLine
  }
  // always assume it's online
  return true
}

function isDocumentVisible(): boolean {
  if (
    typeof document !== 'undefined' &&
    typeof document.visibilityState !== 'undefined'
  ) {
    return document.visibilityState !== 'hidden'
  }
  // always assume it's visible
  return true
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const fetcher = (url: any) => fetch(url).then<any>(res => res.json())

function setOnFocus(callback: (...args: unknown[]) => void): void {
  if (!isWindowEventTarget) return
  document.addEventListener('focus', callback, false)
  document.addEventListener('visibilitychange', callback, false)
}

function setOnConnect(callback: (...args: unknown[]) => void): void {
  if (!isWindowEventTarget) return
  document.addEventListener('online', callback, false)
}

export default {
  isOnline,
  isDocumentVisible,
  fetcher,
  setOnFocus,
  setOnConnect
}
