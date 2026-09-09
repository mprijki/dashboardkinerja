import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY belum terbaca dari .env.local!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const PASSWORD_DEFAULT = 'Kinerja2026!'

// Daftar Pegawai yang Akan Didaftarkan
const DAFTAR_PEGAWAI = [
  {
    nip: '197504072000032003',
    role: 'admin',
    unit_kerja: null
  },
  {
    nip: '198104292010011008',
    role: 'admin',
    unit_kerja: null
  },
  {
    nip: '197704072009021003',
    role: 'admin',
    unit_kerja: null
  },
  {
    nip: '198709202022031001',
    role: 'admin',
    unit_kerja: null
  },
  {
    nip: '197606052009011008',
    role: 'user',
    unit_kerja: [
      'DINAS PENDIDIKAN', 
      'DINAS PENDIDIKAN - SD', 
      'DINAS PENDIDIKAN - SMP', 
      'DINAS PENDIDIKAN - TK', 
      'DINAS PENDIDIKAN - AGAMA ISLAM', 
      'DINAS PENDIDIKAN - NONFORMAL'
    ]
  },
  {
    nip: '197308101997032002',
    role: 'user',
    unit_kerja: ['DINAS KESEHATAN - UPTD RUMAH SAKIT UMUM DAERAH KABUPATEN TANGERANG']
  },
  {
    nip: '198407012009022003',
    role: 'user',
    unit_kerja: ['DINAS KESEHATAN - UPTD RUMAH SAKIT UMUM DAERAH BALARAJA']
  },
  {
    nip: '197206141994032002',
    role: 'user',
    unit_kerja: ['DINAS KESEHATAN - UPTD RUMAH SAKIT UMUM DAERAH PAKUHAJI']
  },
  {
    nip: '197008301990032001',
    role: 'user',
    unit_kerja: ['DINAS KESEHATAN - UPTD RUMAH SAKIT UMUM DAERAH TIGARAKSA']
  },
  {
    nip: '197111062002121001',
    role: 'user',
    unit_kerja: ['SATUAN POLISI PAMONG PRAJA']
  },
  {
    nip: '197303162007012005',
    role: 'user',
    unit_kerja: ['DINAS SOSIAL']
  }, 
  {
    nip: '197209021992032004',
    role: 'user',
    unit_kerja: ['DINAS PERTANIAN DAN KETAHANAN PANGAN']
  },
  {
    nip: '199101042014062001',
    role: 'user',
    unit_kerja: ['DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL']
  },
  {
    nip: '196904241995022001',
    role: 'user',
    unit_kerja: ['DINAS PENGENDALIAN PENDUDUK DAN KELUARGA BERENCANA']
  }
]

async function jalanSeedingBulk() {
  console.log(`🚀 Memproses total ${DAFTAR_PEGAWAI.length} pegawai...`)

  let berhasil = 0
  let gagal = 0

  for (const pegawai of DAFTAR_PEGAWAI) {
    const { nip, role, unit_kerja } = pegawai
    const emailDummy = `${nip}@bidangekpa.com`

    // 1. Buat Akun Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailDummy,
      password: PASSWORD_DEFAULT,
      email_confirm: true,
      user_metadata: { 
        nip: nip,
        role: role 
      }
    })

    if (authError) {
      console.error(`❌ Gagal Auth NIP ${nip}:`, authError.message)
      gagal++
      continue
    }

    const newUserId = authData.user.id

    // 2. Insert ke tabel users_login
    const { error: dbError } = await supabase
      .from('users_login')
      .insert({
        nip: nip,
        role: role,
        unit_kerja: unit_kerja, // Otomatis tersimpan sebagai NULL atau Array text[]
        user_id: newUserId
      })

    if (dbError) {
      console.error(`⚠️ Gagal Insert users_login NIP ${nip}:`, dbError.message)
      gagal++
    } else {
      console.log(`✅ NIP ${nip} [${role.toUpperCase()}] berhasil dibuat & terhubung!`)
      berhasil++
    }
  }

  console.log(`\n🎉 SELESAI! ${berhasil} berhasil, ${gagal} gagal.`)
}

jalanSeedingBulk()