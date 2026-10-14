// src/features/quiz/fantasyIsland.ts
// Fantasy Island realm archetypes, biomes, and lore mapping for student quest maps.

export type BiomeType =
  | 'village'
  | 'cave'
  | 'temple'
  | 'forest'
  | 'tower'
  | 'forge'
  | 'citadel'
  | 'shrine';

export interface FantasyLocation {
  type: BiomeType;
  name: string;
  biomeName: string;
  emoji: string;
  lucideIcon: 'Tent' | 'Mountain' | 'Landmark' | 'Trees' | 'TowerControl' | 'Flame' | 'Castle' | 'Sparkles' | 'Crown';
  lore: string;
  theme: {
    islandBg: string;
    border: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
    particleColor: string;
    ringColor: string;
    landmarkIconBg: string;
  };
}

export function getFantasyLocationForTopic(
  title: string,
  index: number,
  isFinal = false
): FantasyLocation {
  if (isFinal) {
    return {
      type: 'citadel',
      name: 'Istana Mahkota Agung',
      biomeName: 'Puncak Gunung Keemasan',
      emoji: '👑',
      lucideIcon: 'Crown',
      lore: 'Istana puncak tempat para master membuktikan seluruh ilmu pengodean dalam ujian kelulusan akhir.',
      theme: {
        islandBg: 'from-amber-950/80 via-yellow-950/70 to-slate-950',
        border: 'border-amber-400/80 shadow-amber-500/30',
        glow: 'shadow-[0_0_35px_rgba(245,158,11,0.45)]',
        badgeBg: 'bg-amber-500/20 border-amber-400/40',
        badgeText: 'text-amber-300',
        particleColor: '#F59E0B',
        ringColor: 'ring-amber-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950',
      },
    };
  }

  const lower = title.toLowerCase();

  // 1. Village (Intro, Variables, Basics)
  if (
    index === 0 ||
    lower.includes('dasar') ||
    lower.includes('intro') ||
    lower.includes('variabel') ||
    lower.includes('variable') ||
    lower.includes('pengantar') ||
    lower.includes('setup')
  ) {
    return {
      type: 'village',
      name: `Kampung Pemula · ${title}`,
      biomeName: 'Lembah Hijau Tropis',
      emoji: '🏡',
      lucideIcon: 'Tent',
      lore: 'Pondok awal para petualang muda mempelajari mantra dasar dan variabel perdana.',
      theme: {
        islandBg: 'from-emerald-950/70 via-teal-950/60 to-slate-950',
        border: 'border-emerald-500/50 shadow-emerald-500/20',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]',
        badgeBg: 'bg-emerald-500/20 border-emerald-400/40',
        badgeText: 'text-emerald-300',
        particleColor: '#10B981',
        ringColor: 'ring-emerald-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white',
      },
    };
  }

  // 2. Cave (Data Types, Syntax, Numbers, Operators)
  if (
    index === 1 ||
    lower.includes('tipe data') ||
    lower.includes('data type') ||
    lower.includes('string') ||
    lower.includes('number') ||
    lower.includes('operator') ||
    lower.includes('angka') ||
    lower.includes('gua') ||
    lower.includes('cave')
  ) {
    return {
      type: 'cave',
      name: `Gua Kristal Biner · ${title}`,
      biomeName: 'Gua Batuan Kristal Geoda',
      emoji: '💎',
      lucideIcon: 'Mountain',
      lore: 'Gua misterius bertabur kristal biner yang menyimpan rahasia tipe data dan perhitungan.',
      theme: {
        islandBg: 'from-cyan-950/70 via-blue-950/60 to-slate-950',
        border: 'border-cyan-400/50 shadow-cyan-500/25',
        glow: 'shadow-[0_0_25px_rgba(6,182,212,0.35)]',
        badgeBg: 'bg-cyan-500/20 border-cyan-400/40',
        badgeText: 'text-cyan-300',
        particleColor: '#06B6D4',
        ringColor: 'ring-cyan-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950',
      },
    };
  }

  // 3. Temple (Conditionals, If/Else, Boolean Logic)
  if (
    index === 2 ||
    lower.includes('kondisi') ||
    lower.includes('condition') ||
    lower.includes('if') ||
    lower.includes('else') ||
    lower.includes('cabang') ||
    lower.includes('logika') ||
    lower.includes('boolean') ||
    lower.includes('kuil') ||
    lower.includes('temple')
  ) {
    return {
      type: 'temple',
      name: `Kuil Cabang Logika · ${title}`,
      biomeName: 'Pilar Reruntuhan Kuno',
      emoji: '🏛️',
      lucideIcon: 'Landmark',
      lore: 'Kuil batu keramat tempat pertimbangan logika diputuskan melalui rune benar atau salah.',
      theme: {
        islandBg: 'from-amber-950/60 via-stone-900/80 to-slate-950',
        border: 'border-amber-400/60 shadow-amber-500/25',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
        badgeBg: 'bg-amber-500/20 border-amber-400/40',
        badgeText: 'text-amber-300',
        particleColor: '#F59E0B',
        ringColor: 'ring-amber-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950',
      },
    };
  }

  // 4. Forest (Loops, While, For, Arrays)
  if (
    index === 3 ||
    lower.includes('loop') ||
    lower.includes('perulangan') ||
    lower.includes('while') ||
    lower.includes('for') ||
    lower.includes('iterasi') ||
    lower.includes('hutan') ||
    lower.includes('forest')
  ) {
    return {
      type: 'forest',
      name: `Hutan Labirin Loop · ${title}`,
      biomeName: 'Belantara Kabut Berputar',
      emoji: '🌲',
      lucideIcon: 'Trees',
      lore: 'Hutan lebat dengan jalan setapak berulang yang hanya bisa dilewati dengan ketepatan perulangan.',
      theme: {
        islandBg: 'from-emerald-950/80 via-green-950/70 to-slate-950',
        border: 'border-emerald-400/60 shadow-emerald-500/25',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
        badgeBg: 'bg-emerald-500/20 border-emerald-400/40',
        badgeText: 'text-emerald-300',
        particleColor: '#10B981',
        ringColor: 'ring-emerald-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-emerald-400 to-green-700 text-slate-950',
      },
    };
  }

  // 5. Tower (Data Collections, Lists, Array Structures)
  if (
    index === 4 ||
    lower.includes('array') ||
    lower.includes('list') ||
    lower.includes('koleksi') ||
    lower.includes('index') ||
    lower.includes('menara') ||
    lower.includes('tower')
  ) {
    return {
      type: 'tower',
      name: `Menara Pengawas Data · ${title}`,
      biomeName: 'Puncak Tebing Cakrawala',
      emoji: '🗼',
      lucideIcon: 'TowerControl',
      lore: 'Menara pengintai bertingkat tinggi tempat deretan data disimpan rapi dalam tiap lantai rak.',
      theme: {
        islandBg: 'from-indigo-950/80 via-blue-950/70 to-slate-950',
        border: 'border-indigo-400/60 shadow-indigo-500/25',
        glow: 'shadow-[0_0_25px_rgba(99,102,241,0.35)]',
        badgeBg: 'bg-indigo-500/20 border-indigo-400/40',
        badgeText: 'text-indigo-300',
        particleColor: '#6366F1',
        ringColor: 'ring-indigo-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-indigo-400 to-blue-700 text-white',
      },
    };
  }

  // 6. Forge (Functions, Methods, Procedures)
  if (
    index === 5 ||
    lower.includes('fungsi') ||
    lower.includes('function') ||
    lower.includes('method') ||
    lower.includes('prosedur') ||
    lower.includes('forge') ||
    lower.includes('tempa')
  ) {
    return {
      type: 'forge',
      name: `Kawah Tempa Algoritma · ${title}`,
      biomeName: 'Lembah Magma Berapi',
      emoji: '🌋',
      lucideIcon: 'Flame',
      lore: 'Kawah berapi aktif tempat formula mantra dan fungsi kode ditempa berulang kali agar efisien.',
      theme: {
        islandBg: 'from-rose-950/80 via-orange-950/70 to-slate-950',
        border: 'border-orange-500/60 shadow-orange-500/30',
        glow: 'shadow-[0_0_25px_rgba(249,115,22,0.4)]',
        badgeBg: 'bg-orange-500/20 border-orange-400/40',
        badgeText: 'text-orange-300',
        particleColor: '#F97316',
        ringColor: 'ring-orange-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-orange-500 to-rose-700 text-white',
      },
    };
  }

  // 7. Citadel (Objects, Classes, OOP, Architecture)
  if (
    index === 6 ||
    lower.includes('class') ||
    lower.includes('objek') ||
    lower.includes('object') ||
    lower.includes('oop') ||
    lower.includes('struktur') ||
    lower.includes('benteng')
  ) {
    return {
      type: 'citadel',
      name: `Benteng Arsitektur Kode · ${title}`,
      biomeName: 'Benteng Granit Kerajaan',
      emoji: '🏰',
      lucideIcon: 'Castle',
      lore: 'Benteng pertahanan kokoh yang dibangun dengan arsitektur objek terstruktur dan modular.',
      theme: {
        islandBg: 'from-purple-950/80 via-fuchsia-950/60 to-slate-950',
        border: 'border-purple-400/60 shadow-purple-500/30',
        glow: 'shadow-[0_0_25px_rgba(168,85,247,0.35)]',
        badgeBg: 'bg-purple-500/20 border-purple-400/40',
        badgeText: 'text-purple-300',
        particleColor: '#A855F7',
        ringColor: 'ring-purple-400/60',
        landmarkIconBg: 'bg-gradient-to-br from-purple-400 to-indigo-700 text-white',
      },
    };
  }

  // 8. Shrine (Special Topics / Advanced Modules)
  return {
    type: 'shrine',
    name: `Kuil Suci Astral · ${title}`,
    biomeName: 'Pulau Terapung Langit',
    emoji: '⛩️',
    lucideIcon: 'Sparkles',
    lore: 'Sanctuary langit misterius tempat mengasah keahlian coding tingkat tinggi.',
    theme: {
      islandBg: 'from-violet-950/80 via-slate-900/80 to-slate-950',
      border: 'border-violet-400/60 shadow-violet-500/25',
      glow: 'shadow-[0_0_25px_rgba(139,92,246,0.35)]',
      badgeBg: 'bg-violet-500/20 border-violet-400/40',
      badgeText: 'text-violet-300',
      particleColor: '#8B5CF6',
      ringColor: 'ring-violet-400/60',
      landmarkIconBg: 'bg-gradient-to-br from-violet-400 to-purple-700 text-white',
    },
  };
}
