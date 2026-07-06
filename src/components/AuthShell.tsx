import Logo from "@/components/Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted mt-1 mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
