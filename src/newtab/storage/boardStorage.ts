import { clampItemLayout, isSearchEngineId, parseNavigableUrl } from '../model/boardItems'
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
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

export type LocalStorageSaveResult =
  | { ok: true }
  | { ok: false; error: string }

function storageFailure(error: unknown): LocalStorageSaveResult {
  return {
    ok: false,
    error: error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'El almacenamiento local no está disponible.',
  }
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

const noteNodeTypes = new Set([
  'doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList',
  'listItem', 'taskList', 'taskItem', 'hardBreak',
])
const noteMarkTypes = new Set(['bold', 'italic', 'underline', 'strike', 'link', 'textStyle'])
const noteFontSizes = new Set(['12px', '14px', '16px', '20px', '24px'])

function isSafeNoteUrl(value: unknown) {
  if (typeof value !== 'string') return false
  const result = parseNavigableUrl(value)
  return result.ok && (result.url.startsWith('http://') || result.url.startsWith('https://'))
}

function isValidNoteContent(value: unknown, isRoot = true): boolean {
  if (!isRecord(value) || typeof value.type !== 'string' || !noteNodeTypes.has(value.type)) {
    return false
  }
  if (isRoot && value.type !== 'doc') return false
  if (value.type === 'text' && typeof value.text !== 'string') return false
  if ('content' in value && value.content !== undefined) {
    if (!Array.isArray(value.content) || !value.content.every((node) => isValidNoteContent(node, false))) {
      return false
    }
  }
  if ('marks' in value && value.marks !== undefined) {
    if (!Array.isArray(value.marks) || !value.marks.every((mark) => {
      if (!isRecord(mark) || typeof mark.type !== 'string' || !noteMarkTypes.has(mark.type)) return false
      if (mark.type === 'link') {
        if (!isRecord(mark.attrs) || !isSafeNoteUrl(mark.attrs.href)) return false
        if ('openInNewTab' in mark.attrs && typeof mark.attrs.openInNewTab !== 'boolean') return false
        if ('card' in mark.attrs && typeof mark.attrs.card !== 'boolean') return false
        if ('domain' in mark.attrs && (
          typeof mark.attrs.domain !== 'string' ||
          mark.attrs.domain.length > 255 ||
          /[<>]/.test(mark.attrs.domain)
        )) return false
        return true
      }
      if (mark.type === 'textStyle') {
        return isRecord(mark.attrs) && noteFontSizes.has(String(mark.attrs.fontSize))
      }
      return !('attrs' in mark) || mark.attrs === undefined || isRecord(mark.attrs)
    })) return false
  }
  if ('attrs' in value && value.attrs !== undefined) {
    if (!isRecord(value.attrs)) return false
    if (value.type === 'heading' && ![1, 2, 3].includes(Number(value.attrs.level))) return false
    if ((value.type === 'paragraph' || value.type === 'heading') &&
      'indent' in value.attrs &&
      (!Number.isInteger(value.attrs.indent) || Number(value.attrs.indent) < 0 || Number(value.attrs.indent) > 4)
    ) return false
    if ((value.type === 'paragraph' || value.type === 'heading') &&
      'textAlign' in value.attrs &&
      value.attrs.textAlign !== null &&
      !['left', 'center', 'right', 'justify'].includes(String(value.attrs.textAlign))
    ) return false
    if (value.type === 'taskItem' && typeof value.attrs.checked !== 'boolean') return false
  }
  return true
}

function isValidItem(item: unknown): item is BoardItem {
  if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string' || !hasValidLayout(item)) {
    return false
  }

  if ('style' in item && item.style !== undefined && !isRecord(item.style)) {
    return false
  }

  if (item.type === 'link') {
    return typeof item.url === 'string' && parseNavigableUrl(item.url).ok
  }

  if (item.type === 'group') {
    return Array.isArray(item.links) && item.links.every(
      (link) => isRecord(link) && link.type === 'link' && isValidItem(link),
    )
  }

  if (item.type === 'search') {
    return typeof item.placeholder === 'string'
  }

  if (item.type === 'note') {
    return item.contentVersion === 1 &&
      isValidNoteContent(item.content) &&
      (!('checklist' in item) || item.checklist === undefined || (
        isRecord(item.checklist) &&
        (!('hideCompleted' in item.checklist) || typeof item.checklist.hideCompleted === 'boolean') &&
        (!('moveCompletedToEnd' in item.checklist) || typeof item.checklist.moveCompletedToEnd === 'boolean')
      ))
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

      if (item.type === 'link') {
        const result = parseNavigableUrl(item.url)
        return { ...normalizedItem, url: result.ok ? result.url : item.url }
      }

      if (item.type === 'group') {
        return {
          ...normalizedItem,
          links: item.links.map((link) => {
            const result = parseNavigableUrl(link.url)
            return { ...link, url: result.ok ? result.url : link.url }
          }),
        }
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

    try {
      return parseBoard(window.localStorage.getItem(BOARD_STORAGE_KEY))
    } catch {
      return defaultBoard
    }
  },

  save(board: Board): LocalStorageSaveResult {
    if (!canUseLocalStorage()) {
      return storageFailure('El almacenamiento local no está disponible.')
    }

    try {
      window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board))
      return { ok: true }
    } catch (error) {
      return storageFailure(error)
    }
  },
}

export const workspaceStorage = {
  load() {
    if (!canUseLocalStorage()) {
      return createDefaultWorkspace()
    }

    try {
      const storedWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
      const preferredActiveSpaceId =
        window.localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY) ?? undefined
      let workspace: BoardWorkspace | null = null
      const parsed: unknown = storedWorkspace ? JSON.parse(storedWorkspace) : null
      workspace = parseImportedSyncedWorkspace(parsed, preferredActiveSpaceId)
      workspace ??= parseWorkspace(storedWorkspace)

      if (workspace) {
        return workspace
      }

      return createDefaultWorkspace(parseBoard(window.localStorage.getItem(BOARD_STORAGE_KEY)))
    } catch {
      return createDefaultWorkspace()
    }
  },

  save(workspace: BoardWorkspace): LocalStorageSaveResult {
    if (!canUseLocalStorage()) {
      return storageFailure('El almacenamiento local no está disponible.')
    }

    try {
      window.localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify(toSyncedWorkspace(workspace)),
      )
      window.localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, workspace.activeSpaceId)
      return { ok: true }
    } catch (error) {
      return storageFailure(error)
    }
  },
}
