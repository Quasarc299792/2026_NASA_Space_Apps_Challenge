export const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true'
export const demoProject = 'demo-space-mission'

const cloudConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const multiplayerAvailable = useEmulators || Object.values(cloudConfig).every(Boolean)
export const firebaseConfig = useEmulators
  ? { apiKey: 'demo-key', projectId: demoProject, appId: '1:123:web:space-mission' }
  : cloudConfig

export const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'

export const activeRoomKey = 'space-mission.active-room'
