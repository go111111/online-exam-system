import { getOne, isUsingMySQL, query } from "../db";

export async function createNotification(payload: any, adminId: number | string) {
  const { title, content, type = "announcement", target_role = "all", exam_id = null } = payload;

  if (!title || !content) {
    const error = new Error("通知标题和内容不能为空") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const targetRole = ["all", "student", "admin"].includes(target_role) ? target_role : "all";
  const result = await query(
    `INSERT INTO notifications (title, content, type, target_role, exam_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, content, type, targetRole, exam_id, adminId]
  );
  const notificationId = (result as any).insertId;
  const recipient = await getOne(
    `SELECT COUNT(*) as count FROM users WHERE ? = 'all' OR role = ?`,
    [targetRole, targetRole]
  );

  return {
    id: notificationId,
    recipientCount: Number(recipient?.count || 0),
    message: "通知发布成功"
  };
}

export async function listAdminNotifications() {
  const notifications = await query(
    `SELECT n.id,
            n.title,
            n.content,
            n.type,
            n.target_role as targetRole,
            n.created_at as createdAt,
            u.email as createdByEmail,
            (
              SELECT COUNT(*)
              FROM users target_user
              WHERE n.target_role = 'all' OR target_user.role = n.target_role
            ) as recipientCount,
            (
              SELECT COUNT(*)
              FROM notification_reads nr
              WHERE nr.notification_id = n.id
            ) as readCount
     FROM notifications n
     LEFT JOIN users u ON n.created_by = u.id
     ORDER BY n.created_at DESC`
  );

  return (Array.isArray(notifications) ? notifications : []).map((item: any) => ({
    ...item,
    recipientCount: Number(item.recipientCount || 0),
    readCount: Number(item.readCount || 0),
    unreadCount: Math.max(0, Number(item.recipientCount || 0) - Number(item.readCount || 0))
  }));
}

export async function deleteNotification(id: string | number) {
  await query("DELETE FROM notification_reads WHERE notification_id = ?", [id]);
  await query("DELETE FROM notifications WHERE id = ?", [id]);
  return { success: true };
}

export async function listUserNotifications(userId: string | number, userRole: string) {
  const notifications = await query(
    `SELECT n.id,
            n.title,
            n.content,
            n.type,
            n.target_role,
            n.created_at,
            CASE WHEN nr.id IS NULL THEN 0 ELSE 1 END as is_read
     FROM notifications n
     LEFT JOIN notification_reads nr
       ON nr.notification_id = n.id
      AND nr.user_id = ?
     WHERE n.target_role = 'all' OR n.target_role = ?
     ORDER BY n.created_at DESC`,
    [userId, userRole]
  );

  return (Array.isArray(notifications) ? notifications : []).map((item: any) => ({
    ...item,
    is_read: Boolean(item.is_read)
  }));
}

export async function getUnreadNotificationCount(userId: string | number, userRole: string) {
  const countRow = await getOne(
    `SELECT COUNT(*) as count
     FROM notifications n
     LEFT JOIN notification_reads nr
       ON nr.notification_id = n.id
      AND nr.user_id = ?
     WHERE (n.target_role = 'all' OR n.target_role = ?)
       AND nr.id IS NULL`,
    [userId, userRole]
  );

  return { unread_count: Number(countRow?.count || 0) };
}

export async function markNotificationRead(id: string | number, userId: string | number, userRole: string) {
  const notification = await getOne(
    `SELECT id FROM notifications WHERE id = ? AND (target_role = 'all' OR target_role = ?)`,
    [id, userRole]
  );

  if (!notification) {
    const error = new Error("Notification not found") as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (isUsingMySQL()) {
    await query(
      `INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)`,
      [id, userId]
    );
  } else {
    await query(
      `INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)`,
      [id, userId]
    );
  }

  return { success: true };
}
