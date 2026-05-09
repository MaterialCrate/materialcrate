import { prisma } from "../config/prisma.js";
import {
  createNotification,
  NOTIFICATION_ICON,
  NOTIFICATION_TYPE,
} from "./notifications.js";
import type { PlagiarismDetectionResult } from "./plagiarism/types.js";

export const createPlagiarismCase = async (
  result: PlagiarismDetectionResult,
  suspectedPostId: string,
): Promise<void> => {
  if (result.overallVerdict === "CLEAN") return;

  const topMatch = result.matchesByPost[0];
  if (!topMatch) return;

  const originalPostId = topMatch.postId;

  const existing = await prisma.plagiarismCase.findUnique({
    where: { originalPostId_suspectedPostId: { originalPostId, suspectedPostId } },
    select: { id: true },
  });
  if (existing) return;

  const [originalPost, suspectedPost] = await Promise.all([
    prisma.post.findUnique({
      where: { id: originalPostId },
      select: { id: true, title: true, authorId: true },
    }),
    prisma.post.findUnique({
      where: { id: suspectedPostId },
      select: { id: true, title: true, authorId: true },
    }),
  ]);

  if (!originalPost || !suspectedPost) return;

  const isDuplicate = result.overallVerdict === "DUPLICATE";

  const plagiarismCase = await prisma.plagiarismCase.create({
    data: {
      originalPostId,
      suspectedPostId,
      similarityScore: result.overallScore,
      verdict: result.overallVerdict,
      status: "PENDING_REVIEW",
      matchedChunkCount: topMatch.matchedChunks.length,
      totalChunkCount: result.totalChunks,
      revenueRedirectEnabled: isDuplicate && Boolean(originalPost.authorId),
      matchSummaryJson: {
        matches: result.matchesByPost.slice(0, 5).map((m) => ({
          postId: m.postId,
          weightedScore: m.weightedScore,
          plagiarismPercentage: m.plagiarismPercentage,
          matchedChunkCount: m.matchedChunks.length,
          verdict: m.verdict,
          confidence: m.confidence,
        })),
      },
    },
  });

  if (isDuplicate && originalPost.authorId) {
    await prisma.revenueRedirect.create({
      data: {
        caseId: plagiarismCase.id,
        sourcePostId: suspectedPostId,
        beneficiaryPostId: originalPostId,
        beneficiaryUserId: originalPost.authorId,
        redirectPercentage: 100,
        reason: `Duplicate detected: ${(result.overallScore * 100).toFixed(1)}% similarity to post ${originalPostId}`,
        active: true,
      },
    });
  }

  const scorePercent = `${(result.overallScore * 100).toFixed(0)}%`;

  const notifyOriginalAuthor = originalPost.authorId
    ? createNotification({
        userId: originalPost.authorId,
        type: NOTIFICATION_TYPE.PLAGIARISM_ORIGINAL_AUTHOR,
        title: "Plagiarism detected on your document",
        description: isDuplicate
          ? `A newly uploaded document matches your "${originalPost.title}" at ${scorePercent} similarity. Revenue from the copy will be redirected to you automatically.`
          : `A document similar to your "${originalPost.title}" was uploaded (${scorePercent} match). Our team will review it.`,
        icon: NOTIFICATION_ICON.PLAGIARISM,
        postId: originalPostId,
      }).catch(() => null)
    : Promise.resolve(null);

  const notifySuspectedCopier = suspectedPost.authorId
    ? createNotification({
        userId: suspectedPost.authorId,
        type: NOTIFICATION_TYPE.PLAGIARISM_FLAGGED_UPLOAD,
        title: "Your upload is under review",
        description: `Your document "${suspectedPost.title}" has been flagged for ${scorePercent} similarity to an existing document. Our moderation team will review it shortly.`,
        icon: NOTIFICATION_ICON.PLAGIARISM,
        postId: suspectedPostId,
      }).catch(() => null)
    : Promise.resolve(null);

  await Promise.all([notifyOriginalAuthor, notifySuspectedCopier]);
};
