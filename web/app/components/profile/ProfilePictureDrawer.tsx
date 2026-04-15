"use client";

import { Camera, CloseCircle, Trash } from "iconsax-reactjs";

type ProfilePictureDrawerProps = {
  isOpen: boolean;
  hasProfilePicture: boolean;
  isRemoving: boolean;
  onClose: () => void;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
};

export default function ProfilePictureDrawer({
  isOpen,
  hasProfilePicture,
  isRemoving,
  onClose,
  onChangePhoto,
  onRemovePhoto,
}: ProfilePictureDrawerProps) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-100 rounded-t-3xl bg-surface px-3 py-6 transition-all duration-300 ease-out lg:left-1/2 lg:right-auto lg:w-full lg:max-w-2xl lg:-translate-x-1/2 ${
        isOpen
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-[110%] opacity-0 pointer-events-none"
      }`}
    >
      <div className="space-y-5">
        <div className="flex justify-center items-center relative">
          <h1 className="text-lg text-ink font-medium">
            Profile Picture
          </h1>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={isRemoving}
            className="absolute right-0"
          >
            <CloseCircle size={24} color="#959595" />
          </button>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onChangePhoto();
              onClose();
            }}
            disabled={isRemoving}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition hover:bg-surface-high active:bg-surface-high"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF1DE]">
              <Camera size={20} color="#A95A13" variant="Bold" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Change photo</p>
              <p className="text-xs text-ink-3">
                Upload a new profile picture
              </p>
            </div>
          </button>
          {hasProfilePicture && (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={isRemoving}
              className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition hover:bg-surface-high active:bg-surface-high disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE5E5]">
                <Trash size={20} color="#D44" variant="Bold" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#D44]">
                  {isRemoving ? "Removing..." : "Remove photo"}
                </p>
                <p className="text-xs text-ink-3">
                  Delete your current profile picture
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
