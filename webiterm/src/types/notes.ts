export type FolderNoteSummary = {
  id: string;
  groupId: string;
  title: string;
  updatedAt: string;
};

export type FolderNoteDetail = {
  note: FolderNoteSummary;
  body: string;
};
