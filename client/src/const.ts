export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// For email/password auth, login is handled by the internal /login page.
// This function is kept for compatibility with useAuth hook.
export const getLoginUrl = () => "/login";
