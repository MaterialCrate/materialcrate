import React, { useEffect, useRef, useState } from "react";
import ActionButton from "../ActionButton";
import { IoMdCheckmarkCircle, IoMdCloseCircle } from "react-icons/io";

interface passwordTypes {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  onValidated?: (username: string) => void;
}

export default function Username({
  username,
  setUsername,
  onValidated,
}: passwordTypes) {
  const [message, setMessage] = useState<string>("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [isLiveChecking, setIsLiveChecking] = useState<boolean>(false);
  const [isSubmitChecking, setIsSubmitChecking] = useState<boolean>(false);
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  const minUsernameLength = 3;
  const lastLiveCheckedUsernameRef = useRef<string>("");
  const isChecking = isLiveChecking || isSubmitChecking;

  const getValidationError = (value: string) => {
    if (!usernameRegex.test(value)) {
      return "Username may only contain letters, numbers, and underscores.";
    }
    return "";
  };

  const checkUsernameAvailability = async (
    candidate: string,
    signal?: AbortSignal,
  ) => {
    const response = await fetch(
      `/api/auth/username-available?username=${encodeURIComponent(candidate)}`,
      { signal },
    );
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        available: false,
        error:
          body?.error || "Error connecting to server. Please try again later.",
      };
    }

    return {
      ok: true,
      available: Boolean(body?.available),
      error: "",
    };
  };

  useEffect(() => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setMessage("");
      setIsLiveChecking(false);
      return;
    }

    const validationError = getValidationError(trimmedUsername);
    if (validationError) {
      setMessage(validationError);
      setIsLiveChecking(false);
      return;
    }

    if (trimmedUsername === lastLiveCheckedUsernameRef.current) {
      setIsLiveChecking(false);
      return;
    }

    setIsLiveChecking(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(
          trimmedUsername,
          controller.signal,
        );

        if (!result.ok) {
          setMessage(result.error);
          return;
        }

        lastLiveCheckedUsernameRef.current = trimmedUsername;
        setIsUsernameAvailable(result.available ? true : false);
        setMessage("");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMessage("Error connecting to server. Please try again later.");
      } finally {
        setIsLiveChecking(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [username]);

  const handleUsernameSet = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    const validationError = getValidationError(trimmedUsername);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setIsSubmitChecking(true);
      const result = await checkUsernameAvailability(trimmedUsername);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      if (!result.available) {
        setIsUsernameAvailable(false);
        return;
      }

      lastLiveCheckedUsernameRef.current = trimmedUsername;
      setMessage("");
      setUsername(trimmedUsername);
      onValidated?.(trimmedUsername);
    } catch {
      setMessage("Could not check username availability.");
    } finally {
      setIsSubmitChecking(false);
    }
  };
  return (
    <div className="h-full relative w-full">
      <div className="flex flex-col w-full h-full justify-center">
        <div>
          <h4 className="font-medium">USERNAME</h4>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                lastLiveCheckedUsernameRef.current = "";
              }}
              placeholder="e.g. bookworm"
              className="border border-black w-full px-4 py-3 pr-12 rounded-lg focus:outline-none"
              required
            />
            {isChecking && username.length >= minUsernameLength ? (
              <span
                aria-hidden="true"
                className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-[#E1761F] border-t-transparent animate-spin"
              />
            ) : (
              username.length >= minUsernameLength &&
              !message && (
                <p
                  className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold  ${isUsernameAvailable ? "text-green-500" : "text-red-500"}`}
                >
                  {isUsernameAvailable ? (
                    <IoMdCheckmarkCircle size={24} />
                  ) : (
                    <IoMdCloseCircle size={24} />
                  )}
                </p>
              )
            )}
          </div>
          <p className="text-[12px] text-red-500">{message}</p>
        </div>
      </div>
      <ActionButton
        type="submit"
        disabled={
          !username.trim() ||
          isSubmitChecking ||
          username.length < minUsernameLength ||
          getValidationError(username.trim()) !== "" ||
          isUsernameAvailable === false
        }
        onClick={handleUsernameSet}
        className="fixed bottom-8 left-8 right-8 mx-auto"
      >
        NEXT
      </ActionButton>
    </div>
  );
}
