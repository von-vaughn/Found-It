import React, { useEffect } from "react";
import { FoundReportFlow } from "./FoundReportFlow";

interface FoundItemCameraModalProps {
  onClose: () => void;
}

export const FoundItemCameraModal: React.FC<FoundItemCameraModalProps> = ({
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-neutral-950/70 p-4">
      <button
        type="button"
        aria-label="Close found item flow"
        onClick={onClose}
        className="fixed inset-0 cursor-default"
      />
      <div className="relative z-10 my-6 w-full max-w-xl">
        <FoundReportFlow active onExit={onClose} />
      </div>
    </div>
  );
};
