import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ChevronDown, ImagePlus, Lock, RotateCcw, X } from "lucide-react";
import {
  MAX_POST_IMAGES,
  selectAddableImageFiles,
} from "./createPostImages";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import type { Item } from "@/data/mockItems";
import { toClientItem } from "@/lib/itemAdapter";
import { useCreateItem } from "@/hooks/useItems";
import { useCategoryMap, getCategoryUuid } from "@/hooks/useCategories";
import { uploadImage, uploadImages } from "@/services/itemService";
import toast from "react-hot-toast";

interface CreatePostFormProps {
  active: boolean;
  onAddItem: (newItem: Item) => void;
  onUpdateItem?: (updatedItem: Item) => void;
  onSubmitted: () => void;
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
  "w-full h-11 px-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors";

const labelClass =
  "block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5";

type FieldId =
  | "report-title"
  | "report-color"
  | "report-date"
  | "report-time"
  | "report-building"
  | "report-location"
  | "report-category"
  | "report-description"
  | "report-important-details";

type FieldErrors = Partial<Record<FieldId, string>>;

function FieldError({
  fieldId,
  message,
}: {
  fieldId: FieldId;
  message?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={`${fieldId}-error`}
      role="alert"
      className="mt-1.5 text-[11px] font-medium text-[#E5192D] dark:text-red-400"
    >
      {message}
    </p>
  );
}

function stopCameraStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function useIsMobileView(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isMobile;
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

function getPublishErrorMessage(error: unknown): string {
  const data = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Array<{ field?: string; message?: string }>;
        };
      };
    }
  )?.response?.data;
  const details = data?.errors
    ?.map((issue) => issue.message)
    .filter((message): message is string => Boolean(message))
    .join(" ");
  if (data?.message && details) return `${data.message}: ${details}`;
  if (data?.message) return data.message;
  if (error instanceof Error) return error.message;
  return "Could not publish your report. Please try again.";
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  active,
  onAddItem,
  onUpdateItem,
  onSubmitted,
  initialType = "lost",
  initialItem = null,
}) => {
  const createItemMutation = useCreateItem();
  const categoryMap = useCategoryMap();
  const isMobileView = useIsMobileView();
  const isEditing = initialItem !== null;
  const [type, setType] = useState<"lost" | "found">(initialItem?.type ?? initialType);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [building, setBuilding] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [importantDetails, setImportantDetails] = useState("");
  const [category, setCategory] = useState<Item["category"]>("electronics");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | Blob | null>(null);
  const [lostImages, setLostImages] = useState<string[]>([]);
  const [lostFiles, setLostFiles] = useState<(File | Blob)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [uploadingText, setUploadingText] = useState<string | null>(null);
  const lostUrlsRef = useRef<string[]>([]);
  const [photoRequiredError, setPhotoRequiredError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<
    "idle" | "starting" | "ready" | "error"
  >("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sync all fields when activated: prefill from the item being edited,
  // otherwise start blank (derived state).
  const [prevFormSync, setPrevFormSync] = useState({
    active: false,
    itemId: null as string | null,
    initialType: initialType as "lost" | "found",
  });
  if (
    active !== prevFormSync.active ||
    (initialItem?.id ?? null) !== prevFormSync.itemId ||
    (!initialItem && initialType !== prevFormSync.initialType)
  ) {
    setPrevFormSync({
      active,
      itemId: initialItem?.id ?? null,
      initialType,
    });
    setPhotoRequiredError(false);
    setFieldErrors({});
    if (active) {
      // Reset the camera preview state for a fresh capture session.
      setCameraState("starting");
      setCameraError(null);
    }
    if (active) {
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
        setImportantDetails(initialItem.confidentialInfo ?? "");
        setCategory(initialItem.category);
        setUploadedImage(initialItem.image || null);
        setUploadedFile(null);
        setLostImages(initialItem.image ? [initialItem.image] : []);
        setLostFiles([]);
      } else {
        setType(initialType);
        setTitle("");
        setColor("");
        setDateValue("");
        setTimeValue("");
        setBuilding("");
        setLocation("");
        setDescription("");
        setImportantDetails("");
        setCategory("electronics");
        setUploadedImage(null);
        setUploadedFile(null);
        setLostImages([]);
        setLostFiles([]);
      }
    }
  }

  // Avoid leaking object URLs created for uploaded previews.
  useEffect(() => {
    return () => {
      if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    };
  }, [uploadedImage]);

  useEffect(
    () => () => {
      lostUrlsRef.current.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    },
    [],
  );

  // lostUrlsRef tracks created object URLs for revocation only. It must never
  // alias lostImages, or the push in handleLostFileChange mutates state.

  // Live camera for found-item photos (desktop only): runs only while the
  // form is active on the Found tab without a photo yet. Mobile uses the
  // native camera file input instead.
  useEffect(() => {
    if (!active || type !== "found" || uploadedImage || isMobileView) return;

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
  }, [active, type, uploadedImage, isMobileView]);

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
      setUploadedFile(blob);
      setPhotoRequiredError(false);
    }, "image/jpeg", 0.92);
  };

  const handleRetakePhoto = () => {
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    setUploadedImage(null);
    setUploadedFile(null);
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
    setUploadedFile(file);
    setPhotoRequiredError(false);
    // Reset so picking the same file twice still fires onChange.
    e.target.value = "";
  };

  const handleLostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;
    const addable = selectAddableImageFiles(lostImages.length, selectedFiles);
    if (addable.length === 0) {
      if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
        toast.error("Please choose image files.");
      } else {
        toast.error(`You can attach up to ${MAX_POST_IMAGES} pictures.`);
      }
      e.target.value = "";
      return;
    }
    const newUrls = addable.map((file) => URL.createObjectURL(file));
    lostUrlsRef.current.push(...newUrls);
    setLostImages((current) => [...current, ...newUrls]);
    setLostFiles((current) => [...current, ...addable]);
    setPhotoRequiredError(false);
    if (addable.length < selectedFiles.length) {
      toast.error(`You can attach up to ${MAX_POST_IMAGES} pictures.`);
    }
    e.target.value = "";
  };

  const handleRemoveLostImage = (previewToRemove: string) => {
    const removeIndex = lostImages.indexOf(previewToRemove);
    if (previewToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(previewToRemove);
    }
    lostUrlsRef.current = lostUrlsRef.current.filter(
      (url) => url !== previewToRemove,
    );
    setLostImages((current) =>
      current.filter((preview) => preview !== previewToRemove),
    );
    if (removeIndex !== -1) {
      setLostFiles((current) => current.filter((_, idx) => idx !== removeIndex));
    }
  };

  const errorProps = (fieldId: FieldId) => ({
    "aria-invalid": fieldErrors[fieldId] ? true : undefined,
    "aria-describedby": fieldErrors[fieldId]
      ? `${fieldId}-error`
      : undefined,
  });

  const handleFieldChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    const fieldId = (e.target as HTMLElement).id as FieldId;
    setFieldErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  };

  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedLocation = location.trim();
    const trimmedDescription = description.trim();
    const trimmedDetails = importantDetails.trim();

    if (!trimmedTitle) {
      errors["report-title"] = "Enter what the item is.";
    } else if (trimmedTitle.length < 2) {
      errors["report-title"] = "Use at least 2 characters.";
    } else if (trimmedTitle.length > 100) {
      errors["report-title"] = "Keep the title to 100 characters or fewer.";
    }

    if (color.trim().length > 50) {
      errors["report-color"] = "Use 50 characters or fewer.";
    }

    if (!dateValue) {
      errors["report-date"] = "Choose the date.";
    } else {
      const parsedDate = new Date(`${dateValue}T00:00:00Z`);
      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== dateValue
      ) {
        errors["report-date"] = "Enter a valid date.";
      } else if (parsedDate > new Date()) {
        errors["report-date"] = "The date cannot be in the future.";
      }
    }

    if (!timeValue) {
      errors["report-time"] = "Choose the approximate time.";
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
      errors["report-time"] = "Enter a valid time.";
    }

    if (building.trim().length > 100) {
      errors["report-building"] = "Use 100 characters or fewer.";
    }

    if (!trimmedLocation) {
      errors["report-location"] =
        type === "lost"
          ? "Enter where you lost the item."
          : "Enter where you found the item.";
    } else if (trimmedLocation.length > 500) {
      errors["report-location"] = "Use 500 characters or fewer.";
    }

    if (!ITEM_CATEGORIES.some((option) => option.id === category)) {
      errors["report-category"] = "Choose a category.";
    }

    if (trimmedDescription && trimmedDescription.length < 10) {
      errors["report-description"] =
        "Use at least 10 characters, or leave it blank.";
    } else if (trimmedDescription.length > 2000) {
      errors["report-description"] = "Use 2,000 characters or fewer.";
    }

    if (!trimmedDetails) {
      errors["report-important-details"] =
        "Add a detail only the owner would know.";
    } else if (trimmedDetails.length > 2000) {
      errors["report-important-details"] = "Use 2,000 characters or fewer.";
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    const errors = validateFields();
    const photoMissing = type === "found" && !previewImage;
    setFieldErrors(errors);
    setPhotoRequiredError(photoMissing);

    if (Object.keys(errors).length > 0 || photoMissing) {
      toast.error("Please fix the highlighted fields before publishing.");
      const firstInvalidField = Object.keys(errors)[0];
      if (firstInvalidField) {
        document.getElementById(firstInvalidField)?.focus();
      }
      return;
    }

    const submitAsync = async () => {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        // Resolve the category before uploading anything, so a failed lookup
        // can never leave an orphaned Drive image with no published post.
        let categoryUuid: string | undefined;
        if (!isEditing) {
          setUploadingText("Preparing report...");
          categoryUuid = categoryMap?.get(category);
          if (!categoryUuid) {
            try {
              categoryUuid = await getCategoryUuid(category);
            } catch {
              categoryUuid = undefined;
            }
          }
          if (!categoryUuid) {
            throw new Error(
              "Could not resolve the selected category. Check your connection and try again.",
            );
          }
        }

        let finalImageUrl = "";
        let finalImageUrls: string[] = [];

        // Upload images if any
        if (type === "found") {
          if (uploadedFile) {
            setUploadingText("Uploading photo to Drive...");
            finalImageUrl = await uploadImage(uploadedFile);
            finalImageUrls = [finalImageUrl];
          } else if (previewImage && !previewImage.startsWith("blob:")) {
            finalImageUrl = previewImage;
            finalImageUrls = [previewImage];
          }
        } else {
          // lost item
          const filesToUpload: (File | Blob)[] = [];
          const existingUrls: string[] = [];

          lostImages.forEach((imgUrl, index) => {
            if (imgUrl.startsWith("blob:") && lostFiles[index]) {
              filesToUpload.push(lostFiles[index]);
            } else if (!imgUrl.startsWith("blob:")) {
              existingUrls.push(imgUrl);
            }
          });

          if (filesToUpload.length > 0) {
            setUploadingText(
              `Uploading ${filesToUpload.length} picture${filesToUpload.length > 1 ? "s" : ""} to Drive...`,
            );
            const uploadedUrls = await uploadImages(filesToUpload);
            finalImageUrls = [...existingUrls, ...uploadedUrls];
            finalImageUrl = finalImageUrls[0] ?? "";
          } else {
            finalImageUrls = existingUrls;
            finalImageUrl = existingUrls[0] ?? "";
          }
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
            image: finalImageUrl || (type === "lost" ? (lostImages[0] ?? "") : (previewImage ?? "")),
            images: finalImageUrls.length > 0 ? finalImageUrls : undefined,
            description: description.trim() || DEFAULT_DESCRIPTION_PLACEHOLDER,
          };
          if (color.trim()) {
            updatedItem.color = color.trim();
          } else {
            delete updatedItem.color;
          }
          if (importantDetails.trim()) {
            updatedItem.confidentialInfo = importantDetails.trim();
          } else {
            delete updatedItem.confidentialInfo;
          }
          onUpdateItem?.(updatedItem);
          toast.success("Your report was updated.");
          onSubmitted();
          return;
        }

        // Submit to the API and wait for the server-confirmed item before
        // showing a success message or adding anything to the dashboard.
        if (!categoryUuid) {
          throw new Error(
            "Could not resolve the selected category. Check your connection and try again.",
          );
        }
        setUploadingText("Publishing report...");
        const created = await createItemMutation.mutateAsync({
          reportType: type,
          name: title.trim(),
          description: description.trim() || "No additional description provided.",
          itemDate: dateValue,
          itemTime: timeValue || undefined,
          categoryId: categoryUuid,
          color: color.trim() || undefined,
          building: building.trim() || undefined,
          location: location.trim() || undefined,
          importantDetails: importantDetails.trim() || undefined,
          image: finalImageUrl || undefined,
          images: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        });

        onAddItem(toClientItem(created));
        toast.success(`Published "${created.name}" to the dashboard.`);
        onSubmitted();
      } catch (err: unknown) {
        console.error("Failed to submit item report:", err);
        toast.error(getPublishErrorMessage(err));
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setUploadingText(null);
      }
    };

    void submitAsync();
  };

  return (
    <>
      {/* Type tabs — create only: an existing report cannot switch lost/found */}
      {!isEditing && (
        <div
          role="tablist"
          aria-label="Post type"
          className="mt-5 flex items-center gap-5 border-b border-neutral-100 dark:border-neutral-800"
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
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {tab.label}
              {type === tab.id && (
                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-neutral-900 rounded-full dark:hidden" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Form: upload left, details right */}
      <form
        onSubmit={handleSubmit}
        onChange={handleFieldChange}
        noValidate
        className="mt-5 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6"
      >
        {/* Left: photo — live camera for found items, file upload for lost */}
        <div className="min-w-0">
          <span className={labelClass}>
            Photo{type === "found" ? " *" : ""}
          </span>
          {type === "found" ? (
            isMobileView ? (
              <>
                <input
                  ref={mobileCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Take a photo with your camera"
                  tabIndex={-1}
                />
                {previewImage ? (
                  <div
                    className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-neutral-950 ${
                      photoRequiredError
                        ? "outline-2 outline-[#E5192D]"
                        : ""
                    }`}
                  >
                    <img
                      src={previewImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className={`w-full aspect-[4/5] rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-dashed flex flex-col items-center justify-center gap-2 p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 cursor-pointer ${
                      photoRequiredError
                        ? "border-[#E5192D]"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 hover:bg-neutral-100/60 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <Camera
                      className="h-6 w-6 text-neutral-300"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      Take a photo
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      Opens your camera
                    </span>
                  </button>
                )}
                <div className="mt-2 flex justify-end">
                  {previewImage && (
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 rounded cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Retake
                    </button>
                  )}
                </div>
              </>
            ) : (
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
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 rounded cursor-pointer"
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
            )
          ) : (
          <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleLostFileChange}
            className="sr-only"
            aria-label="Upload photos of the item (up to 4)"
            tabIndex={-1}
          />
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3">
            <div className="grid grid-cols-2 gap-2">
              {lostImages.map((preview, index) => (
                <div
                  key={preview}
                  className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-neutral-900"
                >
                  <img
                    src={preview}
                    alt={`Lost item photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLostImage(preview)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {lostImages.length < MAX_POST_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-2 text-center transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-white dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400"
                >
                  <ImagePlus
                    className="h-5 w-5 text-neutral-400 dark:text-neutral-500"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Add photo
                  </span>
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
              {lostImages.length} of {MAX_POST_IMAGES} pictures selected. You can add up to 4.
            </p>
          </div>
          </>
          )}
          {type === "found" && photoRequiredError && (
            <p
              id="report-photo-error"
              role="alert"
              className="mt-2 text-[11px] font-medium text-[#E5192D] dark:text-red-400"
            >
              Add a photo of the found item.
            </p>
          )}
        </div>

        {/* Right: details */}
        <div className="min-w-0 space-y-4">
          <div>
            <label htmlFor="report-title" className={labelClass}>
              What is it? *
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
              {...errorProps("report-title")}
            />
            <FieldError
              fieldId="report-title"
              message={fieldErrors["report-title"]}
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
                  {...errorProps("report-color")}
                />
                <span
                  aria-hidden="true"
                  style={{
                    backgroundColor: color.trim() || "transparent",
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <FieldError
                fieldId="report-color"
                message={fieldErrors["report-color"]}
              />
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
                {...errorProps("report-date")}
              />
              <FieldError
                fieldId="report-date"
                message={fieldErrors["report-date"]}
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
                {...errorProps("report-time")}
              />
              <FieldError
                fieldId="report-time"
                message={fieldErrors["report-time"]}
              />
            </div>
            <div className="min-w-0">
                <label htmlFor="report-building" className={labelClass}>
                  Building
                </label>
                <div className="relative">
                  <select
                    id="report-building"
                    name="building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                    {...errorProps("report-building")}
                  >
                    <option value="">Select a building</option>
                    {ITEM_BUILDINGS.map((buildingOption) => (
                      <option key={buildingOption} value={buildingOption}>
                        {buildingOption}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
                  />
                </div>
                <FieldError
                  fieldId="report-building"
                  message={fieldErrors["report-building"]}
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="report-location" className={labelClass}>
                  {type === "lost" ? "Location lost *" : "Location found *"}
                </label>
                <input
                  id="report-location"
                  name="location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={
                    type === "lost"
                      ? "Where do you think you lost it?"
                      : "Where did you find it?"
                  }
                  autoComplete="off"
                  spellCheck={false}
                  className={inputClass}
                  {...errorProps("report-location")}
                />
                <FieldError
                  fieldId="report-location"
                  message={fieldErrors["report-location"]}
                />
              </div>
            <div className="min-w-0">
              <label htmlFor="report-category" className={labelClass}>
                Category *
              </label>
              <select
                id="report-category"
                name="category"
                required
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Item["category"])
                }
                className={`${inputClass} cursor-pointer`}
                {...errorProps("report-category")}
              >
                {ITEM_CATEGORIES.map((categoryOption) => (
                  <option key={categoryOption.id} value={categoryOption.id}>
                    {categoryOption.label}
                  </option>
                ))}
              </select>
              <FieldError
                fieldId="report-category"
                message={fieldErrors["report-category"]}
              />
            </div>
          </div>

          <div>
            <label htmlFor="report-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="report-description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item's appearance"
              className="w-full p-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors resize-none"
              {...errorProps("report-description")}
            />
            <FieldError
              fieldId="report-description"
              message={fieldErrors["report-description"]}
            />
          </div>

          <div>
            <label htmlFor="report-important-details" className={labelClass}>
              Important details *
            </label>
            <textarea
              id="report-important-details"
              name="importantDetails"
              rows={3}
              required
              value={importantDetails}
              onChange={(e) => setImportantDetails(e.target.value)}
              placeholder="Unique mark only the owner would know…"
              className="w-full p-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors resize-none"
              {...errorProps("report-important-details")}
            />
            <FieldError
              fieldId="report-important-details"
              message={fieldErrors["report-important-details"]}
            />
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Not included in the public post. Only used to verify ownership.
            </p>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#E5192D] text-white font-bold text-sm transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{uploadingText || "Publishing report..."}</span>
                </>
              ) : (
                isEditing ? "Save changes" : "Publish report"
              )}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};
