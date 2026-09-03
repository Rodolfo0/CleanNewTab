import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { lazy, Suspense, useState } from "react";
import type { JSONContent } from "@tiptap/core";

import {
  ActionIcon,
  Group,
  Tooltip,
} from "@mantine/core";
import {
  ArrowsOutCardinalIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { SearchRender } from "../elements/search/SearchRender";
import {
  BoardItem as BoardItemData,
  BoardItemStyle,
  BoardLayout,
  type NoteItem,
  ResizeDirection,
  clampLayout,
  getAnchoredXFromLeft,
  getAnchoredYFromTop,
  getItemStyle,
  getLayoutAnchorX,
  getLayoutAnchorY,
  getViewportLeft,
  getViewportTop,
  resizeItemLayout,
} from "../model/boardItems";

const TitleDesignWindow = lazy(() =>
  import("./TitleDesignWindow").then((module) => ({
    default: module.TitleDesignWindow,
  })),
);
const DateRender = lazy(() =>
  import("../elements/date/DateRender").then((module) => ({ default: module.DateRender })),
);
const GroupRender = lazy(() =>
  import("../elements/group/GroupRender").then((module) => ({ default: module.GroupRender })),
);
const LinkRender = lazy(() =>
  import("../elements/link/LinkRender").then((module) => ({ default: module.LinkRender })),
);
const NoteRender = lazy(() =>
  import("../elements/note/NoteRender").then((module) => ({ default: module.NoteRender })),
);
const TitleRender = lazy(() =>
  import("../elements/title/TitleRender").then((module) => ({ default: module.TitleRender })),
);

type BoardItemProps = {
  item: BoardItemData;
  items: BoardItemData[];
  componentTheme: Partial<BoardItemStyle>;
  viewportHeight: number;
  viewportWidth: number;
  isEditing: boolean;
  isSelected: boolean;
  today: string;
  onSelect: () => void;
  onMove: (itemId: string, layout: BoardLayout) => void;
  onResize: (itemId: string, layout: BoardLayout) => void;
  onStyleChange: (itemId: string, style: Partial<BoardItemStyle>) => void;
  onConfigure: () => void;
  onCloseTitleDesign: () => void;
  onRemove: () => void;
  onAddLink: () => void;
  onOpenTitleDesign: () => void;
  onNoteContentChange: (itemId: string, content: JSONContent) => void;
  onNoteChecklistChange: (itemId: string, checklist: NonNullable<NoteItem["checklist"]>) => void;
  onInitialNoteEditStarted: () => void;
  startNoteInEditMode: boolean;
  isTitleDesignOpen: boolean;
};

type SnapGuide = {
  x?: number;
  y?: number;
};

type SnapTarget = {
  value: number;
};

const SNAP_THRESHOLD = 8;
const DRAG_START_THRESHOLD = 4;

function ItemContent({
  item,
  isEditing,
  today,
  componentTheme,
  onNoteContentChange,
  onNoteChecklistChange,
  onInitialNoteEditStarted,
  noteFrameInset,
  startNoteInEditMode,
}: {
  item: BoardItemData;
  isEditing: boolean;
  today: string;
  componentTheme: Partial<BoardItemStyle>;
  onNoteContentChange: (itemId: string, content: JSONContent) => void;
  onNoteChecklistChange: (itemId: string, checklist: NonNullable<NoteItem["checklist"]>) => void;
  onInitialNoteEditStarted: () => void;
  noteFrameInset: number;
  startNoteInEditMode: boolean;
}) {
  if (item.type === "search") {
    return <SearchRender item={item} isEditing={isEditing} componentTheme={componentTheme} />;
  }

  return (
    <Suspense fallback={null}>
      {item.type === "group" ? (
        <GroupRender item={item} isEditing={isEditing} componentTheme={componentTheme} />
      ) : item.type === "title" ? (
        <TitleRender item={item} componentTheme={componentTheme} />
      ) : item.type === "date" ? (
        <DateRender item={item} today={today} componentTheme={componentTheme} />
      ) : item.type === "note" ? (
        <NoteRender
          key={isEditing ? "layout" : "content"}
          item={item}
          componentTheme={componentTheme}
          editingAllowed={!isEditing}
          frameInset={noteFrameInset}
          onContentChange={(content) => onNoteContentChange(item.id, content)}
          onChecklistChange={(checklist) => onNoteChecklistChange(item.id, checklist)}
          onInitialEditStarted={onInitialNoteEditStarted}
          startInEditMode={!isEditing && startNoteInEditMode}
        />
      ) : (
        <LinkRender item={item} componentTheme={componentTheme} />
      )}
    </Suspense>
  );
}

function getClosestSnap({
  points,
  targets,
}: {
  points: number[];
  targets: SnapTarget[];
}) {
  let closest: { delta: number; guide: number } | null = null;

  for (const point of points) {
    for (const target of targets) {
      const delta = target.value - point;

      if (Math.abs(delta) > SNAP_THRESHOLD) {
        continue;
      }

      if (!closest || Math.abs(delta) < Math.abs(closest.delta)) {
        closest = { delta, guide: target.value };
      }
    }
  }

  return closest;
}

function snapLayoutPosition({
  height,
  left,
  siblingLayouts,
  top,
  viewportHeight,
  viewportWidth,
  width,
}: {
  height: number;
  left: number;
  siblingLayouts: BoardLayout[];
  top: number;
  viewportHeight: number;
  viewportWidth: number;
  width: number;
}) {
  const horizontalTargets: SnapTarget[] = [
    { value: 0 },
    { value: viewportWidth / 2 },
    { value: viewportWidth },
  ];
  const verticalTargets: SnapTarget[] = [
    { value: 0 },
    { value: viewportHeight / 2 },
    { value: viewportHeight },
  ];

  for (const siblingLayout of siblingLayouts) {
    const siblingLeft = getViewportLeft(siblingLayout, viewportWidth);
    const siblingTop = getViewportTop(siblingLayout, viewportHeight);

    horizontalTargets.push(
      { value: siblingLeft },
      { value: siblingLeft + siblingLayout.width / 2 },
      { value: siblingLeft + siblingLayout.width },
    );
    verticalTargets.push(
      { value: siblingTop },
      { value: siblingTop + siblingLayout.height / 2 },
      { value: siblingTop + siblingLayout.height },
    );
  }

  const horizontalSnap = getClosestSnap({
    points: [left, left + width / 2, left + width],
    targets: horizontalTargets,
  });
  const verticalSnap = getClosestSnap({
    points: [top, top + height / 2, top + height],
    targets: verticalTargets,
  });

  return {
    left: left + (horizontalSnap?.delta ?? 0),
    top: top + (verticalSnap?.delta ?? 0),
    guide: {
      x: horizontalSnap?.guide,
      y: verticalSnap?.guide,
    } satisfies SnapGuide,
  };
}

export function BoardItem({
  item,
  items,
  componentTheme,
  viewportHeight,
  viewportWidth,
  isEditing,
  isSelected,
  today,
  onSelect,
  onMove,
  onResize,
  onStyleChange,
  onConfigure,
  onCloseTitleDesign,
  onRemove,
  onAddLink,
  onOpenTitleDesign,
  onNoteContentChange,
  onNoteChecklistChange,
  onInitialNoteEditStarted,
  startNoteInEditMode,
  isTitleDesignOpen,
}: BoardItemProps) {
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);
  const layout = item.layout;
  const anchorX = getLayoutAnchorX(layout);
  const anchorY = getLayoutAnchorY(layout);
  const viewportLeft = getViewportLeft(layout, viewportWidth);
  const viewportTop = getViewportTop(layout, viewportHeight);
  const itemStyle = {
    boxSizing: "border-box",
    left: viewportLeft,
    top: viewportTop,
    width: layout.width,
    height: layout.height,
  } satisfies CSSProperties;
  const itemFrameClass = `absolute box-border rounded-md ${
    isEditing
      ? isSelected
        ? "outline outline-1 outline-offset-2 outline-[#228be6]"
        : "outline outline-1 outline-offset-2 outline-transparent hover:outline-white/70"
      : ""
  }`;
  const visualStyle = getItemStyle(item, componentTheme);
  const itemLabel = item.type === "note" ? "nota" : item.title;
  const surfaceStyle = {
    backgroundColor: visualStyle.backgroundColor,
    backgroundImage: visualStyle.backgroundImage ?? "none",
    borderColor: visualStyle.borderColor,
    borderRadius: visualStyle.borderRadius,
    borderWidth: visualStyle.borderWidth,
    borderStyle: visualStyle.borderWidth === 0 ? "none" : "solid",
    color: visualStyle.textColor,
    boxSizing: "border-box",
    fontFamily: visualStyle.fontFamily,
    height: "100%",
    padding: visualStyle.padding,
    width: "100%",
  } satisfies CSSProperties;
  const surfaceClassName = `box-border h-full min-h-0 w-full transition-shadow ${
    item.type === "note" ? "overflow-visible" : "overflow-hidden"
  }`;

  function startMove(
    event: ReactPointerEvent<HTMLElement>,
    options: { delayed?: boolean } = {},
  ) {
    if (!isEditing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startLayout = { ...layout };
    const startLeft = getViewportLeft(startLayout, viewportWidth);
    const startTop = getViewportTop(startLayout, viewportHeight);
    let hasStarted = !options.delayed;
    const siblingLayouts = items
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => candidate.layout);

    function handleMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (!hasStarted && Math.hypot(deltaX, deltaY) < DRAG_START_THRESHOLD) {
        return;
      }

      hasStarted = true;

      const nextLeft = startLeft + deltaX;
      const nextTop = startTop + deltaY;
      const snappedPosition = snapLayoutPosition({
        height: startLayout.height,
        left: nextLeft,
        siblingLayouts,
        top: nextTop,
        viewportHeight,
        viewportWidth,
        width: startLayout.width,
      });

      setSnapGuide(snappedPosition.guide);

      onMove(
        item.id,
        clampLayout({
          ...startLayout,
          x: getAnchoredXFromLeft({
            anchorX,
            left: snappedPosition.left,
            viewportWidth,
            width: startLayout.width,
          }),
          y: getAnchoredYFromTop({
            anchorY,
            height: startLayout.height,
            top: snappedPosition.top,
            viewportHeight,
          }),
        }),
      );
    }

    function handleEnd() {
      setSnapGuide(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }

  function startResize(
    event: ReactPointerEvent<HTMLElement>,
    direction: ResizeDirection,
  ) {
    if (!isEditing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startLayout = { ...layout };
    const startLeft = getViewportLeft(startLayout, viewportWidth);
    const startTop = getViewportTop(startLayout, viewportHeight);

    function handleMove(moveEvent: PointerEvent) {
      onResize(
        item.id,
        resizeItemLayout({
          deltaX: moveEvent.clientX - startX,
          deltaY: moveEvent.clientY - startY,
          fromCenter: moveEvent.ctrlKey || moveEvent.metaKey,
          direction,
          item,
          keepAspectRatio: moveEvent.shiftKey,
          startLayout,
          startLeft,
          startTop,
          viewportHeight,
          viewportWidth,
        }),
      );
    }

    function handleEnd() {
      setSnapGuide(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }

  const resizeHandles = [
    { direction: "nw", label: "Cambiar tamaño desde arriba a la izquierda", cursor: "cursor-nwse-resize", height: 14, width: 14, left: viewportLeft - 7, top: viewportTop - 7 },
    { direction: "n", label: "Cambiar alto desde arriba", cursor: "cursor-ns-resize", height: 10, width: 28, left: viewportLeft + layout.width / 2 - 14, top: viewportTop - 5 },
    { direction: "ne", label: "Cambiar tamaño desde arriba a la derecha", cursor: "cursor-nesw-resize", height: 14, width: 14, left: viewportLeft + layout.width - 7, top: viewportTop - 7 },
    { direction: "e", label: "Cambiar ancho desde la derecha", cursor: "cursor-ew-resize", height: 28, width: 10, left: viewportLeft + layout.width - 5, top: viewportTop + layout.height / 2 - 14 },
    { direction: "se", label: "Cambiar tamaño desde abajo a la derecha", cursor: "cursor-nwse-resize", height: 14, width: 14, left: viewportLeft + layout.width - 7, top: viewportTop + layout.height - 7 },
    { direction: "s", label: "Cambiar alto desde abajo", cursor: "cursor-ns-resize", height: 10, width: 28, left: viewportLeft + layout.width / 2 - 14, top: viewportTop + layout.height - 5 },
    { direction: "sw", label: "Cambiar tamaño desde abajo a la izquierda", cursor: "cursor-nesw-resize", height: 14, width: 14, left: viewportLeft - 7, top: viewportTop + layout.height - 7 },
    { direction: "w", label: "Cambiar ancho desde la izquierda", cursor: "cursor-ew-resize", height: 28, width: 10, left: viewportLeft - 5, top: viewportTop + layout.height / 2 - 14 },
  ] satisfies Array<{
    direction: ResizeDirection;
    label: string;
    cursor: string;
    height: number;
    width: number;
    left: number;
    top: number;
  }>;

  function handleItemPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!isEditing) {
      return;
    }

    onSelect();
    startMove(event, { delayed: true });
  }

  const surface = (
    <div
      className={surfaceClassName}
      style={surfaceStyle}
      onPointerDown={handleItemPointerDown}
    >
      <div
        className={`box-border h-full min-h-0 w-full ${
          item.type === "note" ? "overflow-visible" : "overflow-hidden"
        }`}
      >
        <ItemContent
          item={item}
          isEditing={isEditing}
          today={today}
          componentTheme={componentTheme}
          onNoteContentChange={onNoteContentChange}
          onNoteChecklistChange={onNoteChecklistChange}
          onInitialNoteEditStarted={onInitialNoteEditStarted}
          noteFrameInset={visualStyle.padding + visualStyle.borderWidth}
          startNoteInEditMode={startNoteInEditMode}
        />
      </div>
    </div>
  );

  return (
    <>
      {item.type === "link" && !isEditing ? (
        <a
          href={item.url}
          target="_self"
          className="absolute box-border block overflow-hidden text-inherit no-underline"
          style={itemStyle}
        >
          {surface}
        </a>
      ) : (
        <div className={itemFrameClass} style={itemStyle}>
          {surface}
        </div>
      )}

      {isEditing && isSelected ? (
        <>
          {snapGuide?.x !== undefined ? (
            <div
              className="pointer-events-none absolute top-0 z-10 h-full w-px bg-[#228be6]/80"
              style={{ left: snapGuide.x }}
            />
          ) : null}

          {snapGuide?.y !== undefined ? (
            <div
              className="pointer-events-none absolute left-0 z-10 h-px w-full bg-[#228be6]/80"
              style={{ top: snapGuide.y }}
            />
          ) : null}

          <Group
            gap={4}
            wrap="nowrap"
            className="absolute z-10 rounded-md border border-[#d0d5dd] bg-white p-1 shadow-sm"
            style={{
              left: viewportLeft,
              top: Math.max(0, viewportTop - 42),
            }}
          >
            <Tooltip label="Mover">
              <ActionIcon
                variant="default"
                color="gray"
                aria-label={`Mover ${itemLabel}`}
                className="cursor-move"
                onPointerDown={startMove}
              >
                <ArrowsOutCardinalIcon size={18} />
              </ActionIcon>
            </Tooltip>

            {item.type === "title" ? (
              <Suspense fallback={null}>
                <TitleDesignWindow
                  item={item}
                  opened={isTitleDesignOpen}
                  onOpen={onOpenTitleDesign}
                  onClose={onCloseTitleDesign}
                  onStyleChange={(style) => onStyleChange(item.id, style)}
                />
              </Suspense>
            ) : null}

            <Tooltip label="Configurar">
              <ActionIcon
                variant="default"
                color="gray"
                aria-label={`Configurar ${itemLabel}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onConfigure}
              >
                <PencilSimpleIcon size={18} />
              </ActionIcon>
            </Tooltip>

            {item.type === "group" ? (
              <Tooltip label="Agregar link">
                <ActionIcon
                  variant="default"
                  color="gray"
                  aria-label={`Agregar link a ${item.title}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={onAddLink}
                >
                  <PlusIcon size={18} />
                </ActionIcon>
              </Tooltip>
            ) : null}

            <Tooltip label="Eliminar">
              <ActionIcon
                variant="default"
                color="red"
                aria-label={`Eliminar ${itemLabel}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onRemove}
              >
                <TrashIcon size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {resizeHandles.map((handle) => (
            <button
              key={handle.direction}
              type="button"
              className={`absolute z-10 rounded-full border border-[#98a2b3] bg-white shadow-sm transition-colors hover:border-[#228be6] hover:bg-[#e7f5ff] ${handle.cursor}`}
              style={{
                height: handle.height,
                left: handle.left,
                top: handle.top,
                width: handle.width,
              }}
              aria-label={`${handle.label} de ${itemLabel}`}
              onPointerDown={(event) => startResize(event, handle.direction)}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
