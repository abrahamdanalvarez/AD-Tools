import type { PDFPage } from "pdf-lib";

/**
 * Pages can carry a /Rotate value, so "bottom-left as the reader sees it" is
 * not always the origin of the page's coordinate system. These helpers work in
 * visual coordinates (points, origin at the visible bottom-left corner, using
 * the crop box) and convert to the page's own user space.
 */
export interface Visual {
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

export function visualOf(page: PDFPage): Visual {
  const box = page.getCropBox();
  const rotation = ((((page.getRotation().angle % 360) + 360) % 360) as Visual["rotation"]);
  const swap = rotation === 90 || rotation === 270;
  return { width: swap ? box.height : box.width, height: swap ? box.width : box.height, rotation };
}

/**
 * Map a visual point to user space. Anything drawn there with `rotate: rotation`
 * appears upright to the reader (pdf-lib rotates counter-clockwise; viewers
 * apply /Rotate clockwise, so the two cancel out).
 */
export function toUserSpace(page: PDFPage, vx: number, vy: number): { x: number; y: number; rotate: number } {
  const box = page.getCropBox();
  const { rotation } = visualOf(page);
  const w = box.width;
  const h = box.height;
  let x: number;
  let y: number;
  switch (rotation) {
    case 90:
      x = w - vy;
      y = vx;
      break;
    case 180:
      x = w - vx;
      y = h - vy;
      break;
    case 270:
      x = vy;
      y = h - vx;
      break;
    default:
      x = vx;
      y = vy;
  }
  return { x: box.x + x, y: box.y + y, rotate: rotation };
}

/** The point to draw from so a w×h box centred at (cx, cy) ends up rotated by `angle`° about its centre. */
export function originForCentre(cx: number, cy: number, w: number, h: number, angle: number) {
  const r = (angle * Math.PI) / 180;
  return {
    x: cx - (w / 2) * Math.cos(r) + (h / 2) * Math.sin(r),
    y: cy - (w / 2) * Math.sin(r) - (h / 2) * Math.cos(r),
  };
}
