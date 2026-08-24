import { useEffect, useRef, useState } from "react";

const CLOSE_DELAY_MS = 500;

export function useEdgeDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function open() {
    cancelClose();
    setIsOpen(true);
  }

  function closeAfterDelay() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }

  useEffect(() => cancelClose, []);

  return { closeAfterDelay, isOpen, open };
}
