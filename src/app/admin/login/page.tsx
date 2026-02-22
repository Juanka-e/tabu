import { redirect } from "next/navigation";

/**
 * /admin/login is no longer needed — all users log in via /login.
 * This redirect ensures any bookmarks or old links still work.
 */
export default function AdminLoginRedirect() {
    redirect("/login");
}
