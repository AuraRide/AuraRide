import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export default function GlassCard({ children, color, className = "" }: GlassCardProps) {
  return (
    <div
      className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl ${className}`}
      style={{
        boxShadow: color
          ? `0 8px 32px 0 ${color}22, inset 0 1px 0 0 ${color}11`
          : "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      }}
    >
      {children}
    </div>
  );
}
