import type { Notification, NotificationType, Prisma, PrismaClient } from "@prisma/client";

export type PreferrableClient = Prisma.TransactionClient | PrismaClient;

export const NOTIFICATION_CHANNEL_IN_APP = "in_app";
export const NOTIFICATION_CHANNEL_EMAIL = "email";

// Security alerts cannot be disabled by the user and are always delivered.
export const ALWAYS_ENABLED_NOTIFICATION_TYPES: readonly NotificationType[] = ["security"];

export interface PreferredNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel?: string;
}

export async function isNotificationEnabled(
  client: PreferrableClient,
  userId: string,
  type: NotificationType,
  channel = NOTIFICATION_CHANNEL_IN_APP,
): Promise<boolean> {
  if (ALWAYS_ENABLED_NOTIFICATION_TYPES.includes(type)) {
    return true;
  }
  const preference = await client.notificationPreference.findUnique({
    where: {
      userId_type_channel: { userId, type, channel },
    },
    select: { enabled: true },
  });
  return preference ? preference.enabled : true;
}

export async function createNotificationIfPreferred(
  client: PreferrableClient,
  input: PreferredNotificationInput,
): Promise<Notification | null> {
  const channel = input.channel ?? NOTIFICATION_CHANNEL_IN_APP;
  if (!(await isNotificationEnabled(client, input.userId, input.type, channel))) {
    return null;
  }
  return client.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
    },
  });
}

export async function notifyAdminsOfNewBrokerApplication(
  client: PreferrableClient,
  applicant: { id: string; displayName: string },
): Promise<void> {
  const admins = await client.user.findMany({
    where: {
      role: { name: { in: ["admin", "super_admin"] } },
      deletedAt: null,
    },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotificationIfPreferred(client, {
      userId: admin.id,
      title: "طلب انضمام وسيط جديد",
      message: `تم استلام طلب انضمام جديد من "${applicant.displayName}". يمكنك مراجعته من صفحة طلبات انضمام الوسطاء.`,
      type: "system",
    });
  }
}
