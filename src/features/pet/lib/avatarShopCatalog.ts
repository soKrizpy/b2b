// src/features/pet/lib/avatarShopCatalog.ts
// Katalog aksesori avatar wardrobe — ported from bits2bytes-lms.
// Pure data — safe to import from both server and client.

export type AccessoryCategory = 'hat' | 'visor' | 'hood' | 'headset' | 'crown';

export interface AccessoryItem {
  id:          string;
  name:        string;
  category:    AccessoryCategory;
  price:       number;
  description: string;
  accentColor: string;
  glowColor:   string;
  iconType:    string;
  badge?:      string;
}

export const AVATAR_ACCESSORIES: AccessoryItem[] = [
  // ── Hats & Caps ──────────────────────────────────────────────────────────
  {
    id: 'topi-hacker', name: 'Topi Hacker Cyberpunk', category: 'hat', price: 50,
    description: 'Topi baseball cyber dengan visor HUD neon transparan.',
    accentColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.4)', iconType: 'hacker-cap', badge: 'Popular',
  },
  {
    id: 'dino-cap', name: 'Topi Dino Kawaii', category: 'hat', price: 55,
    description: 'Topi lucu bergigi dinosaurus mini dengan sirip hijau neon.',
    accentColor: '#10b981', glowColor: 'rgba(16,185,129,0.4)', iconType: 'dino-cap', badge: 'Cute',
  },
  {
    id: 'ninja-headband', name: 'Ikat Kepala Cyber Ninja', category: 'hat', price: 40,
    description: 'Ikat kepala shinobi modern bertuliskan kanji biner.',
    accentColor: '#ef4444', glowColor: 'rgba(239,68,68,0.4)', iconType: 'ninja-band',
  },
  {
    id: 'rookie-band', name: 'Bandana Coder Pemula', category: 'hat', price: 30,
    description: 'Bandana rajut semangat pantang menyerah untuk coder pemula.',
    accentColor: '#3b82f6', glowColor: 'rgba(59,130,246,0.4)', iconType: 'rookie-band', badge: 'Starter',
  },
  // ── Hoods ────────────────────────────────────────────────────────────────
  {
    id: 'tudung-wizard', name: 'Tudung Code Wizard', category: 'hood', price: 75,
    description: 'Tudung mistis dengan rune biner bersinar dan kristal logika.',
    accentColor: '#a855f7', glowColor: 'rgba(168,85,247,0.5)', iconType: 'wizard-hood', badge: 'Mystic',
  },
  // ── Headsets ─────────────────────────────────────────────────────────────
  {
    id: 'headset-cat', name: 'Cyber Cat RGB Headset', category: 'headset', price: 60,
    description: 'Headset telinga kucing dengan equalizer audio RGB.',
    accentColor: '#ec4899', glowColor: 'rgba(236,72,153,0.5)', iconType: 'cyber-cat', badge: 'Trending',
  },
  {
    id: 'headset-pro', name: 'Headset Pro Gamer', category: 'headset', price: 65,
    description: 'Headset gaming peredam bising dengan bantalan busa nyaman.',
    accentColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.4)', iconType: 'gamer-headset',
  },
  // ── Visors & Goggles ─────────────────────────────────────────────────────
  {
    id: 'visor-neon', name: 'Kacamata HUD Scouter', category: 'visor', price: 45,
    description: 'Kacamata visor neon satu mata memproyeksikan baris variabel.',
    accentColor: '#00f0ff', glowColor: 'rgba(0,240,255,0.5)', iconType: 'neon-visor',
  },
  {
    id: 'vr-goggles', name: 'Kacamata VR Metaverse', category: 'visor', price: 80,
    description: 'Perangkat VR futuristik untuk melihat dunia game 3D.',
    accentColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.5)', iconType: 'vr-goggles', badge: 'High-Tech',
  },
  {
    id: 'steampunk-goggles', name: 'Goggles Retro Steampunk', category: 'visor', price: 70,
    description: 'Kacamata pelindung kuningan antik berputar.',
    accentColor: '#d97706', glowColor: 'rgba(217,119,6,0.4)', iconType: 'steampunk-goggles',
  },
  // ── Crowns & Special ─────────────────────────────────────────────────────
  {
    id: 'golden-halo', name: 'Lingkaran Halo Emas', category: 'crown', price: 90,
    description: 'Lingkaran suci data emas melayang di atas kepala.',
    accentColor: '#eab308', glowColor: 'rgba(234,179,8,0.6)', iconType: 'golden-halo', badge: 'Epic',
  },
  {
    id: 'cyber-crown', name: 'Mahkota Juara Algoritma', category: 'crown', price: 120,
    description: 'Mahkota megah bertatahkan batu kristal kuantum.',
    accentColor: '#ffd700', glowColor: 'rgba(255,215,0,0.7)', iconType: 'cyber-crown', badge: 'Legendary',
  },
];

export const CATEGORY_LABEL: Record<AccessoryCategory, string> = {
  hat:     'Topi & Bandana',
  hood:    'Tudung',
  headset: 'Headset',
  visor:   'Kacamata & Visor',
  crown:   'Mahkota & Spesial',
};

export function getAccessoryById(id: string | null | undefined): AccessoryItem | null {
  if (!id) return null;
  return AVATAR_ACCESSORIES.find((a) => a.id === id) ?? null;
}
