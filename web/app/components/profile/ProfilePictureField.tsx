"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Edit, User } from "iconsax-reactjs";
import Cropper, { type Area } from "react-easy-crop";

const MAX_PROFILE_PICTURE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROFILE_PICTURE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const INVALID_PROFILE_PICTURE_TYPE_MESSAGE =
  "Use JPG, PNG, WEBP, or HEIC/HEIF only.";
const CROPPED_PROFILE_PICTURE_FILE_NAME = "profile-picture.webp";
const CROPPED_PROFILE_PICTURE_OUTPUT_MIME_TYPE = "image/webp";
const CROPPED_PROFILE_PICTURE_FALLBACK_MIME_TYPE = "image/jpeg";
const CROPPED_PROFILE_PICTURE_FALLBACK_FILE_NAME = "profile-picture.jpg";
const CROPPED_PROFILE_PICTURE_MAX_DIMENSION = 1200;
const CROPPED_PROFILE_PICTURE_QUALITY = 0.9;

const createImageElement = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(
        new Error(
          "This image format could not be loaded. Try converting it to JPG or PNG.",
        ),
      ),
    );
    image.src = url;
  });

const getNormalizedProfilePictureType = (file: File) => {
  const normalizedType = file.type.toLowerCase().trim();
  if (normalizedType) {
    return normalizedType;
  }

  const normalizedName = file.name.toLowerCase();
  if (/\.jpe?g$/i.test(normalizedName)) return "image/jpeg";
  if (/\.png$/i.test(normalizedName)) return "image/png";
  if (/\.webp$/i.test(normalizedName)) return "image/webp";
  if (/\.heic$/i.test(normalizedName)) return "image/heic";
  if (/\.heif$/i.test(normalizedName)) return "image/heif";

  return "";
};

const getCroppedProfilePictureBlob = async (
  imageUrl: string,
  cropArea: Area,
): Promise<Blob> => {
  const image = await createImageElement(imageUrl);
  const canvas = document.createElement("canvas");
  const longestSide = Math.max(cropArea.width, cropArea.height, 1);
  const scale =
    longestSide > CROPPED_PROFILE_PICTURE_MAX_DIMENSION
      ? CROPPED_PROFILE_PICTURE_MAX_DIMENSION / longestSide
      : 1;
  const outputWidth = Math.max(1, Math.round(cropArea.width * scale));
  const outputHeight = Math.max(1, Math.round(cropArea.height * scale));

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to crop image");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        // Fallback to JPEG if WebP isn't supported
        canvas.toBlob(
          (jpegBlob) => {
            if (!jpegBlob) {
              reject(new Error("Failed to crop image"));
              return;
            }
            resolve(jpegBlob);
          },
          CROPPED_PROFILE_PICTURE_FALLBACK_MIME_TYPE,
          CROPPED_PROFILE_PICTURE_QUALITY,
        );
      },
      CROPPED_PROFILE_PICTURE_OUTPUT_MIME_TYPE,
      CROPPED_PROFILE_PICTURE_QUALITY,
    );
  });
};

type ProfilePictureFieldProps = {
  imageUrl: string;
  onError: (message: string) => void;
  onClearStatus: () => void;
  onImageReady: (file: File, previewUrl: string) => void;
};

export default function ProfilePictureField({
  imageUrl,
  onError,
  onClearStatus,
  onImageReady,
}: ProfilePictureFieldProps) {
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [pendingProfilePictureUrl, setPendingProfilePictureUrl] =
    useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    return () => {
      if (pendingProfilePictureUrl) {
        URL.revokeObjectURL(pendingProfilePictureUrl);
      }
    };
  }, [pendingProfilePictureUrl]);

  const handleProfilePictureButtonClick = () => {
    profilePictureInputRef.current?.click();
  };

  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    const normalizedType = getNormalizedProfilePictureType(file);
    if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.includes(normalizedType)) {
      onError(INVALID_PROFILE_PICTURE_TYPE_MESSAGE);
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      onError("Profile picture must be 10MB or smaller.");
      return;
    }

    onClearStatus();

    const nextPendingUrl = URL.createObjectURL(file);
    setPendingProfilePictureUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return nextPendingUrl;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropModalOpen(true);
  };

  const handleCancelCrop = () => {
    setIsCropModalOpen(false);
    setPendingProfilePictureUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return "";
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleApplyCrop = async () => {
    if (!pendingProfilePictureUrl || !croppedAreaPixels) {
      onError("Please adjust the crop area before applying.");
      return;
    }

    try {
      const croppedBlob = await getCroppedProfilePictureBlob(
        pendingProfilePictureUrl,
        croppedAreaPixels,
      );
      const isWebp = croppedBlob.type === "image/webp";
      const croppedFile = new File(
        [croppedBlob],
        isWebp
          ? CROPPED_PROFILE_PICTURE_FILE_NAME
          : CROPPED_PROFILE_PICTURE_FALLBACK_FILE_NAME,
        { type: croppedBlob.type },
      );

      if (croppedFile.size > MAX_PROFILE_PICTURE_BYTES) {
        onError("Profile picture is still too large after cropping.");
        return;
      }

      onImageReady(croppedFile, URL.createObjectURL(croppedBlob));
      handleCancelCrop();
    } catch (cropError: unknown) {
      onError(
        cropError instanceof Error
          ? cropError.message
          : "Failed to crop image.",
      );
    }
  };

  return (
    <>
      {isCropModalOpen && (
        <div className="fixed inset-0 z-120 bg-black/25 backdrop-blur-[2px] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 space-y-4">
            <p className="font-medium text-[#222222]">Adjust profile picture</p>
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black">
              <Cropper
                image={pendingProfilePictureUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) =>
                  setCroppedAreaPixels(areaPixels)
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-[#5B5B5B]">Zoom</p>
              <input
                title="Image range selector"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex-1 py-2 rounded-xl border border-[#CFCFCF] text-[#4A4A4A]"
                onClick={handleCancelCrop}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-xl bg-[#E1761F] text-white"
                onClick={() => void handleApplyCrop()}
              >
                Use photo
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-35 h-35 aspect-square rounded-full bg-[#F1F1F1] relative flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Profile Picture"
            className="w-full h-full object-cover rounded-full"
            width={140}
            height={140}
            unoptimized
          />
        ) : (
          <User size={56} color="#797979" variant="Bold" />
        )}
        <input
          ref={profilePictureInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleProfilePictureChange}
          aria-hidden="true"
        />
        <button
          aria-label="edit pfp"
          type="button"
          className="w-10 h-10 bg-white shadow-xl rounded-full absolute bottom-1 right-1 flex items-center justify-center"
          onClick={handleProfilePictureButtonClick}
        >
          <Edit size={24} color="#797979" />
        </button>
      </div>
    </>
  );
}
