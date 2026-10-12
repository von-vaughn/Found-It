import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MapPin,
  Clock3,
  CalendarDays,
  Award,
  User,
  Palette,
  Building2,
  Package,
} from "lucide-react";
import type { Item } from "@/data/mockItems";
import { NoItemImage } from "@/components/NoItemImage";
import { ITEM_CATEGORIES } from "@/data/itemCategories";

interface ItemModalProps {
  item: Item | null;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const isLost = item.type === "lost";
  const eventDate =
    item.dateTime && !Number.isNaN(new Date(item.dateTime).getTime())
      ? new Date(item.dateTime)
      : null;
  const itemDate = eventDate
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
        eventDate,
      )
    : null;
  const itemTime = eventDate
    ? new Intl.DateTimeFormat("en-PH", { timeStyle: "short" }).format(
        eventDate,
      )
    : null;
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
            {item.image ? (
              <div className="relative aspect-[16/10] w-full bg-neutral-100 overflow-hidden md:aspect-auto">
                <img
                  src={item.image}
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

            <div className="min-w-0 p-6 sm:p-7 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs text-neutral-400">
                  Reported {item.timeAgo} ({item.date})
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Item Description
                </h4>
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
                <User
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="font-bold text-neutral-900">
                    {isLost ? "Reported By" : "Custodian / Finder"}
                  </dt>
                  <dd className="mt-1 break-words text-neutral-500">
                    {item.contactName}
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
