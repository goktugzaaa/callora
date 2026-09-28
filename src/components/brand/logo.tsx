import { cn } from "cn";

/** Callora mark: three voice bars in an ember tile, plus the wordmark. */
export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <span
        aria-hidden
        className="flex size-8 items-end justify-center gap-[3px] rounded-[10px] bg-primary p-[7px] shadow-[inset_0_1px_0_oklch(1_0_0/0.2)]"
      >
        <span className="h-[42%] w-[3px] rounded-full bg-primary-foreground" />
        <span className="h-full w-[3px] rounded-full bg-primary-foreground" />
        <span className="h-[66%] w-[3px] rounded-full bg-primary-foreground" />
      </span>
      {showWordmark && <span className="text-[1.05rem]">Callora</span>}
    </span>
  );
}
