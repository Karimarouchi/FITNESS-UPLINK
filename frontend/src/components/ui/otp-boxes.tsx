import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type OtpBoxesProps = {
  length?: number;
  disabled?: boolean;
  error?: boolean;
  verified?: boolean;
  verifying?: boolean;
  onComplete: (code: string) => void;
};

export function OtpBoxes({
  length = 6,
  disabled,
  error,
  verified,
  verifying,
  onComplete,
}: OtpBoxesProps) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ""));
  const [merged, setMerged] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!verified) {
      setMerged(false);
      return;
    }
    const timer = window.setTimeout(() => setMerged(true), 480);
    return () => window.clearTimeout(timer);
  }, [verified]);

  function setValue(next: string[]) {
    setDigits(next);
    const code = next.join("");
    if (!doneRef.current && code.length === length && next.every(Boolean)) {
      doneRef.current = true;
      onComplete(code);
    }
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = value;
    setValue(next);
    if (value && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const paste = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!paste) return;
    const next = Array.from({ length }, (_, i) => paste[i] ?? "");
    setValue(next);
    refs.current[Math.min(paste.length, length) - 1]?.focus();
  }

  const locked = disabled || verifying || verified;

  return (
    <div className="relative flex min-h-[72px] items-center justify-center">
      <motion.div
        className="flex"
        animate={
          verified
            ? { gap: 0, scale: merged ? 0.25 : 0.92, opacity: merged ? 0 : 1 }
            : error
              ? { gap: 12, x: [0, -8, 8, -5, 5, 0] }
              : { gap: 12, scale: 1, opacity: 1 }
        }
        transition={
          error && !verified
            ? { duration: 0.42 }
            : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digits[index] ?? ""}
            disabled={locked}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            aria-label={`Chiffre ${index + 1}`}
            className={cn(
              "h-14 w-12 rounded-[6px] border text-center text-xl font-semibold outline-none transition-colors duration-300",
              verified
                ? "border-[#3b5a0b] bg-[#e8f5d8] text-[#3b5a0b]"
                : error
                  ? "border-error bg-[#fff6f6] text-on-surface"
                  : "border-transparent bg-[#f3f2f5] text-on-surface focus:border-primary-container focus:bg-white focus:shadow-[0_0_0_4px_rgba(20,26,50,0.12)]",
            )}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {verified && merged ? (
          <motion.div
            className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-[#3b5a0b] text-white shadow-[0_12px_28px_rgba(59,90,11,0.32)]"
            initial={{ scale: 0.4, opacity: 0, rotate: -24 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Check size={32} strokeWidth={2.8} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
