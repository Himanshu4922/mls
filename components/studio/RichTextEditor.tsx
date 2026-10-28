"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PromptDialog } from "@/components/ui/Dialogs";
import { useUploadStudioImage } from "@/lib/queries/studio";
import { cn } from "@/lib/utils/cn";

/**
 * A small rich-text editor over `contentEditable`.
 *
 * Why not CKEditor, which the Django model already uses? Two reasons. Its
 * uploader authenticates with a Django *session cookie* while the Studio uses a
 * JWT bearer token, so pasting an image would silently fail; and the bundled
 * CKEditor 4.22.1 has known unfixed security issues (Django's own system check
 * warns about it on every command). The stored format is still HTML, so posts
 * written in Django admin and posts written here are interchangeable.
 *
 * `document.execCommand` is formally deprecated but remains the only API every
 * browser implements for this, and the alternative is a full editor framework.
 * The output is sanitized on save (server) and on render (client), so its
 * quirks cannot become a security problem.
 */

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadError?: (message: string) => void;
}

type ToolbarAction =
  | { kind: "command"; command: string; value?: string; label: string; title: string }
  | { kind: "link"; label: string; title: string }
  | { kind: "image"; label: string; title: string }
  | { kind: "alt"; label: string; title: string }
  | { kind: "html"; label: string; title: string }
  | { kind: "htmlFile"; label: string; title: string };

const TOOLBAR: ToolbarAction[] = [
  { kind: "command", command: "bold", label: "B", title: "Bold (Ctrl+B)" },
  { kind: "command", command: "italic", label: "I", title: "Italic (Ctrl+I)" },
  { kind: "command", command: "formatBlock", value: "h2", label: "H2", title: "Heading 2" },
  { kind: "command", command: "formatBlock", value: "h3", label: "H3", title: "Heading 3" },
  { kind: "command", command: "formatBlock", value: "p", label: "¶", title: "Paragraph" },
  { kind: "command", command: "insertUnorderedList", label: "• List", title: "Bulleted list" },
  { kind: "command", command: "insertOrderedList", label: "1. List", title: "Numbered list" },
  { kind: "command", command: "formatBlock", value: "blockquote", label: "❝", title: "Quote" },
  { kind: "link", label: "Link", title: "Insert link" },
  { kind: "image", label: "Image", title: "Insert image" },
  { kind: "alt", label: "Alt", title: "Edit image alt text" },
  { kind: "html", label: "HTML", title: "Edit HTML source" },
  { kind: "htmlFile", label: "Upload HTML", title: "Import an .html file" },
];

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function findImageInSelection(editor: HTMLDivElement | null): HTMLImageElement | null {
  if (!editor) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const node = selection.anchorNode;
  if (!node) return null;
  if (node instanceof HTMLImageElement && editor.contains(node)) return node;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const img = element?.closest?.("img");
  return img instanceof HTMLImageElement && editor.contains(img) ? img : null;
}

