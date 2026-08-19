"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import LoadingButton from "@/components/auth/LoadingButton";
import RememberMe from "@/components/auth/RememberMe";
import ErrorAlert from "@/components/auth/ErrorAlert";
import AuthSuccessTransition from "@/components/auth/AuthSuccessTransition";
import { motion } from "framer-motion";

const initialState = {
  error: "",
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const isAuthenticated = state?.isAuthenticated === true;

  return (
    <>
    <AuthSuccessTransition isAuthenticated={isAuthenticated} />
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
    <AuthCard>
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to your account to continue."
      />

      <form action={formAction} className="space-y-4">
        <ErrorAlert message={state?.error} />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between">
          <RememberMe defaultChecked />
          <Link
            href="/forgot-password"
            className="text-xs text-blue-600 hover:text-blue-500 font-medium transition-colors duration-150"
          >
            Forgot password?
          </Link>
        </div>

        <LoadingButton loading={pending} type="submit">
          Sign In
        </LoadingButton>
      </form>

      <AuthFooter
        text="Don't have an account?"
        linkText="Create one"
        linkHref="/signup"
      />
    </AuthCard>
    </motion.div>
    </>
  );
}
