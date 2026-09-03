"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
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

/**
 * Login page — the form sits directly on the light auth surface (no floating
 * card). All auth behavior (validation, loading, error, success redirect)
 * is unchanged.
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const isAuthenticated = state?.isAuthenticated === true;

  return (
    <>
      <AuthSuccessTransition isAuthenticated={isAuthenticated} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="mb-8 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500">
            Sign in to your workspace to continue.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
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
              className="text-xs font-medium text-blue-600 transition-colors duration-150 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

          <LoadingButton loading={pending} type="submit">
            Sign In
          </LoadingButton>
        </form>

        {/* Footer */}
        <p className="mt-8 text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 transition-colors duration-150 hover:text-blue-500"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </>
  );
}
