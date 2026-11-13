import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MapPin,
  Clock3,
  CalendarDays,
  Award,
  Palette,
  Building2,
  Package,
} from "lucide-react";
import type { Item } from "@/data/mockItems";
import { NoItemImage } from "@/components/NoItemImage";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { parseItemEventDate } from "@/lib/date";

interface ItemModalProps {
  item: Item | null;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevItemId, setPrevItemId] = useState<string | null>(item?.id ?? null);
  if ((item?.id ?? null) !== prevItemId) {
    setPrevItemId(item?.id ?? null);
    setSelectedIndex(0);
  }

  if (!item) return null;

  const isLost = item.type === "lost";
  const { eventDate, hasTime } = parseItemEventDate(item.dateTime, item.date);
  const itemDate = eventDate
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
        eventDate,
      )
    : null;
  const itemTime =
    eventDate && hasTime
      ? new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(
          eventDate,
        )
      : null;
  const gallery =
    item.images && item.images.length > 0
      ? item.images
      : item.image
        ? [item.image]
        : [];
  const activeImage = gallery[selectedIndex] ?? gallery[0] ?? "";
  const category =
    ITEM_CATEGORIES.find(({ id }) => id === item.category) ?? null;
  const CategoryIcon = category?.icon ?? Package;

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
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-neutral-100 my-8"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid md:grid-cols-2">
            {activeImage ? (
              <div className="relative flex flex-col bg-neutral-100">
                <div className="relative aspect-[16/10] w-full flex-1 overflow-hidden md:aspect-auto md:min-h-[320px]">
                  <img
                    src={activeImage}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  {item.reward && (
                    <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                      <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        {item.reward}
                      </span>
                    </div>
                  )}
                </div>
                {gallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto border-t border-neutral-200/80 bg-white p-3">
                    {gallery.map((imgUrl, index) => (
                      <button
                        key={`${imgUrl}-${index}`}
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        aria-label={`View photo ${index + 1}`}
                        className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer ${
                          index === selectedIndex
                            ? "border-[#E5192D]"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative aspect-[16/10] w-full md:aspect-auto">
                <NoItemImage
                  title="No image attached to this report."
                  className="absolute inset-0 h-full w-full"
                />
                {item.reward && (
                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {item.reward}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="min-w-0 p-6 sm:p-7 space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {isLost ? "Lost" : "Found"} • {item.timeAgo}
                </p>
              </div>

              <div>
                <p className="text-neutral-700 text-sm sm:text-base leading-relaxed">
                  {item.description}
                </p>
              </div>

            <dl className="grid grid-cols-1 gap-x-6 border-t border-neutral-200/80 text-xs sm:grid-cols-2">
              {item.color && (
                <div className="flex items-start gap-2.5 py-3">
                  <Palette
                    className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="font-bold text-neutral-900">Primary color</dt>
                    <dd className="mt-1 capitalize text-neutral-500">
                      {item.color}
                    </dd>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5 py-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">
                    Specific location
                  </dt>
                  <dd className="mt-1 break-words text-neutral-500">
                    {item.location}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-3">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">Building</dt>
                  <dd className="mt-1 break-words text-neutral-500">
                    {item.building?.trim() || "Not provided"}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-3">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">
                    {isLost ? "Date lost" : "Date found"}
                  </dt>
                  <dd className="mt-1 text-neutral-500">
                    {itemDate ?? "Not provided"}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-3">
                <Clock3
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">
                    {isLost ? "Time lost" : "Time found"}
                  </dt>
                  <dd className="mt-1 text-neutral-500">
                    {itemTime ?? "Not provided"}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-3">
                <CategoryIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">Category</dt>
                  <dd className="mt-1 text-neutral-500">
                    {category?.label ?? "Other"}
                  </dd>
                </div>
              </div>
            </dl>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
