export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 [animation-delay:240ms]" />
    </span>
  );
}
