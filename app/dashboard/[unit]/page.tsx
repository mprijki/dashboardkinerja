'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface KinerjaItem {
  kuadran?: string;
  kuadran_kinerja?: string;
  kategori?: string;
  jumlah?: number;
  status_penilaian?: string;
  status?: string;
  status_isi?: string;
  updated_at?: string;
  tanggal?: string;
  [key: string]: any;
}

type ThemeType = 'neon' | 'sunset' | 'ocean' | 'emerald' | 'splash';

const themes: { id: ThemeType; label: string; desc: string }[] = [
  { id: 'neon', label: 'Cyber Neon', desc: 'Terang & Futuristik' },
  { id: 'sunset', label: 'Sunset Vibes', desc: 'Hangat & Elegan' },
  { id: 'ocean', label: 'Deep Ocean', desc: 'Tenang & Profesional' },
  { id: 'emerald', label: 'Emerald Dark', desc: 'Segar & Fokus' },
  { id: 'splash', label: 'Paint Splash', desc: 'Putih Bersih & Cipratan Cat' },
];

export default function DashboardUnit() {
  const params = useParams();
  const unit = params?.unit;
  const router = useRouter();

  const [stats, setStats] = useState<Record<string, number>>({});
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [activeStatusCard, setActiveStatusCard] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [theme, setTheme] = useState<ThemeType>('neon');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isOpenKuadran, setIsOpenKuadran] = useState(true);
  const [isOpenChartKuadran, setIsOpenChartKuadran] = useState(true);
  const [isOpenStatusCards, setIsOpenStatusCards] = useState(true);
  const [isOpenChartStatus, setIsOpenChartStatus] = useState(true);

  const decodedUnit = typeof unit === 'string' ? decodeURIComponent(unit) : '';
  const displayUnit = decodedUnit.toUpperCase() === 'SEMUA' ? 'SEMUA PERANGKAT DAERAH' : decodedUnit;

  const kategoriTampil = [
    'Sangat Baik',
    'Baik',
    'Butuh Perbaikan',
    'Kurang',
    'Sangat Kurang',
    'Belum Penilaian',
    'Tidak ada data Penilaian',
  ];

  const statusTampil = ['Sudah', 'Belum', 'Tidak Ada Data'];

  const chartColors = ['#14b8a6', '#38bdf8', '#fbbf24', '#fb923c', '#fb7185', '#a78bfa', '#94a3b8'];

  const flatPastelStyles: Record<string, { bg: string; text: string; badge: string; icon: React.ReactNode }> = {
    'Sangat Baik': {
      bg: 'bg-teal-50/90 border-teal-200 text-teal-900',
      text: 'text-teal-700',
      badge: 'bg-teal-100 text-teal-800 border border-teal-200',
      icon: (
        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    'Baik': {
      bg: 'bg-sky-50/90 border-sky-200 text-sky-900',
      text: 'text-sky-700',
      badge: 'bg-sky-100 text-sky-800 border border-sky-200',
      icon: (
        <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'Butuh Perbaikan': {
      bg: 'bg-amber-50/90 border-amber-200 text-amber-900',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800 border border-amber-200',
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    'Kurang': {
      bg: 'bg-orange-50/90 border-orange-200 text-orange-900',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800 border border-orange-200',
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
    },
    'Sangat Kurang': {
      bg: 'bg-rose-50/90 border-rose-200 text-rose-900',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-800 border border-rose-200',
      icon: (
        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    'Belum Penilaian': {
      bg: 'bg-purple-50/90 border-purple-200 text-purple-900',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-800 border border-purple-200',
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'Tidak ada data Penilaian': {
      bg: 'bg-slate-100/90 border-slate-200 text-slate-800',
      text: 'text-slate-600',
      badge: 'bg-slate-200 text-slate-700 border border-slate-300',
      icon: (
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
  };

  const validateUserAccess = useCallback((userUnitData: any, currentUnitUrl: string): boolean => {
    if (!currentUnitUrl) return true;
    if (!userUnitData) return false;

    let allowedUnits: string[] = [];

    if (Array.isArray(userUnitData)) {
      allowedUnits = userUnitData.map((u) => String(u).trim().toLowerCase());
    } else if (typeof userUnitData === 'string') {
      try {
        const parsed = JSON.parse(userUnitData);
        if (Array.isArray(parsed)) {
          allowedUnits = parsed.map((u) => String(u).trim().toLowerCase());
        } else {
          allowedUnits = userUnitData.split(',').map((s) => s.trim().toLowerCase());
        }
      } catch {
        allowedUnits = userUnitData.split(',').map((s) => s.trim().toLowerCase());
      }
    }

    const target = decodeURIComponent(currentUnitUrl).trim().toLowerCase();
    return allowedUnits.includes(target);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('dypral_theme') as ThemeType;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('dypral_theme', newTheme);
  };

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndFetchData() {
      if (!decodedUnit) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('users_login')
          .select('role, unit_kerja')
          .eq('user_id', session.user.id)
          .single();

        if (!profile) {
          router.push('/login');
          return;
        }

        const role = profile.role || 'user';

        if (role !== 'admin') {
          const hasAccess = validateUserAccess(profile.unit_kerja, decodedUnit);

          if (!hasAccess) {
            alert('AKSES DITOLAK!');
            router.push('/');
            return;
          }
        }

        if (isMounted) setAuthorized(true);
      } catch (e) {
        router.push('/login');
        return;
      }

      const { data: infoData } = await supabase
        .from('metadata_update')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);

      if (infoData && infoData.length > 0) {
        const rawTimestamp = infoData[0].created_at || infoData[0].updated_at || infoData[0].tanggal;
        if (rawTimestamp) {
          const safeIsoString = String(rawTimestamp).replace(' ', 'T');
          const parsedDate = new Date(safeIsoString);
          if (!isNaN(parsedDate.getTime())) {
            const formattedDate = new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(parsedDate);
            if (isMounted) setLastUpdated(formattedDate);
          } else {
            if (isMounted) setLastUpdated(String(rawTimestamp));
          }
        }
      }

      const { data, error } = await supabase.rpc('get_statistik_kinerja', {
        target_unit: decodedUnit,
      });

      if (!isMounted) return;

      if (!error && data) {
        const rows = data as KinerjaItem[];

        const hitungan = rows.reduce((acc: Record<string, number>, curr) => {
          const rawKuadran = curr.kuadran ?? curr.kuadran_kinerja ?? curr.kategori;
          let k = rawKuadran ? String(rawKuadran).trim() : 'Tidak ada data Penilaian';

          const kLower = k.toLowerCase();
          if (kLower.includes('sangat baik')) k = 'Sangat Baik';
          else if (kLower.includes('baik') && !kLower.includes('sangat') && !kLower.includes('kurang')) k = 'Baik';
          else if (kLower.includes('butuh perbaikan')) k = 'Butuh Perbaikan';
          else if (kLower.includes('sangat kurang')) k = 'Sangat Kurang';
          else if (kLower.includes('kurang')) k = 'Kurang';
          else if (kLower.includes('belum')) k = 'Belum Penilaian';
          else k = 'Tidak ada data Penilaian';

          acc[k] = (acc[k] || 0) + Number(curr.jumlah || 0);
          return acc;
        }, {});
        setStats(hitungan);

        const statusHitungan = rows.reduce((acc: Record<string, number>, curr) => {
          const rawStatus = curr.status_penilaian ?? curr.status ?? curr.status_isi;
          let s = rawStatus ? String(rawStatus).trim() : 'Tidak Ada Data';
          const sUpper = s.toUpperCase();
          if (sUpper.includes('SUDAH')) s = 'Sudah';
          else if (sUpper.includes('BELUM')) s = 'Belum';
          else s = 'Tidak Ada Data';
          acc[s] = (acc[s] || 0) + Number(curr.jumlah || 0);
          return acc;
        }, { Sudah: 0, Belum: 0, 'Tidak Ada Data': 0 });

        setStatusStats(statusHitungan);
      }
      setLoading(false);
    }

    checkAuthAndFetchData();
    return () => { isMounted = false; };
  }, [decodedUnit, router, validateUserAccess]);

  const totalPegawai = Object.values(stats).reduce((a, b) => a + b, 0);

  const kuadranChartData = kategoriTampil.map((k) => ({
    name: k,
    jumlah: stats[k] || 0,
  }));

  const statusChartData = statusTampil.map((s) => ({
    name: s,
    jumlah: statusStats[s] || 0,
  }));

  const isLight = theme === 'splash';

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <p className="text-xs font-mono tracking-wider text-slate-500 animate-pulse">MEMERIKSA KREDENSIAL...</p>
      </div>
    );
  }

  return (
    <main className={`min-h-screen text-slate-900 px-4 py-8 sm:px-6 md:px-12 relative overflow-x-hidden transition-colors duration-700 animated-bg theme-${theme}`}>
      
      {/* BACKGROUND ANIMASI & MATRIX */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 opacity-20 flex justify-between overflow-hidden px-4">
          <div className="text-cyan-400 text-xs font-mono animate-matrix-rain writing-mode-vertical">01010101 DYPRAL 10101</div>
          <div className="text-pink-400 text-xs font-mono animate-matrix-rain-slow writing-mode-vertical" style={{ animationDelay: '2s' }}>1100101 BKPSDM 01011</div>
          <div className="text-purple-400 text-xs font-mono animate-matrix-rain writing-mode-vertical" style={{ animationDelay: '4s' }}>01101010 CUKMINI 11001</div>
          <div className="text-emerald-400 text-xs font-mono animate-matrix-rain-fast writing-mode-vertical" style={{ animationDelay: '1s' }}>10101010 SYSTEM 01010</div>
          <div className="text-yellow-400 text-xs font-mono animate-matrix-rain-slow writing-mode-vertical" style={{ animationDelay: '3.5s' }}>00112233 KODE 112233</div>
        </div>

        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-white/40 rounded-full animate-float-particle"></div>
          <div className="absolute top-3/4 left-2/3 w-3 h-3 bg-cyan-300/30 rounded-full animate-float-particle" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20 overflow-hidden">
          <div className="absolute w-[200%] h-full animate-liquid-wave bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent rounded-t-[100%]"></div>
        </div>

        <div className="absolute -top-40 left-0 right-0 h-96 opacity-25 filter blur-[90px] animate-aurora-glow bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
      </div>

      {/* BACKGROUND SVG PAINT SPLASH */}
      {isLight && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-85">
          <svg className="absolute -top-16 -left-16 w-[550px] h-[550px] animate-splash-spin-slow text-pink-500/40" viewBox="0 0 200 200" fill="currentColor">
            <path d="M38.2,-52.1C50.2,-43.3,61.3,-33.5,67.4,-20.5C73.6,-7.5,74.8,8.8,69.5,22.2C64.3,35.6,52.6,46.1,39.1,53.8C25.6,61.4,10.2,66.2,-3.3,65.6C-16.8,65,-28.4,59.1,-39.9,50.7C-51.4,42.4,-62.8,31.6,-67.9,17.9C-73,4.2,-71.8,-12.4,-63.9,-25.6C-56,-38.8,-41.4,-48.6,-27.8,-56.3C-14.2,-64.1,-1.6,-69.8,11.2,-67.2C24,-64.6,26.2,-60.9,38.2,-52.1Z" transform="translate(100 100)" />
          </svg>
          <svg className="absolute -top-12 -right-16 w-[650px] h-[650px] animate-splash-pulse text-sky-400/40" viewBox="0 0 200 200" fill="currentColor">
            <path d="M42.7,-54.1C55.4,-44.6,66.5,-32.5,71.7,-18.2C76.8,-3.8,76,12.8,69.4,26.5C62.9,40.3,50.5,51.2,36.5,58.8C22.4,66.4,6.7,70.7,-8.4,68.9C-23.5,67,-38,59,-50.2,47.8C-62.4,36.6,-72.2,22.2,-73.4,6.9C-74.7,-8.3,-67.4,-24.4,-56.3,-35.1C-45.1,-45.8,-30.1,-51.1,-16.2,-59.2C-2.4,-67.3,10.3,-78.2,24.1,-75.4C37.8,-72.7,30,-63.6,42.7,-54.1Z" transform="translate(100 100)" />
          </svg>
        </div>
      )}

      {/* Tombol Tema */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className={`backdrop-blur-xl p-3 rounded-2xl border shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105 group ${
            isLight 
              ? 'bg-white/90 hover:bg-white border-slate-300 text-slate-800 shadow-purple-500/10' 
              : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
          }`}
          title="Ganti Tema"
        >
          <svg className={`w-5 h-5 transition-transform group-hover:rotate-90 duration-500 ${isLight ? 'text-purple-600' : 'text-cyan-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 73.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Tema</span>
        </button>
      </div>

      {/* Drawer Samping Tema */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-80 ${isLight ? 'bg-slate-900/95 text-white' : 'bg-[#0c0418]/90'} backdrop-blur-2xl border-l border-white/20 shadow-[_-20px_0_50px_rgba(0,0,0,0.7)] z-50 p-6 flex flex-col justify-between transition-transform duration-500 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
              <h2 className="text-white font-extrabold text-base tracking-wide uppercase">Pilih Tema Tampilan</h2>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]' 
                      : 'bg-black/30 border-white/10 hover:bg-white/10 hover:border-white/30 text-slate-300'
                  }`}
                >
                  <div>
                    <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {t.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {t.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-slate-900 font-bold text-xs shadow-md">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            DyPRAL Dynamic Theme Engine
          </p>
        </div>
      </div>

      {/* Orbs Background */}
      <div className="absolute top-10 left-10 w-[400px] h-[400px] rounded-full blur-[130px] pointer-events-none animate-blob orb-1 transition-all duration-700"></div>
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none animate-blob orb-2 transition-all duration-700" style={{ animationDelay: '2.5s' }}></div>
      <div className="absolute bottom-10 left-1/3 w-[420px] h-[420px] rounded-full blur-[150px] pointer-events-none animate-blob orb-3 transition-all duration-700" style={{ animationDelay: '5s' }}></div>

      {/* Konten Utama Dashboard */}
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl transition-colors duration-700 ${
          isLight 
            ? 'bg-white/40 border-pink-300/60 text-slate-900 shadow-pink-500/10' 
            : 'bg-black/30 border-white/20 text-white shadow-black/40'
        }`}>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className={`inline-flex items-center text-xs font-medium px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isLight ? 'bg-white/70 text-slate-800 border-slate-200 hover:bg-white' : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
              }`}
            >
              ← Kembali ke Pencarian
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase">
              {displayUnit}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`text-xs sm:text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Laporan Dinamis Penilaian Kinerja Triwulanan</p>
              <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-lg border ${
                isLight ? 'text-teal-800 bg-teal-50/80 border-teal-200' : 'text-teal-300 bg-teal-950/40 border-teal-500/30'
              }`}>
                <svg className="w-3.5 h-3.5 mr-1.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Update data BKN pada: {lastUpdated || 'Memuat...'}
              </span>
            </div>
          </div>
          <div className={`border p-4 rounded-2xl shadow-inner ${isLight ? 'bg-white/60 border-slate-200 text-slate-900' : 'bg-black/30 border-white/20 text-white'}`}>
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Pegawai</p>
            <p className="text-xl font-black">{loading ? '...' : `${totalPegawai.toLocaleString()} Orang`}</p>
          </div>
        </div>

        {/* SECTION 1: KUADRAN KINERJA */}
        <div className={`backdrop-blur-xl border rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl transition-colors duration-700 ${
          isLight ? 'bg-white/30 border-pink-200/60 text-slate-900' : 'bg-black/25 border-white/20 text-white'
        }`}>
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpenKuadran(!isOpenKuadran)}>
            <h2 className="font-bold uppercase text-sm tracking-wider">Kuadran Kinerja</h2>
            <span className="font-bold">{isOpenKuadran ? '▲' : '▼'}</span>
          </div>

          {isOpenKuadran && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kategoriTampil.map((k, index) => {
                const val = stats[k] || 0;
                const percentage = totalPegawai > 0 ? ((val / totalPegawai) * 100).toFixed(1) : '0';
                const style = flatPastelStyles[k] || flatPastelStyles['Tidak ada data Penilaian'];
                const isSelected = activeCard === k;

                return (
                  <div
                    key={index}
                    onClick={() => setActiveCard(k)}
                    className={`rounded-3xl p-5 flex flex-col justify-between border shadow-md transition-all cursor-pointer ${style.bg} ${
                      isSelected ? 'ring-2 ring-teal-500 scale-[1.02]' : 'hover:shadow-lg'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 rounded-2xl bg-white/80 shadow-sm">
                        {style.icon}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
                        {percentage}% dari total
                      </span>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200/50">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>{k}</p>
                      <h3 className="text-3xl font-black tracking-tight">{loading ? '...' : val.toLocaleString()} <span className="text-xs font-semibold opacity-70">Orang</span></h3>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SUB-SECTION 1: GRAFIK KUADRAN KINERJA */}
        <div className={`backdrop-blur-xl border rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl transition-colors duration-700 ${
          isLight ? 'bg-white/30 border-pink-200/60 text-slate-900' : 'bg-black/25 border-white/20 text-white'
        }`}>
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpenChartKuadran(!isOpenChartKuadran)}>
            <h2 className="font-bold uppercase text-sm tracking-wider">Grafik Sebaran Kuadran Kinerja</h2>
            <span className="font-bold">{isOpenChartKuadran ? '▲' : '▼'}</span>
          </div>

          {isOpenChartKuadran && (
            <div className={`border rounded-2xl p-5 sm:p-8 ${isLight ? 'bg-white/50 border-slate-200' : 'bg-black/30 border-white/15'}`}>
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={kuadranChartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: isLight ? '#475569' : '#cbd5e1', fontWeight: 600 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: isLight ? '#475569' : '#cbd5e1', fontWeight: 600 }} width={95} />
                    <Tooltip contentStyle={{ backgroundColor: isLight ? '#ffffff' : '#1e293b', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: isLight ? '#0f172a' : '#fff' }} />
                    <Bar dataKey="jumlah" radius={[0, 8, 8, 0]}>
                      {kuadranChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: STATUS PENILAIAN */}
        <div className={`backdrop-blur-xl border rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl transition-colors duration-700 ${
          isLight ? 'bg-white/30 border-pink-200/60 text-slate-900' : 'bg-black/25 border-white/20 text-white'
        }`}>
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpenStatusCards(!isOpenStatusCards)}>
            <h2 className="font-bold uppercase text-sm tracking-wider">Status Penilaian</h2>
            <span className="font-bold">{isOpenStatusCards ? '▲' : '▼'}</span>
          </div>

          {isOpenStatusCards && (
            <div className="space-y-4">
              {statusTampil.map((status, index) => {
                const val = statusStats[status] || 0;
                const percentage = totalPegawai > 0 ? ((val / totalPegawai) * 100).toFixed(1) : '0';
                const isSelected = activeStatusCard === status;
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setActiveStatusCard(status === activeStatusCard ? null : status);
                      router.push(`/dashboard/${encodeURIComponent(decodedUnit)}/detil?status=${encodeURIComponent(status)}`);
                    }}
                    className={`p-4 rounded-2xl border shadow-sm flex justify-between items-center cursor-pointer transition-all ${
                      isLight 
                        ? 'bg-white/60 border-slate-200 hover:bg-white text-slate-900' 
                        : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
                    } ${isSelected ? 'ring-2 ring-teal-500' : ''}`}
                  >
                    <div>
                      <p className="font-bold uppercase">{status}</p>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">{percentage}% dari total</span>
                    </div>
                    <div className="text-right">
                      <h4 className="text-xl font-black">{loading ? '...' : val.toLocaleString()}</h4>
                      <p className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Pegawai</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SUB-SECTION 2: GRAFIK RASIO STATUS PENILAIAN */}
        <div className={`backdrop-blur-xl border rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl transition-colors duration-700 ${
          isLight ? 'bg-white/30 border-pink-200/60 text-slate-900' : 'bg-black/25 border-white/20 text-white'
        }`}>
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpenChartStatus(!isOpenChartStatus)}>
            <h2 className="font-bold uppercase text-sm tracking-wider">Grafik Rasio Status Penilaian</h2>
            <span className="font-bold">{isOpenChartStatus ? '▲' : '▼'}</span>
          </div>

          {isOpenChartStatus && (
            <div className={`border rounded-2xl p-4 sm:p-6 ${isLight ? 'bg-white/50 border-slate-200' : 'bg-black/30 border-white/15'}`}>
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={statusChartData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: isLight ? '#475569' : '#cbd5e1', fontWeight: 600 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: isLight ? '#475569' : '#cbd5e1', fontWeight: 600 }} width={75} />
                    <Tooltip contentStyle={{ backgroundColor: isLight ? '#ffffff' : '#1e293b', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: isLight ? '#0f172a' : '#fff' }} />
                    <Bar dataKey="jumlah" radius={[0, 8, 8, 0]}>
                      {statusChartData.map((_, index) => (
                        <Cell key={`status-bar-${index}`} fill={['#14b8a6', '#fbbf24', '#94a3b8'][index % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className={`relative z-10 w-full text-center py-6 text-xs font-medium tracking-wide flex-shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
        DyPRAL v1.0 • © 2026 MPRijki and his glitchy human-wannabe robot, Cukmini.
      </footer>

      {/* CSS & Keyframes Tema & Animasi */}
      <style jsx global>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%, 0% 0%, 0% 50%; }
          50% { background-position: 100% 50%, 50% 100%, 100% 50%; }
          100% { background-position: 0% 50%, 0% 0%, 0% 50%; }
        }

        @keyframes blobMotion {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(35px, -45px) scale(1.12); }
          66% { transform: translate(-25px, 25px) scale(0.88); }
        }

        @keyframes splashSpinSlow {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes splashPulse {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.7; }
          50% { transform: scale(1.2) translateY(-20px); opacity: 0.95; }
        }

        @keyframes matrixRain {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.8; }
        }

        @keyframes liquidWave {
          0% { transform: translateX(0) translateZ(0) scaleY(1); }
          50% { transform: translateX(-25%) translateZ(0) scaleY(1.2); }
          100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
        }

        @keyframes auroraGlow {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(20px) scale(1.1); opacity: 0.4; }
        }

        .animate-matrix-rain {
          animation: matrixRain 4s linear infinite;
        }

        .animate-matrix-rain-slow {
          animation: matrixRain 7s linear infinite;
        }

        .animate-matrix-rain-fast {
          animation: matrixRain 2.5s linear infinite;
        }

        .animate-float-particle {
          animation: floatParticle 6s ease-in-out infinite;
        }

        .animate-liquid-wave {
          animation: liquidWave 8s ease-in-out infinite;
        }

        .animate-aurora-glow {
          animation: auroraGlow 10s ease-in-out infinite;
        }

        .writing-mode-vertical {
          writing-mode: vertical-lr;
        }

        .animated-bg {
          background-size: 200% 200%, 200% 200%, 400% 400%;
          animation: gradientAnimation 15s ease infinite;
        }

        .theme-neon {
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(238, 129, 248, 0.6) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgb(245, 42, 245) 0%, transparent 40%),
            linear-gradient(-45deg, #00fcd2, #b163ff, #ff007f, #a12471);
        }
        .theme-neon .orb-1 { background-color: rgba(183,255,0,0.16); }
        .theme-neon .orb-2 { background-color: rgba(204,255,0,0.14); }
        .theme-neon .orb-3 { background-color: rgba(149,215,0,0.12); }

        .theme-sunset {
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255, 183, 77, 0.6) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(244, 67, 54, 0.6) 0%, transparent 40%),
            linear-gradient(-45deg, #ff9800, #e91e63, #9c27b0, #3f51b5);
        }
        .theme-sunset .orb-1 { background-color: rgba(255,193,7,0.2); }
        .theme-sunset .orb-2 { background-color: rgba(255,87,34,0.2); }
        .theme-sunset .orb-3 { background-color: rgba(156,39,176,0.2); }

        .theme-ocean {
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(0, 229, 255, 0.6) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(41, 121, 255, 0.6) 0%, transparent 40%),
            linear-gradient(-45deg, #002b36, #073642, #268bd2, #2aa198);
        }
        .theme-ocean .orb-1 { background-color: rgba(0,229,255,0.2); }
        .theme-ocean .orb-2 { background-color: rgba(41,121,255,0.2); }
        .theme-ocean .orb-3 { background-color: rgba(0,150,136,0.2); }

        .theme-emerald {
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(0, 230, 118, 0.5) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(0, 150, 136, 0.5) 0%, transparent 40%),
            linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #004d40);
        }
        .theme-emerald .orb-1 { background-color: rgba(0,230,118,0.15); }
        .theme-emerald .orb-2 { background-color: rgba(76,175,80,0.15); }
        .theme-emerald .orb-3 { background-color: rgba(0,150,136,0.15); }

        .theme-splash {
          background-color: #f8fafc;
          background-image: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
        }

        .animate-splash-spin-slow {
          animation: splashSpinSlow 25s linear infinite;
        }

        .animate-splash-pulse {
          animation: splashPulse 7s ease-in-out infinite;
        }

        .theme-splash .orb-1 { background-color: rgb(252, 94, 146); }
        .theme-splash .orb-2 { background-color: rgb(109, 206, 248); }
        .theme-splash .orb-3 { background-color: rgba(255, 196, 86, 0.91); }

        .animate-blob {
          animation: blobMotion 9s infinite ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}