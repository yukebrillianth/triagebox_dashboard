import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      data-testid="page-not-found"
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-foreground text-6xl font-black tracking-tight">
        404
      </h1>
      <h2 className="text-foreground text-2xl font-bold">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-muted max-w-md text-base font-medium">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="bg-accent text-background mt-4 rounded-full px-6 py-3 text-sm font-bold transition hover:opacity-90"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
