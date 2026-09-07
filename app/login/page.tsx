'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  // SINKRONISASI 1: Cek otomatis status login menggunakan token JWT
  useEffect(() => {
    const token = localStorage.getItem('dypral_token')
    const session = localStorage.getItem('dypral_session')
    
    if (token && session) {
      const { role, unitKerja } = JSON.parse(session)
      if (role === 'admin') {
        router.push('/')
      } else {
        router.push(`/dashboard/${encodeURIComponent(unitKerja)}`)
      }
    }
  }, [router])

  // SINKRONISASI 2: Fungsi handleLogin yang nembak ke Backend Python FastAPI
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nip, password }),
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.detail || 'NIP atau Password salah, silakan coba lagi.')
      }

      const { access_token, user } = resData
      const role = user.role || 'user'
      const unitKerja = user.unit_kerja || ''

      localStorage.setItem('dypral_token', access_token)
      localStorage.setItem('dypral_session', JSON.stringify({ nip, role, unitKerja }))

      if (role === 'admin') {
        router.push('/') 
      } else {
        router.push(`/dashboard/${encodeURIComponent(unitKerja)}`)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal terhubung ke server backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Dashboard Kinerja
          </h1>
          <p className="text-sm text-slate-400 mt-2">Masuk menggunakan NIP dan Password</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">NIP</label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Masukkan NIP Anda"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium rounded-xl text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk Sistem'}
          </button>
        </form>
      </div>
    </main>
  )
}
