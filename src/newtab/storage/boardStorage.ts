import { clampItemLayout, isSearchEngineId } from '../model/boardItems'
import type { Board, BoardItem } from '../model/boardItems'
import { isComponentThemeId, type ComponentThemeId } from '../themes/componentThemes'

const BOARD_STORAGE_KEY = 'clean-new-tab:board:v1'
const WORKSPACE_STORAGE_KEY = 'clean-new-tab:workspace:v1'
const ACTIVE_SPACE_STORAGE_KEY = 'clean-new-tab:active-space:v1'

export type BoardSpace = {
  id: string
  name: string
  icon: string
  color: string
  board: Board
  backgroundColor?: string
  backgroundMode?: BoardBackgroundMode
  componentThemeId?: ComponentThemeId
  wallpaperIds?: string[]
}

export type BoardBackgroundMode = 'color-fixed' | 'image-fixed' | 'image-rotating'

export type BoardWorkspace = {
  version: 1
  activeSpaceId: string
  spaces: BoardSpace[]
}

export type SyncedBoardWorkspace = Pick<BoardWorkspace, 'version' | 'spaces'>

export const defaultBoard: Board = {
  version: 1,
  items: [
    {
      id: 'default-search',
      type: 'search',
      title: 'Buscar',
      placeholder: 'Buscar en la web',
      searchEngine: 'google',
      suggestionsEnabled: true,
      layout: {
        x: 0,
        y: 0,
        width: 700,
        height: 50,
        anchorX: 'center',
        anchorY: 'center',
      },
      createdAt: 'initial',
    },
  ],
}

export const emptyBoard: Board = {
  version: 1,
  items: [],
}

const defaultSpaceColor = '#228be6'
const defaultSpaceIcon = 'HouseSimpleIcon'
const defaultBackgroundColor = '#f1f3f5'
const defaultBackgroundMode: BoardBackgroundMode = 'image-rotating'
const defaultComponentThemeId: ComponentThemeId = 'clean'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createStorageId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function hasValidLayout(item: unknown) {
  if (!isRecord(item) || !isRecord(item.layout)) {
    return false
  }

  return (
    typeof item.layout.x === 'number' &&
    typeof item.layout.y === 'number' &&
    typeof item.layout.width === 'number' &&
    typeof item.layout.height === 'number'
  )
}

function isValidItem(item: unknown): item is BoardItem {
  if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string' || !hasValidLayout(item)) {
    return false
  }

  if ('style' in item && item.style !== undefined && !isRecord(item.style)) {
    return false
  }

  if (item.type === 'link') {
    return typeof item.url === 'string'
  }

  if (item.type === 'group') {
    return Array.isArray(item.links)
  }

  if (item.type === 'search') {
    return typeof item.placeholder === 'string'
  }

  if (item.type === 'title' || item.type === 'date') {
    return true
  }

  return false
}

function normalizeBoard(board: Board): Board {
  return {
    ...board,
    items: board.items.map((item) => {
      const normalizedItem = {
        ...item,
        layout: clampItemLayout(item, item.layout),
      }

      return item.type === 'search'
        ? {
            ...normalizedItem,
            searchEngine: isSearchEngineId(item.searchEngine)
              ? item.searchEngine
              : 'google',
            suggestionsEnabled: item.suggestionsEnabled !== false,
          }
        : normalizedItem
    }),
  }
}

function normalizeSpace(space: BoardSpace): BoardSpace {
  return {
    id: space.id,
    name: space.name.trim() || 'Home',
    icon: space.icon.trim() || defaultSpaceIcon,
    color: space.color.trim() || defaultSpaceColor,
    backgroundColor: space.backgroundColor?.trim() || defaultBackgroundColor,
    backgroundMode: isValidBackgroundMode(space.backgroundMode)
      ? space.backgroundMode
      : defaultBackgroundMode,
    board: normalizeBoard(space.board),
    componentThemeId: isComponentThemeId(space.componentThemeId)
      ? space.componentThemeId
      : defaultComponentThemeId,
    wallpaperIds: Array.isArray(space.wallpaperIds)
      ? space.wallpaperIds.filter((id) => typeof id === 'string')
      : undefined,
  }
}

function isValidBackgroundMode(value: unknown): value is BoardBackgroundMode {
  return value === 'color-fixed' || value === 'image-fixed' || value === 'image-rotating'
}

function isValidSpace(space: unknown): space is BoardSpace {
  if (
    !isRecord(space) ||
    typeof space.id !== 'string' ||
    typeof space.name !== 'string' ||
    typeof space.icon !== 'string' ||
    typeof space.color !== 'string' ||
    !isRecord(space.board)
  ) {
    return false
  }

  const board = space.board

  return (
    board.version === 1 &&
    Array.isArray(board.items) &&
    board.items.every(isValidItem) &&
    (!('backgroundColor' in space) ||
      space.backgroundColor === undefined ||
      typeof space.backgroundColor === 'string') &&
    (!('backgroundMode' in space) ||
      space.backgroundMode === undefined ||
      isValidBackgroundMode(space.backgroundMode)) &&
    (!('componentThemeId' in space) ||
      space.componentThemeId === undefined ||
      space.componentThemeId === 'custom' ||
      isComponentThemeId(space.componentThemeId)) &&
    (!('customComponentTheme' in space) ||
      space.customComponentTheme === undefined ||
      isRecord(space.customComponentTheme)) &&
    (!('wallpaperIds' in space) ||
      space.wallpaperIds === undefined ||
      (Array.isArray(space.wallpaperIds) &&
        space.wallpaperIds.every((id) => typeof id === 'string')))
  )
}

