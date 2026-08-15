# TriageBox Dashboard

## Tentang TriageBox Dashboard

TriageBox Dashboard adalah antarmuka pemantauan triase bencana secara waktu nyata. Dashboard menampilkan pasien, tanda vital, prioritas triase, alert, perangkat, analitik, laporan, dan status sistem dari `triagebox-backend`.

## Prasyarat

- Node.js dan pnpm
- `triagebox-backend` berjalan di `http://localhost:3001`
- PostgreSQL dan MQTT backend berjalan melalui Docker

Siapkan layanan backend terlebih dahulu sesuai petunjuk di repositori `triagebox-backend`.

## Setup

Pasang dependensi:

```bash
pnpm i
```

Buat `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Alternatifnya, salin `.env.example` menjadi `.env.local`.

## Menjalankan Mode Development

```bash
pnpm run dev
```

Buka `http://localhost:3000`. Pastikan backend tetap berjalan di port `3001` agar data REST dan Socket.IO tersedia.

## Alur Demo

Gunakan alur berikut untuk demonstrasi utama:

1. **Beranda** — periksa ringkasan KPI, distribusi triase, alert kritis, dan aktivitas terbaru.
2. **Pasien** — cari atau filter pasien berdasarkan prioritas dan node.
3. **Detail registrasi** — buka pasien, tinjau tanda vital, lalu lengkapi atau perbarui data registrasi.
4. **Alert** — periksa alert aktif dan tandai alert yang sudah ditangani.
5. **Command** — buka pusat komando layar penuh untuk pemantauan operasional.
6. **Report** — tinjau laporan kejadian dan gunakan fungsi cetak browser.

## Pengujian E2E dengan Playwright

Backend beserta PostgreSQL dan MQTT harus aktif sebelum pengujian dijalankan.

```bash
pnpm test:e2e
```

Playwright menjalankan server development dashboard secara otomatis di port `3000` bila belum aktif.

## Prinsip Desain

Dashboard mengikuti design Figma TriageBox. Palet dan token warna didefinisikan
di `app/globals.css` — ubah token di sana, bukan warna hardcoded di komponen.

- Antarmuka command gelap (navy `#000827`), padat, dan mengutamakan keterbacaan operasional.
- Hijau `#00D460` adalah warna aksen sekaligus warna triase GREEN; design memperlakukan keduanya sebagai satu warna. Merah, kuning, dan hitam hanya dipakai untuk makna triase.
- Mode terang adalah varian turunan dari palet gelap, dengan aksen/triase yang digelapkan agar teks kecil tetap kontras.
- Tidak memakai purple glow atau gradient dekoratif.
- Tipografi memakai Geist (sans) dan IBM Plex Mono (angka/ID) melalui `next/font`, tanpa permintaan font eksternal saat runtime.
- Grafik memakai warna solid dan informasi penting tetap tersedia sebagai teks.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- TanStack React Query
- Zod dan React Hook Form
- Socket.IO Client
- Recharts
