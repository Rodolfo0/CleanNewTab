import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount } from "@tiptap/extensions";
import { ActionIcon, Group, Select, Tooltip } from "@mantine/core";
import {
  CheckSquareIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  PencilSimpleIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardItemStyle, NoteItem } from "../../model/boardItems";

const NOTE_LIMIT = 2000;
const fontSizes = [
  { label: "XS", value: "12px" },
  { label: "SM", value: "14px" },
  { label: "MD", value: "16px" },
  { label: "LG", value: "20px" },
  { label: "XL", value: "24px" },
];

function countCharacters(text: string) {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (locale?: string, options?: { granularity: "grapheme" }) => {
      segment: (value: string) => Iterable<unknown>;
    };
  }).Segmenter;
  return Segmenter
    ? Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length
    : Array.from(text).length;
}

function createReadOnlyChecklistBridge() {
  let editor: Editor | null = null;

  return {
    connect(nextEditor: Editor) {
      editor = nextEditor;
    },
    extension: TaskItem.configure({
      nested: true,
      onReadOnlyChecked: (node, checked) => {
        if (!editor) return false;

        let nodePosition: number | undefined;
        editor.state.doc.descendants((candidate, position) => {
          if (candidate === node) {
            nodePosition = position;
            return false;
          }
          return true;
        });

        if (nodePosition === undefined) return false;

        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(nodePosition, undefined, {
            ...node.attrs,
            checked,
          }),
        );
        return true;
      },
    }),
  };
}

