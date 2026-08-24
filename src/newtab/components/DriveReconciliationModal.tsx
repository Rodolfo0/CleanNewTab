import { Button, Group, Modal, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  ArrowsMergeIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  LinkIcon,
} from "@phosphor-icons/react";

export type DriveReconciliationChoice =
  | "merge"
  | "upload"
  | "download"
  | "connect-only";

type DriveReconciliationModalProps = {
  localBoards: number;
  opened: boolean;
  remoteBoards: number;
  onChoose: (choice: DriveReconciliationChoice) => void;
  onClose: () => void;
};

export function DriveReconciliationModal({
  localBoards,
  opened,
  remoteBoards,
  onChoose,
  onClose,
}: DriveReconciliationModalProps) {
  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      size="lg"
      title="¿Cómo quieres conectar tus tableros?"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Encontramos {localBoards} {localBoards === 1 ? "tablero local" : "tableros locales"} y {remoteBoards}{" "}
          {remoteBoards === 1 ? "tablero en Drive" : "tableros en Drive"}. Tu cuenta ya está conectada; elige qué hacer con los datos.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Button
            h="auto"
            py="md"
            leftSection={<ArrowsMergeIcon size={20} />}
            onClick={() => onChoose("merge")}
            variant="light"
          >
            <Stack gap={2} align="flex-start">
              <Text fw={600} size="sm">Fusionar tableros</Text>
              <Text fw={400} size="xs">Conserva los locales y añade los remotos que falten.</Text>
            </Stack>
          </Button>
          <Button
            h="auto"
            py="md"
            leftSection={<CloudArrowUpIcon size={20} />}
            onClick={() => onChoose("upload")}
            variant="light"
          >
            <Stack gap={2} align="flex-start">
              <Text fw={600} size="sm">Subir mi copia local</Text>
              <Text fw={400} size="xs">Reemplaza los tableros de Drive con los de este dispositivo.</Text>
            </Stack>
          </Button>
          <Button
            h="auto"
            py="md"
            leftSection={<CloudArrowDownIcon size={20} />}
            onClick={() => onChoose("download")}
            variant="light"
          >
            <Stack gap={2} align="flex-start">
              <Text fw={600} size="sm">Traer la copia de Drive</Text>
              <Text fw={400} size="xs">Reemplaza los tableros locales con los guardados.</Text>
            </Stack>
          </Button>
          <Button
            h="auto"
            py="md"
            leftSection={<LinkIcon size={20} />}
            onClick={() => onChoose("connect-only")}
            variant="subtle"
          >
            <Stack gap={2} align="flex-start">
              <Text fw={600} size="sm">Solo conectar</Text>
              <Text fw={400} size="xs">No sube ni trae datos; la sincronización queda pausada.</Text>
            </Stack>
          </Button>
        </SimpleGrid>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Decidir después</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
