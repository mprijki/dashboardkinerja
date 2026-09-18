'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { supabase } from '@/app/lib/supabase';

interface PegawaiDetail {
  id?: string;
  nip?: string;
  nama: string;
  unit_kerja?: string;
  cuti?: string | number;
  status_penilaian?: string;
  jenis_pegawai?: string;
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

export default function DetailStatusPegawai() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const unit = params?.unit;
  const status = searchParams.get('status') || 'Sudah';

  const decodedUnit = typeof unit === 'string' ? decodeURIComponent(unit) : '';
  const decodedStatus = decodeURIComponent(status);

  const isSemuaUnit = decodedUnit.toUpperCase().includes('SEMUA');

  const [authorized, setAuthorized] = useState(false);
  const [allUnitPegawai, setAllUnitPegawai] = useState<PegawaiDetail[]>([]);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({
    'Sudah': 0,
    'Belum': 0,
    'Tidak Ada Data': 0,
  });
  const [totalPegawaiUnit, setTotalPegawaiUnit] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // State Tema & Sidebar
  const [theme, setTheme] = useState<ThemeType>('neon');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search States
  const [searchTermNama, setSearchTermNama] = useState('');
  const [searchTermUnit, setSearchTermUnit] = useState('');
  const [searchTermCuti, setSearchTermCuti] = useState('');
  const [searchTermJenis, setSearchTermJenis] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const itemsPerPage = 20;

  const statusTampil = ['Sudah', 'Belum', 'Tidak Ada Data'];

