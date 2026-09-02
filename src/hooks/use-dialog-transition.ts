"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CLOSE_DURATION = 220;

export function useDialogTransition(onClose: () => void, active = true) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduceMotion) {
      onClose();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    timerRef.current = window.setTimeout(onClose, CLOSE_DURATION);
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  return { closing, requestClose };
}
