import { useFloatingWindow } from "@mantine/hooks";
import { useCallback, useLayoutEffect, useRef } from "react";

export type NoteAnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type NoteFloatingWindowOptions = {
  prefer?: "above" | "below";
};

export function useNoteFloatingWindow(
  anchorRect: NoteAnchorRect | null,
  options: NoteFloatingWindowOptions = {},
) {
  const prefer = options.prefer ?? "below";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const positionedRef = useRef(false);

  const { ref: floatingRef, setPosition, isDragging } = useFloatingWindow<HTMLDivElement>({
    constrainToViewport: true,
    constrainOffset: 12,
    dragHandleSelector: "[data-note-float-drag-handle]",
    excludeDragHandleSelector: "button,input,[data-no-drag]",
    initialPosition: anchorRect
      ? { left: anchorRect.left, top: anchorRect.bottom + 8 }
      : { right: 18, top: 72 },
  });

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      floatingRef(node);
    },
    [floatingRef],
  );

  useLayoutEffect(() => {
    if (positionedRef.current || !anchorRect || !rootRef.current) return;
    positionedRef.current = true;
    const rect = rootRef.current.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const fitsBelow = anchorRect.bottom + gap + rect.height <= window.innerHeight - margin;
    const fitsAbove = anchorRect.top - gap - rect.height >= margin;

    if (prefer === "above" && fitsAbove) {
      setPosition({ left: anchorRect.left, top: anchorRect.top - gap - rect.height });
    } else if (fitsBelow) {
      setPosition({ left: anchorRect.left, top: anchorRect.bottom + gap });
    } else if (fitsAbove) {
      setPosition({ left: anchorRect.left, top: anchorRect.top - gap - rect.height });
    }
  }, [anchorRect, setPosition, prefer]);

  return { ref, setPosition, isDragging };
}
