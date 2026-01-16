const base64UrlEncode = (buffer: Uint8Array): string => {
  let binary = ''
  buffer.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const generatePKCE = async () => {
  const length = 64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let codeVerifier = ''
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    codeVerifier += chars[array[i] % chars.length]
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
  const codeChallenge = base64UrlEncode(new Uint8Array(hashBuffer))
  return {codeVerifier, codeChallenge}
}

export default generatePKCE;