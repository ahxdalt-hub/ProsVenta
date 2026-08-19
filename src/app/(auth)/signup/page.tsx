"use client";

import { useActionState, useState } from "react";
import { signupAction } from "@/lib/actions/auth";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthFooter from "@/components/auth/AuthFooter";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import LoadingButton from "@/components/auth/LoadingButton";
import PasswordStrength from "@/components/auth/PasswordStrength";
import ErrorAlert from "@/components/auth/ErrorAlert";
import SuccessAlert from "@/components/auth/SuccessAlert";
import AuthSuccessTransition from "@/components/auth/AuthSuccessTransition";
import { motion } from "framer-motion";

const initialState = {
  error: "",
  success: "",
};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const isAuthenticated = state?.isAuthenticated === true;

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value && value !== password) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError(null);
    }
  };

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
        title="Create your account"
        subtitle="Start finding better prospects today."
      />

      <form action={formAction} className="space-y-4">
        <ErrorAlert message={state?.error} />
        <SuccessAlert message={state?.success} />

        <AuthInput
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          required
          autoFocus
        />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />

        <div>
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (confirmPassword && e.target.value !== confirmPassword) {
                setConfirmError("Passwords do not match");
              } else {
                setConfirmError(null);
              }
            }}
          />
          <div className="mt-2">
            <PasswordStrength password={password} />
          </div>
        </div>

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={handleConfirmChange}
          error={confirmError}
        />

        <label className="flex items-start gap-2 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              name="terms"
              required
              className="peer sr-only"
            />
            <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-navy-900 peer-checked:border-navy-900 transition-all duration-150 group-hover:border-slate-400 peer-focus:ring-2 peer-focus:ring-navy-900/20" />
            <svg
              className="absolute inset-0 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-sm text-slate-600 select-none">
            I agree to the{" "}
            <span className="text-blue-600 hover:text-blue-500 font-medium cursor-not-allowed">Terms of Service</span>{" "}
            and{" "}
            <span className="text-blue-600 hover:text-blue-500 font-medium cursor-not-allowed">Privacy Policy</span>
          </span>
        </label>

        <LoadingButton
          loading={pending}
          success={isAuthenticated}
          type="submit"
          disabled={!!confirmError}
        >
          Create Account
        </LoadingButton>
      </form>

      <AuthFooter
        text="Already have an account?"
        linkText="Sign in"
        linkHref="/login"
      />
    </AuthCard>
    </motion.div>
    </>
  );
}
