"use client";

import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ShadcnButton } from "@/components/ui/shadcn-button";
import { cn } from "@/lib/utils";

interface ResetPasswordFormProps {
  email: string;
  onVerifyCode: (code: string) => Promise<boolean>;
  onSubmit: (password: string) => Promise<void>;
  onCancel?: () => void;
}

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => {
  const Icon = met ? CheckCircle2 : XCircle;
  return (
    <motion.div
      className={cn("flex items-center text-sm", met ? "text-[#3b5a0b]" : "text-outline")}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Icon className="mr-2 h-4 w-4" />
      {text}
    </motion.div>
  );
};

export const ResetPasswordForm = ({ email, onVerifyCode, onSubmit, onCancel }: ResetPasswordFormProps) => {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const requirements = useMemo(
    () => [
      { text: "At least one lowercase letter", met: /[a-z]/.test(password) },
      { text: "Minimum 8 characters", met: password.length >= 8 },
      { text: "At least one uppercase letter", met: /[A-Z]/.test(password) },
      { text: "At least one number", met: /[0-9]/.test(password) },
    ],
    [password],
  );

  const allRequirementsMet = requirements.every((req) => req.met);

  const handleOtpChange = (index: number, value: string) => {
    if (value && Number.isNaN(Number(value))) return;
    const next = otp.split("");
    next[index] = value;
    const joined = next.join("").slice(0, 6);
    setOtp(joined);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (joined.length === 6) {
      void handleVerifyCode(joined);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d{6}$/.test(pasteData)) {
      setOtp(pasteData);
      inputRefs.current[5]?.focus();
      void handleVerifyCode(pasteData);
    }
  };

  const handleVerifyCode = async (code: string) => {
    setIsVerifying(true);
    setError(null);
    const success = await onVerifyCode(code);
    if (success) {
      setIsCodeVerified(true);
    } else {
      setError("Invalid code. Please try again.");
      setOtp("");
      inputRefs.current[0]?.focus();
    }
    setIsVerifying(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) return;
    setIsSubmitting(true);
    await onSubmit(password);
    setIsSubmitting(false);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-outline-variant bg-white p-8 text-on-surface shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold">Reset Password</h1>
      <p className="mb-6 text-sm text-outline">
        Enter the code sent to <span className="font-medium text-on-surface">{email}</span> to reset your password.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center space-x-2" onPaste={handlePaste}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={otp[index] || ""}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isCodeVerified || isVerifying}
                  className="h-12 w-12 text-center text-lg font-semibold"
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>
            {isVerifying ? <p className="text-center text-sm text-outline">Verifying...</p> : null}
            {error ? <p className="text-center text-sm text-error">{error}</p> : null}
            {isCodeVerified ? (
              <motion.div
                className="flex items-center justify-center text-sm text-[#3b5a0b]"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Code verified
              </motion.div>
            ) : null}
          </div>

          <hr className="border-outline-variant" />

          <AnimatePresence>
            {isCodeVerified ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-4">
                  <h2 className="font-medium text-on-surface">New password</h2>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-outline hover:text-on-surface"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {requirements.map((req) => (
                      <PasswordRequirement key={req.text} met={req.met} text={req.text} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-end space-x-4">
          {onCancel ? (
            <ShadcnButton variant="outline" type="button" onClick={onCancel}>
              Cancel
            </ShadcnButton>
          ) : null}
          <ShadcnButton type="submit" disabled={!allRequirementsMet || isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset password"}
          </ShadcnButton>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
