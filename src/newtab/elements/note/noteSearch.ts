import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type NoteSearchMatch = { from: number; to: number };

type NoteSearchPluginState = {
  query: string;
  matches: NoteSearchMatch[];
  currentIndex: number;
  decorations: DecorationSet;
};

export const noteSearchPluginKey = new PluginKey<NoteSearchPluginState>("note-search");

type TextSegment = { from: number; to: number; text: string };

function collectTextSegments(doc: ProseMirrorNode): TextSegment[] {
  const segments: TextSegment[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ from: pos + 1, to: pos + 1 + node.text.length, text: node.text });
    }
  });
  return segments;
}

export function findNoteMatches(doc: ProseMirrorNode, query: string): NoteSearchMatch[] {
  if (!query) return [];
  const needle = query.toLowerCase();
  const segments = collectTextSegments(doc);
  if (segments.length === 0) return [];

  let haystack = "";
  const positions: number[] = [];
  let previousTo: number | null = null;

  for (const segment of segments) {
    if (previousTo !== null && segment.from !== previousTo) {
      haystack += "\u0000";
      positions.push(-1);
    }
    for (let index = 0; index < segment.text.length; index += 1) {
      haystack += segment.text[index];
      positions.push(segment.from + index);
    }
    previousTo = segment.to;
  }

  const lowered = haystack.toLowerCase();
  const matches: NoteSearchMatch[] = [];
  let cursor = lowered.indexOf(needle);

  while (cursor !== -1) {
    const from = positions[cursor];
    const to = positions[cursor + needle.length - 1] + 1;
    if (from >= 0) {
      matches.push({ from, to });
    }
    cursor = lowered.indexOf(needle, cursor + needle.length);
  }

  return matches;
}

function buildSearchDecorations(
  doc: ProseMirrorNode,
  matches: NoteSearchMatch[],
  currentIndex: number,
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;
  const decorations = matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class: index === currentIndex ? "note-search-current" : "note-search-match",
    }),
  );
  return DecorationSet.create(doc, decorations);
}

export function setNoteSearch(
  editor: Editor,
  patch: { query: string; matches: NoteSearchMatch[]; currentIndex: number },
) {
  const decorations = buildSearchDecorations(editor.state.doc, patch.matches, patch.currentIndex);
  editor.view.dispatch(
    editor.state.tr.setMeta(noteSearchPluginKey, { ...patch, decorations }),
  );
}

export function clearNoteSearch(editor: Editor) {
  editor.view.dispatch(
    editor.state.tr.setMeta(noteSearchPluginKey, {
      query: "",
      matches: [],
      currentIndex: -1,
      decorations: DecorationSet.empty,
    }),
  );
}

export const NoteSearch = Extension.create({
  name: "noteSearch",
  addProseMirrorPlugins() {
    return [
      new Plugin<NoteSearchPluginState>({
        key: noteSearchPluginKey,
        state: {
          init: () => ({
            query: "",
            matches: [],
            currentIndex: -1,
            decorations: DecorationSet.empty,
          }),
          apply(tr, value) {
            const meta = tr.getMeta(noteSearchPluginKey) as NoteSearchPluginState | undefined;
            if (meta) return meta;
            return { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) };
          },
        },
        props: {
          decorations(state) {
            return noteSearchPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
