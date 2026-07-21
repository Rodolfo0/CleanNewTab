import type { Board } from "./boardItemTypes";

export function copyBoard(board: Board): Board {
  return JSON.parse(JSON.stringify(board));
}
