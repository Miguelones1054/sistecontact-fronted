export const APP_STRINGS = {
  app: {
    name: 'SisteContact',
    tagline: 'Busca comercios por tipo y zona',
  },
  login: {
    subtitle: 'Inicia sesión para continuar',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@correo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: '••••••••',
    submit: 'Entrar',
    submitting: 'Entrando...',
    checkingSession: 'Comprobando sesión...',
    emailRequired: 'Ingresa tu correo.',
    passwordRequired: 'Ingresa tu contraseña.',
    noRegisterHint:
      'No hay registro público. Si no tienes acceso, contacta al administrador.',
    logout: 'Cerrar sesión',
    errors: {
      invalidEmail: 'El correo no es válido.',
      userDisabled: 'Esta cuenta está deshabilitada.',
      invalidCredential: 'Correo o contraseña incorrectos.',
      tooManyRequests: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      network: 'Error de red. Revisa tu conexión.',
      generic: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    },
  },
  search: {
    title: 'Buscar comercios',
    typeLabel: 'Tipo de comercio',
    typePlaceholder: 'Ej: barberías, panaderías, ferreterías...',
    zoneLabel: 'Zona',
    zonePlaceholder: 'Escribe un sector o barrio...',
    zoneHint: 'Selecciona una zona de la lista',
    submit: 'Buscar',
    loading: 'Buscando...',
    noResults: 'No se encontraron comercios en esta zona.',
    resultsTitle: (count: number, type: string, zone: string) =>
      `${count} ${count === 1 ? 'comercio' : 'comercios'} de "${type}" en ${zone}`,
    errorGeneric: 'Ocurrió un error. Inténtalo de nuevo.',
    zoneRequired: 'Primero selecciona una zona.',
    typeRequired: 'Escribe el tipo de comercio.',
  },
  business: {
    openNow: 'Abierto ahora',
    closed: 'Cerrado',
    reviews: (n: number) => `${n} reseñas`,
    reviewsLabel: 'Reseñas',
    viewOnMaps: 'Ver en Google Maps',
    noRating: 'Sin valoraciones',
    phone: 'Teléfono',
    noPhone: 'Sin teléfono',
  },
} as const

export type AppStrings = typeof APP_STRINGS
