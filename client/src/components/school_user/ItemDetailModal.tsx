import React, { useState } from "react";
import {
  X,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Send,
  Share2,
} from "lucide-react";
import type { Item } from "@/data/mockItems";
import toast from "react-hot-toast";
import { formatItemDateTime } from "@/lib/dateTime";
import { NoItemImage } from "@/components/NoItemImage";

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  onLike?: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
}) => {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<
    Array<{ id: number; author: string; text: string; time: string }>
  >([
    {
      id: 1,
      author: "mika_ross",
      text: "I think I saw something similar near the 2nd floor yesterday!",
      time: "2h ago",
    },
    {
      id: 2,
      author: "denji_07",
      text: "Hope you find it soon, bump!",
      time: "1h ago",
    },
  ]);

  if (!item) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setComments((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: "Vaughn Evangelista",
        text: commentText.trim(),
        time: "Just now",
      },
    ]);
    setCommentText("");
    toast.success("Comment posted!");
  };

  const username =
    item.username || item.contactName?.toLowerCase().replace(/\s+/g, "_") || "student_user";
  const avatarUrl =
    item.userAvatar ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;
  const itemDateTime =
    item.dateTime
      ? formatItemDateTime(item.dateTime)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-neutral-100 my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200">
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-neutral-900">
                  {username}
                </span>
                {item.type === "lost" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#E5192D] text-[10px] font-extrabold uppercase">
                    <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
                    LOST
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase">
                    <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                    FOUND
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">
                {item.timeAgo} • {item.location}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Title */}
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight mb-2">
              {item.title}
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          </div>

          {/* Image */}
          {item.image ? (
            <div className="rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/80 max-h-80 flex items-center justify-center">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-contain max-h-80"
              />
            </div>
          ) : (
            <NoItemImage
              title="No image attached to this report"
              className="rounded-2xl p-8"
            />
          )}

          {/* Details metadata */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs">
            <div className="flex items-center gap-2 text-neutral-600">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>
                <strong>Location:</strong> {item.location}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>
                <strong>Reported:</strong> {item.date} ({item.timeAgo})
              </span>
            </div>
            {item.type === "lost" && (
              <div className="col-span-2 flex items-center gap-2 text-neutral-600">
                <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>
                  <strong>Date and time lost:</strong>{" "}
                  {itemDateTime ?? "Not provided"}
                </span>
              </div>
            )}
          </div>

          {/* Comments section */}
          <div className="pt-2 border-t border-neutral-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Community Comments ({comments.length})
            </h4>

            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 text-xs">
                  <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600 shrink-0">
                    {c.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-neutral-50 rounded-xl p-2.5 border border-neutral-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-neutral-800">
                        {c.author}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {c.time}
                      </span>
                    </div>
                    <p className="text-neutral-600">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a helpful comment or information..."
                className="flex-1 h-10 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-[#E5192D]"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-[#E5192D] text-white text-xs font-semibold hover:bg-[#c91424] transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Reply
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Item link copied to clipboard!");
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
          >
            <Share2 className="w-4 h-4" />
            Share Post
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toast.success(`Message sent to ${item.contactName || username}!`);
              }}
              className="h-10 px-5 rounded-full bg-[#E5192D] text-white text-xs font-bold hover:bg-[#c81424] transition-colors shadow-sm"
            >
              {item.type === "lost" ? "I Found This!" : "This is Mine!"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
