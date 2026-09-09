'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

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

  // --- STATE ACCORDION (SHOW/HIDE) ---
  const [isOpenKuadran, setIsOpenKuadran] = useState(false);
  const [isOpenStatus, setIsOpenStatus] = useState(false);

  // Ref Running Text (Unit)
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const velocityRef = useRef(0.8);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Ref Scroll Kartu Statistik
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const isCardsMouseDownRef = useRef(false);
  const cardsStartXRef = useRef(0);
  const cardsScrollLeftRef = useRef(0);

  const decodedUnit = typeof unit === 'string' ? decodeURIComponent(unit) : '';

  const displayUnit =
    decodedUnit.toUpperCase() === 'SEMUA'
      ? 'SEMUA PERANGKAT DAERAH'
      : decodedUnit;

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

  const styleKategori: Record<
    string,
    { accentGlow: string; text: string; shadow: string; badgeBg: string; icon: React.ReactNode }
  > = {
    'Sangat Baik': {
      accentGlow: 'from-emerald-500/20 to-transparent',
      text: 'text-emerald-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(16,185,129,0.2)]',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    'Baik': {
      accentGlow: 'from-cyan-500/20 to-transparent',
      text: 'text-cyan-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(6,182,212,0.2)]',
      badgeBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'Butuh Perbaikan': {
      accentGlow: 'from-amber-500/20 to-transparent',
      text: 'text-amber-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(245,158,11,0.2)]',
      badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    'Kurang': {
      accentGlow: 'from-orange-500/20 to-transparent',
      text: 'text-orange-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(249,115,22,0.2)]',
      badgeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      icon: (
        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
    },
    'Sangat Kurang': {
      accentGlow: 'from-rose-500/20 to-transparent',
      text: 'text-rose-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(244,63,94,0.2)]',
      badgeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      icon: (
        <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    'Belum Penilaian': {
      accentGlow: 'from-indigo-500/20 to-transparent',
      text: 'text-indigo-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(99,102,241,0.2)]',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      icon: (
        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'Tidak ada data Penilaian': {
      accentGlow: 'from-slate-500/20 to-transparent',
      text: 'text-slate-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(148,163,184,0.15)]',
      badgeBg: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
      icon: (
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
  };

  const styleStatus: Record<
    string,
    { accentGlow: string; text: string; shadow: string; badgeBg: string; icon: React.ReactNode }
  > = {
    'Sudah': {
      accentGlow: 'from-emerald-500/20 to-transparent',
      text: 'text-emerald-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(16,185,129,0.2)]',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    'Belum': {
      accentGlow: 'from-amber-500/20 to-transparent',
      text: 'text-amber-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(245,158,11,0.2)]',
      badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'Tidak Ada Data': {
      accentGlow: 'from-slate-500/20 to-transparent',
      text: 'text-slate-400',
      shadow: 'hover:shadow-[0_15px_30px_rgba(148,163,184,0.15)]',
      badgeBg: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
      icon: (
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
        </svg>
      ),
    },
  };

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndFetchData() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('users_login')
          .select('role, unit_kerja')
          .eq('user_id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.error('Sesi rusak/Profil tidak ditemukan:', profileError);
          router.push('/login');
          return;
        }

        const role = profile.role || 'user';
        const userUnit = profile.unit_kerja || '';

        // OTORISASI AKSES UNIT KERJA (Support Array & String)
        if (role !== 'admin') {
          let hasAccess = false;
          const targetUnit = String(decodedUnit || '').toLowerCase();

          if (Array.isArray(userUnit)) {
            hasAccess = userUnit.some(
              (u: string) => String(u || '').toLowerCase() === targetUnit
            );
          } else if (typeof userUnit === 'string') {
            hasAccess = userUnit.toLowerCase() === targetUnit;
          }

          if (!hasAccess) {
            alert(
              'AKSES DITOLAK! Anda tidak memiliki hak untuk mengakses unit kerja ini.'
            );
            router.push('/');
            return;
          }
        }

        if (isMounted) setAuthorized(true);
      } catch (e) {
        console.error('Error Validasi Akses:', e);
        router.push('/login');
        return;
      }

      // Ambil Info Metadata Update dari Supabase
      const { data: infoData, error: infoError } = await supabase
        .from('metadata_update')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);

      console.log('DEBUG METADATA:', infoData, infoError);

      if (infoError) {
        console.error('Error Info Update:', infoError);
      }

      if (infoData && infoData.length > 0) {
        const rawTimestamp =
          infoData[0].created_at || infoData[0].updated_at || infoData[0].tanggal;
        
        if (rawTimestamp) {
          // Bersihkan string timestamp agar aman diparsing JS di semua environment browser
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

      if (!decodedUnit) {
        setLoading(false);
        return;
      }

      // Eksekusi RPC get_statistik_kinerja
      const { data, error } = await supabase.rpc('get_statistik_kinerja', {
        target_unit: decodedUnit,
      });

      if (!isMounted) return;

      if (error) {
        console.error('Error RPC:', error);
      } else if (data) {
        const rows = data as KinerjaItem[];

        const hitungan = rows.reduce((acc: Record<string, number>, curr) => {
          const rawKuadran = curr.kuadran ?? curr.kuadran_kinerja ?? curr.kategori;
          let k = rawKuadran ? String(rawKuadran).trim() : 'Tidak ada data Penilaian';

          const kLower = k.toLowerCase();
          if (kLower.includes('sangat baik')) k = 'Sangat Baik';
          else if (
            kLower.includes('baik') &&
            !kLower.includes('sangat') &&
            !kLower.includes('kurang')
          )
            k = 'Baik';
          else if (kLower.includes('butuh perbaikan')) k = 'Butuh Perbaikan';
          else if (kLower.includes('sangat kurang')) k = 'Sangat Kurang';
          else if (kLower.includes('kurang')) k = 'Kurang';
          else if (kLower.includes('belum')) k = 'Belum Penilaian';
          else k = 'Tidak ada data Penilaian';

          acc[k] = (acc[k] || 0) + Number(curr.jumlah || 0);
          return acc;
        }, {});
        setStats(hitungan);

        const statusHitungan = rows.reduce(
          (acc: Record<string, number>, curr) => {
            const rawStatus =
              curr.status_penilaian ?? curr.status ?? curr.status_isi;
            let s = rawStatus ? String(rawStatus).trim() : 'Tidak Ada Data';

            const sUpper = s.toUpperCase();
            if (sUpper.includes('SUDAH')) s = 'Sudah';
            else if (sUpper.includes('BELUM')) s = 'Belum';
            else s = 'Tidak Ada Data';

            acc[s] = (acc[s] || 0) + Number(curr.jumlah || 0);
            return acc;
          },
          { Sudah: 0, Belum: 0, 'Tidak Ada Data': 0 }
        );

        setStatusStats(statusHitungan);
      }
      setLoading(false);
    }

    checkAuthAndFetchData();

    return () => {
      isMounted = false;
    };
  }, [decodedUnit, router]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const contentWidth = el.scrollWidth / 3;

    const animate = () => {
      if (!isDraggingRef.current) {
        posRef.current -= velocityRef.current;

        if (Math.abs(velocityRef.current) > 0.8) {
          velocityRef.current *= 0.95;
          if (Math.abs(velocityRef.current) <= 0.8) {
            velocityRef.current = 0.8;
          }
        }

        if (posRef.current <= -contentWidth) {
          posRef.current += contentWidth;
        } else if (posRef.current >= 0) {
          posRef.current -= contentWidth;
        }

        el.style.transform = `translateX(${posRef.current}px)`;
      }
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const handleStart = (clientX: number) => {
    isDraggingRef.current = true;
    startXRef.current = clientX;
    lastXRef.current = clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handleMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    const dx = clientX - lastXRef.current;

    posRef.current += dx;
    containerRef.current.style.transform = `translateX(${posRef.current}px)`;

    if (dt > 0) {
      velocityRef.current = (dx / dt) * 16;
    }

    lastXRef.current = clientX;
    lastTimeRef.current = now;
  }, []);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (Math.abs(velocityRef.current) < 0.2) {
      velocityRef.current = 0.8;
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const handleCardsMouseDown = (e: React.MouseEvent) => {
    if (!cardsScrollRef.current) return;
    isCardsMouseDownRef.current = true;
    cardsStartXRef.current = e.pageX - cardsScrollRef.current.offsetLeft;
    cardsScrollLeftRef.current = cardsScrollRef.current.scrollLeft;
  };

  const handleCardsMouseLeaveOrUp = useCallback(() => {
    isCardsMouseDownRef.current = false;
    setActiveCard(null);
  }, []);

  const handleCardsMouseMove = useCallback((e: MouseEvent) => {
    if (!isCardsMouseDownRef.current || !cardsScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - cardsScrollRef.current.offsetLeft;
    const walk = (x - cardsStartXRef.current) * 1.5;
    cardsScrollRef.current.scrollLeft = cardsScrollLeftRef.current - walk;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleCardsMouseMove(e);
    const onMouseUp = () => handleCardsMouseLeaveOrUp();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleCardsMouseMove, handleCardsMouseLeaveOrUp]);

  const totalPegawai = Object.values(stats).reduce(
    (a: number, b: number) => a + b,
    0
  );

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-mono animate-pulse">
          Memeriksa Kredensial Keamanan...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-white px-3 py-6 sm:px-6 md:p-12 relative overflow-x-hidden overflow-y-auto flex flex-col justify-between selection:bg-cyan-500 selection:text-white animated-bg">
      <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-[rgba(183,255,0,0.16)] rounded-full blur-[130px] pointer-events-none animate-blob"></div>
      <div
        className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-[rgba(204,255,0,0.14)] rounded-full blur-[140px] pointer-events-none animate-blob"
        style={{ animationDelay: '2.5s' }}
      ></div>
      <div
        className="absolute bottom-10 left-1/3 w-[420px] h-[420px] bg-[rgba(149,215,0,0.12)] rounded-full blur-[150px] pointer-events-none animate-blob"
        style={{ animationDelay: '5s' }}
      ></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 pb-6 border-b border-white/10 backdrop-blur-md bg-black/20 p-6 rounded-3xl shadow-2xl">
          <div className="overflow-hidden max-w-full md:max-w-2xl">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center text-xs font-medium text-slate-200 hover:text-white transition-colors mb-3 group bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 w-fit shadow-sm backdrop-blur-md cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 mr-1.5 transform transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Kembali ke Pencarian Perangkat Daerah
            </button>

            <div
              className="relative w-full overflow-hidden marquee-container py-1 cursor-grab active:cursor-grabbing select-none whitespace-nowrap"
              onMouseDown={(e) => handleStart(e.clientX)}
              onTouchStart={(e) => {
                if (e.touches.length > 0) handleStart(e.touches[0].clientX);
              }}
            >
              <div
                ref={containerRef}
                className="inline-flex items-center will-change-transform"
              >
                {[0, 1, 2].map((i) => (
                  <h1
                    key={i}
                    className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase drop-shadow-md inline-flex items-center flex-shrink-0"
                  >
                    <span>{displayUnit}</span>
                    <span className="mx-6 sm:mx-10 inline-flex items-center">
                      <svg
                        className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </span>
                  </h1>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
              <p className="text-slate-300 text-xs sm:text-sm">
                Laporan Dinamis Penilaian Kinerja Triwulanan
              </p>
              <span className="inline-flex items-center text-[10px] sm:text-xs text-slate-300 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md w-fit">
                <svg
                  className="w-3 h-3 mr-1 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Update data BKN pada: {lastUpdated || 'Memuat...'}
              </span>
            </div>
          </div>

          <div className="flex items-center bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden self-start md:self-auto p-1.5 flex-shrink-0">
            <div className="bg-cyan-500/25 px-3 py-2 rounded-xl flex items-center justify-center border border-cyan-500/40 mr-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
            </div>
            <div className="px-2 py-0.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">
                Total Pegawai
              </p>
              <p className="text-sm sm:text-lg font-bold text-white tracking-wide">
                {loading ? '...' : `${totalPegawai.toLocaleString()} Orang`}
              </p>
            </div>
          </div>
        </div>

        {/* --- SECTION 1: KUADRAN KINERJA (ACCORDION) --- */}
        <div className="mb-2">
          <button
            onClick={() => setIsOpenKuadran(!isOpenKuadran)}
            className="w-full text-left focus:outline-none group py-1"
          >
            <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase px-3 flex items-center gap-2 drop-shadow-md cursor-pointer hover:opacity-80 transition-opacity">
              <svg
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] flex-shrink-0 transform transition-transform duration-300 ${
                  isOpenKuadran ? 'rotate-90' : 'rotate-0'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)] tracking-wide">
                Kuadran Kinerja
              </span>
            </h2>
          </button>

          {/* KONTEN KUADRAN KINERJA */}
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              isOpenKuadran
                ? 'max-h-[500px] opacity-100 mt-2'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div
              ref={cardsScrollRef}
              onMouseDown={handleCardsMouseDown}
              className="relative w-full overflow-x-auto no-scrollbar py-2 px-3 cursor-grab active:cursor-grabbing select-none flex items-center"
            >
              <div className="inline-flex gap-4 flex-nowrap w-max mx-auto">
                {kategoriTampil.map((k, index) => {
                  const val = stats[k] || 0;
                  const percentage =
                    totalPegawai > 0
                      ? ((val / totalPegawai) * 100).toFixed(1)
                      : '0';
                  const theme =
                    styleKategori[k] || styleKategori['Tidak ada data Penilaian'];
                  const isSelected = activeCard === k;

                  return (
                    <div
                      key={index}
                      onMouseDown={() => setActiveCard(k)}
                      onTouchStart={() => setActiveCard(k)}
                      className={`flex flex-col h-[195px] sm:h-[210px] min-w-[155px] sm:min-w-[185px] rounded-2xl bg-slate-900/40 backdrop-blur-xl border transition-all duration-300 overflow-hidden group flex-shrink-0 relative z-10 ${
                        isSelected
                          ? 'scale-95 shadow-[0_0_25px_rgba(6,182,212,0.4)] border-cyan-400 bg-slate-900/80 ring-2 ring-cyan-500/50'
                          : `border-white/10 hover:-translate-y-2 hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${theme.shadow} hover:z-20`
                      }`}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${theme.accentGlow} opacity-50 pointer-events-none`}
                      ></div>

                      <div className="h-[60%] px-3 pt-3 pb-1 flex flex-col items-center justify-between border-b border-white/5 relative z-10 pointer-events-none">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center">
                          {theme.icon}
                        </div>
                        <div>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${theme.badgeBg} uppercase tracking-wider`}
                          >
                            {percentage}%
                          </span>
                        </div>
                        <p className="text-slate-200 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase leading-tight px-0.5 text-center">
                          {k}
                        </p>
                      </div>

                      <div className="h-[40%] px-3 py-1 flex flex-col items-center justify-center bg-black/20 relative z-10 pointer-events-none">
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                          {loading ? (
                            <span className="inline-block w-5 h-5 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></span>
                          ) : (
                            val.toLocaleString()
                          )}
                        </h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          Orang
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: STATUS PENILAIAN (ACCORDION) --- */}
        <div className="mt-4 mb-2">
          <button
            onClick={() => setIsOpenStatus(!isOpenStatus)}
            className="w-full text-left focus:outline-none group py-1"
          >
            <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase px-3 flex items-center gap-2 drop-shadow-md cursor-pointer hover:opacity-80 transition-opacity">
              <svg
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] flex-shrink-0 transform transition-transform duration-300 ${
                  isOpenStatus ? 'rotate-90' : 'rotate-0'
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)] tracking-wide">
                Status Penilaian
              </span>
            </h2>
          </button>

          {/* KONTEN STATUS PENILAIAN */}
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              isOpenStatus
                ? 'max-h-[500px] opacity-100 mt-2'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2 py-2">
              {statusTampil.map((status, index) => {
                const val = statusStats[status] || 0;
                const percentage =
                  totalPegawai > 0
                    ? ((val / totalPegawai) * 100).toFixed(1)
                    : '0';
                const theme = styleStatus[status];
                const isSelected = activeStatusCard === status;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setActiveStatusCard(
                        status === activeStatusCard ? null : status
                      );
                      const encodedUnit = encodeURIComponent(decodedUnit);
                      router.push(
                        `/dashboard/${encodedUnit}/detil?status=${encodeURIComponent(
                          status
                        )}`
                      );
                    }}
                    onTouchStart={() => {
                      setActiveStatusCard(
                        status === activeStatusCard ? null : status
                      );
                      const encodedUnit = encodeURIComponent(decodedUnit);
                      router.push(
                        `/dashboard/${encodedUnit}/detil?status=${encodeURIComponent(
                          status
                        )}`
                      );
                    }}
                    className={`rounded-2xl p-4 bg-slate-900/40 backdrop-blur-xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex items-center justify-between z-10 ${
                      isSelected
                        ? 'scale-95 shadow-[0_0_25px_rgba(6,182,212,0.4)] border-cyan-400 bg-slate-900/80 ring-2 ring-cyan-500/50'
                        : `border-white/10 hover:-translate-y-1 hover:border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${theme.shadow} hover:z-20`
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${theme.accentGlow} opacity-50 pointer-events-none`}
                    ></div>

                    <div className="flex items-center gap-3.5 pointer-events-none relative z-10">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center flex-shrink-0">
                        {theme.icon}
                      </div>
                      <div>
                        <p className="text-white text-xs sm:text-sm font-black uppercase tracking-wide">
                          {status}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${theme.badgeBg}`}
                        >
                          {percentage}% dari Total
                        </span>
                      </div>
                    </div>

                    <div className="text-right pointer-events-none relative z-10">
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {loading ? '...' : val.toLocaleString()}
                      </h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        Pegawai
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 w-full max-w-7xl mx-auto pt-8 mt-12 border-t border-white/10 text-center text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>DyPRAL v1.0 • Dynamic Performance Appraisal Report</p>
        <p>© 2026 MPRijki and his glitchy human-wannabe robot, Cukmini</p>
      </footer>

      <style jsx global>{`
        @keyframes gradientAnimation {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes blobMotion {
          0%,
          100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(35px, -45px) scale(1.12);
          }
          66% {
            transform: translate(-25px, 25px) scale(0.88);
          }
        }

        .animated-bg {
          background-image: radial-gradient(
              circle at 20% 30%,
              rgba(238, 129, 248, 0.6) 0%,
              transparent 40%
            ),
            radial-gradient(circle at 80% 70%, rgb(245, 42, 245) 0%, transparent 40%),
            linear-gradient(-45deg, #00fcd2, #b163ff, #ff007f, #a12471);
          background-size: 200% 200%, 200% 200%, 400% 400%;
          animation: gradientAnimation 15s ease infinite;
        }

        .animate-blob {
          animation: blobMotion 9s infinite ease-in-out;
        }

        .marquee-container {
          mask-image: linear-gradient(
            to right,
            transparent,
            black 10%,
            black 90%,
            transparent
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent,
            black 10%,
            black 90%,
            transparent
          );
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}