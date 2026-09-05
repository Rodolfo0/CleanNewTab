import {
  ActionIcon,
  Group,
  Paper,
  Portal,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  ArrowClockwiseIcon,
  ArrowDownIcon,
  ArrowsClockwiseIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CaretRightIcon,
  DotsSixVerticalIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { NoteSearchMatch } from "./noteSearch";
import { useNoteFloatingWindow, type NoteAnchorRect } from "./noteFloatingWindow";

type NoteSearchWindowProps = {
  anchorRect: NoteAnchorRect | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  replaceQuery: string;
  searchMode: "find" | "replace";
  searchMatches: NoteSearchMatch[];
  searchIndex: number;
  onQueryChange: (value: string) => void;
  onReplaceQueryChange: (value: string) => void;
  onToggleMode: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
};

export function NoteSearchWindow({
  anchorRect,
  inputRef,
  searchQuery,
  replaceQuery,
  searchMode,
  searchMatches,
  searchIndex,
  onQueryChange,
  onReplaceQueryChange,
  onToggleMode,
  onPrev,
  onNext,
  onClose,
  onReplace,
  onReplaceAll,
}: NoteSearchWindowProps) {
  const { ref, isDragging } = useNoteFloatingWindow(anchorRect);

  return (
    <Portal>
      <Paper
        ref={ref}
        data-note-float-window
        withBorder
        radius="md"
        shadow="lg"
        className="overflow-hidden bg-white"
        style={{ position: "fixed", zIndex: 420 }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            inputRef.current?.focus();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <Group gap={0} wrap="nowrap" align="stretch">
          <div
            data-note-float-drag-handle
            aria-label="Arrastrar búsqueda"
            className={`flex w-7 shrink-0 items-center justify-center border-r border-[#eaecf0] bg-[#f9fafb] ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <DotsSixVerticalIcon size={16} className="text-[#98a2b3]" />
          </div>
          <div className="min-w-0 p-1.5">
            <Stack gap={4}>
              <Group gap={2} wrap="nowrap">
                <Tooltip label={searchMode === "replace" ? "Contraer reemplazar" : "Expandir reemplazar"}>
                  <ActionIcon
                    aria-label={searchMode === "replace" ? "Contraer reemplazar" : "Expandir reemplazar"}
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={onToggleMode}
                  >
                    {searchMode === "replace" ? <CaretDownIcon size={15} /> : <CaretRightIcon size={15} />}
                  </ActionIcon>
                </Tooltip>
                <TextInput
                  ref={inputRef}
                  aria-label="Buscar en la nota"
                  placeholder="Buscar"
                  size="xs"
                  w={180}
                  value={searchQuery}
                  onChange={(event) => onQueryChange(event.currentTarget.value)}
                />
                <span
                  aria-live="polite"
                  className="min-w-9 whitespace-nowrap text-center text-[10px] font-medium opacity-70"
                >
                  {searchQuery
                    ? searchMatches.length > 0
                      ? `${searchIndex + 1}/${searchMatches.length}`
                      : "0/0"
                    : ""}
                </span>
                <Tooltip label="Coincidencia anterior">
                  <ActionIcon
                    aria-label="Coincidencia anterior"
                    size="sm"
                    variant="subtle"
                    color="gray"
                    disabled={searchMatches.length === 0}
                    onClick={onPrev}
                  >
                    <ArrowUpIcon size={15} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Coincidencia siguiente">
                  <ActionIcon
                    aria-label="Coincidencia siguiente"
                    size="sm"
                    variant="subtle"
                    color="gray"
                    disabled={searchMatches.length === 0}
                    onClick={onNext}
                  >
                    <ArrowDownIcon size={15} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Cerrar búsqueda">
                  <ActionIcon
                    aria-label="Cerrar búsqueda"
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={onClose}
                  >
                    <XIcon size={15} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              {searchMode === "replace" ? (
                <Group gap={2} wrap="nowrap" className="pl-[30px]">
                  <TextInput
                    aria-label="Reemplazar por"
                    placeholder="Reemplazar por"
                    size="xs"
                    w={180}
                    value={replaceQuery}
                    onChange={(event) => onReplaceQueryChange(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onReplace();
                      }
                    }}
                  />
                  <Tooltip label="Reemplazar">
                    <ActionIcon
                      aria-label="Reemplazar"
                      size="sm"
                      variant="subtle"
                      color="gray"
                      disabled={searchMatches.length === 0}
                      onClick={onReplace}
                    >
                      <ArrowClockwiseIcon size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Reemplazar todo">
                    <ActionIcon
                      aria-label="Reemplazar todo"
                      size="sm"
                      variant="subtle"
                      color="red"
                      disabled={searchMatches.length === 0}
                      onClick={onReplaceAll}
                    >
                      <ArrowsClockwiseIcon size={15} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ) : null}
            </Stack>
          </div>
        </Group>
      </Paper>
    </Portal>
  );
}
