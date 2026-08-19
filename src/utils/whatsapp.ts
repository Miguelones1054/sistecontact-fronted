/** Convierte un teléfono local o internacional al formato wa.me (solo dígitos con país). */
export function toWhatsAppNumber(phone: string, defaultCountry = '57'): string | null {
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith(defaultCountry) && digits.length >= 11) return digits
  if (digits.length >= 10) return `${defaultCountry}${digits}`
  if (digits.length >= 7) return `${defaultCountry}${digits}`
  return null
}

export function whatsappChatUrl(phone: string, message = ''): string | null {
  const number = toWhatsAppNumber(phone)
  if (!number) return null
  const base = `https://wa.me/${number}`
  const text = message.trim()
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function defaultWhatsAppMessage(businessName: string): string {
  const name = businessName.trim()
  if (!name) {
    return 'Hola, le escribo para conocer más sobre su comercio y coordinar un contacto.'
  }
  return `Hola, le escribo de parte de SisteContact. Me gustaría hablar con ${name} para coordinar un contacto.`
}
