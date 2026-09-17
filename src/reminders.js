import { Capacitor } from "@capacitor/core";

export async function ensureDailyDiscoveryReminder() {
  if (!Capacitor.isNativePlatform()) return { scheduled: false, reason: "browser" };
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { scheduled: false, reason: "permission" };
  await LocalNotifications.schedule({ notifications: [{ id: 805, title: "Apply Desk", body: "每日岗位已更新，打开查看真实新增数。", schedule: { on: { hour: 8, minute: 5 }, repeats: true }, extra: { page: "command" } }] });
  return { scheduled: true };
}
