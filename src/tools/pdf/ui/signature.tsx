import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface SignatureImage {
  png: Uint8Array;
  /** width / height */
  aspect: number;
  /** For the on-page preview. Revoked by the owner. */
  url: string;
}

const INK = "#1e293b";

/** Crop a canvas to its drawn pixels, with padding, as PNG bytes. */
async function cropToInk(canvas: HTMLCanvasElement): Promise<SignatureImage | null> {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return null;
  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  const w = Math.min(width, maxX + pad) - minX;
  const h = Math.min(height, maxY + pad) - minY;
  const out = Object.assign(document.createElement("canvas"), { width: w, height: h });
  out.getContext("2d")!.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
  if (!blob) return null;
  return { png: new Uint8Array(await blob.arrayBuffer()), aspect: w / h, url: URL.createObjectURL(blob) };
}

function DrawPad({ onChange }: { onChange: (s: SignatureImage | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  return (
    <div className="grid gap-2">
      <canvas
        ref={ref}
        width={900}
        height={300}
        aria-label="Signature drawing area. Draw with a mouse, finger or pen. Keyboard users can use the Type tab."
        role="img"
        className="w-full max-w-xl touch-none rounded-lg border border-input bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = pos(e);
          line(last.current, { x: last.current.x + 0.1, y: last.current.y });
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const p = pos(e);
          line(last.current, p);
          last.current = p;
        }}
        onPointerUp={() => {
          last.current = null;
          void cropToInk(ref.current!).then(onChange);
        }}
      />
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const c = ref.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            onChange(null);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function TypePad({ onChange }: { onChange: (s: SignatureImage | null) => void }) {
  const [name, setName] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      if (!name.trim()) return onChange(null);
      const c = Object.assign(document.createElement("canvas"), { width: 1200, height: 240 });
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = INK;
      ctx.font = "italic 600 120px 'Plus Jakarta Sans Variable', serif";
      ctx.textBaseline = "middle";
      ctx.fillText(name.trim(), 20, 120, 1160);
      void cropToInk(c).then(onChange);
    }, 200);
    return () => clearTimeout(t);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-2">
      <Label htmlFor="sig-name">Type your name</Label>
      <Input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className="sm:w-80" />
    </div>
  );
}

function ImagePad({ onChange }: { onChange: (s: SignatureImage | null) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="sig-image">Signature image (PNG or JPG, ideally on a transparent or white background)</Label>
      <input
        id="sig-image"
        type="file"
        accept=".png,.jpg,.jpeg"
        className="text-sm"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return onChange(null);
          try {
            const bmp = await createImageBitmap(f);
            const c = Object.assign(document.createElement("canvas"), { width: bmp.width, height: bmp.height });
            c.getContext("2d")!.drawImage(bmp, 0, 0);
            bmp.close();
            onChange(await cropToInk(c));
          } catch {
            onChange(null);
          }
        }}
      />
    </div>
  );
}

/** Draw, type or choose a signature image. Everything stays in memory on this device. */
export function SignatureInput({ onChange }: { onChange: (s: SignatureImage | null) => void }) {
  return (
    <Tabs defaultValue="draw" onValueChange={() => onChange(null)}>
      <TabsList>
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
        <TabsTrigger value="image">Image</TabsTrigger>
      </TabsList>
      <TabsContent value="draw">
        <DrawPad onChange={onChange} />
      </TabsContent>
      <TabsContent value="type">
        <TypePad onChange={onChange} />
      </TabsContent>
      <TabsContent value="image">
        <ImagePad onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}
