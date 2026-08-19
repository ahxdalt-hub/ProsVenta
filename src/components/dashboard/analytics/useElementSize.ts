"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks the width of an element using ResizeObserver.
 * Used by chart components to render at the correct pixel dimensions
 * for crisp rendering and accurate hover detection.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    setWidth(element.offsetWidth);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}