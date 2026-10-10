import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ImagePlus, RotateCcw, X } from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import type { Item } from "@/data/mockItems";
import { useAuth } from "@/context/useAuth";
import toast from "react-hot-toast";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (newItem: Item) => void;
  onUpdateItem?: (updatedItem: Item) => void;
  initialType?: "lost" | "found";
  initialItem?: Item | null;
}

const DEFAULT_DESCRIPTION_PLACEHOLDER = "No additional description provided.";

function splitDateTime(item: Item): { date: string; time: string } {
  if (item.dateTime) {
    const parsed = new Date(item.dateTime);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        date: item.dateTime.slice(0, 10),
        time: item.dateTime.slice(11, 16),
      };
    }
  }
  return { date: item.date, time: "" };
}

const localDateTime = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const inputClass =
  "w-full h-11 px-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors";

const labelClass =
  "block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5";

function stopCameraStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "No camera was found on this device.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is already in use by another app. Close it and try again.";
    }
  }
  return "The camera could not be started. Check your camera connection and try again.";
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  onUpdateItem,
  initialType = "lost",
  initialItem = null,
}) => {
  const { user } = useAuth();
  const isEditing = initialItem !== null;
  const [type, setType] = useState<"lost" | "found">(initialItem?.type ?? initialType);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [building, setBuilding] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Item["category"]>("electronics");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [photoRequiredError, setPhotoRequiredError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<
    "idle" | "starting" | "ready" | "error"
  >("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sync all fields when opened: prefill from the item being edited,
  // otherwise start blank (derived state).
  const [prevFormSync, setPrevFormSync] = useState({
    isOpen: false,
    itemId: null as string | null,
    initialType: initialType as "lost" | "found",
  });
  if (
    isOpen !== prevFormSync.isOpen ||
    (initialItem?.id ?? null) !== prevFormSync.itemId ||
    (!initialItem && initialType !== prevFormSync.initialType)
  ) {
    setPrevFormSync({
      isOpen,
      itemId: initialItem?.id ?? null,
      initialType,
    });
    setPhotoRequiredError(false);
    if (isOpen) {
      // Reset the camera preview state for a fresh capture session.
      setCameraState("starting");
      setCameraError(null);
    }
    if (isOpen) {
      if (initialItem) {
        const { date, time } = splitDateTime(initialItem);
        setType(initialItem.type);
        setTitle(initialItem.title);
        setColor(initialItem.color ?? "");
        setDateValue(date);
        setTimeValue(time);
        setBuilding(initialItem.building ?? "");
        setLocation(initialItem.location);
        setDescription(
          initialItem.description === DEFAULT_DESCRIPTION_PLACEHOLDER
            ? ""
            : initialItem.description,
        );
        setCategory(initialItem.category);
        setUploadedImage(initialItem.image || null);
      } else {
        setType(initialType);
        setTitle("");
        setColor("");
        setDateValue("");
        setTimeValue("");
        setBuilding("");
        setLocation("");
        setDescription("");
        setCategory("electronics");
        setUploadedImage(null);
      }
    }
  }

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Avoid leaking object URLs created for uploaded previews.
  useEffect(() => {
    return () => {
      if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    };
  }, [uploadedImage]);

  // Live camera for found-item photos: runs only while the modal is open
  // on the Found tab without a photo yet.
  useEffect(() => {
    if (!isOpen || type !== "found" || uploadedImage) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError(
            "Camera access is unavailable. Use a secure connection and a browser that supports camera access.",
          );
          setCameraState("error");
        }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stopCameraStream(stream);
          return;
        }

        streamRef.current = stream;
        if (!videoElement) {
          throw new Error("Camera preview element is unavailable.");
        }
        videoElement.srcObject = stream;
        await videoElement.play();
        if (!cancelled) setCameraState("ready");
      } catch (error) {
        stopCameraStream(stream);
        if (streamRef.current === stream) streamRef.current = null;
        stream = null;
        if (!cancelled) {
          setCameraError(getCameraErrorMessage(error));
          setCameraState("error");
        }
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      const activeStream = streamRef.current;
      streamRef.current = null;
      stopCameraStream(activeStream);
      if (stream !== activeStream) stopCameraStream(stream);
      if (videoElement) videoElement.srcObject = null;
    };
  }, [isOpen, type, uploadedImage]);

  if (!isOpen) return null;

  const previewImage = uploadedImage;

  const handleFoundTabSelect = () => {
    setType("found");
    setCameraState("starting");
    setCameraError(null);
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("The camera preview is not ready. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Could not capture the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Could not capture the photo. Please try again.");
        return;
      }
      if (uploadedImage) URL.revokeObjectURL(uploadedImage);
      setUploadedImage(URL.createObjectURL(blob));
      setPhotoRequiredError(false);
    }, "image/jpeg", 0.92);
  };

  const handleRetakePhoto = () => {
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    setUploadedImage(null);
    setCameraState("starting");
    setCameraError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    setUploadedImage(URL.createObjectURL(file));
    setPhotoRequiredError(false);
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
    if (type === "found" && !previewImage) {
      setPhotoRequiredError(true);
      toast.error("Attach a photo of the found item first.");
      return;
    }
    if (!dateValue || !timeValue) {
      toast.error("Add the date and time first.");
      return;
    }

    if (isEditing && initialItem) {
      const updatedItem: Item = {
        ...initialItem,
        title: title.trim(),
        type,
        category,
        building: building.trim() || undefined,
        location: location.trim(),
        date: dateValue,
        dateTime: new Date(`${dateValue}T${timeValue}`).toISOString(),
        image: previewImage ?? "",
        description: description.trim() || DEFAULT_DESCRIPTION_PLACEHOLDER,
      };
      if (color.trim()) {
        updatedItem.color = color.trim();
      } else {
        delete updatedItem.color;
      }
      onUpdateItem?.(updatedItem);
      toast.success("Your report was updated.");
      onClose();
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
      userAvatar: "/images/avatars/vaughn_evangelista.svg",
      building: building.trim() || undefined,
      location: location.trim(),
      date: dateValue,
      dateTime: new Date(`${dateValue}T${timeValue}`).toISOString(),
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
                {isEditing ? "Edit your report" : "Post an item lost or found"}
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
              onClick={() =>
                tab.id === "found" ? handleFoundTabSelect() : setType(tab.id)
              }
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
          {/* Left: photo — live camera for found items, file upload for lost */}
          <div className="min-w-0">
            <span className={labelClass}>
              Photo{type === "found" ? " *" : ""}
            </span>
            {type === "found" ? (
              <>
                <div
                  className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-neutral-950 ${
                    photoRequiredError && !previewImage
                      ? "outline-2 outline-[#E5192D]"
                      : ""
                  }`}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      aria-label="Live camera preview"
                      className={`h-full w-full object-cover ${
                        cameraState === "error" ? "hidden" : ""
                      }`}
                    />
                  )}
                  {cameraState === "starting" && !previewImage && (
                    <div
                      role="status"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs font-medium text-white"
                    >
                      <Camera
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                      Starting camera…
                    </div>
                  )}
                  {cameraState === "error" && !previewImage && (
                    <div
                      role="alert"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-white"
                    >
                      <CameraOff
                        className="h-6 w-6 text-neutral-300"
                        aria-hidden="true"
                      />
                      <p>{cameraError}</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  {previewImage ? (
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 rounded cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retake
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      disabled={cameraState !== "ready"}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      Take photo
                    </button>
                  )}
                </div>
              </>
            ) : (
            <>
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
            </>
            )}
            {previewImage && type === "lost" && (
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
                  Primary color
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
                  {type === "lost" ? "Date lost *" : "Date found *"}
                </label>
                <input
                  id="report-date"
                  name="reportDate"
                  type="date"
                  required
                  value={dateValue}
                  max={localDateTime().slice(0, 10)}
                  onChange={(e) => setDateValue(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="report-time" className={labelClass}>
                  {type === "lost" ? "Approximate time lost *" : "Time found *"}
                </label>
                <input
                  id="report-time"
                  name="reportTime"
                  type="time"
                  required
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="report-building" className={labelClass}>
                  Building{" "}
                  <span className="font-medium normal-case tracking-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <select
                  id="report-building"
                  name="building"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a building</option>
                  {ITEM_BUILDINGS.map((buildingOption) => (
                    <option key={buildingOption} value={buildingOption}>
                      {buildingOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="report-location" className={labelClass}>
                  Specific location *
                </label>
                <input
                  id="report-location"
                  name="location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Near the library entrance…"
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
                  {ITEM_CATEGORIES.map((categoryOption) => (
                    <option key={categoryOption.id} value={categoryOption.id}>
                      {categoryOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="report-description" className={labelClass}>
                Description *
              </label>
              <textarea
                id="report-description"
                name="description"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Marks, where it was last seen…"
                className="w-full p-3.5 text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors resize-none"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#E5192D] text-white font-bold text-sm transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer"
              >
                {isEditing ? "Save changes" : "Publish report"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
