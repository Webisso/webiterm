export type AppStatus = {
  appVersion: string;
  schemaVersion: number;
  databaseReady: boolean;
  storagePath: string;
};

export type LocalPreferences = {
  inspectorCollapsed: boolean;
};

export type CommandError = {
  code: string;
  message: string;
};

export type CommandItem = {
  id: string;
  title: string;
  shortcut?: string;
  keywords: string[];
};
