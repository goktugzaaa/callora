import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold text-lg tracking-tight">
      <span className="h-8 w-8 rounded-lg bg-ink flex items-end justify-center gap-[3px] p-[7px]">
        <span className="w-[3px] rounded-full bg-white" style={{ height: "40%" }} />
        <span className="w-[3px] rounded-full bg-white" style={{ height: "100%" }} />
        <span className="w-[3px] rounded-full bg-white" style={{ height: "65%" }} />
      </span>
      Callora
    </Link>
  );
}
