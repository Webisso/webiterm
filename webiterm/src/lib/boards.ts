import { invoke } from "@tauri-apps/api/core";
import type { TaskBoardDetail, TaskBoardSummary, TaskColumnKey } from "../types/boards";

export async function listTaskBoards(): Promise<TaskBoardSummary[]> {
  return invoke("list_task_boards_cmd");
}

export async function createTaskBoard(groupId: string, name: string): Promise<TaskBoardSummary> {
  return invoke("create_task_board_cmd", { input: { groupId, name } });
}

export async function renameTaskBoard(id: string, name: string): Promise<TaskBoardSummary> {
  return invoke("rename_task_board_cmd", { id, name });
}

export async function deleteTaskBoard(id: string): Promise<void> {
  return invoke("delete_task_board_cmd", { id });
}

export async function deleteTaskBoardsForGroup(groupId: string): Promise<void> {
  return invoke("delete_task_boards_for_group_cmd", { groupId });
}

export async function getTaskBoard(id: string): Promise<TaskBoardDetail> {
  return invoke("get_task_board_cmd", { id });
}

export async function createTask(
  boardId: string,
  title: string,
  columnKey: TaskColumnKey = "planning",
): Promise<TaskBoardDetail> {
  return invoke("create_task_cmd", { input: { boardId, title, columnKey } });
}

export async function updateTask(
  id: string,
  title: string,
  body: string,
): Promise<TaskBoardDetail> {
  return invoke("update_task_cmd", { id, update: { title, body } });
}

export async function moveTask(
  taskId: string,
  columnKey: TaskColumnKey,
  beforeId: string | null,
): Promise<TaskBoardDetail> {
  return invoke("move_task_cmd", { taskId, columnKey, beforeId });
}

export async function deleteTask(id: string): Promise<TaskBoardDetail> {
  return invoke("delete_task_cmd", { id });
}

export async function addTaskImage(
  taskId: string,
  mime: string,
  dataBase64: string,
): Promise<TaskBoardDetail> {
  return invoke("add_task_image_cmd", { input: { taskId, mime, dataBase64 } });
}

export async function deleteTaskImage(id: string): Promise<TaskBoardDetail> {
  return invoke("delete_task_image_cmd", { id });
}

export async function addTaskComment(
  taskId: string,
  body: string,
  image?: { mime: string; dataBase64: string },
): Promise<TaskBoardDetail> {
  return invoke("add_task_comment_cmd", {
    input: {
      taskId,
      body,
      imageMime: image?.mime ?? null,
      imageBase64: image?.dataBase64 ?? null,
    },
  });
}

export async function deleteTaskComment(id: string): Promise<TaskBoardDetail> {
  return invoke("delete_task_comment_cmd", { id });
}

export function readImageFile(file: File): Promise<{ mime: string; dataBase64: string }> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose an image file."));
  }
  if (file.size > 1_400_000) {
    return Promise.reject(new Error("Image must be under 1.4 MB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("Could not read image."));
        return;
      }
      resolve({ mime: file.type || "image/png", dataBase64: result.slice(comma + 1) });
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}
