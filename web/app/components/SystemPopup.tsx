"use client";

import {
  createContext,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draftValue, setDraftValue] = useState(
    popup.config.kind === "prompt" ? (popup.config.defaultValue ?? "") : "",
  );

  useEffect(() => {
    if (popup.config.kind !== "prompt") {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [popup.config.kind]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose(null);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onClose(popup.config.kind === "prompt" ? draftValue : true);
    }
  };

  const isDestructive =
    popup.config.kind === "confirm" && popup.config.isDestructive;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-popup-title"
      aria-describedby={
        popup.config.message ? "system-popup-message" : undefined
      }
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/28 px-5 backdrop-blur-[2px]"
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-85 overflow-hidden rounded-[22px] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pb-4 pt-5 text-center">
          <h2
            id="system-popup-title"
            className="text-[17px] font-semibold leading-5 text-[#111111]"
          >
            {popup.config.title}
          </h2>
          {popup.config.message ? (
            <p
              id="system-popup-message"
              className="mt-1 text-[13px] leading-[1.35] text-[#3D3D3D]"
            >
              {popup.config.message}
            </p>
          ) : null}
          {popup.config.kind === "prompt" ? (
            <input
              ref={inputRef}
              type={popup.config.inputType ?? "text"}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              placeholder={popup.config.placeholder}
              className="mt-4 h-11 w-full rounded-xl border border-black/10 bg-[#F5F5F7] px-3 text-[#111111] outline-none placeholder:text-[#9B9BA1] focus:border-[#E1761F]"
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="flex h-11 w-full items-center justify-center text-[17px] font-normal text-[#8a8a8a] transition-colors hover:bg-black/3"
          >
            {popup.config.cancelLabel ?? "Cancel"}
          </button>
          <div className="w-px h-full bg-black/30" />
          <button
            type="button"
            onClick={() =>
              onClose(popup.config.kind === "prompt" ? draftValue : true)
            }
            className={`flex h-11 w-full items-center justify-center text-[17px] transition-colors hover:bg-black/3 ${
              isDestructive
                ? "font-semibold text-[#FF3B30]"
                : "font-semibold text-[#E1761F]"
            }`}
          >
            {popup.config.confirmLabel ?? "OK"}
          </button>
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
      {activePopup ? (
        <PopupCard popup={activePopup} onClose={closePopup} />
      ) : null}
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
