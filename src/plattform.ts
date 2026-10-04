import { Capacitor } from '@capacitor/core'

/** true in der Android-App (Capacitor), false im Browser und in der installierten Web-App */
export const IST_APP = Capacitor.isNativePlatform()
