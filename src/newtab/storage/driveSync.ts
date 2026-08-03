import type { SyncedBoardWorkspace } from './boardStorage'
import type { WallpaperExportData } from '../hooks/useSessionWallpaper'

export type DriveSyncState =
  | 'checking'
  | 'disconnected'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'conflict'
  | 'unsupported'
  | 'error'

export type DriveWorkspaceEnvelope = {
  format: 'clean-new-tab-workspace'
  formatVersion: 1
  revision: number
  updatedAt: string
  updatedBy: string
  workspace: SyncedBoardWorkspace
}

export type DriveWallpaperBundle = WallpaperExportData

type RuntimeApi = {
  lastError?: { message?: string }
  sendMessage: (
    message: unknown,
    callback: (response: unknown) => void,
  ) => void
}

function getRuntime(): RuntimeApi | null {
  const extensionGlobals = globalThis as typeof globalThis & {
    browser?: { runtime?: RuntimeApi }
    chrome?: { runtime?: RuntimeApi }
  }
  const extensionApi = extensionGlobals.browser ?? extensionGlobals.chrome
  return extensionApi?.runtime ?? null
}

export function sendDriveMessage<T>(message: unknown): Promise<T> {
  const runtime = getRuntime()

  if (!runtime) {
    return Promise.reject(new Error('La API de la extensión no está disponible.'))
  }

  return new Promise((resolve, reject) => {
    runtime.sendMessage(message, (response) => {
      const runtimeError = runtime.lastError
      if (runtimeError) {
        reject(new Error(runtimeError.message ?? 'No se pudo contactar al servicio de Drive.'))
        return
      }

      const result = response as { error?: string } | undefined
      if (!result || result.error) {
        reject(new Error(result?.error ?? 'Drive no devolvió una respuesta válida.'))
        return
      }

      resolve(response as T)
    })
  })
}
