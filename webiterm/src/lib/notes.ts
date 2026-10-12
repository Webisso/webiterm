import { invoke } from "@tauri-apps/api/core";
import type { FolderNoteDetail, FolderNoteSummary } from "../types/notes";

export async function listFolderNotes(): Promise<FolderNoteSummary[]> {
  return invoke("list_folder_notes_cmd");
}

export async function getFolderNote(id: string): Promise<FolderNoteDetail> {
  return invoke("get_folder_note_cmd", { id });
}

export async function createFolderNote(groupId: string, title: string): Promise<FolderNoteDetail> {
  return invoke("create_folder_note_cmd", { input: { groupId, title } });
}

export async function updateFolderNote(
  id: string,
  title: string,
  body: string,
): Promise<FolderNoteDetail> {
  return invoke("update_folder_note_cmd", { id, update: { title, body } });
}

export async function renameFolderNote(id: string, name: string): Promise<FolderNoteSummary> {
  return invoke("rename_folder_note_cmd", { id, name });
}

export async function deleteFolderNote(id: string): Promise<void> {
  return invoke("delete_folder_note_cmd", { id });
}

export async function deleteFolderNotesForGroup(groupId: string): Promise<void> {
  return invoke("delete_folder_notes_for_group_cmd", { groupId });
}