export function NoteRender({
  componentTheme,
  item,
  onContentChange,
  onInitialEditStarted,
  editingAllowed = true,
  frameInset = 0,
  startInEditMode = false,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: NoteItem;
  onContentChange: (content: JSONContent) => void;
  onInitialEditStarted?: () => void;
  editingAllowed?: boolean;
  frameInset?: number;
  startInEditMode?: boolean;
}) {
  const shouldStartEditing = editingAllowed && startInEditMode;
  const [editing, setEditing] = useState(shouldStartEditing);
  const [count, setCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const pendingContentRef = useRef<JSONContent | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const [checklistBridge] = useState(createReadOnlyChecklistBridge);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: shouldStartEditing,
    content: item.content,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      checklistBridge.extension,
      TextStyle,
      FontSize,
      CharacterCount.configure({
        limit: NOTE_LIMIT,
        autoTrim: false,
        textCounter: countCharacters,
      }),
    ],
    editorProps: {
      attributes: {
        class: "note-editor-content",
        "aria-label": "Contenido de la nota",
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      checklistBridge.connect(currentEditor);
      setCount(currentEditor.storage.characterCount.characters());
      if (shouldStartEditing) {
        window.setTimeout(() => currentEditor.commands.focus("end"), 0);
        onInitialEditStarted?.();
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextCount = currentEditor.storage.characterCount.characters();
      setCount(nextCount);
      if (nextCount > NOTE_LIMIT) return;
      pendingContentRef.current = currentEditor.getJSON();
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        if (pendingContentRef.current) onContentChangeRef.current(pendingContentRef.current);
        pendingContentRef.current = null;
        saveTimerRef.current = null;
      }, 500);
    },
  });

  useEffect(() => {
    if (!editor || editing) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(item.content)) {
      editor.commands.setContent(item.content, { emitUpdate: false });
    }
  }, [editing, editor, item.content]);

  useEffect(() => () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    if (pendingContentRef.current) onContentChangeRef.current(pendingContentRef.current);
  }, []);

  const flush = useCallback(() => {
    if (!editor) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (editor.storage.characterCount.characters() <= NOTE_LIMIT) {
      onContentChangeRef.current(editor.getJSON());
      pendingContentRef.current = null;
    }
  }, [editor]);

  function startEditing() {
    if (!editor || !editingAllowed) return;
    setEditing(true);
    editor.setEditable(true);
    window.setTimeout(() => editor.commands.focus("end"), 0);
  }

  const stopEditing = useCallback(() => {
    if (!editor) return;
    flush();
    editor.setEditable(false);
    setEditing(false);
  }, [editor, flush]);

  useEffect(() => {
    if (!editing) return;

    function handlePointerDown(event: PointerEvent) {
      const container = containerRef.current;
      if (!container || event.composedPath().includes(container)) return;
      stopEditing();
    }

    function handleFocusIn(event: FocusEvent) {
      const container = containerRef.current;
      const target = event.target;
      if (!container || (target instanceof Node && container.contains(target))) return;
      stopEditing();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    window.addEventListener("blur", stopEditing);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      window.removeEventListener("blur", stopEditing);
    };
  }, [editing, stopEditing]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("URL del enlace", previous ?? "https://");
    if (href === null) return;
    if (!/^https?:\/\//i.test(href)) {
      window.alert("Usa una URL que empiece con http:// o https://.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  if (!editor) return null;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col"
      style={{ fontFamily: componentTheme.fontFamily, color: componentTheme.textColor }}
      onDoubleClick={(event) => {
        if (!editingAllowed) return;
        const target = event.target as HTMLElement;
        if (!target.closest("a,button,input,[role='combobox']")) startEditing();
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && editing) {
          event.preventDefault();
          event.stopPropagation();
          flush();
          return;
        }
        if (event.key === "Escape" && editing) {
          event.preventDefault();
          stopEditing();
        }
      }}
      onPointerDown={editing ? (event) => event.stopPropagation() : undefined}
    >
      {editing ? (
        <Group
          gap={4}
          wrap="nowrap"
          className="absolute bottom-[calc(100%+12px)] z-30 w-max max-w-[calc(100vw-24px)] rounded-md border border-[#d0d5dd] bg-white p-1 shadow-md"
          data-note-actions
          style={{ left: -frameInset }}
        >
          <Select
            aria-label="Tamaño de texto"
            comboboxProps={{ withinPortal: false }}
            size="xs"
            w={64}
            defaultValue="16px"
            data={fontSizes}
            onChange={(value) => value && editor.chain().focus().setFontSize(value).run()}
          />
          {[
            { label: "Negrita", active: "bold", icon: TextBIcon, action: () => editor.chain().focus().toggleBold().run() },
            { label: "Cursiva", active: "italic", icon: TextItalicIcon, action: () => editor.chain().focus().toggleItalic().run() },
            { label: "Subrayado", active: "underline", icon: TextUnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run() },
            { label: "Tachado", active: "strike", icon: TextStrikethroughIcon, action: () => editor.chain().focus().toggleStrike().run() },
            { label: "Lista", active: "bulletList", icon: ListBulletsIcon, action: () => editor.chain().focus().toggleBulletList().run() },
            { label: "Lista numerada", active: "orderedList", icon: ListNumbersIcon, action: () => editor.chain().focus().toggleOrderedList().run() },
            { label: "Checklist", active: "taskList", icon: CheckSquareIcon, action: () => editor.chain().focus().toggleTaskList().run() },
          ].map(({ action, active, icon: Icon, label }) => (
            <Tooltip key={label} label={label}>
              <ActionIcon aria-label={label} size="sm" variant={editor.isActive(active) ? "filled" : "default"} onClick={action}>
                <Icon size={15} />
              </ActionIcon>
            </Tooltip>
          ))}
          <Tooltip label="Enlace">
            <ActionIcon aria-label="Enlace" size="sm" variant={editor.isActive("link") ? "filled" : "default"} onClick={setLink}>
              <LinkIcon size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Terminar edición">
            <ActionIcon aria-label="Terminar edición" size="sm" variant="default" onClick={stopEditing}>
              <XIcon size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : editingAllowed ? (
        <Tooltip label="Editar nota">
          <ActionIcon
            aria-label="Editar nota"
            className="absolute bottom-0 right-0 z-10 opacity-70 hover:opacity-100"
            size="sm"
            variant="subtle"
            onClick={(event) => { event.stopPropagation(); startEditing(); }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <PencilSimpleIcon size={15} />
          </ActionIcon>
        </Tooltip>
      ) : null}

      <EditorContent editor={editor} className="min-h-0 flex-1 overflow-y-auto pr-1" />
      {editing ? (
        <div className={`shrink-0 text-right text-[10px] ${count > NOTE_LIMIT ? "text-red-600" : "opacity-60"}`} aria-live={count >= NOTE_LIMIT ? "polite" : "off"}>
          {count} / {NOTE_LIMIT}
        </div>
      ) : null}
    </div>
  );
}
