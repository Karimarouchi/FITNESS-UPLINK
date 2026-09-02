import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

const VARIANT_CLASS = {
  solid: "btn-solid",
  ghost: "btn-ghost",
  outline: "btn-outline",
  mini: "btn-mini",
  primary: "btn-mini primary",
  dark: "btn-mini dark",
  danger: "btn-danger",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASS;

type ButtonProps = {
  variant?: ButtonVariant;
  to?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "solid", to, children, className = "", type = "button", ...props }: ButtonProps) {
  const cls = `${VARIANT_CLASS[variant]}${className ? ` ${className}` : ""}`;
  if (to) {
    return (
      <Link className={cls} to={to}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} type={type} {...props}>
      {children}
    </button>
  );
}
