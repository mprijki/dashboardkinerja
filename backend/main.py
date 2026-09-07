import os
import bcrypt
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "secret_dypral_default")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token berlaku 24 jam

# Inisialisasi Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="DyPRAL Backend - Auth & Dashboard Kinerja")

# Pengaturan CORS agar Next.js lokal dan cloud bisa nembak Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schema Data Input
class LoginSchema(BaseModel):
    nip: str
    password: str

# Fungsi Helper Password Menggunakan Bcrypt Murni (Bypass Passlib Bug)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12) # Standar keamanan tinggi
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

# Fungsi Helper JWT
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend DyPRAL Dashboard Kinerja Siap!"}

@app.post("/api/auth/login")
def login(payload: LoginSchema):
    # 1. Cari user berdasarkan NIP di tabel users_login
    response = supabase.table("users_login").select("*").eq("nip", payload.nip).execute()
    users = response.data

    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="NIP atau Password salah!"
        )

    user = users[0]

    # 2. Cek Password Terenkripsi (Hashed)
    db_hashed_password = user.get("hashed_password")
    db_plain_password = user.get("password")

    if db_hashed_password and db_hashed_password.startswith("$2"):
        # Jika sudah berbentuk hash di database, verifikasi pakai bcrypt murni
        if not verify_password(payload.password, db_hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="NIP atau Password salah!"
            )
    else:
        # MIGRASI OTOMATIS: Jika di database masih berupa password mentah pendek (seperti '1')
        if db_plain_password == payload.password:
            new_hash = get_password_hash(payload.password)
            
            # Update database Supabase: simpan hasil hash dan kosongkan password mentahnya
            supabase.table("users_login").update({
                "hashed_password": new_hash,
                "password": None  # Dihapus demi keamanan
            }).eq("id", user["id"]).execute()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="NIP atau Password salah!"
            )

    # 3. Terbitkan Token JWT jika login berhasil (Gunakan fallback jika unit_kerja bernilai NULL)
    token_data = {
        "sub": str(user["nip"]),
        "role": user.get("role", "user"),
        "unit_kerja": user.get("unit_kerja") if user.get("unit_kerja") is not None else ""
    }
    access_token = create_access_token(token_data)

    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "user": token_data
    }
