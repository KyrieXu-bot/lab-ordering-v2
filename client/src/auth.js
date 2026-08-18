export function getSession() {
  try { return JSON.parse(localStorage.getItem('ordering_session') || 'null') }
  catch (_) { return null }
}

export function setSession(session) {
  localStorage.setItem('ordering_session', JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem('ordering_session')
}
