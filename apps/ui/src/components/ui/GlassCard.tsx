export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-brand-outline/60 bg-brand-paperElev/80 p-6 shadow-glass ${className}`}>
      {children}
    </div>
  );
}
