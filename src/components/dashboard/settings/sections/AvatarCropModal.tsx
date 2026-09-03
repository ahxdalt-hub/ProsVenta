"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

// ============================================================================
// AvatarCropModal - post-upload crop step for profile photos
// ============================================================================
// Shown after the user picks an image (before anything is uploaded). Presents
// the image with a circular crop guide and a square rule-of-thirds grid,
// supports drag-to-pan + wheel/slider zoom, and returns the cropped square
// region via canvas so the upload only happens once the user confirms.
// ============================================================================

interface AvatarCropModalProps {
  /** Object URL of the image to crop. */
  imageUrl: string;
  fileName: string;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}

const SIZE = 320; // crop area is square, SIZE x SIZE
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function AvatarCropModal({ imageUrl, fileName, onConfirm, onCancel }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cropping, setCropping] = useState(false);
  const [cropError, setCropError] = useState(false);

  const viewRef = useRef({ zoom: 1, x: 0, y: 0 });
  viewRef.current = { zoom, x: offset.x, y: offset.y };

  // Cover-fit scale for the source image at zoom 1.
  const getCover = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return 1;
    return Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;

    const { zoom: z, x, y } = viewRef.current;
    const scale = getCover() * z;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (SIZE - dw) / 2 + x;
    const dy = (SIZE - dh) / 2 + y;

    // Image clipped to the circle guide.
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    // Square rule-of-thirds grid behind the circle guide.
    const cell = SIZE / 3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.clip();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, SIZE);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(SIZE, i * cell);
      ctx.stroke();
    }
    // Square frame corner marks.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    const corner = 18;
    const marks: Array<[number, number, number, number]> = [
      [0, 0, 1, 1],
      [SIZE, 0, -1, 1],
      [0, SIZE, 1, -1],
      [SIZE, SIZE, -1, -1],
    ];
    for (const [cx, cy, hx, hy] of marks) {
      ctx.beginPath();
      ctx.moveTo(cx + hx * corner, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + hy * corner);
      ctx.stroke();
    }
    ctx.restore();

    // Circle guide border.
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [getCover]);


  // Single rAF loop while mounted keeps drawing simple and consistent.
  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Load image from the object URL.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => setLoadError(true);
    img.src = imageUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // Clamp pan so the image can't be dragged fully out of the frame.
  const clampOffset = useCallback((next: { x: number; y: number }, z: number) => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return { x: 0, y: 0 };
    const scale = getCover() * z;
    const maxX = Math.max(0, (img.naturalWidth * scale - SIZE) / 2);
    const maxY = Math.max(0, (img.naturalHeight * scale - SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, [getCover]);

  // Zoom, optionally keeping the canvas point under `focal` stationary.
  const applyZoom = useCallback(
    (nextZoom: number, focal?: { x: number; y: number }) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      const ratio = z / viewRef.current.zoom;
      const center = SIZE / 2;
      const fx = focal?.x ?? center;
      const fy = focal?.y ?? center;
      const next = {
        x: (fx - center) * (1 - ratio) + viewRef.current.x * ratio,
        y: (fy - center) * (1 - ratio) + viewRef.current.y * ratio,
      };
      setZoom(z);
      setOffset(clampOffset(next, z));
    },
    [clampOffset]
  );

  // Wheel zoom (non-passive so we can preventDefault page scroll).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      applyZoom(viewRef.current.zoom * (e.deltaY < 0 ? 1.1 : 0.9), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // Pointer drag-to-pan.
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset(
      clampOffset(
        { x: drag.baseX + (e.clientX - drag.startX), y: drag.baseY + (e.clientY - drag.startY) },
        zoom
      )
    );
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  // Produce the cropped square JPEG from the visible circle region.
  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || cropping) return;
    setCropping(true);
    setCropError(false);
    try {
      const { zoom: z, x, y } = viewRef.current;
      const scale = getCover() * z;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const sx = ((SIZE - dw) / 2 + x) / scale;
      const sy = ((SIZE - dh) / 2 + y) / scale;
      const size = SIZE / scale;

      const out = document.createElement("canvas");
      out.width = 512;
      out.height = 512;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);

      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("crop failed");
      onConfirm(
        new File([blob], fileName.replace(/\.[^.]+$/, "") + "-cropped.jpg", { type: "image/jpeg" })
      );
    } catch {
      setCropError(true);
    } finally {
      setCropping(false);
    }
  }

  // Escape closes the crop step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile photo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
      >
        <h2 className="text-base font-bold tracking-tight text-slate-900">Crop your photo</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Drag to reposition and scroll or use the slider to zoom. The photo is cropped to a circle.
        </p>

        <div className="mt-4 flex justify-center">
          <canvas
            ref={canvasRef}
            style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}
            className="cursor-grab touch-none rounded-xl active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        {loadError ? (
          <p role="alert" className="mt-3 text-center text-[13px] font-medium text-red-600">
            The image failed to load. Please try a different photo.
          </p>
        ) : (
          <label className="mt-4 flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
              disabled={!loaded}
            />
          </label>
        )}

        {cropError && (
          <p role="alert" className="mt-3 text-[13px] font-medium text-red-600">
            Something went wrong while cropping. Please try again.
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={cropping}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!loaded || cropping || loadError}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {cropping ? "Cropping…" : "Set as profile photo"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}


