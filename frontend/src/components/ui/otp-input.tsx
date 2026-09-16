"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";

const CROSSFADE = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 0.8,
} as const;
const EASE = [0.23, 1, 0.32, 1] as const;

export type OtpMode = "numeric" | "alphanumeric";

const ALLOW: Record<OtpMode, RegExp> = {
  numeric: /^[0-9]$/,
  alphanumeric: /^[0-9a-zA-Z]$/,
};

export type UseOtpInputOptions = {
  length?: number;
  mode?: OtpMode;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
};

export type OtpCellProps = {
  ref: (el: HTMLInputElement | null) => void;
  value: string;
  disabled: boolean;
  type: "text";
  inputMode: "numeric" | "text";
  autoComplete: string;
  autoCorrect: "off";
  autoCapitalize: "off";
  spellCheck: false;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  onFocus: (e: FocusEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
};

export type UseOtpInputReturn = {
  chars: string[];
  value: string;
  length: number;
  complete: boolean;
  focusedIndex: number;
  getCellProps: (index: number) => OtpCellProps;
  focusAt: (index: number) => void;
  clear: () => void;
};

export function useOtpInput({
  length = 6,
  mode = "numeric",
  defaultValue = "",
  disabled = false,
  onChange,
  onComplete,
}: UseOtpInputOptions = {}): UseOtpInputReturn {
  const allow = ALLOW[mode];

  const keep = useCallback(
    (text: string) =>
      text
        .split("")
        .filter((c) => allow.test(c))
        .join(""),
    [allow],
  );

  const [chars, setChars] = useState<string[]>(() => {
    const seed = defaultValue
      .split("")
      .filter((c) => ALLOW[mode].test(c))
      .slice(0, length);
    return Array.from({ length }, (_, i) => seed[i] ?? "");
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const charsRef = useRef(chars);
  charsRef.current = chars;

  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const changed = useRef(onChange);
  changed.current = onChange;
  const completed = useRef(onComplete);
  completed.current = onComplete;

  useEffect(() => {
    setChars((prev) =>
      prev.length === length ? prev : Array.from({ length }, (_, i) => prev[i] ?? ""),
    );
    refs.current.length = length;
  }, [length]);

  const commit = useCallback((next: string[]) => {
    charsRef.current = next;
    setChars(next);
    const value = next.join("");
    changed.current?.(value);
    if (next.length > 0 && next.every((c) => c !== "")) completed.current?.(value);
  }, []);

  const focusAt = useCallback(
    (index: number) => {
      const el = refs.current[Math.max(0, Math.min(length - 1, index))];
      if (!el) return;
      el.focus();
      el.select();
    },
    [length],
  );

  const fillFrom = useCallback(
    (index: number, text: string) => {
      const incoming = keep(text);
      if (incoming.length === 0) return;
      const next = [...charsRef.current];
      let cursor = index;
      for (const c of incoming) {
        if (cursor >= length) break;
        next[cursor] = c;
        cursor += 1;
      }
      commit(next);
      focusAt(cursor);
    },
    [commit, focusAt, keep, length],
  );

  const clear = useCallback(() => {
    commit(Array.from({ length }, () => ""));
    focusAt(0);
  }, [commit, focusAt, length]);

  const getCellProps = useCallback(
    (index: number): OtpCellProps => ({
      ref: (el) => {
        refs.current[index] = el;
      },
      value: chars[index] ?? "",
      disabled,
      type: "text",
      inputMode: mode === "numeric" ? "numeric" : "text",
      autoComplete: index === 0 ? "one-time-code" : "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      spellCheck: false,
      onChange: (e) => {
        const previous = charsRef.current[index] ?? "";
        const raw = e.currentTarget.value;
        const trimmed =
          raw.length > 1 && previous && raw.startsWith(previous) ? raw.slice(previous.length) : raw;
        const incoming = keep(trimmed);

        if (incoming.length === 0) {
          if (raw.length === 0 && previous) {
            const next = [...charsRef.current];
            next[index] = "";
            commit(next);
          }
          e.currentTarget.value = charsRef.current[index] ?? "";
          return;
        }

        if (incoming.length === 1) {
          const next = [...charsRef.current];
          next[index] = incoming;
          e.currentTarget.value = incoming;
          commit(next);
          if (index < length - 1) focusAt(index + 1);
          return;
        }

        fillFrom(index, incoming);
      },
      onKeyDown: (e) => {
        if (e.key === "Backspace") {
          e.preventDefault();
          const current = charsRef.current;
          const next = [...current];
          if (current[index]) {
            next[index] = "";
            commit(next);
            return;
          }
          if (index > 0) {
            next[index - 1] = "";
            commit(next);
            focusAt(index - 1);
          }
          return;
        }
        if (e.key === "Delete") {
          e.preventDefault();
          const next = [...charsRef.current];
          next[index] = "";
          commit(next);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusAt(index - 1);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusAt(index + 1);
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          focusAt(0);
          return;
        }
        if (e.key === "End") {
          e.preventDefault();
          focusAt(length - 1);
        }
      },
      onPaste: (e) => {
        e.preventDefault();
        const text = keep(e.clipboardData.getData("text"));
        fillFrom(text.length >= length ? 0 : index, text);
      },
      onFocus: (e) => {
        e.currentTarget.select();
        const firstEmpty = charsRef.current.findIndex((c) => c === "");
        if (firstEmpty !== -1 && firstEmpty < index) {
          focusAt(firstEmpty);
          return;
        }
        setFocusedIndex(index);
      },
      onBlur: (e) => {
        const to = e.relatedTarget as HTMLInputElement | null;
        if (to && refs.current.includes(to)) return;
        setFocusedIndex(-1);
      },
    }),
    [chars, commit, disabled, fillFrom, focusAt, keep, length, mode],
  );

  const value = chars.join("");

  return {
    chars,
    value,
    length,
    complete: chars.length > 0 && chars.every((c) => c !== ""),
    focusedIndex,
    getCellProps,
    focusAt,
    clear,
  };
}

export type OtpStatus = "idle" | "error" | "success";

export type OtpInputHandle = {
  clear: () => void;
  focus: () => void;
};

export type OtpInputProps = {
  length?: number;
  mode?: OtpMode;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  status?: OtpStatus;
  errorMessage?: string;
  successMessage?: string;
  hint?: string;
  label?: string;
  groupEvery?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  focusOnError?: boolean;
  className?: string;
  onSuccessAnimationEnd?: () => void;
  ref?: Ref<OtpInputHandle>;
};

export function OtpInput({
  length = 6,
  mode = "numeric",
  defaultValue = "",
  onChange,
  onComplete,
  status = "idle",
  errorMessage = "",
  successMessage = "",
  hint = "",
  label = "Verification code",
  groupEvery = 0,
  disabled = false,
  autoFocus = false,
  focusOnError = true,
  className = "",
  onSuccessAnimationEnd,
  ref,
}: OtpInputProps) {
  const reduced = useReducedMotion();
  const statusId = useId();
  const [merged, setMerged] = useState(false);
  const [checked, setChecked] = useState(false);
  const successEnd = useRef(onSuccessAnimationEnd);
  successEnd.current = onSuccessAnimationEnd;

  const { chars, focusedIndex, getCellProps, focusAt, clear } = useOtpInput({
    length,
    mode,
    defaultValue,
    disabled,
    onChange,
    onComplete,
  });

  const wasError = useRef(false);
  const error = status === "error";
  const success = status === "success";

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        clear();
        focusAt(0);
      },
      focus: () => focusAt(0),
    }),
    [clear, focusAt],
  );

  useEffect(() => {
    if (error && !wasError.current && focusOnError && !disabled) focusAt(0);
    wasError.current = error;
  }, [error, focusOnError, disabled, focusAt]);

  useEffect(() => {
    if (autoFocus && !disabled) focusAt(0);
  }, [autoFocus, disabled, focusAt]);

  useEffect(() => {
    if (!success) {
      setMerged(false);
      setChecked(false);
      return;
    }
    const mergeAt = reduced ? 0 : 550;
    const checkAt = reduced ? 80 : 1050;
    const doneAt = reduced ? 400 : 2100;
    const mergeTimer = window.setTimeout(() => setMerged(true), mergeAt);
    const checkTimer = window.setTimeout(() => setChecked(true), checkAt);
    const doneTimer = window.setTimeout(() => successEnd.current?.(), doneAt);
    return () => {
      window.clearTimeout(mergeTimer);
      window.clearTimeout(checkTimer);
      window.clearTimeout(doneTimer);
    };
  }, [success, reduced]);

  const enter = reduced ? { duration: 0 } : { duration: 0.22, ease: EASE };
  const swap = reduced ? { duration: 0 } : CROSSFADE;
  const hasStatus = hint.length > 0 || errorMessage.length > 0 || successMessage.length > 0;

  const message = error ? errorMessage : success ? successMessage : hint;
  const messageTone = error
    ? "text-error"
    : success
      ? "text-[#3b5a0b]"
      : "text-on-surface-variant";

  return (
    <div className={`relative inline-flex min-h-14 w-full flex-col items-center ${className}`}>
      <motion.div
        role="group"
        aria-label={label}
        className={`otp-row${success ? " is-success" : ""}${merged ? " is-merged" : ""}`}
        initial={false}
        animate={
          checked
            ? { scale: 0.28, opacity: 0, x: 0 }
            : success
              ? { scale: merged ? 0.92 : 1, opacity: 1, x: 0 }
              : error && !reduced
                ? { x: [0, -5, 4, -3, 0], scale: 1, opacity: 1 }
                : { x: 0, scale: 1, opacity: 1 }
        }
        transition={{ duration: 0.42, ease: EASE }}
      >
        {Array.from({ length }, (_, i) => {
          const char = chars[i] ?? "";
          const active = focusedIndex === i;
          const extraGap = groupEvery > 0 && i > 0 && i % groupEvery === 0;

          return (
            <div key={i} className={`otp-cell-wrap${extraGap ? " ml-3" : ""}`}>
              <input
                {...getCellProps(i)}
                aria-label={`${label}, character ${i + 1} of ${length}`}
                aria-invalid={error || undefined}
                aria-describedby={hasStatus ? statusId : undefined}
                className={`otp-cell${
                  error
                    ? " is-error"
                    : success
                      ? " is-success"
                      : active
                        ? " is-active"
                        : char
                          ? " is-filled"
                          : ""
                }${disabled ? " opacity-50" : ""}`}
              />

              <span aria-hidden className={`otp-digit${success ? " is-success" : ""}`}>
                <AnimatePresence initial={false} mode="popLayout">
                  {char ? (
                    <motion.span
                      key={char}
                      initial={reduced ? false : { opacity: 0, scale: 0.97, y: 10, filter: "blur(6px)" }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6, filter: "blur(3px)" }}
                      transition={enter}
                      className="col-start-1 row-start-1 tabular-nums"
                    >
                      {char}
                    </motion.span>
                  ) : null}
                </AnimatePresence>

                {active && !char && !disabled ? (
                  <motion.span
                    className="col-start-1 row-start-1 block h-[18px] w-[2px] rounded-[1px] bg-[#141a32]"
                    initial={{ opacity: 1 }}
                    animate={reduced ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 1.06, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear" }
                    }
                  />
                ) : null}
              </span>
            </div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {success && checked ? (
          <motion.div
            className="absolute top-0 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[#3b5a0b] text-white shadow-[0_12px_28px_rgba(59,90,11,0.32)]"
            initial={{ scale: 0.4, opacity: 0, rotate: -24 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Check size={28} strokeWidth={2.8} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {hasStatus ? (
        <>
          <div aria-hidden className="mt-3 grid min-h-4 text-center text-[13px] leading-[18px]">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={status}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -3 }}
                transition={swap}
                className={`col-start-1 row-start-1 ${messageTone}`}
              >
                {message}
              </motion.span>
            </AnimatePresence>
          </div>
          <span id={statusId} role="status" className="sr-only">
            {message}
          </span>
        </>
      ) : null}
    </div>
  );
}

export default OtpInput;
