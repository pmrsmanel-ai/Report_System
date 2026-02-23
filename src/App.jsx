import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Users, 
  Award, 
  Send,
  CheckCircle2,
  Target,
  LogIn,
  FileText,
  BookOpen,
  X,
  ExternalLink,
  Camera,
  Smartphone,
  ShieldCheck,
  Database,
  UserPlus,
  Trash2,
  UserCheck,
  RefreshCw,
  Image as ImageIcon,
  LogOut
} from 'lucide-react';

// --- KONFIGURASI ---
// URL Google Apps Script Anda (Gunakan versi yang mendukung multi-upload)
const GAS_URL = "https://script.google.com/macros/s/AKfycbxUPUmQkWTB9Ux1oivo98F4L3zESR6-DfUibI8CaE6qiwI_kSZdRafGwjou-HIo7iQd/exec"; 
// URL Cloudflare Worker Anda
const CLOUDFLARE_ENDPOINT = "https://your-worker.your-subdomain.workers.dev";

// --- SUB-KOMPONEN ---

const Header = ({ view, setView, isLoggedIn, onLogout }) => (
  <header className="bg-red-800 text-white p-4 md:p-6 shadow-2xl sticky top-0 z-50 border-b border-red-900">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-white p-2 rounded-full shadow-inner hidden sm:block">
          <Award className="text-red-800 w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase leading-none">REPORT SYSTEM</h1>
          <p className="text-[9px] md:text-[10px] text-red-200 opacity-90 uppercase tracking-widest font-bold mt-1">PMR SMAN 1 AIKMEL</p>
        </div>
      </div>
      <div className="flex gap-2">
        {view === 'form' ? (
          <button onClick={() => setView('login')} className="flex items-center gap-2 bg-red-900 hover:bg-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all border border-red-700">
            <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Admin</span>
          </button>
        ) : (
          <div className="flex gap-2">
            {isLoggedIn && (
               <button onClick={onLogout} className="flex items-center gap-2 bg-black/20 hover:bg-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all border border-white/20">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button onClick={() => setView('form')} className="flex items-center gap-2 bg-white text-red-800 hover:bg-slate-100 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all shadow-md">
              Formulir
            </button>
          </div>
        )}
      </div>
    </div>
  </header>
);

const DetailModal = ({ report, onClose }) => {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 text-slate-900">
        <div className="bg-red-800 p-5 md:p-6 text-white flex justify-between items-center">
          <div className="pr-4 text-left">
            <h3 className="text-lg md:text-xl font-bold leading-tight line-clamp-1">{report.materi}</h3>
            <p className="text-[10px] md:text-xs opacity-80 uppercase font-semibold">{report.bidang} • {report.date}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-700 rounded-full transition-colors flex-shrink-0">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Koordinator</p>
              <p className="font-bold text-slate-800">{report.nama}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Kehadiran</p>
              <p className="font-bold text-slate-800">{report.hadir} Anggota</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasil Latihan</p>
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{report.hasil}</div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{width: `${report.progres}%`}}></div>
              </div>
              <span className="text-xs font-bold text-slate-500">{report.progres}% Tuntas</span>
            </div>
            {report.link && report.link !== "#" && (
              <a href={report.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-red-800 font-bold text-sm hover:underline uppercase tracking-tighter w-full sm:w-auto justify-center sm:justify-end text-center">
                Buka Dokumentasi <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FormView = ({ formData, handleInputChange, handleFileChange, handleSubmit, loading, status, photoPreviews, removePhoto }) => {
  const getProgressLabel = (value) => {
    if (value <= 20) return { label: "Tahap Awal", desc: "Pengenalan materi & teori dasar." };
    if (value <= 40) return { label: "Tahap Dasar", desc: "Pemahaman teori & prosedur awal." };
    if (value <= 60) return { label: "Tahap Menengah", desc: "Praktik terbimbing & materi 50%." };
    if (value <= 80) return { label: "Tahap Lanjutan", desc: "Penguasaan praktik secara mandiri." };
    return { label: "Tahap Mahir", desc: "Penuntasan materi & siap evaluasi." };
  };

  const progressInfo = getProgressLabel(formData.persentase);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mt-2 sm:mt-6 animate-in fade-in duration-500">
        <div className="bg-slate-900 text-white p-5 md:p-6 text-left">
          <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-red-500" />
            Pelaporan Latihan Mingguan
          </h2>
          <p className="text-slate-400 text-[10px] md:text-xs mt-1">Isi formulir untuk merekap progres bidang Anda.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 text-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase">Nama Koordinator</label>
              <input required type="text" name="namaKoordinator" value={formData.namaKoordinator} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none transition-all text-sm bg-white" />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase">Bidang PMR</label>
              <select name="bidang" value={formData.bidang} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none bg-white transition-all text-sm">
                <option value="Pertolongan Pertama">Pertolongan Pertama</option>
                <option value="Perawatan Keluarga">Perawatan Keluarga</option>
                <option value="Pasang Bongkar Tenda">Pasang Bongkar Tenda</option>
                <option value="Tandu">Tandu</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-700 uppercase">Judul Materi</label>
            <input required type="text" name="judulMateri" value={formData.judulMateri} onChange={handleInputChange} placeholder="Misal: Teknik Pembalutan Siku" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none transition-all text-sm bg-white" />
          </div>

          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-700 uppercase">Progres</label>
                <span className="text-[10px] font-black text-red-800 uppercase tracking-tighter">{progressInfo.label}</span>
              </div>
              <span className="bg-red-800 text-white px-3 py-1 rounded-full text-xs font-bold">{formData.persentase}%</span>
            </div>
            <input type="range" name="persentase" min="0" max="100" value={formData.persentase} onChange={handleInputChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-800" />
            <p className="text-[10px] text-slate-500 font-medium italic">* {progressInfo.desc}</p>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-700 uppercase">Hasil Latihan Hari Ini</label>
            <textarea required name="hasilLatihan" value={formData.hasilLatihan} onChange={handleInputChange} rows="3" placeholder="Apa saja target yang sudah dicapai?" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none resize-none text-sm bg-white"></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase">Anggota Hadir</label>
              <div className="relative">
                <input required type="number" name="jumlahHadir" value={formData.jumlahHadir} onChange={handleInputChange} placeholder="0" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none text-sm bg-white" />
                <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
            
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase">Dokumentasi (Bisa {' > '} 1 Foto)</label>
              <label className="flex flex-col items-center justify-center w-full min-h-[128px] border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all p-4">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-8 h-8 text-slate-400 mb-2 group-hover:text-red-800 transition-colors" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight text-center">Pilih atau Ambil Foto Dokumentasi</p>
                </div>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              </label>

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                  {photoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                      <img src={preview} alt={`Dokumentasi ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {status.message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs md:text-sm font-bold">{status.message}</p>
            </div>
          )}

          <button disabled={loading} type="submit" className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${loading ? 'bg-slate-400' : 'bg-red-800 hover:bg-red-900 shadow-red-200 uppercase tracking-[0.2em] text-sm'}`}>
            {loading ? `Mengirim (${photoPreviews.length} Foto)...` : "Kirim Laporan"}
            {!loading && <Send className="w-4 h-4" />}
          </button>
        </form>
      </section>
    </div>
  );
};

const LoginView = ({ loginData, setLoginData, handleLogin, status }) => (
  <div className="max-w-md mx-auto p-4 pt-12 md:pt-20 text-slate-900 animate-in zoom-in duration-300">
    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="text-red-800 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Login Admin</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Sistem Autentikasi Internal</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2 text-left">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Username</label>
          <input required type="text" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none text-sm bg-white" placeholder="User" />
        </div>
        <div className="space-y-2 text-left">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
          <input required type="password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none text-sm bg-white" placeholder="••••••••" />
        </div>
        {status.type === 'error' && <p className="text-red-600 text-xs font-black italic text-left">{status.message}</p>}
        <button type="submit" className="w-full bg-red-800 hover:bg-black text-white py-4 rounded-2xl font-black transition-all shadow-lg uppercase tracking-widest text-sm">Masuk</button>
      </form>
    </div>
  </div>
);

const AdminView = ({ reports, setSelectedReport, users, onAddUser, onDeleteUser, isLoadingUsers, onRefreshUsers }) => {
  const [activeTab, setActiveTab] = useState('reports');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Admin' });

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (newUser.username && newUser.password) {
      onAddUser(newUser);
      setNewUser({ username: '', password: '', role: 'Admin' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 md:space-y-8 text-slate-900 animate-in slide-in-from-bottom-4 duration-500">
      <section className="flex gap-4 border-b border-white/20 pb-2 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('reports')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-white text-red-800 shadow-lg' : 'text-white/60 hover:text-white'}`}>
          Laporan
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-red-800 shadow-lg' : 'text-white/60 hover:text-white'}`}>
          Manajemen User
        </button>
      </section>

      {activeTab === 'reports' ? (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-left">
              <div className="bg-blue-50 p-2 md:p-3 rounded-xl"><ClipboardCheck className="text-blue-600 w-5 h-5 md:w-6 md:h-6" /></div>
              <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Total</p><p className="text-lg md:text-2xl font-black text-slate-900">{reports.length}</p></div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-left">
              <div className="bg-green-50 p-2 md:p-3 rounded-xl"><Target className="text-green-600 w-5 h-5 md:w-6 md:h-6" /></div>
              <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Efisiensi</p><p className="text-lg md:text-2xl font-black text-slate-900">100%</p></div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-left">
              <div className="bg-purple-50 p-2 md:p-3 rounded-xl"><Users className="text-purple-600 w-5 h-5 md:w-6 md:h-6" /></div>
              <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Admin</p><p className="text-lg md:text-2xl font-black text-slate-900">{users.length}</p></div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-left">
              <div className="bg-red-50 p-2 md:p-3 rounded-xl"><BookOpen className="text-red-800 w-5 h-5 md:w-6 md:h-6" /></div>
              <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Bidang</p><p className="text-lg md:text-2xl font-black text-slate-900">4</p></div>
            </div>
          </section>
          
          <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-slate-900">
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base uppercase tracking-tight text-left">
                <FileText className="text-red-800 w-5 h-5" /> REKAPITULASI LAPORAN
              </h2>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              {reports.length > 0 ? (
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Koordinator</th>
                      <th className="px-6 py-4">Materi</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-left">
                          <p className="font-bold text-slate-800 text-sm md:text-base">{report.nama}</p>
                          <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black">{report.bidang}</p>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <p className="text-xs md:text-sm font-bold text-slate-700 line-clamp-1">{report.materi}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{report.date}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => setSelectedReport(report)} className="bg-red-800 text-white hover:bg-black px-3 py-2 rounded-xl text-[9px] font-black transition-all uppercase shadow-sm">Detail</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-20 text-center text-slate-400 space-y-2">
                  <Database className="w-12 h-12 mx-auto opacity-20" />
                  <p className="font-bold italic uppercase text-xs tracking-widest">Belum ada data laporan yang masuk</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 h-fit">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <UserPlus className="text-red-800 w-5 h-5" /> Tambah Admin
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block text-left">Username</label>
                <input required type="text" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block text-left">Password</label>
                <input required type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none" />
              </div>
              <button disabled={isLoadingUsers} type="submit" className="w-full py-3 bg-red-800 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all">
                {isLoadingUsers ? "Memproses..." : "Simpan Admin"}
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
             <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base uppercase tracking-tight">
                <UserCheck className="text-red-800 w-5 h-5" /> DAFTAR USER
              </h2>
              <button onClick={onRefreshUsers} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                  <tr><th className="px-6 py-4">Username</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-800">{u.username}</td>
                      <td className="px-6 py-4 uppercase text-[10px] font-black text-slate-500">{u.role}</td>
                      <td className="px-6 py-4 text-center">
                        <button disabled={users.length === 1} onClick={() => onDeleteUser(u.username)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  const [view, setView] = useState('form');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [imagesData, setImagesData] = useState([]);
  const [users, setUsers] = useState([{ username: 'User', password: 'User', role: 'Super Admin' }]);
  const [reports, setReports] = useState([]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    if (CLOUDFLARE_ENDPOINT.includes("your-worker")) return;
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${CLOUDFLARE_ENDPOINT}/users`);
      const data = await response.json();
      if (data && data.length > 0) setUsers(data);
    } catch (e) { console.error("Cloudflare Error:", e); }
    finally { setIsLoadingUsers(false); }
  };

  const [formData, setFormData] = useState({
    namaKoordinator: '', bidang: 'Pertolongan Pertama', judulMateri: '', persentase: 50, jumlahHadir: '', hasilLatihan: '', kendala: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        setPhotoPreviews(prev => [...prev, URL.createObjectURL(file)]);
        setImagesData(prev => [...prev, { imageBase64: base64, mimeType: file.type, fileName: `PMR_${Date.now()}_${file.name}` }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
    setImagesData(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === loginData.username && u.password === loginData.password);
    if (found) { setIsLoggedIn(true); setView('admin'); setStatus({ type: '', message: '' }); }
    else { setStatus({ type: 'error', message: 'Kombinasi salah!' }); }
  };

  const handleLogout = () => { setIsLoggedIn(false); setView('form'); };

  const addUser = async (userData) => {
    const newList = [...users, userData];
    setUsers(newList);
    if (!CLOUDFLARE_ENDPOINT.includes("your-worker")) {
      try { await fetch(`${CLOUDFLARE_ENDPOINT}/users`, { method: 'POST', body: JSON.stringify({ action: 'add', user: userData }) }); } catch (e) {}
    }
  };

  const deleteUser = async (username) => {
    const newList = users.filter(u => u.username !== username);
    setUsers(newList);
    if (!CLOUDFLARE_ENDPOINT.includes("your-worker")) {
      try { await fetch(`${CLOUDFLARE_ENDPOINT}/users`, { method: 'POST', body: JSON.stringify({ action: 'delete', username }) }); } catch (e) {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setStatus({ type: '', message: '' });
    try {
      await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...formData, photos: imagesData }) });
      setStatus({ type: 'success', message: 'Laporan Terkirim!' });
      setReports([{ id: Date.now(), date: new Date().toLocaleDateString(), nama: formData.namaKoordinator, bidang: formData.bidang, materi: formData.judulMateri, hadir: formData.jumlahHadir, progres: formData.persentase, hasil: formData.hasilLatihan, link: "#" }, ...reports]);
      setFormData({ namaKoordinator: '', bidang: 'Pertolongan Pertama', judulMateri: '', persentase: 50, jumlahHadir: '', hasilLatihan: '', kendala: '' });
      setPhotoPreviews([]); setImagesData([]);
    } catch (err) { setStatus({ type: 'error', message: 'Gagal mengirim!' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#5a0505] font-sans pb-12 overflow-x-hidden text-white selection:bg-red-200 selection:text-red-900">
      <Header view={view} setView={setView} isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      <main className="w-full px-2 sm:px-0">
        {view === 'form' && <FormView formData={formData} handleInputChange={handleInputChange} handleFileChange={handleFileChange} handleSubmit={handleSubmit} loading={loading} status={status} photoPreviews={photoPreviews} removePhoto={removePhoto} />}
        {view === 'login' && <LoginView loginData={loginData} setLoginData={setLoginData} handleLogin={handleLogin} status={status} />}
        {view === 'admin' && <AdminView reports={reports} setSelectedReport={setSelectedReport} users={users} onAddUser={addUser} onDeleteUser={deleteUser} isLoadingUsers={isLoadingUsers} onRefreshUsers={fetchUsers} />}
      </main>
      <DetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      <footer className="max-w-[280px] mx-auto text-center space-y-4 py-8 mt-8 px-4 border-t border-red-900/40 text-white/95">
        <div className="space-y-1.5">
          <p className="text-xs italic font-black tracking-widest uppercase">"Siamo Tutti Fratelli!"</p>
          <div className="bg-red-900/30 py-1.5 px-3 rounded-xl inline-flex items-center gap-2 border border-red-800/20">
             <ShieldCheck className="w-3.5 h-3.5 text-green-400" /><span className="text-[9px] font-black uppercase tracking-wider">v1.3 Complete</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;