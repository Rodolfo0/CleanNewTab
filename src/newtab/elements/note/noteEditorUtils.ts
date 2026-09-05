import type { Editor } from "@tiptap/core";

export const fontSizes = [
  { label: "XS", value: "12px" },
  { label: "SM", value: "14px" },
  { label: "MD", value: "16px" },
  { label: "LG", value: "20px" },
  { label: "XL", value: "24px" },
];

export function changeIndent(editor: Editor, direction: -1 | 1) {
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

export function normalizeLinkUrl(value: string) {
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