export function createBoardSpace(values?: {
  board?: Board
  color?: string
  backgroundColor?: string
  backgroundMode?: BoardBackgroundMode
  componentThemeId?: ComponentThemeId
  icon?: string
  name?: string
  wallpaperIds?: string[]
}): BoardSpace {
  return normalizeSpace({
    id: createStorageId(),
    name: values?.name ?? 'Home',
    icon: values?.icon ?? defaultSpaceIcon,
    color: values?.color ?? defaultSpaceColor,
    backgroundColor: values?.backgroundColor ?? defaultBackgroundColor,
    backgroundMode: values?.backgroundMode ?? defaultBackgroundMode,
    board: values?.board ?? emptyBoard,
    componentThemeId: values?.componentThemeId ?? defaultComponentThemeId,
    wallpaperIds: values?.wallpaperIds,
  })
}

function createDefaultWorkspace(board = defaultBoard): BoardWorkspace {
  const space = createBoardSpace({ board, name: 'Home' })

  return {
    version: 1,
    activeSpaceId: space.id,
    spaces: [space],
  }
}

export function parseWorkspace(value: string | null): BoardWorkspace | null {
  if (!value) {
    return null
  }

  try {
    const workspace: unknown = JSON.parse(value)

    if (
      isRecord(workspace) &&
      workspace.version === 1 &&
      typeof workspace.activeSpaceId === 'string' &&
      Array.isArray(workspace.spaces) &&
      workspace.spaces.length > 0 &&
      workspace.spaces.every(isValidSpace)
    ) {
      const spaces = workspace.spaces.map((space) =>
        normalizeSpace(space as BoardSpace),
      )
      const activeSpaceId = spaces.some(
        (space) => space.id === workspace.activeSpaceId,
      )
        ? workspace.activeSpaceId
        : spaces[0].id

      return {
        version: 1,
        activeSpaceId,
        spaces,
      }
    }
  } catch {
    return null
  }

  return null
}

export function parseImportedWorkspace(value: unknown): BoardWorkspace | null {
  try {
    return parseWorkspace(JSON.stringify(value))
  } catch {
    return null
  }
}

export function toSyncedWorkspace(workspace: BoardWorkspace): SyncedBoardWorkspace {
  return {
    version: workspace.version,
    spaces: workspace.spaces,
  }
}

export function parseImportedSyncedWorkspace(
  value: unknown,
  preferredActiveSpaceId?: string,
): BoardWorkspace | null {
  if (!isRecord(value) || !Array.isArray(value.spaces)) {
    return null
  }

  const legacyActiveSpaceId =
    typeof value.activeSpaceId === 'string' ? value.activeSpaceId : undefined
  const fallbackSpaceId = isRecord(value.spaces[0]) && typeof value.spaces[0].id === 'string'
    ? value.spaces[0].id
    : ''

  return parseImportedWorkspace({
    ...value,
    activeSpaceId:
      (preferredActiveSpaceId && value.spaces.some(
        (space) => isRecord(space) && space.id === preferredActiveSpaceId,
      )
        ? preferredActiveSpaceId
        : legacyActiveSpaceId) ?? fallbackSpaceId,
  })
}

export function parseBoard(value: string | null): Board {
  if (!value) {
    return defaultBoard
  }

  try {
    const board: unknown = JSON.parse(value)

    if (isRecord(board) && board.version === 1 && Array.isArray(board.items) && board.items.every(isValidItem)) {
      return normalizeBoard(board as Board)
    }
  } catch {
    return defaultBoard
  }

  return defaultBoard
}

export function parseImportedBoard(value: string): Board | null {
  try {
    const board: unknown = JSON.parse(value)

    if (isRecord(board) && board.version === 1 && Array.isArray(board.items) && board.items.every(isValidItem)) {
      return normalizeBoard(board as Board)
    }
  } catch {
    return null
  }

  return null
}

export const boardStorage = {
  load() {
    if (!canUseLocalStorage()) {
      return defaultBoard
    }

    return parseBoard(window.localStorage.getItem(BOARD_STORAGE_KEY))
  },

  save(board: Board) {
    if (!canUseLocalStorage()) {
      return
    }

    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board))
  },
}

export const workspaceStorage = {
  load() {
    if (!canUseLocalStorage()) {
      return createDefaultWorkspace()
    }

    const storedWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    const preferredActiveSpaceId =
      window.localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY) ?? undefined
    let workspace: BoardWorkspace | null = null

    try {
      const parsed: unknown = storedWorkspace ? JSON.parse(storedWorkspace) : null
      workspace = parseImportedSyncedWorkspace(parsed, preferredActiveSpaceId)
    } catch {
      workspace = null
    }

    workspace ??= parseWorkspace(storedWorkspace)

    if (workspace) {
      return workspace
    }

    return createDefaultWorkspace(parseBoard(window.localStorage.getItem(BOARD_STORAGE_KEY)))
  },

  save(workspace: BoardWorkspace) {
    if (!canUseLocalStorage()) {
      return
    }

    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify(toSyncedWorkspace(workspace)),
    )
    window.localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, workspace.activeSpaceId)
  },
}
