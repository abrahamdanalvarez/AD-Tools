import { FileUp } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { acceptAttribute, extensionOf } from "@/lib/files";
import { cn } from "@/lib/utils";

interface FilePickerProps {
  formats: string[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  /** Called with a user-facing message when files are rejected. */
  onReject?: (message: string) => void;
}

/**
 * Local file selection with drag and drop. Files are only read into memory by
 * the tool; nothing is uploaded. Wording says "Choose", never "Upload".
 */
export function FilePicker({ formats, multiple = false, onFiles, onReject }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);

  const accept = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const ok = formats.includes("*") ? files : files.filter((f) => formats.includes(extensionOf(f.name)));
    if (ok.length < files.length) {
      onReject?.(`Unsupported file type. Choose a ${formats.map((f) => f.toUpperCase()).join(", ")} file.`);
    }
    if (ok.length > 0) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center rounded-xl border-2 border-dashed border-input bg-surface px-6 py-10 text-center transition-colors",
        dragging && "border-primary bg-primary-soft",
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-text">
        <FileUp aria-hidden className="size-6" />
      </span>
      <p className="mt-4 font-semibold">Drop {multiple ? "files" : "a file"} here</p>
      <p id={hintId} className="mt-1 text-sm text-muted-foreground">
        or choose from your device. It stays on your device.
      </p>
      <Button className="mt-5" onClick={() => inputRef.current?.click()} aria-describedby={hintId}>
        Choose {multiple ? "files" : "file"}
      </Button>
      {/* Hidden from everyone: the button above is the single accessible control. */}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={acceptAttribute(formats)}
        multiple={multiple}
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
