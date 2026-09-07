'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export default function DetailStatusPegawai() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const unit = params?.unit;
  const status = searchParams.get('status') || 'Sudah';

  const decodedUnit = typeof unit === 'string' ? decodeURIComponent(unit) : '';
  const decodedStatus = decodeURIComponent(status);

  // LOGIKA DETEKSI OPSi FIKTIF ADMIN
  const isSemuaUnit = decodedUnit.toUpperCase().includes('SEMUA');

  const [allUnitPegawai, setAllUnitPegawai] = useState<PegawaiDetail[]>([]);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({
    'Sudah': 0,
    'Belum': 0,
    'Tidak Ada Data': 0,
  });
  const [totalPegawaiUnit, setTotalPegawaiUnit] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Search States
  const [searchTermNama, setSearchTermNama] = useState('');
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
      badgeText: '#6ee7b7',
      badgeBorder: 'rgba(52, 211, 153, 0.3)',
      iconBg: 'rgba(52, 211, 153, 0.2)',
      iconText: '#34d399',
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
      hexColor: '#fbbf24',
      badgeBg: 'rgba(251, 191, 36, 0.1)',
      badgeText: '#fcd34d',
      badgeBorder: 'rgba(251, 191, 36, 0.3)',
      iconBg: 'rgba(251, 191, 36, 0.2)',
      iconText: '#fbbf24',
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
      hexColor: '#94a3b8',
      badgeBg: 'rgba(100, 116, 139, 0.1)',
      badgeText: '#cbd5e1',
      badgeBorder: 'rgba(100, 116, 139, 0.3)',
      iconBg: 'rgba(100, 116, 139, 0.2)',
      iconText: '#94a3b8',
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

  // PERBAIKAN: RESET PAGING SETIAP KALI URL STATUS BERUBAH
  useEffect(() => {
    setCurrentPage(1);
    setPageInput('1');
    setSearchTermNama('');
    setSearchTermCuti('');
    setSearchTermJenis('');
  }, [decodedStatus]);

  useEffect(() => {
    let isMounted = true;

    async function fetchAllDataRecursive() {
      if (!decodedUnit) return;
      setLoading(true);

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

        if (error) {
          console.error('Error fetching data:', error.message);
          break;
        }

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

    fetchAllDataRecursive();

    return () => {
      isMounted = false;
    };
  }, [decodedUnit, isSemuaUnit, getNormalizedStatus]);

  const filteredData = useMemo(() => {
    const targetStatusNorm = getNormalizedStatus(decodedStatus);

    return allUnitPegawai.filter((pegawai) => {
      const itemStatusNorm = getNormalizedStatus(pegawai.status_penilaian);

      const matchStatus = itemStatusNorm === targetStatusNorm;
      const matchNama = (pegawai.nama || '')
        .toLowerCase()
        .includes(searchTermNama.toLowerCase());
      const matchCuti = String(pegawai.cuti ?? '')
        .toLowerCase()
        .includes(searchTermCuti.toLowerCase());
      const matchJenis = String(pegawai.jenis_pegawai ?? '')
        .toLowerCase()
        .includes(searchTermJenis.toLowerCase());

      return matchStatus && matchNama && matchCuti && matchJenis;
    });
  }, [
    allUnitPegawai,
    decodedStatus,
    searchTermNama,
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

  return (
    <main className="min-h-screen text-white px-3 py-6 sm:px-6 md:p-12 relative overflow-x-hidden overflow-y-auto flex flex-col justify-between selection:bg-cyan-500 selection:text-white animated-bg">
      <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-[rgba(183,255,0,0.16)] rounded-full blur-[130px] pointer-events-none animate-blob"></div>
      <div
        className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[rgba(204,255,0,0.14)] rounded-full blur-[140px] pointer-events-none animate-blob"
        style={{ animationDelay: '2.5s' }}
      ></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex-grow">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10 backdrop-blur-md bg-black/30 p-6 rounded-3xl shadow-2xl">
          <div>
            <button
              onClick={() => {
                const encodedUnit = encodeURIComponent(decodedUnit);
                router.push(`/dashboard/${encodedUnit}`);
              }}
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
              Kembali ke Dashboard Unit
            </button>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white uppercase drop-shadow-md">
              Status Penilaian :{' '}
              <span style={{ color: styleStatus[getNormalizedStatus(decodedStatus)]?.hexColor || '#ffffff' }}>
                {getNormalizedStatus(decodedStatus)}
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Unit:{' '}
              <span className="font-semibold text-cyan-400">
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
            const theme = styleStatus[st];
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
                    ? `bg-gradient-to-r ${theme.gradientBorder} shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-[1.02]`
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div
                  className={`h-full w-full bg-black/40 backdrop-blur-xl rounded-[15px] p-4 flex items-center justify-between transition-all duration-300 ${theme.glow}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="p-2.5 rounded-xl border shadow-inner flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: theme.iconBg,
                        color: theme.iconText,
                        borderColor: theme.iconBorder,
                      }}
                    >
                      {theme.icon}
                    </div>
                    <div>
                      <p className="text-white text-xs font-black uppercase tracking-wide group-hover:text-cyan-300 transition-colors">
                        {st}
                      </p>
                      <span
                        className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                          borderColor: theme.badgeBorder,
                        }}
                      >
                        {percentage}% dari Total
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <h3
                      className="text-xl sm:text-2xl font-black"
                      style={{ color: isSelected ? theme.hexColor : '#ffffff' }}
                    >
                      {val.toLocaleString()}
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Orang
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Bar Info Paging --- */}
        {!loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/30 border border-white/10 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl mb-4 text-xs">
            <p className="text-slate-300">
              Menampilkan data{' '}
              <span className="font-semibold text-cyan-400">
                {filteredData.length > 0 ? startIndex + 1 : 0}
              </span>{' '}
              sampai{' '}
              <span className="font-semibold text-cyan-400">
                {Math.min(startIndex + itemsPerPage, filteredData.length)}
              </span>{' '}
              dari total{' '}
              <span className="font-semibold text-cyan-400">{filteredData.length}</span>{' '}
              pegawai
            </p>

            <div className="flex items-center gap-2">
              <form
                onSubmit={handlePageInputSubmit}
                className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10"
              >
                <span className="text-slate-300">Hal.</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className="w-12 text-center bg-black/60 border border-white/20 rounded-lg text-cyan-300 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 py-0.5 text-xs"
                />
                <span className="text-slate-300">dari {totalPages}</span>
              </form>
            </div>
          </div>
        )}

        {/* Tabel Data Lengkap */}
        <div className="bg-black/30 border border-white/10 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-300 text-[11px] uppercase tracking-wider">
                  <th className="py-4 px-6 font-bold w-16">No</th>
                  <th className="py-4 px-6 font-bold">Nama Pegawai</th>
                  {isSemuaUnit && <th className="py-4 px-6 font-bold">Perangkat Daerah</th>}
                  <th className="py-4 px-6 font-bold">Cuti</th>
                  <th className="py-4 px-6 font-bold">Jenis Pegawai</th>
                </tr>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="py-2.5 px-6"></th>
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
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/20 text-white placeholder-slate-400 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </th>
                  {isSemuaUnit && <th className="py-2.5 px-6"></th>}
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
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/20 text-white placeholder-slate-400 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-cyan-400"
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
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/20 text-white placeholder-slate-400 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={isSemuaUnit ? 5 : 4} className="py-12 text-center text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-slate-400 border-t-cyan-400 rounded-full animate-spin mr-2 align-middle"></div>
                      Sedang memuat data...
                    </td>
                  </tr>
                ) : currentTableData.length === 0 ? (
                  <tr>
                    <td colSpan={isSemuaUnit ? 5 : 4} className="py-12 text-center text-slate-400">
                      Tidak ada data pegawai yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  currentTableData.map((item, index) => (
                    <tr
                      key={item.id || startIndex + index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-6 text-slate-400 font-mono">
                        {startIndex + index + 1}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-white">
                        {item.nama || '-'}
                      </td>
                      {isSemuaUnit && (
                        <td className="py-3.5 px-6 text-cyan-300 text-xs font-medium">
                          {item.unit_kerja || '-'}
                        </td>
                      )}
                      <td className="py-3.5 px-6 text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                          {item.cuti !== null &&
                          item.cuti !== undefined &&
                          item.cuti !== ''
                            ? item.cuti
                            : '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs">
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

        {/* Pagination Controls */}
        {!loading && filteredData.length > 0 && (
          <div className="flex items-center justify-end gap-2 bg-black/30 border border-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Sebelumnya
            </button>

            <form
              onSubmit={handlePageInputSubmit}
              className="flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10"
            >
              <span className="text-xs text-slate-300">Hal.</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={handlePageInputChange}
                className="w-12 text-center bg-black/60 border border-white/20 rounded-lg text-cyan-300 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 py-0.5 text-xs"
              />
              <span className="text-xs text-slate-300">dari {totalPages}</span>
            </form>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      <footer className="relative z-10 w-full max-w-7xl mx-auto pt-8 mt-12 border-t border-white/10 text-center text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>DyPRAL v1.0 • Dynamic Performance Appraisal Report</p>
        <p>© 2026 MPRijki and his glitchy human-wannabe robot, Cukmini.</p>
      </footer>

      <style jsx global>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes blobMotion {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(35px, -45px) scale(1.12); }
          66% { transform: translate(-25px, 25px) scale(0.88); }
        }
        .animated-bg {
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(238, 129, 248, 0.6) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgb(245, 42, 245) 0%, transparent 40%),
            linear-gradient(-45deg, #00fcd2, #b163ff, #ff007f, #a12471);
          background-size: 200% 200%, 200% 200%, 400% 400%;
          animation: gradientAnimation 15s ease infinite;
        }
        .animate-blob {
          animation: blobMotion 9s infinite ease-in-out;
        }
      `}</style>
    </main>
  );
}