export function RichTextEditor({ value, onChange, onUploadError }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const htmlFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageUrl = useRef<string | null>(null);
  const altTargetRef = useRef<HTMLImageElement | null>(null);
  const { mutateAsync: uploadImage, isPending: uploading } = useUploadStudioImage();
  // Remembers where the caret was before focus moved to a toolbar button or the
  // file picker, so an insert lands where the author was typing.
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [altInitial, setAltInitial] = useState("");
  /** Whether the alt dialog is finishing a new insert or editing an existing img. */
  const [altInserting, setAltInserting] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value || "");

  // Sync external value in ONLY when it differs from what the DOM already holds.
  // Writing on every render would reset the caret to the start on each keypress.
  useEffect(() => {
    if (sourceMode) {
      setSourceHtml(value || "");
      return;
    }
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value, sourceMode]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedRange.current;
    if (!range) {
      editorRef.current?.focus();
      return;
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editorRef.current?.focus();
  }, []);

  const emit = useCallback(() => {
    if (sourceMode) {
      onChange(sourceHtml);
      return;
    }
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange, sourceHtml, sourceMode]);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (sourceMode) return;
      restoreSelection();
      document.execCommand(command, false, commandValue);
      emit();
    },
    [emit, restoreSelection, sourceMode],
  );

  // The caret was saved on the toolbar's mousedown, so it survives the dialog
  // taking focus; `runCommand` restores it before inserting.
  const insertLink = useCallback(
    (url: string) => {
      const href = /^https?:\/\//i.test(url) || url.startsWith("/") || url.startsWith("mailto:")
        ? url
        : `https://${url}`;
      setLinkOpen(false);
      runCommand("createLink", href);
    },
    [runCommand],
  );

  const insertImageWithAlt = useCallback(
    (url: string, alt: string) => {
      restoreSelection();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" />`,
      );
      emit();
    },
    [emit, restoreSelection],
  );

  const handleImage = useCallback(
    async (file: File) => {
      try {
        const data = await uploadImage(file);
        pendingImageUrl.current = data.url;
        setAltInitial("");
        altTargetRef.current = null;
        setAltInserting(true);
        setAltOpen(true);
      } catch (error) {
        onUploadError?.(
          error instanceof Error ? error.message : "Could not upload that image.",
        );
      }
    },
    [onUploadError, uploadImage],
  );

  const applyAlt = useCallback(
    (alt: string) => {
      setAltOpen(false);
      setAltInserting(false);
      const pendingUrl = pendingImageUrl.current;
      if (pendingUrl) {
        pendingImageUrl.current = null;
        insertImageWithAlt(pendingUrl, alt);
        return;
      }
      const img = altTargetRef.current;
      altTargetRef.current = null;
      if (img && editorRef.current?.contains(img)) {
        img.alt = alt;
        emit();
      }
    },
    [emit, insertImageWithAlt],
  );

  const openAltEditor = useCallback(() => {
    if (sourceMode) return;
    const img = findImageInSelection(editorRef.current);
    if (!img) {
      onUploadError?.("Select an image in the post first, then click Alt.");
      return;
    }
    pendingImageUrl.current = null;
    altTargetRef.current = img;
    setAltInserting(false);
    setAltInitial(img.getAttribute("alt") ?? "");
    setAltOpen(true);
  }, [onUploadError, sourceMode]);

  const toggleSourceMode = useCallback(() => {
    if (sourceMode) {
      // Leaving source mode: push textarea into the visual editor.
      onChange(sourceHtml);
      setSourceMode(false);
      return;
    }
    const html = editorRef.current?.innerHTML ?? value ?? "";
    setSourceHtml(html);
    onChange(html);
    setSourceMode(true);
  }, [onChange, sourceHtml, sourceMode, value]);

  const handleHtmlFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        if (sourceMode) {
          setSourceHtml(text);
          onChange(text);
        } else if (editorRef.current) {
          editorRef.current.innerHTML = text;
          onChange(text);
        } else {
          onChange(text);
        }
      } catch {
        onUploadError?.("Could not read that HTML file.");
      }
    },
    [onChange, onUploadError, sourceMode],
  );

  return (
    <div className="rounded-surface border border-line bg-surface">
      <div
        role="toolbar"
        aria-label="Formatting"
        // Sticks under the editor's action bar (lg:h-14) while writing long posts.
        className="z-10 flex flex-wrap items-center gap-1 rounded-t-surface border-b border-line bg-surface px-2 py-1.5 lg:sticky lg:top-14"
      >
        {TOOLBAR.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.title}
            // Keeps focus (and the caret) in the editor when the button is hit.
            onMouseDown={(event) => {
              event.preventDefault();
              if (!sourceMode) saveSelection();
            }}
            onClick={() => {
              if (action.kind === "command") runCommand(action.command, action.value);
              else if (action.kind === "link") setLinkOpen(true);
              else if (action.kind === "image") fileInputRef.current?.click();
              else if (action.kind === "alt") openAltEditor();
              else if (action.kind === "html") toggleSourceMode();
              else htmlFileInputRef.current?.click();
            }}
            disabled={
              (action.kind === "image" && uploading) ||
              (sourceMode && (action.kind === "command" || action.kind === "link" || action.kind === "image" || action.kind === "alt"))
            }
            aria-pressed={action.kind === "html" ? sourceMode : undefined}
            className={cn(
              "rounded px-2 py-1 text-caption font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink disabled:opacity-50",
              action.kind === "html" && sourceMode && "bg-surface-alt text-ink",
            )}
          >
            {action.kind === "image" && uploading ? "Uploading…" : action.label}
          </button>
        ))}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImage(file);
            // Reset so picking the same file twice still fires a change.
            event.target.value = "";
          }}
        />
        <input
          ref={htmlFileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleHtmlFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={(event) => {
            setSourceHtml(event.target.value);
            onChange(event.target.value);
          }}
          aria-label="Post HTML source"
          spellCheck={false}
          className="min-h-[calc(100dvh-22rem)] w-full resize-y bg-surface-alt px-5 py-5 font-mono text-small text-ink focus:outline-none sm:px-8 sm:py-6"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Post body"
          onInput={emit}
          onBlur={() => {
            saveSelection();
            emit();
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onDoubleClick={(event) => {
            const target = event.target;
            if (target instanceof HTMLImageElement && editorRef.current?.contains(target)) {
              event.preventDefault();
              pendingImageUrl.current = null;
              altTargetRef.current = target;
              setAltInserting(false);
              setAltInitial(target.getAttribute("alt") ?? "");
              setAltOpen(true);
            }
          }}
          onPaste={(event) => {
            // Paste as PLAIN TEXT. Pasting from Word or a web page otherwise drags
            // in font tags, inline styles and class names that fight the site's
            // own typography — and that the sanitizer would strip anyway.
            // Authors who need raw markup use HTML source mode or Upload HTML.
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
            emit();
          }}
          className={cn(
            "prose-article min-h-[calc(100dvh-22rem)] px-5 py-5 focus:outline-none sm:px-8 sm:py-6",
            "[&:empty]:before:text-ink-subtle [&:empty]:before:content-['Start_writing…']",
          )}
        />
      )}

      <PromptDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={insertLink}
        title="Insert link"
        description="Select text first to turn it into a link."
        label="Link URL"
        placeholder="https://…"
        submitLabel="Insert link"
        // Block script-bearing schemes at entry; the sanitizers would strip
        // them later, but failing here tells the author immediately.
        validate={(url) =>
          /^(javascript|vbscript|data):/i.test(url.replace(/[\u0000- ]/g, ""))
            ? "That link type isn't allowed."
            : null
        }
      />

      <PromptDialog
        open={altOpen}
        onClose={() => {
          // Cancelling a brand-new upload still inserts the image with empty alt
          // so the author does not lose the upload; they can edit Alt afterward.
          if (pendingImageUrl.current) {
            const url = pendingImageUrl.current;
            pendingImageUrl.current = null;
            insertImageWithAlt(url, "");
          }
          altTargetRef.current = null;
          setAltInserting(false);
          setAltOpen(false);
        }}
        onSubmit={applyAlt}
        title="Image alt text"
        description="Describe the image for search engines and screen readers. Leave blank only if it is decorative."
        label="Alt text"
        placeholder="e.g. Toronto skyline at dusk"
        initialValue={altInitial}
        submitLabel={altInserting ? "Insert image" : "Save alt text"}
        allowEmpty
      />
    </div>
  );
}
