import { Router } from "express";
import { authenticateToken, isAdmin } from "../middleware/auth";
import { createNotification, deleteNotification, getUnreadNotificationCount, listAdminNotifications, listUserNotifications, markNotificationRead } from "../services/notification.service";

const router = Router();

  router.post("/api/admin/notifications", authenticateToken, isAdmin, async (req, res) => {
    try {
      const adminId = (req as any).user.id;
      res.json(await createNotification(req.body, adminId));
    } catch (e: any) {
      console.error('Create notification error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to create notification" });
    }
  });

  // Manage notifications (admin)

  router.get("/api/admin/notifications", authenticateToken, isAdmin, async (_req, res) => {
    try {
      res.json(await listAdminNotifications());
    } catch (e: any) {
      console.error('Fetch admin notifications error:', e.message);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  router.delete("/api/admin/notifications/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      res.json(await deleteNotification(req.params.id));
    } catch (e: any) {
      console.error('Delete notification error:', e.message);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Get notifications for current user

  router.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      res.json(await listUserNotifications(userId, userRole));
    } catch (e: any) {
      console.error('Fetch notifications error:', e.message);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  router.get("/api/notifications/unread/count", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      res.json(await getUnreadNotificationCount(userId, userRole));
    } catch (e: any) {
      console.error('Fetch unread notification count error:', e.message);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  router.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      res.json(await markNotificationRead(req.params.id, userId, userRole));
    } catch (e: any) {
      console.error('Mark notification read error:', e.message);
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Failed to mark notification as read" });
    }
  });
export default router;
