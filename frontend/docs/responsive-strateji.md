# Responsive Breakpoint Stratejisi (Görev 9.6)

## Yaklaşım: Mobil Öncelikli (Mobile-First)

Tüm stiller önce **mobil** (en dar ekran) için yazılır; büyük ekranlara özel değişiklikler `sm:`, `md:`, `lg:` gibi öneklerle **üzerine eklenir**. Bu, Tailwind'in varsayılan felsefesidir ve projede bilinçli olarak korunmuştur — çünkü kullanıcıların büyük kısmı SMS'ten gelen linke **telefonlarından** tıklayacak (Bölüm 6, "PWA/mobil öncelikli").

## Kırılma Noktaları (Breakpoints)

| Ön ek | Genişlik | Hedef Cihaz |
|---|---|---|
| *(önek yok)* | 0px+ | Taban stil — en dar telefonlar dahil her cihaz |
| `xs:` | 375px+ | Küçük/standart telefonlar (iPhone SE, çoğu Android) |
| `sm:` | 640px+ | Büyük telefonlar (yatay mod), küçük tabletler |
| `md:` | 768px+ | Tabletler |
| `lg:` | 1024px+ | Küçük laptoplar |
| `xl:` | 1280px+ | Masaüstü |
| `2xl:` | 1536px+ | Geniş masaüstü |

## Kullanım Örneği (design-system sayfasından)

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
```

- **1024px altında** (`lg:` devreye girmeden): tek sütun, kartlar alt alta.
- **1024px ve üzerinde**: iki sütun, kartlar yan yana.

## Test Yöntemi

Tarayıcı geliştirici araçlarında (F12 → cihaz araç çubuğu / Toggle device toolbar) şu genişlikleri deneyin:
- **360px - 375px**: En dar telefon senaryosu (proof kriteri).
- **1440px**: Tipik masaüstü senaryosu (proof kriteri).

İkisinde de:
- Metin taşmamalı / kesilmemeli.
- Butonlar/inputlar dokunmaya uygun boyutta kalmalı (min. 44x44px dokunma alanı).
- Layout, ekran genişliğine göre mantıklı şekilde yeniden düzenlenmeli (mobilde alt alta, masaüstünde yan yana gibi).
