"use client";

import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "primary";
}

export function Button({ variant = "default", className = "", children, ...props }: ButtonProps) {
  const variants = {
    default:
      "border border-slate-700 bg-[#16213e] text-slate-200 hover:bg-slate-800 disabled:opacity-50",
    ghost: "text-slate-300 hover:bg-slate-800/60 disabled:opacity-50",
    primary:
      "border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50",
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
