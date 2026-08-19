import { User } from "../types";

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
export const TOKEN_KEY = "mobasher_auth_token";
export const BACKUP_TOKEN_KEY = "mobasher_karmon_token";
export const USER_KEY = "mobasher_current_user";
export const LAST_ACTIVITY_KEY = "mobasher_last_activity_time";
export const LOGOUT_NOTICE_KEY = "mobasher_session_notice";

let lastRecordedTime = 0;

/**
 * Record user activity timestamp in localStorage and in memory.
 * Throttled to write to localStorage at most once every 5 seconds.
 */
export function recordUserActivity(force: boolean = false): void {
  const now = Date.now();
  if (force || now - lastRecordedTime > 5000) {
    lastRecordedTime = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    } catch (e) {
      // Ignore localStorage write errors (e.g. quota/privacy)
    }
  }
}

/**
 * Returns the timestamp of the last recorded activity.
 */
export function getLastActivityTime(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch (e) {
    return 0;
  }
}

/**
 * Checks if the session has expired due to 30 minutes of inactivity.
 */
export function isSessionExpiredDueToInactivity(): boolean {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(BACKUP_TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  
  // If no user is logged in, it's not "expired", just unauthenticated
  if (!token && !user) {
    return false;
  }

  const lastActivity = getLastActivityTime();
  if (!lastActivity) {
    // If token exists but no activity recorded yet, check if just logged in or treat as expired
    return false;
  }

  const elapsed = Date.now() - lastActivity;
  return elapsed >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Save user session to localStorage with current activity time.
 */
export function saveUserSession(user: User, token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(BACKUP_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(LOGOUT_NOTICE_KEY);
    recordUserActivity(true);
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

/**
 * Clears user session and optionally sets an inactivity notice.
 */
export function clearUserSession(reason: "manual" | "inactivity" = "manual"): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(BACKUP_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    lastRecordedTime = 0;

    if (reason === "inactivity") {
      localStorage.setItem(
        LOGOUT_NOTICE_KEY,
        "به دلیل ۳۰ دقیقه عدم فعالیت در سایت، از حساب کاربری خارج شدید. لطفاً مجدداً وارد شوید."
      );
    } else {
      localStorage.removeItem(LOGOUT_NOTICE_KEY);
    }
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}

/**
 * Get and consume the session notice (e.g. displayed on AuthModal).
 */
export function getAndClearSessionNotice(): string | null {
  try {
    const notice = localStorage.getItem(LOGOUT_NOTICE_KEY);
    if (notice) {
      localStorage.removeItem(LOGOUT_NOTICE_KEY);
      return notice;
    }
  } catch (e) {}
  return null;
}

/**
 * Setup global listeners to track user activity and an interval to trigger auto-logout after 30 minutes of inactivity.
 */
export function initSessionInactivityTracker(onInactivityLogout: () => void): () => void {
  const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

  const handleUserActivity = () => {
    recordUserActivity(false);
  };

  // Attach global event listeners
  events.forEach((event) => {
    window.addEventListener(event, handleUserActivity, { passive: true });
  });

  // Record initial activity on init
  recordUserActivity(true);

  // Interval check every 10 seconds for 30 minutes inactivity
  const intervalId = setInterval(() => {
    if (isSessionExpiredDueToInactivity()) {
      clearUserSession("inactivity");
      onInactivityLogout();
    }
  }, 10000);

  // Return cleanup function
  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, handleUserActivity);
    });
    clearInterval(intervalId);
  };
}
