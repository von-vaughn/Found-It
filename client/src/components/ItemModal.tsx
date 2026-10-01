import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MapPin,
  Clock,
  Award,
  User,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Item } from "@/data/mockItems";
import toast from "react-hot-toast";

interface ItemModalProps {
  item: Item | null;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const isLost = item.type === "lost";

  const handleAction = () => {
    if (isLost) {
      toast.success(
        `Alert sent to ${item.contactName}! They have been notified with your contact details.`,
        { duration: 4000 },
      );
    } else {
      toast.success(
        `Claim submitted for verification! Bring your ID to ${item.location} to collect.`,
        { duration: 4000 },
      );
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-neutral-100 my-8"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative aspect-[16/10] w-full bg-neutral-100 overflow-hidden">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 ${
                  isLost
                    ? "bg-[#E5192D] text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-white ${isLost ? "animate-pulse" : ""}`}
                />
                {isLost ? "LOST ITEM" : "FOUND ITEM"}
              </span>

              {item.reward && (
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {item.reward}
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 text-xs font-medium text-white/90 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Reported {item.timeAgo} ({item.date})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight drop-shadow-sm text-white">
                {item.title}
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Item Description
              </h4>
              <p className="text-neutral-700 text-sm sm:text-base leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-50 text-[#E5192D] shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-neutral-400">
                    {isLost ? "Last Seen Location" : "Found / Pick-up Location"}
                  </div>
                  <div className="text-sm font-semibold text-neutral-800">
                    {item.location}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-neutral-400">
                    {isLost ? "Reported By" : "Custodian / Finder"}
                  </div>
                  <div className="text-sm font-semibold text-neutral-800">
                    {item.contactName}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-neutral-500 bg-amber-50/70 border border-amber-200/50 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Safety protocol: Verify item serial numbers or physical details
                at a campus security desk.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                onClick={handleAction}
                className={`w-full sm:flex-1 h-12 rounded-full font-semibold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isLost
                    ? "bg-[#E5192D] hover:bg-[#c91424] text-white shadow-red-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLost
                  ? "I Found This Item / Notify Owner"
                  : "Claim This Item / Verification"}
              </Button>

              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto h-12 px-6 rounded-full border-neutral-300 font-semibold text-sm hover:bg-neutral-50"
              >
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
