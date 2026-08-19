"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ActionState {
  error?: string;
  success?: string;
  isAuthenticated?: boolean;
  userName?: string;
}

export async function loginAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const userName = data.user?.user_metadata?.full_name as string | undefined;

  return { success: "Signing you in...", isAuthenticated: true, userName };
}

export async function signupAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    return { error: "All fields are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If the session is created (no email confirmation required), we can transition directly
  if (data.session) {
    return { success: "Account created!", isAuthenticated: true };
  }

  return { success: "Check your email to confirm your account." };
}

export async function forgotPasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for a reset link." };
}

export async function updatePasswordAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const password = formData.get("password") as string;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOutAction(_prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}