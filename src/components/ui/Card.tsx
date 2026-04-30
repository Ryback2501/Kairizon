import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-card p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
