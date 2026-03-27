"use client";

import {
  createContext,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type ConfirmPopupConfig = {
  kind: "confirm";
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
};

type PromptPopupConfig = {
  kind: "prompt";
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: InputHTMLAttributes<HTMLInputElement>["type"];
};

type PopupContextValue = {
  confirm: (config: Omit<ConfirmPopupConfig, "kind">) => Promise<boolean>;
  prompt: (config: Omit<PromptPopupConfig, "kind">) => Promise<string | null>;
};

const PopupContext = createContext<PopupContextValue | null>(null);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ActivePopup =
  | {
      config: ConfirmPopupConfig;
      resolve: (value: boolean) => void;
    }
  | {
      config: PromptPopupConfig;
      resolve: (value: string | null) => void;
    };

function PopupCard({
  popup,
  onClose,
}: {
  popup: ActivePopup;
  onClose: (value: boolean | string | null) => void;
}) {
  const [draftValue, setDraftValue] = useState(
    popup.config.kind === "prompt" ? (popup.config.defaultValue ?? "") : "",
  );
  const isEmailPrompt =
    popup.config.kind === "prompt" && popup.config.inputType === "email";
  const isPromptSubmissionDisabled =
    popup.config.kind === "prompt" &&
    isEmailPrompt &&
    !EMAIL_REGEX.test(draftValue.trim());

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose(null);
    }

    if (event.key === "Enter") {
      if (isPromptSubmissionDisabled) {
        return;
      }
      event.preventDefault();
      onClose(popup.config.kind === "prompt" ? draftValue : true);
    }
  };

  const isDestructive =
    popup.config.kind === "confirm" && popup.config.isDestructive;
  const eyebrow =
    popup.config.kind === "prompt" ? "Input Required" : "Confirmation";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-popup-title"
      aria-describedby={
        popup.config.message ? "system-popup-message" : undefined
      }
      className="fixed inset-0 z-120 flex items-center justify-center bg-[#111111]/36 px-5 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-96 overflow-hidden rounded-[28px] border border-black/6 bg-[#F7F7F7] shadow-[0_28px_80px_rgba(0,0,0,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[#1D1D1D] px-5 pb-5 pt-5 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
            {eyebrow}
          </p>
          <h2
            id="system-popup-title"
            className="mt-2 text-[28px] font-semibold leading-8 tracking-[-0.03em] text-white"
          >
            {popup.config.title}
          </h2>
          {popup.config.message ? (
            <p
              id="system-popup-message"
              className="mt-2 max-w-80 text-sm leading-6 text-white/72"
            >
              {popup.config.message}
            </p>
          ) : null}
        </div>

        <div className="px-5 pb-5 pt-4">
          {popup.config.kind === "prompt" ? (
            <input
              autoFocus
              type={popup.config.inputType ?? "text"}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              placeholder={popup.config.placeholder}
              className="h-13 w-full rounded-2xl border border-black/8 bg-white px-4 text-[15px] text-[#202020] outline-none placeholder:text-[#9B9B9B] focus:border-[#E1761F] focus:bg-[#FFFDFC]"
            />
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onClose(null)}
              className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-black/8 bg-white text-[15px] font-medium text-[#5F5F5F] transition-colors hover:bg-black/3"
            >
              {popup.config.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              disabled={isPromptSubmissionDisabled}
              onClick={() =>
                onClose(popup.config.kind === "prompt" ? draftValue : true)
              }
              className={`flex h-12 flex-1 items-center justify-center rounded-2xl text-[15px] font-semibold text-white transition-colors ${
                isPromptSubmissionDisabled
                  ? "cursor-not-allowed bg-[#CFCFCF] text-white/80"
                  : isDestructive
                    ? "bg-[#C04A4A] hover:bg-[#AF3F3F]"
                    : "bg-[#E1761F] hover:bg-[#C96619]"
              }`}
            >
              {popup.config.confirmLabel ?? "OK"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SystemPopupProvider({ children }: { children: ReactNode }) {
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);

  useEffect(() => {
    if (!activePopup) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activePopup]);

  const closePopup = (value: boolean | string | null) => {
    if (!activePopup) {
      return;
    }

    if (activePopup.config.kind === "confirm") {
      (activePopup.resolve as (result: boolean) => void)(Boolean(value));
    } else {
      (activePopup.resolve as (result: string | null) => void)(
        typeof value === "string" ? value : null,
      );
    }

    setActivePopup(null);
  };

  return (
    <PopupContext.Provider
      value={{
        confirm: (config) =>
          new Promise<boolean>((resolve) => {
            setActivePopup({
              config: { ...config, kind: "confirm" },
              resolve,
            });
          }),
        prompt: (config) =>
          new Promise<string | null>((resolve) => {
            setActivePopup({
              config: { ...config, kind: "prompt" },
              resolve,
            });
          }),
      }}
    >
      {children}
      {activePopup && (
        <PopupCard
          key={`${activePopup.config.kind}:${activePopup.config.title}:${activePopup.config.message ?? ""}:${activePopup.config.kind === "prompt" ? (activePopup.config.defaultValue ?? "") : ""}`}
          popup={activePopup}
          onClose={closePopup}
        />
      )}
    </PopupContext.Provider>
  );
}

export function useSystemPopup() {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error("useSystemPopup must be used within SystemPopupProvider");
  }

  return context;
}
