export type TaskColumnKey = "planning" | "doing" | "on_test" | "done" | "cancelled";

export type TaskBoardSummary = {
  id: string;
  groupId: string;
  name: string;
};

export type BoardImage = {
  id: string;
  mime: string;
  dataBase64: string;
};

export type BoardComment = {
  id: string;
  body: string;
  createdAt: string;
  image: BoardImage | null;
};

export type BoardTask = {
  id: string;
  columnKey: TaskColumnKey;
  title: string;
  body: string;
  sortOrder: number;
  images: BoardImage[];
  comments: BoardComment[];
};

export type TaskBoardDetail = {
  board: TaskBoardSummary;
  tasks: BoardTask[];
};

export const TASK_COLUMNS: { key: TaskColumnKey; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "doing", label: "Doing" },
  { key: "on_test", label: "On test" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];
