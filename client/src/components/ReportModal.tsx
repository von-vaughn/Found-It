import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, PlusCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Item } from "@/data/mockItems";
import toast from "react-hot-toast";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: "lost" | "found";
  onAddItem: (newItem: Item) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  defaultType,
  onAddItem,
}) => {
  const [type, setType] = useState<"lost" | "found">(defaultType);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Item["category"]>("electronics");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [contactName, setContactName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !contactName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const defaultImages: Record<string, string> = {
      bags: "/images/backpack.jpg",
      electronics: "/images/iphone.jpg",
      keys: "/images/keys.jpg",
      wallets: "/images/wallet.jpg",
      accessories: "/images/glasses.jpg",
      other: "/images/backpack.jpg",
    };

    const newItem: Item = {
      id: `item-${Date.now()}`,
      title: title.trim(),
      type: type,
      category: category,
      location: location.trim(),
      date: new Date().toISOString().split("T")[0],
      timeAgo: "Just now",
      image: defaultImages[category] || "/images/backpack.jpg",
      description: description.trim() || "No additional details provided.",
      status: "active",
      reward: type === "lost" && reward.trim() ? `$${reward.replace(/[^0-9]/g, "")} Reward` : undefined,
      contactName: contactName.trim(),
    };

    onAddItem(newItem);
    toast.success(
      `Successfully published ${type === "lost" ? "lost" : "found"} item report!`,
      { duration: 4000 }
    );
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
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-neutral-100 my-8 p-6 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E5192D] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Community Report
              </div>
              <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                Report a {type === "lost" ? "Lost" : "Found"} Item
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType("lost")}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === "lost"
                    ? "bg-[#E5192D] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                I Lost Something
              </button>
              <button
                type="button"
                onClick={() => setType("found")}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === "found"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                I Found Something
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Item Name / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blue Hydro Flask, Silver MacBook Pro"
                className="w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] transition-all"
              />
            </div>

            {/* Category & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Item["category"])}
                  className="w-full h-11 px-3 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] transition-all"
                >
                  <option value="electronics">📱 Electronics</option>
                  <option value="bags">🎒 Bags & Backpacks</option>
                  <option value="keys">🔑 Keys & Fobs</option>
                  <option value="wallets">👛 Wallets & IDs</option>
                  <option value="accessories">👓 Accessories</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  {type === "lost" ? "Where Lost" : "Where Found"} *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Science Library, 2nd Fl"
                  className="w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] transition-all"
                />
              </div>
            </div>

            {/* Reporter / Contact name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Your Name / Contact *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Alex Rivera or Desk #2"
                  className="w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] transition-all"
                />
              </div>

              {type === "lost" && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Optional Reward ($)
                  </label>
                  <input
                    type="text"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] transition-all"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Description & Distinguishing Features
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention specific stickers, scratches, colors, case design, or security markings..."
                className="w-full p-3 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] transition-all resize-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button
                type="submit"
                className="flex-1 h-11 rounded-full bg-[#E5192D] hover:bg-[#c91424] text-white font-semibold text-sm shadow-md shadow-red-500/20"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Submit Report
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-11 px-5 rounded-full border-neutral-300 font-semibold text-sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
