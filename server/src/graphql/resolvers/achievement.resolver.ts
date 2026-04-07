import { prisma } from "../../config/prisma.js";
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_MAP } from "../../achievements/definitions.js";

type GraphQLContext = { user?: { sub: string } };

async function getHolderPercentage(achievementId: string): Promise<number> {
  const [holderCount, totalUsers] = await Promise.all([
    prisma.userAchievement.count({ where: { achievementId } }),
    (prisma as any).user.count({ where: { deleted: false, disabled: false } }),
  ]);
  if (!totalUsers) return 0;
  return Math.round((holderCount / totalUsers) * 1000) / 10; // 1 decimal
}

export const AchievementResolver = {
  Query: {
    achievement: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      const def = ACHIEVEMENT_MAP.get(id);
      if (!def) return null;

      const [holderPercentage, userRecord] = await Promise.all([
        getHolderPercentage(id),
        ctx.user?.sub
          ? prisma.userAchievement.findUnique({
              where: { userId_achievementId: { userId: ctx.user.sub, achievementId: id } },
            })
          : Promise.resolve(null),
      ]);

      return {
        ...def,
        unlockedAt: userRecord ? userRecord.unlockedAt.toISOString() : null,
        holderPercentage,
      };
    },

    userAchievements: async (
      _: unknown,
      { username }: { username: string },
    ) => {
      const user = await (prisma as any).user.findFirst({
        where: { username, deleted: false },
        select: { id: true },
      });
      if (!user) return [];

      const records = await prisma.userAchievement.findMany({
        where: { userId: user.id },
        orderBy: { unlockedAt: "desc" },
      });

      const totalUsers = await (prisma as any).user.count({
        where: { deleted: false, disabled: false },
      });

      return Promise.all(
        records.map(async (record) => {
          const def = ACHIEVEMENT_MAP.get(record.achievementId);
          if (!def) return null;

          const holderCount = await prisma.userAchievement.count({
            where: { achievementId: record.achievementId },
          });
          const holderPercentage = totalUsers
            ? Math.round((holderCount / totalUsers) * 1000) / 10
            : 0;

          return {
            ...def,
            unlockedAt: record.unlockedAt.toISOString(),
            holderPercentage,
          };
        }),
      ).then((results) => results.filter(Boolean));
    },

    allAchievements: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const [totalUsers, userRecords] = await Promise.all([
        (prisma as any).user.count({ where: { deleted: false, disabled: false } }),
        ctx.user?.sub
          ? prisma.userAchievement.findMany({ where: { userId: ctx.user.sub } })
          : Promise.resolve([]),
      ]);

      const unlockedMap = new Map(
        userRecords.map((r) => [r.achievementId, r.unlockedAt]),
      );

      // Batch holder counts
      const holderCounts = await Promise.all(
        ACHIEVEMENT_DEFINITIONS.map((a) =>
          prisma.userAchievement.count({ where: { achievementId: a.id } }),
        ),
      );

      return ACHIEVEMENT_DEFINITIONS.map((def, i) => ({
        ...def,
        unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
        holderPercentage: totalUsers
          ? Math.round((holderCounts[i] / totalUsers) * 1000) / 10
          : 0,
      }));
    },
  },
};
