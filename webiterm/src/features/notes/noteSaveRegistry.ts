const savers = new Map<string, () => Promise<void>>();

export function registerNoteSaver(noteId: string, saver: () => Promise<void>) {
  savers.set(noteId, saver);
}

export function unregisterNoteSaver(noteId: string) {
  savers.delete(noteId);
}

export async function flushNoteSaver(noteId: string): Promise<void> {
  const saver = savers.get(noteId);
  if (!saver) {
    return;
  }
  await saver();
}
