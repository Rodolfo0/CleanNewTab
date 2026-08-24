import { Button, Stack, Text, Title } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";

type EmptyBoardProps = {
  isEditing: boolean;
  onAdd: () => void;
};

export function EmptyBoard({ isEditing, onAdd }: EmptyBoardProps) {
  return (
    <section className="rounded-md border border-dashed border-[#cfd4dc] bg-white px-6 py-14 text-center">
      <Stack align="center" gap="sm">
        <Title order={2} className="text-xl font-semibold text-[#1d2939]">
          Tu tablero está vacío
        </Title>
        <Text className="max-w-md text-[#667085]">
          Entra en modo edición para agregar links o grupos y organizarlos
          libremente.
        </Text>
        {isEditing ? (
          <Button
            color="dark"
            radius="md"
            leftSection={<PlusIcon size={18} />}
            onClick={onAdd}
          >
            Agregar elemento
          </Button>
        ) : null}
      </Stack>
    </section>
  );
}
