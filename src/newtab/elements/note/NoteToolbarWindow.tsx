import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Paper,
  Portal,
  Popover,
  Select,
  Stack,
  Switch,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CheckSquareIcon,
  DotsSixVerticalIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { changeIndent, fontSizes, normalizeLinkUrl } from "./noteEditorUtils";
import { useNoteFloatingWindow, type NoteAnchorRect } from "./noteFloatingWindow";

type NoteToolbarWindowProps = {
  editor: Editor;
  anchorRect: NoteAnchorRect | null;
};

export function NoteToolbarWindow({ editor, anchorRect }: NoteToolbarWindowProps) {
  const [linkEditorOpened, setLinkEditorOpened] = useState(false);
  const [linkHref, setLinkHref] = useState("https://");
  const [linkText, setLinkText] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);
  const [linkCard, setLinkCard] = useState(false);
  const [linkCanBeRemoved, setLinkCanBeRemoved] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkRangeRef = useRef({ from: 0, to: 0 });

  const { ref, isDragging } = useNoteFloatingWindow(anchorRect, { prefer: "above" });

  function openLinkEditor() {
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
    const { from, to } = linkRangeRef.current;
    if (from !== to) {
      editor.chain().focus().setTextSelection({ from, to }).unsetLink().run();
    }
    setLinkEditorOpened(false);
  }

  function runIndent(direction: -1 | 1) {
    editor.commands.focus();
    changeIndent(editor, direction);
  }

  const alignmentOptions = [
    { label: "Izquierda", value: "left", icon: TextAlignLeftIcon },
    { label: "Centrada", value: "center", icon: TextAlignCenterIcon },
    { label: "Derecha", value: "right", icon: TextAlignRightIcon },
    { label: "Justificada", value: "justify", icon: TextAlignJustifyIcon },
  ] as const;
  const currentAlignment = alignmentOptions.find(({ value }) => editor.isActive({ textAlign: value }))
    ?? alignmentOptions[0];
  const CurrentAlignmentIcon = currentAlignment.icon;
  const listOptions = [
    {
      active: "bulletList",
      action: () => editor.chain().focus().toggleBulletList().run(),
      icon: ListBulletsIcon,
      label: "Lista",
    },
    {
      active: "orderedList",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      icon: ListNumbersIcon,
      label: "Lista numerada",
    },
    {
      active: "taskList",
      action: () => editor.chain().focus().toggleTaskList().run(),
      icon: CheckSquareIcon,
      label: "Checklist",
    },
  ] as const;
  const currentList = listOptions.find(({ active }) => editor.isActive(active));
  const CurrentListIcon = currentList?.icon ?? ListBulletsIcon;

  return (
    <Portal>
      <Paper
        ref={ref}
        data-note-float-window
        withBorder
        radius="md"
        shadow="lg"
        className="overflow-visible bg-white"
        style={{ position: "fixed", zIndex: 420 }}
      >
        <Group gap={0} wrap="nowrap" align="stretch">
          <div
            data-note-float-drag-handle
            aria-label="Arrastrar barra de edición"
            className={`flex w-7 shrink-0 items-center justify-center rounded-l-[7px] border-r border-[#eaecf0] bg-[#f9fafb] ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <DotsSixVerticalIcon size={16} className="text-[#98a2b3]" />
          </div>
          <Group gap={2} wrap="nowrap" className="p-1">
            <Select
              aria-label="Tamaño de texto"
              comboboxProps={{ withinPortal: false }}
              size="xs"
              w={64}
              defaultValue="16px"
              data={fontSizes}
              onChange={(value) => value && editor.chain().focus().setFontSize(value).run()}
            />
            <Menu
              position="bottom-start"
              shadow="md"
              width={132}
              withinPortal={false}
              styles={{ dropdown: { padding: 4 }, item: { padding: "4px 6px", fontSize: 12 } }}
            >
              <Menu.Target>
                <Tooltip label={`Alineación: ${currentAlignment.label.toLowerCase()}`}>
                  <ActionIcon
                    aria-label={`Alineación: ${currentAlignment.label.toLowerCase()}`}
                    size="sm"
                    variant="default"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <CurrentAlignmentIcon size={15} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {alignmentOptions.map(({ icon: Icon, label, value }) => (
                  <Menu.Item
                    key={value}
                    leftSection={<Icon size={15} />}
                    rightSection={currentAlignment.value === value ? <CheckIcon size={13} /> : null}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => editor.chain().focus().setTextAlign(value).run()}
                  >
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            {[
              { label: "Negrita", active: "bold", icon: TextBIcon, action: () => editor.chain().focus().toggleBold().run() },
              { label: "Cursiva", active: "italic", icon: TextItalicIcon, action: () => editor.chain().focus().toggleItalic().run() },
              { label: "Subrayado", active: "underline", icon: TextUnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run() },
              { label: "Tachado", active: "strike", icon: TextStrikethroughIcon, action: () => editor.chain().focus().toggleStrike().run() },
            ].map(({ action, active, icon: Icon, label }) => (
              <Tooltip key={label} label={label}>
                <ActionIcon aria-label={label} size="sm" variant={editor.isActive(active) ? "filled" : "default"} onClick={action}>
                  <Icon size={15} />
                </ActionIcon>
              </Tooltip>
            ))}
            <Menu
              position="bottom-start"
              shadow="md"
              width={156}
              withinPortal={false}
              styles={{ dropdown: { padding: 4 }, item: { padding: "4px 6px", fontSize: 12 } }}
            >
              <Menu.Target>
                <Tooltip label={currentList?.label ?? "Tipo de lista"}>
                  <ActionIcon
                    aria-label={currentList?.label ?? "Tipo de lista"}
                    size="sm"
                    variant={currentList ? "filled" : "default"}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <CurrentListIcon size={15} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {listOptions.map(({ action, active, icon: Icon, label }) => (
                  <Menu.Item
                    key={active}
                    leftSection={<Icon size={15} />}
                    rightSection={currentList?.active === active ? <CheckIcon size={13} /> : null}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={action}
                  >
                    {label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            <Tooltip label="Reducir sangría">
              <ActionIcon
                aria-label="Reducir sangría"
                size="sm"
                variant="default"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runIndent(-1)}
              >
                <ArrowLeftIcon size={15} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Aumentar sangría">
              <ActionIcon
                aria-label="Aumentar sangría"
                size="sm"
                variant="default"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runIndent(1)}
              >
                <ArrowRightIcon size={15} />
              </ActionIcon>
            </Tooltip>
            <Popover
              opened={linkEditorOpened}
              onChange={setLinkEditorOpened}
              position="bottom"
              shadow="md"
              width={260}
              withinPortal={false}
              styles={{ dropdown: { padding: 8 } }}
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
              <Popover.Dropdown>
                <Stack gap="xs">
                  <TextInput
                    size="xs"
                    label="Texto"
                    value={linkText}
                    onChange={(event) => setLinkText(event.currentTarget.value)}
                  />
                  <TextInput
                    autoFocus
                    size="xs"
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
                    size="xs"
                    checked={linkOpenInNewTab}
                    label="Abrir en una pestaña nueva"
                    onChange={(event) => setLinkOpenInNewTab(event.currentTarget.checked)}
                  />
                  <Switch
                    size="xs"
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
        </Group>
      </Paper>
    </Portal>
  );
}
