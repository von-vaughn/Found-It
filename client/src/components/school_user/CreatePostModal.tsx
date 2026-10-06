import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Lock, X } from "lucide-react";
import type { Item } from "@/data/mockItems";
import { useAuth } from "@/context/useAuth";
import toast from "react-hot-toast";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: Item) => void;
  initialType?: "lost" | "found";
}

const todayIso = () => new Date().toISOString().split("T")[0];

const inputClass =
  "w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors";

const labelClass =
  "block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5";

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  initialType = "lost",
}) => {
  const { user } = useAuth();
  const [type, setType] = useState<"lost" | "found">(initialType);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("");
  const [dateValue, setDateValue] = useState(todayIso);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [confidentialInfo, setConfidentialInfo] = useState("");
  const [category, setCategory] = useState<Item["category"]>("electronics");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync type when opened from different entry points; close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, initialType, onClose]);

  // Avoid leaking object URLs created for uploaded previews.
  useEffect(() => {
    return () => {
      if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    };
  }, [uploadedImage]);

  if (!isOpen) return null;

  const previewImage = uploadedImage;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    setUploadedImage(URL.createObjectURL(file));
    // Reset so picking the same file twice still fires onChange.
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
      setUploadedImage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      toast.error("Add a title and location first.");
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
      date: dateValue || todayIso(),
      timeAgo: "Just now",
      image: previewImage ?? "",
      description: description.trim() || "No additional description provided.",
      status: "active",
      contactName: user?.name || "Vaughn Evangelista",
      likes: 0,
      commentsCount: 0,
      saved: false,
    };
    if (color.trim()) newItem.color = color.trim();
    // Stored on the report but never rendered publicly.
    if (confidentialInfo.trim())
      newItem.confidentialInfo = confidentialInfo.trim();

    onAddItem(newItem);
    toast.success(
      `Published your ${type === "lost" ? "lost" : "found"} item post.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/40">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-neutral-100 my-8 p-6 sm:p-7"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="report-modal-title"
              className="text-base font-extrabold text-neutral-900 tracking-tight text-balance"
            >
              Post an item lost or found
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report form"
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Type tabs */}
        <div
          role="tablist"
          aria-label="Post type"
          className="mt-5 flex items-center gap-5 border-b border-neutral-100"
        >
          {(
            [
              { id: "lost", label: "Lost" },
              { id: "found", label: "Found" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={type === tab.id}
              onClick={() => setType(tab.id)}
              className={`relative pb-2.5 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 rounded-sm ${
                type === tab.id
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {tab.label}
              {type === tab.id && (
                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-neutral-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Form: upload left, details right */}
        <form
          onSubmit={handleSubmit}
          className="mt-5 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6"
        >
          {/* Left: photo upload */}
          <div className="min-w-0">
            <span className={labelClass}>Photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload a photo of the item"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-neutral-50 border border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 p-3 text-center transition-colors hover:border-neutral-400 hover:bg-neutral-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer"
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt=""
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                <>
                  <ImagePlus
                    className="h-6 w-6 text-neutral-300"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-neutral-500">
                    Upload photo
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Click to choose a file
                  </span>
                </>
              )}
            </button>
            {previewImage && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="shrink-0 text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 rounded cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="min-w-0 space-y-4">
            <div>
              <label htmlFor="report-title" className={labelClass}>
                What is it?
              </label>
              <input
                id="report-title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Black backpack, iPhone 13…"
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="report-color" className={labelClass}>
                  Color
                </label>
                <div className="relative">
                  <input
                    id="report-color"
                    name="color"
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Black…"
                    autoComplete="off"
                    spellCheck={false}
                    className={`${inputClass} pr-9`}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      backgroundColor: color.trim() || "transparent",
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-neutral-200"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor="report-date" className={labelClass}>
                  {type === "lost" ? "Date lost" : "Date found"}
                </label>
                <input
                  id="report-date"
                  name="reportDate"
                  type="date"
                  required
                  value={dateValue}
                  max={todayIso()}
                  onChange={(e) => setDateValue(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="report-location" className={labelClass}>
                  Where?
                </label>
                <input
                  id="report-location"
                  name="location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Library…"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="report-category" className={labelClass}>
                  Category
                </label>
                <select
                  id="report-category"
                  name="category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Item["category"])
                  }
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="bags">Bags</option>
                  <option value="electronics">Electronics</option>
                  <option value="keys">Keys</option>
                  <option value="wallets">Wallets & IDs</option>
                  <option value="accessories">Accessories</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="report-description" className={labelClass}>
                Details{" "}
                <span className="font-medium normal-case tracking-normal text-neutral-400">
                  (optional)
                </span>
              </label>
              <textarea
                id="report-description"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Marks, where it was last seen…"
                className="w-full p-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="report-confidential"
                className={`${labelClass} flex items-center gap-1.5`}
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                Confidential info
              </label>
              <input
                id="report-confidential"
                name="confidentialInfo"
                type="text"
                value={confidentialInfo}
                onChange={(e) => setConfidentialInfo(e.target.value)}
                placeholder="Serial number, ID number…"
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Never shown publicly — only used to verify ownership.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#E5192D] text-white font-bold text-sm transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
              >
                Publish report
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
