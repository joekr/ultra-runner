// state/achievementNotifications.ts — Signal for achievement toast notifications

import { signal } from "@preact/signals";

export interface AchievementNotification {
  id: string;
  name: string;
  description: string;
}

/**
 * Queue of achievement notifications waiting to be displayed.
 * Components consume from this queue to show toasts.
 */
export const pendingAchievements = signal<AchievementNotification[]>([]);

/**
 * Push new achievement notifications onto the queue.
 */
export function pushAchievementNotifications(notifications: AchievementNotification[]): void {
  if (notifications.length === 0) return;
  pendingAchievements.value = [...pendingAchievements.value, ...notifications];
}

/**
 * Remove the first notification from the queue (after it's been displayed).
 */
export function dismissAchievementNotification(): void {
  pendingAchievements.value = pendingAchievements.value.slice(1);
}
