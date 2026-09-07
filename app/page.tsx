'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface LokasiItem {
  unit_kerja: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ThemeType = 'neon' | 'sunset' | 'ocean' | 'emerald' | 'splash';

const themes: { id: ThemeType; label: string; desc: string }[] = [
  { id: 'neon', label: 'Cyber Neon', desc: 'Terang & Futuristik' },
  { id: 'sunset', label: 'Sunset Vibes', desc: 'Hangat & Elegan' },
  { id: 'ocean', label: 'Deep Ocean', desc: 'Tenang & Profesional' },
  { id: 'emerald', label: 'Emerald Dark', desc: 'Segar & Fokus' },
  { id: 'splash', label: 'Paint Splash', desc: 'Putih Bersih & Cipratan Cat' },
];

export default function Home() {
  const [lokasi, setLokasi] = useState<LokasiItem[]>([]);
  const [inputKetik, setInputKetik] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [easterEggAktif, setEasterEggAktif] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('neon');

  const [userRole, setUserRole] = useState<string>('');
  const [userUnitKerja, setUserUnitKerja] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('dypral_session');
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const parsedSession = JSON.parse(session);
      const role = parsedSession.role || 'user';
      const unit = parsedSession.unitKerja || '';

      setUserRole(role);
      setUserUnitKerja(unit);

      if (role !== 'admin' && unit) {
        setInputKetik(unit);
        setLokasi([{ unit_kerja: unit }]);
      }
    } catch (e) {
      console.error('Gagal parsing sesi:', e);
      router.push('/login');
    }
  }, [router]);

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

    async function fetchData() {
      try {
        const sessionStr = localStorage.getItem('dypral_session');
        const parsedSession = sessionStr ? JSON.parse(sessionStr) : null;
        const role = parsedSession?.role || 'user';
        const unit = parsedSession?.unitKerja || '';

        const { data, error } = await supabase.rpc('get_unit_kerja_unik');
        if (error) throw error;

        if (isMounted) {
          if (data && data.length > 0) {
            if (role !== 'admin' && unit) {
              const filteredUnit = data.filter(
                (item: LokasiItem) => item.unit_kerja?.toLowerCase() === unit.toLowerCase()
              );
              setLokasi(filteredUnit.length > 0 ? filteredUnit : [{ unit_kerja: unit }]);
            } else {
              const opsiSemua = [{ unit_kerja: 'SEMUA PERANGKAT DAERAH' }, ...data];
              setLokasi(opsiSemua);
            }
          } else if (unit) {
            setLokasi([{ unit_kerja: unit }]);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil data unit kerja:', err);
        const sessionStr = localStorage.getItem('dypral_session');
        if (sessionStr && isMounted) {
          const parsed = JSON.parse(sessionStr);
          if (parsed.unitKerja) {
            setLokasi([{ unit_kerja: parsed.unitKerja }]);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dypral_session');
    localStorage.removeItem('dypral_token');
    router.push('/login');
  };

  const filtered = lokasi.filter((item) =>
    item.unit_kerja?.toLowerCase().includes(inputKetik.toLowerCase())
  );

  const isLight = theme === 'splash';

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-hidden selection:bg-cyan-400 selection:text-slate-900 transition-colors duration-700 animated-bg theme-${theme}`}
    >
      {/* Background Matrix & Visual Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 opacity-20 flex justify-between overflow-hidden px-4">
          <div className="text-cyan-400 text-xs font-mono animate-matrix-rain writing-mode-vertical">
            01010101 DYPRAL 10101
          </div>
          <div
            className="text-pink-400 text-xs font-mono animate-matrix-rain-slow writing-mode-vertical"
            style={{ animationDelay: '2s' }}
          >
            1100101 BKPSDM 01011
          </div>
          <div
            className="text-purple-400 text-xs font-mono animate-matrix-rain writing-mode-vertical"
            style={{ animationDelay: '4s' }}
          >
            01101010 CUKMINI 11001
          </div>
          <div
            className="text-emerald-400 text-xs font-mono animate-matrix-rain-fast writing-mode-vertical"
            style={{ animationDelay: '1s' }}
          >
            10101010 SYSTEM 01010
          </div>
          <div
            className="text-yellow-400 text-xs font-mono animate-matrix-rain-slow writing-mode-vertical"
            style={{ animationDelay: '3.5s' }}
          >
            00112233 KODE 112233
          </div>
        </div>

        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-white/40 rounded-full animate-float-particle"></div>
          <div
            className="absolute top-3/4 left-2/3 w-3 h-3 bg-cyan-300/30 rounded-full animate-float-particle"
            style={{ animationDelay: '3s' }}
          ></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20 overflow-hidden">
          <div className="absolute w-[200%] h-full animate-liquid-wave bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent rounded-t-[100%]"></div>
        </div>

        <div className="absolute -top-40 left-0 right-0 h-96 opacity-25 filter blur-[90px] animate-aurora-glow bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
      </div>

      {/* SVG Background khusus Light Theme */}
      {isLight && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-85">
          <svg
            className="absolute -top-16 -left-16 w-[550px] h-[550px] animate-splash-spin-slow text-pink-500/40"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <path
              d="M38.2,-52.1C50.2,-43.3,61.3,-33.5,67.4,-20.5C73.6,-7.5,74.8,8.8,69.5,22.2C64.3,35.6,52.6,46.1,39.1,53.8C25.6,61.4,10.2,66.2,-3.3,65.6C-16.8,65,-28.4,59.1,-39.9,50.7C-51.4,42.4,-62.8,31.6,-67.9,17.9C-73,4.2,-71.8,-12.4,-63.9,-25.6C-56,-38.8,-41.4,-48.6,-27.8,-56.3C-14.2,-64.1,-1.6,-69.8,11.2,-67.2C24,-64.6,26.2,-60.9,38.2,-52.1Z"
              transform="translate(100 100)"
            />
          </svg>
          <svg
            className="absolute -top-12 -right-16 w-[650px] h-[650px] animate-splash-pulse text-sky-400/40"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <path
              d="M42.7,-54.1C55.4,-44.6,66.5,-32.5,71.7,-18.2C76.8,-3.8,76,12.8,69.4,26.5C62.9,40.3,50.5,51.2,36.5,58.8C22.4,66.4,6.7,70.7,-8.4,68.9C-23.5,67,-38,59,-50.2,47.8C-62.4,36.6,-72.2,22.2,-73.4,6.9C-74.7,-8.3,-67.4,-24.4,-56.3,-35.1C-45.1,-45.8,-30.1,-51.1,-16.2,-59.2C-2.4,-67.3,10.3,-78.2,24.1,-75.4C37.8,-72.7,30,-63.6,42.7,-54.1Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>
      )}

      {/* Top Action Buttons */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={handleLogout}
          className={`backdrop-blur-xl px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105 ${
            isLight
              ? 'bg-red-500/90 hover:bg-red-600 border-red-300 text-white shadow-red-500/10'
              : 'bg-red-950/40 hover:bg-red-900/60 border-red-500/20 text-red-200'
          }`}
          title="Keluar Sistem"
        >
          <span className="text-xs font-bold uppercase tracking-wider">Keluar</span>
        </button>

        <button
          onClick={() => setSidebarOpen(true)}
          className={`backdrop-blur-xl p-3 rounded-2xl border shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105 group ${
            isLight
              ? 'bg-white/90 hover:bg-white border-slate-300 text-slate-800 shadow-purple-500/10'
              : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
          }`}
          title="Ganti Tema"
        >
          <svg
            className={`w-5 h-5 transition-transform group-hover:rotate-90 duration-500 ${
              isLight ? 'text-purple-600' : 'text-cyan-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Tema</span>
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 ${
          isLight ? 'bg-slate-900/95 text-white' : 'bg-[#0c0418]/90'
        } backdrop-blur-2xl border-l border-white/20 shadow-[-20px_0_50px_rgba(0,0,0,0.7)] z-50 p-6 flex flex-col justify-between transition-transform duration-500 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Pilih Tema Tampilan</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
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
                    <div
                      className={`text-sm font-bold ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {t.label}
                    </div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </div>
                  {isSelected && <span className="text-cyan-400 font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-400 text-center">DyPRAL Dynamic Theme Engine</div>
      </div>

      {/* Decorative Floating Orbs */}
      <div
        className="absolute top-1/3 right-10 w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none animate-blob orb-2 transition-all duration-700"
        style={{ animationDelay: '2.5s' }}
      ></div>
      <div
        className="absolute bottom-10 left-1/3 w-[420px] h-[420px] rounded-full blur-[150px] pointer-events-none animate-blob orb-3 transition-all duration-700"
        style={{ animationDelay: '5s' }}
      ></div>

      {/* Main Card */}
      <div
        className={`w-full max-w-md backdrop-blur-2xl rounded-3xl border relative z-10 p-6 sm:p-8 flex flex-col items-center my-auto transition-colors duration-700 ${
          isLight
            ? 'bg-[#8f128b]/95 border-pink-400/50 shadow-[0_20px_50px_rgba(198,14,94,0.4)] text-white'
            : 'bg-white/10 border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-white'
        }`}
      >
        <div
          onClick={() => setEasterEggAktif(true)}
          className="relative w-40 h-40 sm:w-48 sm:h-48 mb-4 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] cursor-pointer group transition-transform duration-300 hover:scale-105"
          title="Klik untuk rahasia..."
        >
          <Image alt="Logo DyPRAL" className="object-contain" fill priority src="/logo-bkpsdm.png"/>
        </div>

        <h1 className="text-xl font-bold mb-2">Selamat Datang</h1>
        <p className="text-xs opacity-80 mb-6 text-center">
          {userRole === 'admin'
            ? 'Pilih Perangkat Daerah untuk lanjut ke Dashboard'
            : `Unit Kerja Anda: ${userUnitKerja || 'Memuat...'}`}
        </p>

        <div className="relative w-full mb-4">
          <input
            type="text"
            placeholder="Cari Perangkat Daerah..."
            disabled={userRole !== 'admin'}
            className={`w-full p-4 backdrop-blur-xl rounded-2xl border-2 outline-none transition-all text-sm font-semibold text-center shadow-inner ${
              isLight
                ? 'bg-black/20 border-pink-300/40 text-white focus:border-white focus:bg-black/30 focus:ring-4 focus:ring-white/20 placeholder:text-pink-200/70'
                : 'bg-black/30 border-white/20 text-white focus:border-cyan-400 focus:bg-black/40 focus:ring-4 focus:ring-cyan-400/30 placeholder:text-slate-300/70'
            } ${userRole !== 'admin' ? 'cursor-not-allowed opacity-95 font-bold' : ''}`}
            value={inputKetik}
            onChange={(e) => {
              if (userRole === 'admin') {
                setInputKetik(e.target.value);
                setShowDropdown(true);
              }
            }}
            onFocus={() => {
              if (userRole === 'admin') setShowDropdown(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowDropdown(false);
              }, 200);
            }}
          />

          {showDropdown && inputKetik.length > 0 && userRole === 'admin' && (
            <ul
              className={`absolute left-0 right-0 mt-2 backdrop-blur-2xl border rounded-2xl shadow-2xl max-h-36 overflow-y-auto z-50 p-2 text-left ${
                isLight
                  ? 'bg-[#9b0948]/95 border-pink-400/40 text-white'
                  : 'bg-[#100522]/95 border-white/20 text-slate-100'
              }`}
            >
              {loading ? (
                <li className="p-3 text-xs text-center opacity-70">Loading...</li>
              ) : filtered.length > 0 ? (
                filtered.map((item, idx) => (
                  <li
                    key={idx}
                    className={`p-3 rounded-xl cursor-pointer transition-colors text-xs font-semibold ${
                      isLight
                        ? 'hover:bg-white/20 hover:text-white text-pink-100'
                        : 'hover:bg-white/25 hover:text-white text-slate-100'
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (item.unit_kerja === 'SEMUA PERANGKAT DAERAH') {
                        router.push('/dashboard/SEMUA');
                      } else {
                        router.push(`/dashboard/${encodeURIComponent(item.unit_kerja)}`);
                      }
                    }}
                  >
                    {item.unit_kerja}
                  </li>
                ))
              ) : (
                <li className="p-3 text-xs text-center opacity-70">
                  Maaf data yang Anda cari tidak tersedia
                </li>
              )}
            </ul>
          )}
        </div>

        {userRole !== 'admin' && (
          <button
            onClick={() => {
              const targetUnit = userUnitKerja || inputKetik;
              if (targetUnit) {
                router.push(`/dashboard/${encodeURIComponent(targetUnit)}`);
              } else {
                alert('Unit kerja tidak ditemukan pada sesi Anda. Silakan login ulang.');
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.02]"
          >
            Masuk ke Dashboard Unit Kerja Anda →
          </button>
        )}

        <div className="mt-4 text-[10px] font-mono tracking-widest opacity-60 uppercase">
          {userRole === 'admin'
            ? `${lokasi.length} DATA TERSEDIA`
            : 'AKSES UNIT KERJA TERBATAS'}
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`relative z-10 w-full text-center py-4 text-xs font-medium tracking-wide drop-shadow-sm flex-shrink-0 ${
          isLight ? 'text-slate-600' : 'text-slate-300'
        }`}
      >
        DyPRAL v1.0 • © 2026 MPRijki and his glitchy human-wannabe robot, Cukmini.
      </footer>

      {/* Easter Egg Modal */}
      {easterEggAktif && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-10 animate-fade-in cursor-zoom-out" onClick={() => setEasterEggAktif(false)}>
          <div className="text-center flex flex-col items-center">
            <Image 
              src="/logo-bkpsdm.png" 
              alt="Secret Logo" 
              width={260} 
              height={260} 
              className="animate-spin mb-6 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)]" 
              style={{ animationDuration: '6s' }}
            />
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 uppercase tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
              BKPSDM
            </h2>
            <p className="mt-4 text-slate-100 text-lg font-semibold tracking-wide">Bidang Evaluasi Kinerja dan Pembinaan Aparatur - 2026</p>
            <p className="mt-2 text-slate-400 text-xs uppercase tracking-widest">(Klik di mana saja buat keluar)</p>
          </div>
        </div>
      )}

      {/* Custom Keyframes & Utility Styles */}
      <style jsx global>{`
        @keyframes gradientAnimation {
          0% {
            background-position: 0% 50%, 0% 0%, 0% 50%;
          }
          50% {
            background-position: 100% 50%, 50% 100%, 100% 50%;
          }
          100% {
            background-position: 0% 50%, 0% 0%, 0% 50%;
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
        @keyframes splashSpinSlow {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.15);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        @keyframes splashPulse {
          0%,
          100% {
            transform: scale(1) translateY(0);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2) translateY(-20px);
            opacity: 0.95;
          }
        }
        @keyframes matrixRain {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }
        @keyframes floatParticle {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-30px) translateX(15px);
            opacity: 0.8;
          }
        }
        @keyframes liquidWave {
          0% {
            transform: translateX(0) translateZ(0) scaleY(1);
          }
          50% {
            transform: translateX(-25%) translateZ(0) scaleY(1.2);
          }
          100% {
            transform: translateX(-50%) translateZ(0) scaleY(1);
          }
        }
        @keyframes auroraGlow {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(20px) scale(1.1);
            opacity: 0.4;
          }
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
          background-image: radial-gradient(
              circle at 20% 30%,
              rgba(238, 129, 248, 0.6) 0%,
              transparent 40%
            ),
            radial-gradient(circle at 80% 70%, rgb(245, 42, 245) 0%, transparent 40%),
            linear-gradient(-45deg, #00fcd2, #b163ff, #ff007f, #a12471);
        }
        .theme-neon .orb-1 {
          background-color: rgba(183, 255, 0, 0.16);
        }
        .theme-neon .orb-2 {
          background-color: rgba(204, 255, 0, 0.14);
        }
        .theme-neon .orb-3 {
          background-color: rgba(149, 215, 0, 0.12);
        }
        .theme-sunset {
          background-image: radial-gradient(
              circle at 20% 30%,
              rgba(255, 183, 77, 0.6) 0%,
              transparent 40%
            ),
            radial-gradient(circle at 80% 70%, rgba(244, 67, 54, 0.6) 0%, transparent 40%),
            linear-gradient(-45deg, #ff9800, #e91e63, #9c27b0, #3f51b5);
        }
        .theme-sunset .orb-1 {
          background-color: rgba(255, 193, 7, 0.2);
        }
        .theme-sunset .orb-2 {
          background-color: rgba(255, 87, 34, 0.2);
        }
        .theme-sunset .orb-3 {
          background-color: rgba(156, 39, 176, 0.2);
        }
        .theme-ocean {
          background-image: radial-gradient(
              circle at 20% 30%,
              rgba(0, 229, 255, 0.6) 0%,
              transparent 40%
            ),
            radial-gradient(circle at 80% 70%, rgba(41, 121, 255, 0.6) 0%, transparent 40%),
            linear-gradient(-45deg, #002b36, #073642, #268bd2, #2aa198);
        }
        .theme-ocean .orb-1 {
          background-color: rgba(0, 229, 255, 0.2);
        }
        .theme-ocean .orb-2 {
          background-color: rgba(41, 121, 255, 0.2);
        }
        .theme-ocean .orb-3 {
          background-color: rgba(0, 150, 136, 0.2);
        }
        .theme-emerald {
          background-image: radial-gradient(
              circle at 20% 30%,
              rgba(0, 230, 118, 0.5) 0%,
              transparent 40%
            ),
            radial-gradient(circle at 80% 70%, rgba(0, 150, 136, 0.5) 0%, transparent 40%),
            linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #004d40);
        }
        .theme-emerald .orb-1 {
          background-color: rgba(0, 230, 118, 0.15);
        }
        .theme-emerald .orb-2 {
          background-color: rgba(76, 175, 80, 0.15);
        }
        .theme-emerald .orb-3 {
          background-color: rgba(0, 150, 136, 0.15);
        }
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
        .theme-splash .orb-1 {
          background-color: rgb(252, 94, 146);
        }
        .theme-splash .orb-2 {
          background-color: rgb(109, 206, 248);
        }
        .theme-splash .orb-3 {
          background-color: rgba(255, 196, 86, 0.91);
        }
        .animate-blob {
          animation: blobMotion 9s infinite ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}