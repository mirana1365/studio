// src/app/actions/authActions.ts
"use server";

import { cookies } from "next/headers";
import { verifyPassword } from "@/lib/auth";
import { z } from "zod";

const SESSION_COOKIE_NAME = "fileforge-admin-session";
const ADMIN_USERNAME = "admin"; 

const loginSchema = z.object({
  username: z.string().refine(val => val === ADMIN_USERNAME, {message: "نام کاربری نامعتبر است."}),
  password: z.string().min(1, "رمز عبور الزامی است."),
});

export async function login(formData: FormData): Promise<{ success: boolean; message: string }> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ username, password });

  if (!parsed.success) {
    return { success: false, message: parsed.error.errors.map(e => e.message).join(", ") };
  }
  
  const isValidPassword = await verifyPassword(parsed.data.password);

  if (isValidPassword) {
    cookies().set(SESSION_COOKIE_NAME, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, 
      path: "/",
    });
    return { success: true, message: "ورود موفقیت آمیز بود." };
  } else {
    return { success: false, message: "نام کاربری یا رمز عبور نامعتبر است." };
  }
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function checkAuth(): Promise<{ isAuthenticated: boolean }> {
  const session = cookies().get(SESSION_COOKIE_NAME);
  return { isAuthenticated: !!session && session.value === "authenticated" };
}
