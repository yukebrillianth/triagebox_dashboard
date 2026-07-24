import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      data-testid="page-not-found"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center"
    >
      <h1 className="text-6xl font-black tracking-tight text-foreground">
        404
      </h1>
      <h2 className="text-2xl font-bold text-foreground">
        Halaman Tidak Ditemukan
      </h2>
      <p className="max-w-md text-base font-medium text-muted">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-full bg-accent px-6 py-3 text-sm font-bold text-background transition hover:opacity-90"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
