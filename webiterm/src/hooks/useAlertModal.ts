import { useCallback, useState } from "react";
import type { AlertPayload } from "../components/AlertModal";

export type ShowAlertOptions = {
  title?: string;
  tone?: AlertPayload["tone"];
};

export function useAlertModal() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);

  const showAlert = useCallback((message: string, options?: ShowAlertOptions) => {
    setAlert({
      title: options?.title ?? "Notice",
      message,
      tone: options?.tone ?? "info",
    });
  }, []);

  const dismissAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return { alert, showAlert, dismissAlert };
}
