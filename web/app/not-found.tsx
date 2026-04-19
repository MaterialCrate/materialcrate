import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <Image src="/logo.svg" alt="Material Crate" width={48} height={48} />

        <div className="flex flex-col gap-1">
          <span className="text-7xl font-bold text-ink">404</span>
          <p className="text-base font-medium text-ink-2">Page not found</p>
        </div>

        <p className="max-w-xs text-sm text-ink-3">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
        </p>

        <Link
          href="/"
          className="rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-background transition-opacity active:opacity-70"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
