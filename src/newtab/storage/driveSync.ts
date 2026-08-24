import type { SyncedBoardWorkspace } from './boardStorage'
import type { WallpaperExportData } from '../hooks/useSessionWallpaper'

export type DriveSyncState =
  | 'checking'
  | 'disconnected'
  | 'syncing'
  | 'synced'
  | 'paused'
  | 'pending'
  | 'conflict'
  | 'unsupported'
  | 'error'

export type DriveWorkspaceEnvelope = {
  format: 'clean-new-tab-workspace'
  formatVersion: 1 | 2
  revision: number
  updatedAt: string
  updatedBy: string
  workspace: SyncedBoardWorkspace
  resources?: {
    wallpapers: DriveWallpaperBundle
    tabIcon: string | null
  }
}

export type DriveWallpaperBundle = WallpaperExportData

type RuntimeApi = {
  lastError?: { message?: string }
  sendMessage: (
    message: unknown,
    callback?: (response: unknown) => void,
  ) => Promise<unknown> | void
}

function getRuntime(): { runtime: RuntimeApi; usesPromises: boolean } | null {
  const extensionGlobals = globalThis as typeof globalThis & {
    browser?: { runtime?: RuntimeApi }
    chrome?: { runtime?: RuntimeApi }
  }
  if (extensionGlobals.browser?.runtime) {
    return { runtime: extensionGlobals.browser.runtime, usesPromises: true }
  }
  if (extensionGlobals.chrome?.runtime) {
    return { runtime: extensionGlobals.chrome.runtime, usesPromises: false }
  }
  return null
}

function validateDriveResponse<T>(response: unknown): T {
  const result = response as { error?: string } | undefined
  if (!result || result.error) {
    throw new Error(result?.error ?? 'Drive no devolvió una respuesta válida.')
  }
  return response as T
}

export function sendDriveMessage<T>(message: unknown): Promise<T> {
  const runtimeInfo = getRuntime()

  if (!runtimeInfo) {
    return Promise.reject(new Error('La API de la extensión no está disponible.'))
  }

  const { runtime, usesPromises } = runtimeInfo

  if (usesPromises) {
    try {
      return Promise.resolve(runtime.sendMessage(message)).then((response) =>
        validateDriveResponse<T>(response),
      )
    } catch (error) {
      return Promise.reject(error)
    }
  }

  return new Promise((resolve, reject) => {
    runtime.sendMessage(message, (response) => {
      const runtimeError = runtime.lastError
      if (runtimeError) {
        reject(new Error(runtimeError.message ?? 'No se pudo contactar al servicio de Drive.'))
        return
      }

      try {
        resolve(validateDriveResponse<T>(response))
      } catch (error) {
        reject(error)
      }
    })
  })
}
