import { useEffect, useRef, useState } from "react";
import type { AdminReport } from "@/components/admin/types";

export function useSelectedReport() {
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(
    null,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selectedReport && dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [selectedReport]);

  return { selectedReport, setSelectedReport, dialogRef };
}
