# AP PERFORMANCE

Kumpulan kalkulator performa mesin 4-tak berbasis web untuk membantu estimasi spesifikasi engine, injector, camshaft, dan porting. Project ini menggunakan HTML statis, Tailwind CSS via CDN, Google Fonts, dan script JavaScript lokal di folder `src/scripts`.

Dikembangkan sebagai bagian dari **Adi Prass | Engine Simulation Lab**.

---

## Fitur Utama

- **Engine Performance Calculator**  
  Menghitung kapasitas mesin, aliran intake/exhaust, potensi tenaga, torsi, kurva tenaga dinamis, riwayat simulasi, dan export report.

- **Injector Calculator**  
  Menghitung kebutuhan flow rate injector, total fuel flow, HP support per injector, duty cycle, koreksi tekanan, dan rekomendasi injector.

- **Camshaft Calculator**  
  Menghitung intake lift, exhaust lift, intake overlift, dan exhaust overlift berdasarkan referensi Graham Bell.

- **Porting Calculator**  
  Menghitung diameter port, area port, estimasi gas speed, dan rekomendasi port berdasarkan valve diameter serta usage profile.

- **UI Responsif**  
  Mendukung tampilan desktop dan mobile dengan navigasi yang menyesuaikan.

- **Tema Gelap**  
  Menggunakan tampilan dark mode dengan aksen performa otomotif.

- **Status & Feedback**  
  Terdapat badge status, toast notification, dan visualisasi hasil.

---

## Halaman

| File | Deskripsi |
|---|---|
| `index.html` | Engine Performance Calculator |
| `injector.html` | Injector Calculator |
| `camshaft.html` | Camshaft Calculator |
| `porting.html` | Porting Calculator |

---

## Teknologi

- HTML5
- Tailwind CSS via CDN
- Google Fonts
  - Raleway
  - Open Sans
  - JetBrains Mono
  - Material Symbols Outlined
- JavaScript lokal
- Canvas API untuk grafik dyno
- LocalStorage untuk riwayat simulasi pada halaman engine

---

## Struktur Project

```text
.
├── index.html
├── injector.html
├── camshaft.html
├── porting.html
├── README.md
└── src/
    ├── scripts/
    │   ├── engine.js
    │   ├── injector.js
    │   ├── camshaft.js
    │   └── porting.js
    └── styles/
        ├── tailwind.js
        ├── styles.css
        └── main.css