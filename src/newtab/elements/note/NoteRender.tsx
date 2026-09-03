import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount } from "@tiptap/extensions";
import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Select,
  Stack,
  Switch,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  CheckSquareIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
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

const fontSizes = [
  { label: "XS", value: "12px" },
  { label: "SM", value: "14px" },
  { label: "MD", value: "16px" },
  { label: "LG", value: "20px" },
  { label: "XL", value: "24px" },
];

function changeIndent(editor: Editor, direction: -1 | 1) {
  if (editor.isActive("taskItem")) {
    return direction > 0
      ? editor.commands.sinkListItem("taskItem")
      : editor.commands.liftListItem("taskItem");
  }
  if (editor.isActive("listItem")) {
    return direction > 0
      ? editor.commands.sinkListItem("listItem")
      : editor.commands.liftListItem("listItem");
  }

  const type = editor.isActive("heading") ? "heading" : "paragraph";
  const current = Number(editor.getAttributes(type).indent ?? 0);
  const indent = Math.max(0, Math.min(4, current + direction));
  if (indent === current) return false;
  return editor.commands.updateAttributes(type, { indent });
}

function handleIndentShortcut(editor: Editor, direction: -1 | 1) {
  changeIndent(editor, direction);
  return true;
}

const Indent = Extension.create({
  name: "noteIndent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => Math.max(
            0,
            Math.min(4, Number(element.getAttribute("data-indent")) || 0),
          ),
          renderHTML: (attributes) =>
            attributes.indent ? { "data-indent": attributes.indent } : {},
        },
      },
    }];
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => handleIndentShortcut(this.editor, 1),
      "Shift-Tab": () => handleIndentShortcut(this.editor, -1),
    };
  },
});

const NoteLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      openInNewTab: {
        default: true,
        parseHTML: (element) => element.getAttribute("target") === "_blank",
        renderHTML: (attributes) => ({
          target: attributes.openInNewTab ? "_blank" : "_self",
        }),
      },
      card: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-link-card") === "true",
        renderHTML: (attributes) =>
          attributes.card ? { "data-link-card": "true" } : {},
      },
      domain: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-link-domain") ?? "",
        renderHTML: (attributes) =>
          attributes.domain ? { "data-link-domain": attributes.domain } : {},
      },
    };
  },
}).configure({
  autolink: true,
  defaultProtocol: "https",
  HTMLAttributes: { rel: "noopener noreferrer" },
  linkOnPaste: true,
  openOnClick: true,
  protocols: ["http", "https"],
});

function normalizeLinkUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`,
    );
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

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

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
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
        const resolvedNodePosition = nodePosition;

        let transaction = editor.state.tr.setNodeMarkup(resolvedNodePosition, undefined, {
          ...node.attrs,
          checked,
        });
        node.descendants((candidate, position) => {
          if (candidate.type.name === "taskItem") {
            transaction = transaction.setNodeMarkup(
              resolvedNodePosition + 1 + position,
              undefined,
              { ...candidate.attrs, checked },
            );
          }
        });
        editor.view.dispatch(transaction);
        return true;
      },
    }),
  };
}

export function NoteRender({
  componentTheme,
  item,
  onContentChange,
  onChecklistChange,
  onInitialEditStarted,
  editingAllowed = true,
  frameInset = 0,
  startInEditMode = false,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: NoteItem;
  onContentChange: (content: JSONContent) => void;
  onChecklistChange: (checklist: NonNullable<NoteItem["checklist"]>) => void;
  onInitialEditStarted?: () => void;
  editingAllowed?: boolean;
  frameInset?: number;
  startInEditMode?: boolean;
}) {
  const shouldStartEditing = editingAllowed && startInEditMode;
  const [editing, setEditing] = useState(shouldStartEditing);
  const [textCount, setTextCount] = useState({ characters: 0, words: 0 });
  const [taskProgress, setTaskProgress] = useState({ completed: 0, total: 0 });
  const [checklistOptionsOpened, setChecklistOptionsOpened] = useState(false);
  const [linkEditorOpened, setLinkEditorOpened] = useState(false);
  const [linkHref, setLinkHref] = useState("https://");
  const [linkText, setLinkText] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);
  const [linkCard, setLinkCard] = useState(false);
  const [linkCanBeRemoved, setLinkCanBeRemoved] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkRangeRef = useRef({ from: 0, to: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const pendingContentRef = useRef<JSONContent | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const checklistRef = useRef(item.checklist ?? {});
  const [checklistBridge] = useState(createReadOnlyChecklistBridge);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    checklistRef.current = item.checklist ?? {};
  }, [item.checklist]);

  function updateTaskProgress(currentEditor: Editor) {
    let completed = 0;
    let total = 0;
    currentEditor.state.doc.descendants((node) => {
      if (node.type.name === "taskItem") {
        total += 1;
        if (node.attrs.checked) completed += 1;
      }
    });
    setTaskProgress({ completed, total });
  }

  const editor = useEditor({
    immediatelyRender: false,
    editable: shouldStartEditing,
    content: item.content,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      NoteLink,
      TaskList,
      checklistBridge.extension,
      Indent,
      TextStyle,
      FontSize,
      CharacterCount.configure({
        textCounter: countCharacters,
        wordCounter: countWords,
      }),
    ],
    editorProps: {
      attributes: {
        class: "note-editor-content",
        "aria-label": "Contenido de la nota",
      },
      handleClick: (view, _position, event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
          return false;
        }
        const taskElement = target.closest('li[data-type="taskItem"]');
        if (!taskElement) return false;
        const nodePosition = view.posAtDOM(taskElement, 0) - 1;
        const node = view.state.doc.nodeAt(nodePosition);
        if (!node || node.type.name !== "taskItem") return false;
        const checked = !node.attrs.checked;
        let transaction = view.state.tr.setNodeMarkup(nodePosition, undefined, {
          ...node.attrs,
          checked,
        });
        node.descendants((candidate, position) => {
          if (candidate.type.name === "taskItem") {
            transaction = transaction.setNodeMarkup(
              nodePosition + 1 + position,
              undefined,
              { ...candidate.attrs, checked },
            );
          }
        });
        view.dispatch(transaction);
        return true;
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      checklistBridge.connect(currentEditor);
      setTextCount({
        characters: currentEditor.storage.characterCount.characters(),
        words: currentEditor.storage.characterCount.words(),
      });
      updateTaskProgress(currentEditor);
      if (shouldStartEditing) {
        window.setTimeout(() => currentEditor.commands.focus("end"), 0);
        onInitialEditStarted?.();
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextCount = currentEditor.storage.characterCount.characters();
      setTextCount({
        characters: nextCount,
        words: currentEditor.storage.characterCount.words(),
      });
      updateTaskProgress(currentEditor);
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
    onContentChangeRef.current(editor.getJSON());
    pendingContentRef.current = null;
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

  function openLinkEditor() {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").run();
    }

    const { from, to } = editor.state.selection;
    const attributes = editor.getAttributes("link") as {
      card?: boolean;
      href?: string;
      openInNewTab?: boolean;
    };
    linkRangeRef.current = { from, to };
    setLinkText(editor.state.doc.textBetween(from, to, " "));
    setLinkHref(attributes.href ?? "https://");
    setLinkOpenInNewTab(attributes.openInNewTab ?? true);
    setLinkCard(attributes.card ?? false);
    setLinkCanBeRemoved(editor.isActive("link") && from !== to);
    setLinkError(null);
    setLinkEditorOpened(true);
  }

  function applyLink() {
    if (!editor) return;
    const url = normalizeLinkUrl(linkHref);
    if (!url) {
      setLinkError("Escribe una dirección HTTP o HTTPS válida.");
      return;
    }

    const href = url.toString();
    const text = linkText.trim() || href;
    const { from, to } = linkRangeRef.current;
    const attributes = {
      card: linkCard,
      domain: url.hostname,
      href,
      openInNewTab: linkOpenInNewTab,
    };

    if (from === to) {
      editor.chain().focus().insertContent({
        type: "text",
        text,
        marks: [{ type: "link", attrs: attributes }],
      }).run();
    } else {
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .insertContent(text)
        .setTextSelection({ from, to: from + text.length })
        .setLink(attributes)
        .setTextSelection(from + text.length)
        .run();
    }

    setLinkEditorOpened(false);
  }

  function removeLink() {
    if (!editor) return;
    const { from, to } = linkRangeRef.current;
    if (from !== to) {
      editor.chain().focus().setTextSelection({ from, to }).unsetLink().run();
    }
    setLinkEditorOpened(false);
  }

  function changeChecklistOptions(
    patch: Partial<NonNullable<NoteItem["checklist"]>>,
  ) {
    const checklist = { ...checklistRef.current, ...patch };
    checklistRef.current = checklist;
    onChecklistChange(checklist);
  }

  if (!editor) return null;

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full min-h-0 flex-col ${
        item.checklist?.hideCompleted ? "note-hide-completed" : ""
      } ${item.checklist?.moveCompletedToEnd ? "note-move-completed" : ""}`}
      style={{ fontFamily: componentTheme.fontFamily, color: componentTheme.textColor }}
      onDoubleClick={(event) => {
        if (!editingAllowed) return;
        const target = event.target as HTMLElement;
        if (!target.closest("a,button,input,[role='combobox'],[data-note-footer]")) startEditing();
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
          <Tooltip label="Reducir sangría">
            <ActionIcon
              aria-label="Reducir sangría"
              size="sm"
              variant="default"
              onClick={() => changeIndent(editor, -1)}
            >
              <ArrowLeftIcon size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Aumentar sangría">
            <ActionIcon
              aria-label="Aumentar sangría"
              size="sm"
              variant="default"
              onClick={() => changeIndent(editor, 1)}
            >
              <ArrowRightIcon size={15} />
            </ActionIcon>
          </Tooltip>
          <Popover
            opened={linkEditorOpened}
            onChange={setLinkEditorOpened}
            position="bottom"
            shadow="md"
            width={300}
            withinPortal={false}
          >
            <Popover.Target>
              <Tooltip label="Editar enlace">
                <ActionIcon
                  aria-label="Editar enlace"
                  size="sm"
                  variant={editor.isActive("link") ? "filled" : "default"}
                  onClick={openLinkEditor}
                >
                  <LinkIcon size={15} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown data-note-actions>
              <Stack gap="xs">
                <TextInput
                  label="Texto"
                  value={linkText}
                  onChange={(event) => setLinkText(event.currentTarget.value)}
                />
                <TextInput
                  autoFocus
                  error={linkError}
                  label="Dirección"
                  placeholder="https://ejemplo.com"
                  value={linkHref}
                  onChange={(event) => {
                    setLinkHref(event.currentTarget.value);
                    setLinkError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                />
                <Switch
                  checked={linkOpenInNewTab}
                  label="Abrir en una pestaña nueva"
                  onChange={(event) => setLinkOpenInNewTab(event.currentTarget.checked)}
                />
                <Switch
                  checked={linkCard}
                  label="Mostrar como tarjeta"
                  onChange={(event) => setLinkCard(event.currentTarget.checked)}
                />
                <Group justify="space-between" gap="xs">
                  <Button
                    color="red"
                    disabled={!linkCanBeRemoved}
                    size="xs"
                    variant="subtle"
                    onClick={removeLink}
                  >
                    Quitar enlace
                  </Button>
                  <Button size="xs" onClick={applyLink}>Guardar</Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      ) : null}

      <EditorContent editor={editor} className="min-h-0 flex-1 overflow-y-auto pr-1" />
      <footer
        data-note-footer
        className="mt-1 flex min-h-7 shrink-0 items-center gap-2 border-t border-current/15 pt-1"
      >
        {taskProgress.total > 0 ? (
          <Popover
            opened={checklistOptionsOpened}
            onChange={setChecklistOptionsOpened}
            position="top-start"
            shadow="md"
            width={240}
            withinPortal={false}
          >
            <Popover.Target>
              <button
                type="button"
                aria-label={`Checklist: ${taskProgress.completed} de ${taskProgress.total} completadas`}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold opacity-65 hover:bg-black/5 hover:opacity-100"
                onClick={() => setChecklistOptionsOpened((current) => !current)}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {taskProgress.completed} / {taskProgress.total}
              </button>
            </Popover.Target>
            <Popover.Dropdown data-note-actions>
              <Stack gap="sm">
                <Switch
                  checked={item.checklist?.hideCompleted ?? false}
                  label="Ocultar completadas"
                  onChange={(event) => changeChecklistOptions({
                    hideCompleted: event.currentTarget.checked,
                  })}
                />
                <Switch
                  checked={item.checklist?.moveCompletedToEnd ?? false}
                  label="Mover completadas al final"
                  onChange={(event) => changeChecklistOptions({
                    moveCompletedToEnd: event.currentTarget.checked,
                  })}
                />
              </Stack>
            </Popover.Dropdown>
          </Popover>
        ) : null}
        <div className="min-w-0 flex-1 truncate text-[10px] opacity-60" aria-live="polite">
          {textCount.characters} {textCount.characters === 1 ? "carácter" : "caracteres"}
          {" · "}
          {textCount.words} {textCount.words === 1 ? "palabra" : "palabras"}
        </div>
        {editingAllowed ? (
          <Tooltip label={editing ? "Terminar edición" : "Editar nota"}>
            <ActionIcon
              aria-label={editing ? "Terminar edición" : "Editar nota"}
              size="sm"
              variant="subtle"
              onClick={(event) => {
                event.stopPropagation();
                if (editing) stopEditing();
                else startEditing();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {editing ? <CheckIcon size={15} /> : <PencilSimpleIcon size={15} />}
            </ActionIcon>
          </Tooltip>
        ) : null}
      </footer>
    </div>
  );
}
