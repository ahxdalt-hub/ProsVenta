"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/lib/actions/auth";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthInput from "@/components/auth/AuthInput";
import LoadingButton from "@/components/auth/LoadingButton";
import ErrorAlert from "@/components/auth/ErrorAlert";
import SuccessAlert from "@/components/auth/SuccessAlert";

const initialState = {
  error: "",
  success: "",
};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <AuthCard>
      <AuthHeader
        title="Reset your password"
        subtitle="Enter your email and we'll send you a reset link."
      />

      <form action={formAction} className="space-y-4">
        <ErrorAlert message={state?.error} />
        <SuccessAlert message={state?.success} />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />

        <LoadingButton loading={pending} type="submit">
          Send Reset Link
        </LoadingButton>
      </form>

      <AuthFooter
        text="Remember your password?"
        linkText="Sign in"
        linkHref="/login"
      />
    </AuthCard>
  );
}