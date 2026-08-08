import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDquHbSqh-s2GWEwwEBUlfdGOCbBI-d4a4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'sistecontact.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'sistecontact',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'sistecontact.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '811424258609',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:811424258609:web:15b7440eb658db96029310',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
