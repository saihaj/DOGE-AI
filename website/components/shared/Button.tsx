import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const button = cva(["uppercase", "transition-colors"], {
  variants: {
    intent: {
      primary: ["bg-indigo-600", "hover:bg-indigo-700", "text-white"],
      secondary: ["bg-zinc-900", "hover:bg-zinc-700", "text-white"],
      outline: ["bg-white", "hover:bg-zinc-200", "border", "border-zinc-900"],
    },
    size: {
      small: ["px-3", "py-1.5", "rounded-md", "text-sm"],
      medium: ["p-3", "rounded-lg", "text-base"],
    },
  },
  compoundVariants: [{ intent: "primary", size: "medium", class: "uppercase" }],
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button: React.FC<ButtonProps> = ({
  className,
  intent,
  size,
  ...props
}) => <button className={button({ intent, size, className })} {...props} />;
