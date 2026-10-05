import React, { useState } from "react";
import { X, PlusCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Item } from "@/data/mockItems";
import { useAuth } from "@/context/useAuth";
import toast from "react-hot-toast";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: Item) => void;
  initialType?: "lost" | "found";
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  initialType = "lost",
}) => {
  const { user } = useAuth();
  const [type, setType] = useState<"lost" | "found">(initialType);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Item["category"]>("electronics");
  const [selectedImage, setSelectedImage] = useState<string>("/images/backpack.jpg");
  const [attachImage, setAttachImage] = useState<boolean>(true);

  if (!isOpen) return null;

  const openSourceImageOptions = [
    { label: "Backpack", value: "/images/backpack.jpg" },
    { label: "iPhone", value: "/images/iphone.jpg" },
    { label: "Glasses", value: "/images/glasses.jpg" },
    { label: "Wallet", value: "/images/wallet.jpg" },
    { label: "Water Bottle", value: "/images/water-bottle.jpg" },
    { label: "Laptop Charger", value: "/images/laptop-charger.jpg" },
    { label: "Notebook", value: "/images/notebook.jpg" },
    { label: "Calculator", value: "/images/calculator.jpg" },
    { label: "Jacket", value: "/images/jacket.jpg" },
    { label: "Keys", value: "/images/keys.jpg" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      toast.error("Please provide both title and location.");
      return;
    }

    const username = user?.name
      ? user.name.toLowerCase().replace(/\s+/g, "_")
      : "vaughn_e";

    const newItem: Item = {
      id: `post-${Date.now()}`,
      title: title.trim(),
      type,
      category,
      username,
      userAvatar: "/images/avatar-vaughn.jpg",
      location: location.trim(),
      date: new Date().toISOString().split("T")[0],
      timeAgo: "Just now",
      image: attachImage ? selectedImage : "",
      description: description.trim() || "No additional description provided.",
      status: "active",
      contactName: user?.name || "Vaughn Evangelista",
      likes: 0,
      commentsCount: 0,
      saved: false,
    };

    onAddItem(newItem);
    toast.success(
      `Successfully published ${type === "lost" ? "lost" : "found"} item report!`,
      { icon: "✨" }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-neutral-100 my-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
              Create a Report
            </h3>
            <p className="text-xs text-neutral-400">
              Share details to help our campus community reunite items.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Image Attachment Options */}
          <div className="md:row-start-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Photo Attachment
              </label>
              <button
                type="button"
                onClick={() => setAttachImage(!attachImage)}
                className="text-xs font-medium text-[#E5192D] hover:underline"
              >
                {attachImage ? "Remove photo (No image)" : "Attach photo"}
              </button>
            </div>

            {attachImage ? (
              <div className="space-y-2">
                <select
                  value={selectedImage}
                  onChange={(e) => setSelectedImage(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#E5192D]"
                >
                  {openSourceImageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="w-full h-64 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="h-[19rem] p-3 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl flex items-center justify-center text-center text-xs text-neutral-400">
                Item will be posted without an image attached.
              </div>
            )}
          </div>

          <div className="space-y-4 md:col-start-2 md:row-start-1">
            {/* Post Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType("lost")}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === "lost"
                    ? "bg-[#E5192D] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                I Lost An Item
              </button>
              <button
                type="button"
                onClick={() => setType("found")}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === "found"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                I Found An Item
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Black Backpack, iPhone 13, Hydro Flask"
                className="w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D]"
              />
            </div>

            {/* Location & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. WMSU Campus, Library"
                  className="w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Item["category"])
                  }
                  className="w-full h-11 px-3 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D]"
                >
                  <option value="bags">Bags & Backpacks</option>
                  <option value="electronics">Electronics</option>
                  <option value="keys">Keys & Fobs</option>
                  <option value="wallets">Wallets & IDs</option>
                  <option value="accessories">Accessories</option>
                  <option value="other">Other Items</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Description & Details
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe distinctive features, marks, or where it was last seen..."
                className="w-full p-3 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E5192D]/20 focus:border-[#E5192D] resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-3 md:col-span-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-[#E5192D] hover:bg-[#c91424] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Publish Post
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl border border-neutral-200 font-semibold text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
