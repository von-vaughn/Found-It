import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ImagePlus, Lock, X } from "lucide-react";
import { SelectDropdown } from "@/components/SelectDropdown";
import {
  MAX_POST_IMAGES,
  selectAddableImageFiles,
} from "./createPostImages";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { useBuildings } from "@/hooks/useBuildings";
import type { Item } from "@/data/mockItems";
import { toClientItem } from "@/lib/itemAdapter";
import { useCreateItem, useUpdateItem } from "@/hooks/useItems";
import {
  formatCategoryLabel,
  getCategoryUuid,
  isOtherCategory,
  useCategories,
  useCategoryMap,
} from "@/hooks/useCategories";
import { uploadFoundImage, uploadImages } from "@/services/itemService";
import { localTodayDate } from "@/lib/date";
import toast from "react-hot-toast";

export interface CreatePostDraft {
  key: string;
  type: "lost" | "found";
  title: string;
  color?: string;
  date?: string;
  time?: string;
  building?: string;
  location?: string;
  description?: string;
  importantDetails?: string;
  category?: Item["category"] | "";
  customCategory?: string;
  images?: string[];
}

interface CreatePostFormProps {
  active: boolean;
  onAddItem: (newItem: Item) => void;
  onUpdateItem?: (updatedItem: Item) => void;
  onSubmitted: () => void;
  initialType?: "lost" | "found";
  initialItem?: Item | null;
  initialDraft?: CreatePostDraft | null;
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

const inputClass =
  "w-full h-11 px-3.5 text-sm bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100 focus:bg-white focus:outline-none focus:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 transition-colors";

const labelClass =
  "block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 capitalize mb-1.5";

type FieldId =
  | "report-title"
  | "report-color"
  | "report-date"
  | "report-time"
  | "report-building"
  | "report-location"
  | "report-category"
  | "report-custom-category"
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
  initialDraft = null,
}) => {
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const categoryMap = useCategoryMap();
  const { data: serverCategories } = useCategories();
  const categoryOptions = serverCategories
    ? serverCategories.map((entry) => ({
        id: entry.name,
        label: formatCategoryLabel(entry.name),
      }))
    : ITEM_CATEGORIES;
  const { data: buildings } = useBuildings();
  const buildingOptions = buildings?.map((entry) => entry.name) ?? ITEM_BUILDINGS;
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
  const [category, setCategory] = useState<Item["category"] | "">("");
  const [customCategory, setCustomCategory] = useState("");
  const [foundImages, setFoundImages] = useState<string[]>([]);
  const [foundFileMap, setFoundFileMap] = useState<Record<string, File | Blob>>({});
  const [foundImagesChanged, setFoundImagesChanged] = useState(false);
  const [lostImages, setLostImages] = useState<string[]>([]);
  const [lostFileMap, setLostFileMap] = useState<Record<string, File | Blob>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const foundUrlsRef = useRef<string[]>([]);
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

  // Sync all fields when activated: prefill from the item being edited or a
  // passed-in draft (e.g. from a rejected claim), otherwise start blank.
  const [prevFormSync, setPrevFormSync] = useState({
    active: false,
    itemId: null as string | null,
    draftKey: null as string | null,
    initialType: initialType as "lost" | "found",
  });
  if (
    active !== prevFormSync.active ||
    (initialItem?.id ?? null) !== prevFormSync.itemId ||
    (initialDraft?.key ?? null) !== prevFormSync.draftKey ||
    (!initialItem && !initialDraft && initialType !== prevFormSync.initialType)
  ) {
    setPrevFormSync({
      active,
      itemId: initialItem?.id ?? null,
      draftKey: initialDraft?.key ?? null,
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
        setCustomCategory(initialItem.customCategory ?? "");
        const existingImages = (
          initialItem.images && initialItem.images.length > 0
            ? initialItem.images
            : initialItem.image
              ? [initialItem.image]
              : []
        ).slice(0, MAX_POST_IMAGES);
        setFoundImages(initialItem.type === "found" ? existingImages : []);
        setFoundFileMap({});
        setFoundImagesChanged(false);
        setLostImages(initialItem.type === "lost" ? existingImages : []);
        setLostFileMap({});
      } else if (initialDraft) {
        setType(initialDraft.type);
        setTitle(initialDraft.title);
        setColor(initialDraft.color ?? "");
        setDateValue(initialDraft.date ?? "");
        setTimeValue(initialDraft.time ?? "");
        setBuilding(initialDraft.building ?? "");
        setLocation(initialDraft.location ?? "");
        setDescription(
          initialDraft.description === DEFAULT_DESCRIPTION_PLACEHOLDER
            ? ""
            : (initialDraft.description ?? ""),
        );
        setImportantDetails(initialDraft.importantDetails ?? "");
        setCategory(initialDraft.category ?? "");
        setCustomCategory(initialDraft.customCategory ?? "");
        setFoundImages(
          initialDraft.type === "found"
            ? (initialDraft.images ?? []).slice(0, MAX_POST_IMAGES)
            : [],
        );
        setFoundFileMap({});
        setFoundImagesChanged(false);
        setLostImages(
          initialDraft.type === "lost"
            ? (initialDraft.images ?? []).slice(0, MAX_POST_IMAGES)
            : [],
        );
        setLostFileMap({});
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
        setCategory("");
        setCustomCategory("");
        setFoundImages([]);
        setFoundFileMap({});
        setFoundImagesChanged(false);
        setLostImages([]);
        setLostFileMap({});
      }
    }
  }

  // Avoid leaking object URLs created for uploaded previews.
  useEffect(
    () => () => {
      foundUrlsRef.current.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      lostUrlsRef.current.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    },
    [],
  );

  // foundUrlsRef / lostUrlsRef track created object URLs for revocation only.
  // They must never alias state arrays.

  // Live camera for found-item photos (desktop only): runs while the form is
  // active on the Found tab and fewer than MAX_POST_IMAGES photos are captured.
  // Mobile uses the native camera file input instead.
  const needsLiveCamera =
    active &&
    type === "found" &&
    !isMobileView &&
    foundImages.length < MAX_POST_IMAGES;

  useEffect(() => {
    if (!needsLiveCamera) return;

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
  }, [needsLiveCamera]);

  const handleFoundTabSelect = () => {
    setType("found");
    if (foundImages.length < MAX_POST_IMAGES) {
      setCameraState("starting");
      setCameraError(null);
    }
  };

  const handleTakePhoto = () => {
    if (foundImages.length >= MAX_POST_IMAGES) {
      toast.error(`You can attach up to ${MAX_POST_IMAGES} pictures.`);
      return;
    }
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
      const previewUrl = URL.createObjectURL(blob);
      foundUrlsRef.current.push(previewUrl);
      setFoundImages((current) => {
        if (current.length >= MAX_POST_IMAGES) {
          URL.revokeObjectURL(previewUrl);
          return current;
        }
        return [...current, previewUrl];
      });
      setFoundFileMap((current) => ({ ...current, [previewUrl]: blob }));
      setFoundImagesChanged(true);
      setPhotoRequiredError(false);
    }, "image/jpeg", 0.92);
  };

  const handleRemoveFoundImage = (previewToRemove: string) => {
    const wasAtMax = foundImages.length >= MAX_POST_IMAGES;
    if (previewToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(previewToRemove);
    }
    foundUrlsRef.current = foundUrlsRef.current.filter(
      (url) => url !== previewToRemove,
    );
    setFoundImages((current) =>
      current.filter((preview) => preview !== previewToRemove),
    );
    setFoundFileMap((current) => {
      if (!(previewToRemove in current)) return current;
      const next = { ...current };
      delete next[previewToRemove];
      return next;
    });
    setFoundImagesChanged(true);
    if (wasAtMax && !isMobileView) {
      setCameraState("starting");
      setCameraError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (foundImages.length >= MAX_POST_IMAGES) {
      toast.error(`You can attach up to ${MAX_POST_IMAGES} pictures.`);
      e.target.value = "";
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    foundUrlsRef.current.push(previewUrl);
    setFoundImages((current) => [...current, previewUrl]);
    setFoundFileMap((current) => ({ ...current, [previewUrl]: file }));
    setFoundImagesChanged(true);
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
    setLostFileMap((current) => {
      const next = { ...current };
      newUrls.forEach((url, index) => {
        next[url] = addable[index];
      });
      return next;
    });
    setPhotoRequiredError(false);
    if (addable.length < selectedFiles.length) {
      toast.error(`You can attach up to ${MAX_POST_IMAGES} pictures.`);
    }
    e.target.value = "";
  };

  const handleRemoveLostImage = (previewToRemove: string) => {
    if (previewToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(previewToRemove);
    }
    lostUrlsRef.current = lostUrlsRef.current.filter(
      (url) => url !== previewToRemove,
    );
    setLostImages((current) =>
      current.filter((preview) => preview !== previewToRemove),
    );
    setLostFileMap((current) => {
      if (!(previewToRemove in current)) return current;
      const next = { ...current };
      delete next[previewToRemove];
      return next;
    });
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
      } else if (dateValue > localTodayDate()) {
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

    if (!categoryOptions.some((option) => option.id === category)) {
      errors["report-category"] = "Choose a category.";
    } else if (isOtherCategory(category)) {
      const trimmedCustomCategory = customCategory.trim();
      if (!trimmedCustomCategory) {
        errors["report-custom-category"] =
          "Specify what type of category it is.";
      } else if (trimmedCustomCategory.length < 2) {
        errors["report-custom-category"] = "Use at least 2 characters.";
      } else if (trimmedCustomCategory.length > 80) {
        errors["report-custom-category"] = "Use 80 characters or fewer.";
      }
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
    const photoMissing = type === "found" && foundImages.length === 0;
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

    if (!category) return; // validateFields already flagged this; narrows the type.

    const submitAsync = async () => {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        // Resolve the category before uploading anything, so a failed lookup
        // can never leave an orphaned Drive image with no published post.
        // Validation already ensured category is a chosen option id.
        let categoryId = categoryMap?.get(category);
        if (!categoryId) {
          try {
            categoryId = await getCategoryUuid(category);
          } catch {
            // The check below surfaces the fallback error.
          }
        }
        if (!categoryId) {
          throw new Error(
            "Could not resolve the selected category. Check your connection and try again.",
          );
        }

        let finalImageUrl = "";
        let finalImageUrls: string[] = [];
        let finalBlurredUrls: string[] = [];

        // Upload images if any
        if (type === "found") {
          const uploadedUrls: string[] = [];
          const uploadedBlurred: string[] = [];
          let allHaveBlurred = true;
          for (const imgUrl of foundImages) {
            const fileForUrl = foundFileMap[imgUrl];
            if (fileForUrl) {
              const uploadRes = await uploadFoundImage(fileForUrl);
              uploadedUrls.push(uploadRes.url);
              if (uploadRes.blurredUrl) {
                uploadedBlurred.push(uploadRes.blurredUrl);
              } else {
                allHaveBlurred = false;
              }
            } else if (!imgUrl.startsWith("blob:")) {
              uploadedUrls.push(imgUrl);
              allHaveBlurred = false;
            }
          }
          finalImageUrls = uploadedUrls;
          finalImageUrl = uploadedUrls[0] ?? "";
          if (allHaveBlurred && uploadedBlurred.length === uploadedUrls.length) {
            finalBlurredUrls = uploadedBlurred;
          }
        } else {
          // lost item
          const filesToUpload: (File | Blob)[] = [];
          const existingUrls: string[] = [];

          lostImages.forEach((imgUrl) => {
            const fileForUrl = lostFileMap[imgUrl];
            if (fileForUrl) {
              filesToUpload.push(fileForUrl);
            } else if (!imgUrl.startsWith("blob:")) {
              existingUrls.push(imgUrl);
            }
          });

          if (filesToUpload.length > 0) {
            const uploadedUrls = await uploadImages(filesToUpload);
            finalImageUrls = [...existingUrls, ...uploadedUrls];
            finalImageUrl = finalImageUrls[0] ?? "";
          } else {
            finalImageUrls = existingUrls;
            finalImageUrl = existingUrls[0] ?? "";
          }
        }

        if (isEditing && initialItem) {
          const shouldSendImages =
            type === "lost" || foundImagesChanged;
          // PATCH /api/items/:id — server-side update so the edit persists for
          // everyone; omit unchanged found-item images so existing blurred URLs stay intact.
          const updated = await updateItemMutation.mutateAsync({
            id: initialItem.id,
            payload: {
              name: title.trim(),
              description: description.trim() || "No additional description provided.",
              itemDate: dateValue,
              itemTime: timeValue,
              categoryId,
              customCategory: isOtherCategory(category)
                ? customCategory.trim()
                : null,
              color: color.trim() || undefined,
              building: building.trim() || undefined,
              location: location.trim(),
              importantDetails: importantDetails.trim(),
              ...(shouldSendImages
                ? {
                    images: finalImageUrls.length > 0 ? finalImageUrls : [],
                    blurredImages:
                      finalBlurredUrls.length > 0 ? finalBlurredUrls : undefined,
                  }
                : {}),
            },
          });
          onUpdateItem?.(toClientItem(updated));
          toast.success("Your report was updated.");
          onSubmitted();
          return;
        }

        // Submit to the API and wait for the server-confirmed item before
        // showing a success message or adding anything to the dashboard.
        const created = await createItemMutation.mutateAsync({
          reportType: type,
          name: title.trim(),
          description: description.trim() || "No additional description provided.",
          itemDate: dateValue,
          itemTime: timeValue || undefined,
          categoryId,
          ...(isOtherCategory(category)
            ? { customCategory: customCategory.trim() }
            : {}),
          color: color.trim() || undefined,
          building: building.trim() || undefined,
          location: location.trim() || undefined,
          importantDetails: importantDetails.trim() || undefined,
          image: finalImageUrl || undefined,
          images: finalImageUrls.length > 0 ? finalImageUrls : undefined,
          blurredImages: finalBlurredUrls.length > 0 ? finalBlurredUrls : undefined,
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
                <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-neutral-900 dark:bg-neutral-100" />
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
        className="mt-6 grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10"
      >
        {/* Left: photo — live camera for found items, file upload for lost */}
        <div className="min-w-0 md:sticky md:top-24">
          <span className={labelClass}>
            Photos
            {type === "found" && (
              <>
                {" "}
                <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </>
            )}
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
                  aria-label="Take a photo with your camera (up to 4)"
                  tabIndex={-1}
                />
                {foundImages.length === 0 ? (
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
                      Opens your camera (up to {MAX_POST_IMAGES} photos)
                    </span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {foundImages.map((preview, index) => (
                        <div
                          key={preview}
                          className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-neutral-900"
                        >
                          <img
                            src={preview}
                            alt={`Captured photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFoundImage(preview)}
                            aria-label={`Remove photo ${index + 1}`}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      {foundImages.length < MAX_POST_IMAGES && (
                        <button
                          type="button"
                          onClick={() => mobileCameraInputRef.current?.click()}
                          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-3 text-center transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-white dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 cursor-pointer"
                        >
                          <Camera
                            className="h-5 w-5 text-neutral-400"
                            aria-hidden="true"
                          />
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                            Take photo
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <p className="mt-2 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                  {foundImages.length}/{MAX_POST_IMAGES} photos taken
                </p>
              </>
            ) : (
            <>
              {foundImages.length < MAX_POST_IMAGES ? (
                <>
                  <div
                    className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-neutral-950 ${
                      photoRequiredError && foundImages.length === 0
                        ? "outline-2 outline-[#E5192D]"
                        : ""
                    }`}
                  >
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
                    {cameraState === "starting" && (
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
                    {cameraState === "error" && (
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
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {foundImages.length}/{MAX_POST_IMAGES} photos taken
                    </span>
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      disabled={cameraState !== "ready"}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      {foundImages.length === 0 ? "Take photo" : "Take another"}
                    </button>
                  </div>
                  {foundImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {foundImages.map((preview, index) => (
                        <div
                          key={preview}
                          className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-950"
                        >
                          <img
                            src={preview}
                            alt={`Captured photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFoundImage(preview)}
                            aria-label={`Remove photo ${index + 1}`}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {foundImages.map((preview, index) => (
                      <div
                        key={preview}
                        className="relative aspect-square overflow-hidden rounded-lg bg-neutral-950"
                      >
                        <img
                          src={preview}
                          alt={`Captured photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoundImage(preview)}
                          aria-label={`Remove photo ${index + 1}`}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-neutral-600 dark:text-neutral-400 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    {foundImages.length}/{MAX_POST_IMAGES} photos taken (remove one to take another)
                  </p>
                </div>
              )}
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
            <div
              className={`grid gap-2 ${
                lostImages.length === 0 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
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
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-3 text-center transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-white dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 ${
                    lostImages.length === 0
                      ? "aspect-[4/3] md:aspect-square"
                      : "aspect-square"
                  }`}
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
              {lostImages.length}/{MAX_POST_IMAGES} selected
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
              What is it? <span className="text-[#E5192D]" aria-hidden="true">*</span>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="report-color" className={labelClass}>
                Primary color
              </label>
              <input
                id="report-color"
                name="color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Black…"
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
                {...errorProps("report-color")}
              />
              <FieldError
                fieldId="report-color"
                message={fieldErrors["report-color"]}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="report-date" className={labelClass}>
                {type === "lost" ? "Date lost" : "Date found"}{" "}
                <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="report-date"
                name="reportDate"
                type="date"
                required
                value={dateValue}
                max={localTodayDate()}
                onChange={(e) => setDateValue(e.target.value)}
                className={`${inputClass} cursor-pointer dark:[color-scheme:dark]`}
                {...errorProps("report-date")}
              />
              <FieldError
                fieldId="report-date"
                message={fieldErrors["report-date"]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="report-time" className={labelClass}>
                {type === "lost" ? "Approximate time lost" : "Approximate time found"}{" "}
                <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="report-time"
                name="reportTime"
                type="time"
                required
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className={`${inputClass} cursor-pointer dark:[color-scheme:dark]`}
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
                <SelectDropdown
                  id="report-building"
                  value={building}
                  onChange={setBuilding}
                  options={buildingOptions.map((buildingOption) => ({
                    value: buildingOption,
                    label: buildingOption,
                  }))}
                  placeholder="Select a building"
                  allowEmpty
                  className={inputClass}
                  {...errorProps("report-building")}
                />
                <FieldError
                  fieldId="report-building"
                  message={fieldErrors["report-building"]}
                />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="report-location" className={labelClass}>
                  {type === "lost" ? "Location lost" : "Location found"}{" "}
                  <span className="text-[#E5192D]" aria-hidden="true">*</span>
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
                Category <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <SelectDropdown
                id="report-category"
                value={category}
                onChange={(val) => {
                  const nextCategory = val as Item["category"] | "";
                  setCategory(nextCategory);
                  if (!isOtherCategory(nextCategory)) {
                    setFieldErrors((prev) => {
                      if (!prev["report-custom-category"]) return prev;
                      const next = { ...prev };
                      delete next["report-custom-category"];
                      return next;
                    });
                  }
                }}
                options={categoryOptions.map((categoryOption) => ({
                  value: categoryOption.id,
                  label: categoryOption.label,
                }))}
                placeholder="Select category"
                className={inputClass}
                {...errorProps("report-category")}
              />
              <FieldError
                fieldId="report-category"
                message={fieldErrors["report-category"]}
              />
            </div>
          </div>

          {isOtherCategory(category) && (
            <div>
              <label htmlFor="report-custom-category" className={labelClass}>
                Specify category{" "}
                <span className="text-[#E5192D]" aria-hidden="true">*</span>
              </label>
              <input
                id="report-custom-category"
                name="customCategory"
                type="text"
                required
                maxLength={80}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g., Helmet, Camera, Musical Instrument…"
                autoComplete="off"
                className={inputClass}
                {...errorProps("report-custom-category")}
              />
              <FieldError
                fieldId="report-custom-category"
                message={fieldErrors["report-custom-category"]}
              />
            </div>
          )}

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
              Important details <span className="text-[#E5192D]" aria-hidden="true">*</span>
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
              Private — used only to verify ownership.
            </p>
          </div>

          <div className="flex justify-end border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E5192D] px-6 text-sm font-bold text-white transition-colors hover:bg-[#c91424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-44"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Publishing</span>
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
