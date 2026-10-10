import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/context/useAuth";

interface ComposerCardProps {
  onOpenReportModal: (type?: "lost" | "found") => void;
}

export const ComposerCard: React.FC<ComposerCardProps> = ({
  onOpenReportModal,
}) => {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(" ")[0] : "Vaughn";

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
      <div className="flex items-center gap-3.5">
        {/* User Avatar Circle */}
        <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200/80 overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src="/images/avatars/vaughn_evangelista.svg"
            alt={firstName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/images/avatars/vaughn_evangelista.svg";
            }}
          />
        </div>

        {/* Input Trigger */}
        <button
          onClick={() => onOpenReportModal()}
          className="flex-1 text-left py-2 text-neutral-400 text-sm font-normal cursor-pointer hover:text-neutral-500 transition-colors"
        >
          What did you lose or find, {firstName}?
        </button>

        {/* Photo Upload Icon Button */}
        <button
          onClick={() => onOpenReportModal()}
          title="Upload item photo"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
        >
          <ImageIcon className="w-5 h-5 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
};
