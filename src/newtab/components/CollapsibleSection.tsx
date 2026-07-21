import { Collapse, Text } from "@mantine/core";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

export function CollapsibleSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <div className="overflow-hidden rounded-md border border-[#eaecf0]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 bg-white px-2.5 py-2 text-left transition-colors hover:bg-[#f9fafb]"
        aria-expanded={opened}
        onClick={() => setOpened((value) => !value)}
      >
        <Text size="xs" fw={700} className="text-[#344054]">
          {title}
        </Text>
        <CaretDownIcon
          size={14}
          className={`shrink-0 text-[#667085] transition-transform ${
            opened ? "rotate-180" : ""
          }`}
        />
      </button>
      <Collapse expanded={opened}>
        <div className="border-t border-[#eaecf0] p-2">{children}</div>
      </Collapse>
    </div>
  );
}
