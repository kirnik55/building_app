let holder

export function ensureHolder() {
  if (!holder) {
    holder = document.createElement('div')
    holder.style.position = 'fixed'
    holder.style.top = '16px'
    holder.style.right = '16px'
    holder.style.zIndex = '9999'
    document.body.appendChild(holder)
  }
}

export function showToast(message, type = 'info', timeout = 3500) {
  ensureHolder()
  const el = document.createElement('div')
  el.className = `alert alert-${type}`
  el.textContent = message
  el.style.minWidth = '260px'
  el.style.boxShadow = '0 2px 10px rgba(0,0,0,.1)'
  holder.appendChild(el)
  setTimeout(() => el.remove(), timeout)
}

export const showError = (m)=>showToast(m,'danger')
export const showSuccess = (m)=>showToast(m,'success')
export const showInfo = (m)=>showToast(m,'info')
