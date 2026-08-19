"use client";

import { useActionState, useState } from "react";
import { updatePasswordAction } from "@/lib/actions/auth";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthFooter from "@/components/auth/AuthFooter";
import PasswordInput from "@/components/auth/PasswordInput";
import LoadingButton from "@/components/auth/LoadingButton";
import PasswordStrength from "@/components/auth/PasswordStrength";
import ErrorAlert from "@/components/auth/ErrorAlert";

const initialState = {
  error: "",
  success: "",
};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);
  const [password, setPassword] = useState("");

  return (
    <AuthCard>
      <AuthHeader
        title="Set new password"
        subtitle="Enter your new password below."
      />

      <form action={formAction} className="space-y-4">
        <ErrorAlert message={state?.error} />

        <div>
          <PasswordInput
            label="New password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2">
            <PasswordStrength password={password} />
          </div>
        </div>

        <LoadingButton loading={pending} type="submit">
          Update Password
        </LoadingButton>
      </form>

      <AuthFooter
        text=""
        linkText="Back to sign in"
        linkHref="/login"
      />
    </AuthCard>
  );
}