import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount } from "@tiptap/extensions";
import { TextSelection } from "@tiptap/pm/state";
import {
  ActionIcon,
  Popover,
  Stack,
  Switch,
  Tooltip,
} from "@mantine/core";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardItemStyle, NoteItem } from "../../model/boardItems";
import {
  NoteSearch,
  clearNoteSearch,
  findNoteMatches,
  setNoteSearch,
  type NoteSearchMatch,
} from "./noteSearch";
import { NoteSearchWindow } from "./NoteSearchWindow";
import { NoteToolbarWindow } from "./NoteToolbarWindow";
import { changeIndent } from "./noteEditorUtils";
import type { NoteAnchorRect } from "./noteFloatingWindow";

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
  startInEditMode = false,
}: {
  componentTheme: Partial<BoardItemStyle>;
  item: NoteItem;
  onContentChange: (content: JSONContent) => void;
  onChecklistChange: (checklist: NonNullable<NoteItem["checklist"]>) => void;
  onInitialEditStarted?: () => void;
  editingAllowed?: boolean;
  startInEditMode?: boolean;
}) {
  const shouldStartEditing = editingAllowed && startInEditMode;
  const [editing, setEditing] = useState(shouldStartEditing);
  const [textCount, setTextCount] = useState({ characters: 0, words: 0 });
  const [taskProgress, setTaskProgress] = useState({ completed: 0, total: 0 });
  const [checklistOptionsOpened, setChecklistOptionsOpened] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAnchor, setSearchAnchor] = useState<NoteAnchorRect | null>(null);
  const [toolbarAnchor, setToolbarAnchor] = useState<NoteAnchorRect | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"find" | "replace">("find");
  const [searchMatches, setSearchMatches] = useState<NoteSearchMatch[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchQueryInputRef = useRef<HTMLInputElement>(null);
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

  function captureAnchor(): NoteAnchorRect | null {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect
      ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
      : null;
  }

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
      NoteSearch,
      TextStyle,
      FontSize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
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
        setToolbarAnchor(captureAnchor());
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

  function runSearch(query: string) {
    if (!editor) return;
    const matches = findNoteMatches(editor.state.doc, query);
    const currentIndex = matches.length > 0 ? 0 : -1;
    setSearchMatches(matches);
    setSearchIndex(currentIndex);
    setNoteSearch(editor, { query, matches, currentIndex });
  }

  function openSearch() {
    if (!editor) return;
    setSearchAnchor(captureAnchor());
    setSearchOpen(true);
    window.setTimeout(() => searchQueryInputRef.current?.focus(), 0);
    if (searchQuery) {
      runSearch(searchQuery);
    }
  }

  function closeSearch() {
    if (!editor) return;
    setSearchOpen(false);
    clearNoteSearch(editor);
  }

  function goToMatch(index: number) {
    if (!editor || !searchQuery) return;
    const matches = findNoteMatches(editor.state.doc, searchQuery);
    if (matches.length === 0) {
      setSearchMatches(matches);
      setSearchIndex(-1);
      setNoteSearch(editor, { query: searchQuery, matches, currentIndex: -1 });
      return;
    }
    const clamped = ((index % matches.length) + matches.length) % matches.length;
    setSearchMatches(matches);
    setSearchIndex(clamped);
    setNoteSearch(editor, { query: searchQuery, matches, currentIndex: clamped });
    const match = matches[clamped];
    const chain = editor.chain();
    if (editing) chain.focus();
    chain.setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
  }

  function nextMatch() {
    goToMatch(searchIndex + 1);
  }

  function prevMatch() {
    goToMatch(searchIndex - 1);
  }

  function replaceCurrent() {
    if (!editor || !searchQuery) return;
    const matches = findNoteMatches(editor.state.doc, searchQuery);
    if (matches.length === 0) return;
    const index = Math.min(Math.max(searchIndex, 0), matches.length - 1);
    const match = matches[index];
    const { from, to } = match;
    const tr = editor.state.tr;
    if (replaceQuery) {
      tr.replaceWith(from, to, editor.schema.text(replaceQuery, editor.state.doc.resolve(from).marks()));
    } else {
      tr.delete(from, to);
    }
    tr.setSelection(TextSelection.create(tr.doc, from + replaceQuery.length));
    editor.view.dispatch(tr);

    const nextMatches = findNoteMatches(editor.state.doc, searchQuery);
    const currentIndex = nextMatches.length > 0 ? Math.min(index, nextMatches.length - 1) : -1;
    setSearchMatches(nextMatches);
    setSearchIndex(currentIndex);
    setNoteSearch(editor, { query: searchQuery, matches: nextMatches, currentIndex });
  }

  function replaceAllMatches() {
    if (!editor || !searchQuery) return;
    const matches = findNoteMatches(editor.state.doc, searchQuery);
    if (matches.length === 0) return;
    if (
      !window.confirm(
        `¿Reemplazar ${matches.length} ${matches.length === 1 ? "coincidencia" : "coincidencias"}?`,
      )
    ) {
      return;
    }

    let tr = editor.state.tr;
    for (const match of [...matches].reverse()) {
      if (replaceQuery) {
        tr = tr.replaceWith(
          match.from,
          match.to,
          editor.schema.text(replaceQuery, editor.state.doc.resolve(match.from).marks()),
        );
      } else {
        tr = tr.delete(match.from, match.to);
      }
    }
    editor.view.dispatch(tr);

    const nextMatches = findNoteMatches(editor.state.doc, searchQuery);
    const currentIndex = nextMatches.length > 0 ? 0 : -1;
    setSearchMatches(nextMatches);
    setSearchIndex(currentIndex);
    setNoteSearch(editor, { query: searchQuery, matches: nextMatches, currentIndex });
  }

  function startEditing() {
    if (!editor || !editingAllowed) return;
    setToolbarAnchor(captureAnchor());
    setEditing(true);
    editor.setEditable(true);
    window.setTimeout(() => editor.commands.focus("end"), 0);
  }

  const stopEditing = useCallback(() => {
    if (!editor) return;
    flush();
    editor.setEditable(false);
    setEditing(false);
    setToolbarAnchor(null);
  }, [editor, flush]);

  useEffect(() => {
    if (!editing) return;

    function handlePointerDown(event: PointerEvent) {
      const container = containerRef.current;
      if (!container || event.composedPath().includes(container)) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-note-float-window]")) return;
      stopEditing();
    }

    function handleFocusIn(event: FocusEvent) {
      const container = containerRef.current;
      const target = event.target;
      if (!container || (target instanceof Node && container.contains(target))) return;
      if (target instanceof Element && target.closest("[data-note-float-window]")) return;
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
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && !event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          openSearch();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && editing) {
          event.preventDefault();
          event.stopPropagation();
          flush();
          return;
        }
        if (event.key === "Escape") {
          if (searchOpen) {
            event.preventDefault();
            closeSearch();
            return;
          }
          if (editing) {
            event.preventDefault();
            stopEditing();
          }
        }
      }}
      onPointerDown={editing ? (event) => event.stopPropagation() : undefined}
    >
      {editing && toolbarAnchor ? (
        <NoteToolbarWindow editor={editor} anchorRect={toolbarAnchor} />
      ) : null}

      {searchOpen ? (
        <NoteSearchWindow
          anchorRect={searchAnchor}
          inputRef={searchQueryInputRef}
          searchQuery={searchQuery}
          replaceQuery={replaceQuery}
          searchMode={searchMode}
          searchMatches={searchMatches}
          searchIndex={searchIndex}
          onQueryChange={(value) => {
            setSearchQuery(value);
            runSearch(value);
          }}
          onReplaceQueryChange={setReplaceQuery}
          onToggleMode={() => setSearchMode((current) => (current === "find" ? "replace" : "find"))}
          onPrev={prevMatch}
          onNext={nextMatch}
          onClose={closeSearch}
          onReplace={replaceCurrent}
          onReplaceAll={replaceAllMatches}
        />
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
            width={205}
            withinPortal={false}
            styles={{ dropdown: { padding: 8 } }}
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
              <Stack gap="xs">
                <Switch
                  size="xs"
                  checked={item.checklist?.hideCompleted ?? false}
                  label="Ocultar completadas"
                  onChange={(event) => changeChecklistOptions({
                    hideCompleted: event.currentTarget.checked,
                  })}
                />
                <Switch
                  size="xs"
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
        <Tooltip label="Buscar en la nota">
          <ActionIcon
            aria-label="Buscar en la nota"
            size="sm"
            variant="subtle"
            onClick={(event) => {
              event.stopPropagation();
              openSearch();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MagnifyingGlassIcon size={15} />
          </ActionIcon>
        </Tooltip>
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
