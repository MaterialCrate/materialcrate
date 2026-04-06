import { prisma } from "../../config/prisma.js";

type GraphQLContext = {
  user?: {
    sub?: string;
  };
};

const AI_TOKEN_LIMITS: Record<string, { daily: number; monthly: number }> = {
  free: { daily: 1_000, monthly: 10_000 },
  pro: { daily: 25_000, monthly: 500_000 },
  premium: { daily: 75_000, monthly: 2_000_000 },
};

const getTokenLimits = (plan: string) =>
  AI_TOKEN_LIMITS[plan] ?? AI_TOKEN_LIMITS.free;

const requireViewerId = (ctx: GraphQLContext) => {
  const userId = ctx.user?.sub;
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
};

const isSameDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const isSameMonth = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth();

const getNextDayResetUTC = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
};

const getNextMonthResetUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

const getResetUsage = (user: {
  aiTokensUsedDaily: number;
  aiTokensUsedMonthly: number;
  aiTokensDailyResetAt: Date;
  aiTokensMonthlyResetAt: Date;
}) => {
  const now = new Date();
  let dailyUsed = user.aiTokensUsedDaily;
  let monthlyUsed = user.aiTokensUsedMonthly;
  let needsDbReset = false;

  if (!isSameDay(now, new Date(user.aiTokensDailyResetAt))) {
    dailyUsed = 0;
    needsDbReset = true;
  }

  if (!isSameMonth(now, new Date(user.aiTokensMonthlyResetAt))) {
    monthlyUsed = 0;
    needsDbReset = true;
  }

  return { dailyUsed, monthlyUsed, needsDbReset };
};

export const AiUsageResolver = {
  Query: {
    myAiUsage: async (_: unknown, _args: unknown, ctx: GraphQLContext) => {
      const userId = requireViewerId(ctx);

      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          subscriptionPlan: true,
          aiTokensUsedDaily: true,
          aiTokensUsedMonthly: true,
          aiTokensDailyResetAt: true,
          aiTokensMonthlyResetAt: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const { dailyUsed, monthlyUsed, needsDbReset } = getResetUsage(user);
      const plan = user.subscriptionPlan || "free";
      const limits = getTokenLimits(plan);

      if (needsDbReset) {
        const now = new Date();
        const updateData: Record<string, unknown> = {};

        if (dailyUsed === 0) {
          updateData.aiTokensUsedDaily = 0;
          updateData.aiTokensDailyResetAt = now;
        }
        if (monthlyUsed === 0) {
          updateData.aiTokensUsedMonthly = 0;
          updateData.aiTokensMonthlyResetAt = now;
        }

        void (prisma as any).user
          .update({ where: { id: userId }, data: updateData })
          .catch(() => null);
      }

      return {
        dailyTokensUsed: dailyUsed,
        monthlyTokensUsed: monthlyUsed,
        dailyTokenLimit: limits.daily,
        monthlyTokenLimit: limits.monthly,
        dailyResetsAt: getNextDayResetUTC().toISOString(),
        monthlyResetsAt: getNextMonthResetUTC().toISOString(),
        plan,
      };
    },
  },
  Mutation: {
    recordAiTokenUsage: async (
      _: unknown,
      args: { tokensUsed: number },
      ctx: GraphQLContext,
    ) => {
      const userId = requireViewerId(ctx);
      const tokensUsed = Math.max(0, Math.round(args.tokensUsed));

      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          subscriptionPlan: true,
          aiTokensUsedDaily: true,
          aiTokensUsedMonthly: true,
          aiTokensDailyResetAt: true,
          aiTokensMonthlyResetAt: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const { dailyUsed, monthlyUsed } = getResetUsage(user);
      const now = new Date();

      const updatedUser = await (prisma as any).user.update({
        where: { id: userId },
        data: {
          aiTokensUsedDaily: dailyUsed + tokensUsed,
          aiTokensUsedMonthly: monthlyUsed + tokensUsed,
          aiTokensDailyResetAt:
            dailyUsed === 0 && user.aiTokensUsedDaily !== 0 ? now : undefined,
          aiTokensMonthlyResetAt:
            monthlyUsed === 0 && user.aiTokensUsedMonthly !== 0
              ? now
              : undefined,
        },
        select: {
          subscriptionPlan: true,
          aiTokensUsedDaily: true,
          aiTokensUsedMonthly: true,
          aiTokensDailyResetAt: true,
          aiTokensMonthlyResetAt: true,
        },
      });

      const plan = updatedUser.subscriptionPlan || "free";
      const limits = getTokenLimits(plan);

      return {
        dailyTokensUsed: updatedUser.aiTokensUsedDaily,
        monthlyTokensUsed: updatedUser.aiTokensUsedMonthly,
        dailyTokenLimit: limits.daily,
        monthlyTokenLimit: limits.monthly,
        dailyResetsAt: getNextDayResetUTC().toISOString(),
        monthlyResetsAt: getNextMonthResetUTC().toISOString(),
        plan,
      };
    },
  },
};
