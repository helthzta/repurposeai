import type { Metadata } from "next";
import { AdminLoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Admin sign in — Adiy AI",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