  const styleStatus: Record<
    string,
    {
      gradientBorder: string;
      glow: string;
      hexColor: string;
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
      iconBg: string;
      iconText: string;
      iconBorder: string;
      icon: React.ReactNode;
    }
  > = {
    'Sudah': {
      gradientBorder: 'from-[#34d399] via-[#14b8a6] to-[#06b6d4]',
      glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.35)]',
      hexColor: '#34d399',
      badgeBg: 'rgba(52, 211, 153, 0.1)',
      badgeText: '#0d9488',
      badgeBorder: 'rgba(52, 211, 153, 0.3)',
      iconBg: 'rgba(52, 211, 153, 0.2)',
      iconText: '#0d9488',
      iconBorder: 'rgba(52, 211, 153, 0.3)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    'Belum': {
      gradientBorder: 'from-[#fbbf24] via-[#f97316] to-[#f43f5e]',
      glow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.35)]',
      hexColor: '#d97706',
      badgeBg: 'rgba(251, 191, 36, 0.1)',
      badgeText: '#b45309',
      badgeBorder: 'rgba(251, 191, 36, 0.3)',
      iconBg: 'rgba(251, 191, 36, 0.2)',
      iconText: '#d97706',
      iconBorder: 'rgba(251, 191, 36, 0.3)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    'Tidak Ada Data': {
      gradientBorder: 'from-[#64748b] via-[#475569] to-[#334155]',
      glow: 'hover:shadow-[0_0_30px_rgba(100,116,139,0.35)]',
      hexColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.1)',
      badgeText: '#475569',
      badgeBorder: 'rgba(100, 116, 139, 0.3)',
      iconBg: 'rgba(100, 116, 139, 0.2)',
      iconText: '#64748b',
      iconBorder: 'rgba(100, 116, 139, 0.3)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6" />
        </svg>
      ),
    },
  };

  const getNormalizedStatus = useCallback((rawStatus: any): string => {
    if (!rawStatus) return 'Tidak Ada Data';
    const str = String(rawStatus).trim().toLowerCase();
    if (str.includes('sudah')) return 'Sudah';
    if (str.includes('belum')) return 'Belum';
    return 'Tidak Ada Data';
  }, []);

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

  // Sinkronisasi tema dari localStorage
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
    setCurrentPage(1);
    setPageInput('1');
    setSearchTermNama('');
    setSearchTermUnit('');
    setSearchTermCuti('');
    setSearchTermJenis('');
  }, [decodedStatus]);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndFetchData() {
      if (!decodedUnit) return;
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users_login')
        .select('role, unit_kerja')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !profile) {
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

      let semuaData: PegawaiDetail[] = [];
      let limit = 1000;
      let offset = 0;
      let fetchMore = true;

      while (fetchMore) {
        let query = supabase
          .from('data_triwulan')
          .select('nama, unit_kerja, cuti, jenis_pegawai, status_penilaian');

        if (!isSemuaUnit) {
          query = query.eq('unit_kerja', decodedUnit);
        }

        const { data, error } = await query.range(offset, offset + limit - 1);

        if (error) break;

        if (data && data.length > 0) {
          semuaData = [...semuaData, ...data];
          if (data.length < limit) {
            fetchMore = false;
          } else {
            offset += limit;
          }
        } else {
          fetchMore = false;
        }
      }

      if (isMounted) {
        setAllUnitPegawai(semuaData);
        setTotalPegawaiUnit(semuaData.length);

        const hitungan: Record<string, number> = {
          'Sudah': 0,
          'Belum': 0,
          'Tidak Ada Data': 0,
        };

        semuaData.forEach((item) => {
          const s = getNormalizedStatus(item.status_penilaian);
          hitungan[s] = (hitungan[s] || 0) + 1;
        });
        setStatusStats(hitungan);

        setLoading(false);
      }
    }

    checkAuthAndFetchData();

    return () => {
      isMounted = false;
    };
  }, [decodedUnit, isSemuaUnit, getNormalizedStatus, router, validateUserAccess]);

  const filteredData = useMemo(() => {
    const targetStatusNorm = getNormalizedStatus(decodedStatus);

    return allUnitPegawai.filter((pegawai) => {
      const itemStatusNorm = getNormalizedStatus(pegawai.status_penilaian);

      const matchStatus = itemStatusNorm === targetStatusNorm;
      const matchNama = (pegawai.nama || '')
        .toLowerCase()
        .includes(searchTermNama.toLowerCase());
      const matchUnit = (pegawai.unit_kerja || '')
        .toLowerCase()
        .includes(searchTermUnit.toLowerCase());
      const matchCuti = String(pegawai.cuti ?? '')
        .toLowerCase()
        .includes(searchTermCuti.toLowerCase());
      const matchJenis = String(pegawai.jenis_pegawai ?? '')
        .toLowerCase()
        .includes(searchTermJenis.toLowerCase());

      return matchStatus && matchNama && matchUnit && matchCuti && matchJenis;
    });
  }, [
    allUnitPegawai,
    decodedStatus,
    searchTermNama,
    searchTermUnit,
    searchTermCuti,
    searchTermJenis,
    getNormalizedStatus,
  ]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setPageInput(String(newPage));
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum)) {
      if (pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
      } else if (pageNum > totalPages) {
        setCurrentPage(totalPages);
        setPageInput(String(totalPages));
      } else {
        setCurrentPage(1);
        setPageInput('1');
      }
    }
  };

  const handleDownloadExcelAll = () => {
    if (allUnitPegawai.length === 0) {
      alert('Tidak ada data unit untuk diunduh.');
      return;
    }

    const now = new Date();
    const tanggalWaktu = now.toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const displayUnitText = isSemuaUnit
      ? 'SEMUA PERANGKAT DAERAH'
      : decodedUnit.toUpperCase();

    const wsData: any[][] = [
      [`REKAP KESELURUHAN PENILAIAN KINERJA - ${displayUnitText}`],
      [`Waktu Ekspor: ${tanggalWaktu} | Total Pegawai: ${allUnitPegawai.length}`],
      [],
      ['No', 'Nama Pegawai', 'Perangkat Daerah', 'Cuti', 'Jenis Pegawai', 'Status Penilaian'],
    ];

    allUnitPegawai.forEach((item, index) => {
      wsData.push([
        index + 1,
        item.nama || '-',
        item.unit_kerja || '-',
        item.cuti !== null && item.cuti !== undefined && item.cuti !== '' ? item.cuti : '-',
        item.jenis_pegawai || '-',
        getNormalizedStatus(item.status_penilaian),
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 35 },
      { wch: 30 },
      { wch: 15 },
      { wch: 22 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Semua Status');

    XLSX.writeFile(wb, `Rekap_Semua_Status_${decodedUnit}.xlsx`);
  };

  const isLight = theme === 'splash';

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
    <main className={`min-h-screen px-3 py-6 sm:px-6 md:p-12 relative overflow-x-hidden overflow-y-auto flex flex-col justify-between selection:bg-cyan-500 selection:text-white transition-colors duration-700 animated-bg theme-${theme}`}>
      
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
          <div className="absolute w-[200%] h-full animate-liquid-wave bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent rounded-t-[100%]" />
        </div>

        <div className="absolute -top-40 left-0 right-0 h-96 opacity-25 filter blur-[90px] animate-aurora-glow bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
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
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
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
      <div className="absolute top-10 left-10 w-[400px] h-[400px] rounded-full blur-[130px] pointer-events-none animate-blob orb-1 transition-all duration-700" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none animate-blob orb-2 transition-all duration-700" style={{ animationDelay: '2.5s' }} />
      <div className="absolute bottom-10 left-1/3 w-[420px] h-[420px] rounded-full blur-[150px] pointer-events-none animate-blob orb-3 transition-all duration-700" style={{ animationDelay: '5s' }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex-grow">
        
        {/* Header Section */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border backdrop-blur-xl p-6 rounded-3xl shadow-2xl transition-colors duration-700 ${
          isLight 
            ? 'bg-white/40 border-pink-300/60 text-slate-900 shadow-pink-500/10' 
            : 'bg-black/30 border-white/10 text-white shadow-2xl'
        }`}>
          <div>
            <button
              onClick={() => {
                const encodedUnit = encodeURIComponent(decodedUnit);
                router.push(`/dashboard/${encodedUnit}`);
              }}
              className={`inline-flex items-center text-xs font-medium transition-colors mb-3 group px-3.5 py-2 rounded-xl border w-fit shadow-sm backdrop-blur-md cursor-pointer ${
                isLight ? 'bg-white/70 text-slate-800 border-slate-200 hover:bg-white' : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/20'
              }`}
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
              Kembali ke Dashboard Unit
            </button>
            <h1 className={`text-xl sm:text-3xl font-extrabold tracking-tight uppercase drop-shadow-md ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Status Penilaian :{' '}
              <span style={{ color: styleStatus[getNormalizedStatus(decodedStatus)]?.hexColor || (isLight ? '#0f172a' : '#ffffff') }}>
                {getNormalizedStatus(decodedStatus)}
              </span>
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Unit:{' '}
              <span className={`font-semibold ${isLight ? 'text-teal-700' : 'text-cyan-400'}`}>
                {isSemuaUnit ? 'SEMUA PERANGKAT DAERAH' : decodedUnit}
              </span>
            </p>
          </div>

          <div>
            <button
              onClick={handleDownloadExcelAll}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Unduh Seluruh Data Status Penilaian
            </button>
          </div>
        </div>

        {/* --- Kartu Status Penilaian --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {statusTampil.map((st, index) => {
            const val = statusStats[st] || 0;
            const percentage =
              totalPegawaiUnit > 0
                ? ((val / totalPegawaiUnit) * 100).toFixed(1)
                : '0';
            const themeStyle = styleStatus[st];
            const isSelected = getNormalizedStatus(decodedStatus) === st;

            return (
              <div
                key={index}
                onClick={() => {
                  const encodedUnit = encodeURIComponent(decodedUnit);
                  router.push(`/dashboard/${encodedUnit}/detil?status=${encodeURIComponent(st)}`);
                }}
                className={`relative rounded-2xl p-[1px] transition-all duration-300 cursor-pointer group ${
                  isSelected
                    ? `bg-gradient-to-r ${themeStyle.gradientBorder} shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-[1.02]`
                    : isLight ? 'bg-white/40 hover:bg-white/70 border border-slate-200' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div
                  className={`h-full w-full backdrop-blur-xl rounded-[15px] p-4 flex items-center justify-between transition-all duration-300 ${
                    isLight ? 'bg-white/60 text-slate-900' : `bg-black/40 text-white ${themeStyle.glow}`
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="p-2.5 rounded-xl border shadow-inner flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: themeStyle.iconBg,
                        color: themeStyle.iconText,
                        borderColor: themeStyle.iconBorder,
                      }}
                    >
                      {themeStyle.icon}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wide transition-colors ${isLight ? 'text-slate-900 group-hover:text-teal-700' : 'text-white group-hover:text-cyan-300'}`}>
                        {st}
                      </p>
                      <span
                        className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: themeStyle.badgeBg,
                          color: themeStyle.badgeText,
                          borderColor: themeStyle.badgeBorder,
                        }}
                      >
                        {percentage}% dari Total
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <h3
                      className="text-xl sm:text-2xl font-black"
                      style={{ color: isSelected ? themeStyle.hexColor : (isLight ? '#0f172a' : '#ffffff') }}
                    >
                      {val.toLocaleString()}
                    </h3>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Orang
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Bar Info Paging ATAS --- */}
        {!loading && (
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 border backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl mb-4 text-xs ${
            isLight ? 'bg-white/40 border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
          }`}>
            <p className={isLight ? 'text-slate-700' : 'text-slate-300'}>
              Menampilkan data{' '}
              <span className={`font-semibold ${isLight ? 'text-teal-700' : 'text-cyan-400'}`}>
                {filteredData.length > 0 ? startIndex + 1 : 0}
              </span>{' '}
              sampai{' '}
              <span className={`font-semibold ${isLight ? 'text-teal-700' : 'text-cyan-400'}`}>
                {Math.min(startIndex + itemsPerPage, filteredData.length)}
              </span>{' '}
              dari total{' '}
              <span className={`font-semibold ${isLight ? 'text-teal-700' : 'text-cyan-400'}`}>{filteredData.length}</span>{' '}
              pegawai
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer ${
                  isLight ? 'bg-white/70 border-slate-200 text-slate-800 hover:bg-white' : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                }`}
              >
                ← Sebelumnya
              </button>

              <form
                onSubmit={handlePageInputSubmit}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  isLight ? 'bg-white/60 border-slate-200 text-slate-800' : 'bg-black/40 border-white/10 text-slate-300'
                }`}
              >
                <span>Hal.</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className={`w-12 text-center border rounded-lg font-bold focus:outline-none focus:ring-1 py-0.5 text-xs ${
                    isLight ? 'bg-white border-slate-300 text-teal-700 focus:ring-teal-500' : 'bg-black/60 border-white/20 text-cyan-300 focus:ring-cyan-400'
                  }`}
                />
                <span>dari {totalPages}</span>
              </form>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer ${
                  isLight ? 'bg-white/70 border-slate-200 text-slate-800 hover:bg-white' : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                }`}
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}

        {/* Tabel Data Lengkap */}
        <div className={`border backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden mb-6 ${
          isLight ? 'bg-white/30 border-pink-200/60 text-slate-900' : 'bg-black/30 border-white/10 text-white'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] uppercase tracking-wider ${
                  isLight ? 'border-slate-200 bg-white/50 text-slate-700 font-bold' : 'border-white/10 bg-white/5 text-slate-300 font-bold'
                }`}>
                  <th className="py-4 px-6 w-16">No</th>
                  <th className="py-4 px-6">Nama Pegawai</th>
                  <th className="py-4 px-6">Perangkat Daerah</th>
                  <th className="py-4 px-6">Cuti</th>
                  <th className="py-4 px-6">Jenis Pegawai</th>
                </tr>
                <tr className={`border-b ${isLight ? 'border-slate-200 bg-white/30' : 'border-white/10 bg-black/20'}`}>
                  <th className="py-2.5 px-6" />
                  <th className="py-2.5 px-6">
                    <input
                      type="text"
                      placeholder="Cari nama..."
                      value={searchTermNama}
                      onChange={(e) => {
                        setSearchTermNama(e.target.value);
                        setCurrentPage(1);
                        setPageInput('1');
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-normal focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-white/80 border-slate-300 text-slate-900 placeholder-slate-500 focus:ring-teal-500' : 'bg-black/40 border-white/20 text-white placeholder-slate-400 focus:ring-cyan-400'
                      }`}
                    />
                  </th>
                  <th className="py-2.5 px-6">
                    <input
                      type="text"
                      placeholder="Cari perangkat daerah..."
                      value={searchTermUnit}
                      onChange={(e) => {
                        setSearchTermUnit(e.target.value);
                        setCurrentPage(1);
                        setPageInput('1');
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-normal focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-white/80 border-slate-300 text-slate-900 placeholder-slate-500 focus:ring-teal-500' : 'bg-black/40 border-white/20 text-white placeholder-slate-400 focus:ring-cyan-400'
                      }`}
                    />
                  </th>
                  <th className="py-2.5 px-6">
                    <input
                      type="text"
                      placeholder="Cari cuti..."
                      value={searchTermCuti}
                      onChange={(e) => {
                        setSearchTermCuti(e.target.value);
                        setCurrentPage(1);
                        setPageInput('1');
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-normal focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-white/80 border-slate-300 text-slate-900 placeholder-slate-500 focus:ring-teal-500' : 'bg-black/40 border-white/20 text-white placeholder-slate-400 focus:ring-cyan-400'
                      }`}
                    />
                  </th>
                  <th className="py-2.5 px-6">
                    <input
                      type="text"
                      placeholder="Cari jenis..."
                      value={searchTermJenis}
                      onChange={(e) => {
                        setSearchTermJenis(e.target.value);
                        setCurrentPage(1);
                        setPageInput('1');
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-normal focus:outline-none focus:ring-1 ${
                        isLight ? 'bg-white/80 border-slate-300 text-slate-900 placeholder-slate-500 focus:ring-teal-500' : 'bg-black/40 border-white/20 text-white placeholder-slate-400 focus:ring-cyan-400'
                      }`}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs sm:text-sm ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={`py-12 text-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      <div className="inline-block w-6 h-6 border-2 border-slate-400 border-t-cyan-400 rounded-full animate-spin mr-2 align-middle" />
                      Sedang memuat data...
                    </td>
                  </tr>
                ) : currentTableData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`py-12 text-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Tidak ada data pegawai yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  currentTableData.map((item, index) => (
                    <tr
                      key={item.id || startIndex + index}
                      className={`transition-colors ${isLight ? 'hover:bg-white/60 text-slate-900' : 'hover:bg-white/5 text-white'}`}
                    >
                      <td className={`py-3.5 px-6 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {startIndex + index + 1}
                      </td>
                      <td className="py-3.5 px-6 font-semibold">
                        {item.nama || '-'}
                      </td>
                      <td className={`py-3.5 px-6 text-xs font-medium ${isLight ? 'text-teal-700' : 'text-cyan-300'}`}>
                        {item.unit_kerja || '-'}
                      </td>
                      <td className={`py-3.5 px-6 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        <span className={`px-2.5 py-1 rounded-lg border text-xs ${isLight ? 'bg-white/80 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                          {item.cuti !== null &&
                          item.cuti !== undefined &&
                          item.cuti !== ''
                            ? item.cuti
                            : '-'}
                        </span>
                      </td>
                      <td className={`py-3.5 px-6 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        <span className={`px-2.5 py-1 rounded-lg border text-xs ${isLight ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'}`}>
                          {item.jenis_pegawai || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls BAWAH */}
        {!loading && filteredData.length > 0 && (
          <div className={`flex items-center justify-end gap-2 border backdrop-blur-md p-4 rounded-2xl shadow-xl ${
            isLight ? 'bg-white/40 border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
          }`}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-xl border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer ${
                isLight ? 'bg-white/70 border-slate-200 text-slate-800 hover:bg-white' : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
            >
              Sebelumnya
            </button>

            <form
              onSubmit={handlePageInputSubmit}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border ${
                isLight ? 'bg-white/60 border-slate-200 text-slate-800' : 'bg-black/40 border-white/10 text-slate-300'
              }`}
            >
              <span className="text-xs">Hal.</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={handlePageInputChange}
                className={`w-12 text-center border rounded-lg font-bold focus:outline-none focus:ring-1 py-0.5 text-xs ${
                  isLight ? 'bg-white border-slate-300 text-teal-700 focus:ring-teal-500' : 'bg-black/60 border-white/20 text-cyan-300 focus:ring-cyan-400'
                }`}
              />
              <span className="text-xs">dari {totalPages}</span>
            </form>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-xl border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer ${
                isLight ? 'bg-white/70 border-slate-200 text-slate-800 hover:bg-white' : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      <footer className={`relative z-10 w-full max-w-7xl mx-auto pt-8 mt-12 border-t text-xs flex flex-col sm:flex-row items-center justify-between gap-2 ${
        isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-slate-300'
      }`}>
        <p>DyPRAL v1.0 • Dynamic Performance Appraisal Report</p>
        <p>© 2026 MPRijki and his glitchy human-wannabe robot, Cukmini.</p>
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