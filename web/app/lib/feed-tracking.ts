export type FeedInteractionPayload = {
  postId?: string | null;
  interactionType: string;
  signalKind?: "positive" | "negative" | "context" | string;
  category?: string | null;
  searchTerm?: string | null;
  durationMs?: number | null;
  metadata?: string | Record<string, unknown> | null;
};

export async function trackFeedInteraction(payload: FeedInteractionPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/feed/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        metadata:
          payload.metadata && typeof payload.metadata === "object"
            ? JSON.stringify(payload.metadata)
            : payload.metadata,
      }),
      keepalive: true,
    });
  } catch {
    // best-effort signal logging
  }
}
