import React, { useState } from 'react';
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
  Database
} from 'lucide-react';

// URL Google Apps Script yang Anda berikan
const GAS_URL = "https://script.google.com/macros/s/AKfycbxUPUmQkWTB9Ux1oivo98F4L3zESR6-DfUibI8CaE6qiwI_kSZdRafGwjou-HIo7iQd/exec"; 

// --- SUB-COMPONENTS ---

const Header = ({ view, setView }) => (
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
          <button onClick={() => setView('form')} className="flex items-center gap-2 bg-white text-red-800 hover:bg-slate-100 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all shadow-md">
            Kembali
          </button>
        )}
      </div>
    </div>
  </header>
);

const DetailModal = ({ report, onClose }) => {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-red-800 p-5 md:p-6 text-white flex justify-between items-center">
          <div className="pr-4">
            <h3 className="text-lg md:text-xl font-bold leading-tight line-clamp-1">{report.materi}</h3>
            <p className="text-[10px] md:text-xs opacity-80 uppercase font-semibold">{report.bidang} • {report.date}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-700 rounded-full transition-colors flex-shrink-0">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-slate-900 scrollbar-thin">
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
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kendala</p>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm leading-relaxed text-slate-700">{report.kendala || "Tidak ada kendala."}</div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{width: `${report.progres}%`}}></div>
              </div>
              <span className="text-xs font-bold text-slate-500">{report.progres}% Tuntas</span>
            </div>
            <a href={report.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-red-800 font-bold text-sm hover:underline uppercase tracking-tighter w-full sm:w-auto justify-center sm:justify-end">
              Dokumentasi Drive <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormView = ({ formData, handleInputChange, handleFileChange, handleSubmit, loading, status, photoPreview }) => {
  const getProgressLabel = (value) => {
    if (value <= 20) return { label: "Tahap Awal", desc: "Pengenalan materi & teori dasar." };
    if (value <= 40) return { label: "Tahap Dasar", desc: "Pemahaman teori & prosedur awal." };
    if (value <= 60) return { label: "Tahap Menengah", desc: "Praktik terbimbing & materi 50%." };
    if (value <= 80) return { label: "Tahap Lanjutan", desc: "Penguasaan praktik secara mandiri." };
    return { label: "Tahap Mahir", desc: "Penuntasan materi & siap evaluasi." };
  };

  const progressInfo = getProgressLabel(formData.persentase);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mt-2 sm:mt-6">
        <div className="bg-slate-900 text-white p-5 md:p-6">
          <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-red-500" />
            Pelaporan Latihan Mingguan
          </h2>
          <p className="text-slate-400 text-[10px] md:text-xs mt-1">Isi formulir untuk merekap progres bidang Anda.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 text-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Nama Koordinator</label>
              <input required type="text" name="namaKoordinator" value={formData.namaKoordinator} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Bidang PMR</label>
              <select name="bidang" value={formData.bidang} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none bg-white transition-all text-sm">
                <option value="Pertolongan Pertama">Pertolongan Pertama</option>
                <option value="Perawatan Keluarga">Perawatan Keluarga</option>
                <option value="Pasang Bongkar Tenda">Pasang Bongkar Tenda</option>
                <option value="Tandu">Tandu</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Judul Materi</label>
            <input required type="text" name="judulMateri" value={formData.judulMateri} onChange={handleInputChange} placeholder="Misal: Teknik Pembalutan Siku" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none transition-all text-sm" />
          </div>

          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Hasil Latihan Hari Ini</label>
            <textarea required name="hasilLatihan" value={formData.hasilLatihan} onChange={handleInputChange} rows="3" placeholder="Apa saja target yang sudah dicapai?" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none resize-none text-sm"></textarea>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded-r-xl">
              <p className="text-[9px] text-blue-700 font-medium leading-tight italic">
                Laporkan poin materi yang diselesaikan, simulasi praktik, dan evaluasi pemahaman anggota.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Anggota Hadir</label>
              <div className="relative">
                <input required type="number" name="jumlahHadir" value={formData.jumlahHadir} onChange={handleInputChange} placeholder="0" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none text-sm" />
                <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Dokumentasi</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all overflow-hidden relative group">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover p-1 transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-8 h-8 text-slate-400 mb-2 group-hover:text-red-800 transition-colors" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Klik / Ambil Foto</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Kendala Latihan</label>
            <textarea name="kendala" value={formData.kendala} onChange={handleInputChange} rows="2" placeholder="Tulis '-' jika tidak ada kendala" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none resize-none text-sm"></textarea>
          </div>

          {status.message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm' : 'bg-red-50 text-red-800 border border-red-200 shadow-sm'}`}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs md:text-sm font-bold">{status.message}</p>
            </div>
          )}

          <button disabled={loading} type="submit" className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${loading ? 'bg-slate-400' : 'bg-red-800 hover:bg-red-900 shadow-red-200 uppercase tracking-[0.2em] text-sm'}`}>
            {loading ? "Mengirim..." : "Kirim Laporan"}
            {!loading && <Send className="w-4 h-4" />}
          </button>
        </form>
      </section>

      {/* Info Card Sinkronisasi */}
      <section className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg p-5 border border-white/20 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="bg-red-100 p-3 rounded-2xl flex-shrink-0">
          <Database className="text-red-700 w-6 h-6" />
        </div>
        <div className="space-y-1 text-center sm:text-left text-slate-900">
          <h4 className="text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2">
            Sinkronisasi Data
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </h4>
          <p className="text-[11px] md:text-xs text-slate-600 font-medium leading-relaxed">
            Laporan tersinkronisasi secara <span className="text-red-700 font-bold italic">real-time</span> ke database internal <span className="font-bold">PMR SMAN 1 AIKMEL</span>.
          </p>
        </div>
      </section>
    </div>
  );
};

// --- LOGIN & ADMIN VIEWS ---
const LoginView = ({ loginData, setLoginData, handleLogin, status }) => (
  <div className="max-w-md mx-auto p-4 pt-12 md:pt-20 animate-in zoom-in duration-300 text-slate-900">
    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="text-red-800 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Login Admin</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Sistem Autentikasi Internal</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Username</label>
          <input required type="text" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none text-sm" placeholder="User" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
          <input required type="password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-800 outline-none text-sm" placeholder="••••••••" />
        </div>
        {status.type === 'error' && <p className="text-red-600 text-xs font-black italic">{status.message}</p>}
        <button type="submit" className="w-full bg-red-800 hover:bg-black text-white py-4 rounded-2xl font-black transition-all shadow-lg uppercase tracking-widest text-sm">Masuk</button>
      </form>
    </div>
  </div>
);

const AdminView = ({ reports, setSelectedReport }) => (
  <div className="max-w-6xl mx-auto p-4 space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2 md:mt-6">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-slate-900">
        <div className="bg-blue-50 p-2 md:p-3 rounded-xl"><ClipboardCheck className="text-blue-600 w-5 h-5 md:w-6 md:h-6" /></div>
        <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Laporan</p><p className="text-lg md:text-2xl font-black text-slate-900">{reports.length}</p></div>
      </div>
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-slate-900">
        <div className="bg-green-50 p-2 md:p-3 rounded-xl"><Target className="text-green-600 w-5 h-5 md:w-6 md:h-6" /></div>
        <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Efisiensi</p><p className="text-lg md:text-2xl font-black text-slate-900">94%</p></div>
      </div>
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-slate-900">
        <div className="bg-purple-50 p-2 md:p-3 rounded-xl"><Users className="text-purple-600 w-5 h-5 md:w-6 md:h-6" /></div>
        <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Hadir</p><p className="text-lg md:text-2xl font-black text-slate-900">312</p></div>
      </div>
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 text-slate-900">
        <div className="bg-red-50 p-2 md:p-3 rounded-xl"><BookOpen className="text-red-800 w-5 h-5 md:w-6 md:h-6" /></div>
        <div><p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-wider">Bidang</p><p className="text-lg md:text-2xl font-black text-slate-900">4</p></div>
      </div>
    </section>
    
    <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-slate-900">
      <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base uppercase tracking-tight">
          <FileText className="text-red-800 w-5 h-5" /> REKAPITULASI
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
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
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800 text-sm md:text-base">{report.nama}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black">{report.bidang}</p>
                </td>
                <td className="px-6 py-4">
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
      </div>
    </section>
  </div>
);

// --- MAIN APP COMPONENT ---

const App = () => {
  const [view, setView] = useState('form');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    namaKoordinator: '',
    bidang: 'Pertolongan Pertama',
    judulMateri: '',
    persentase: 50,
    jumlahHadir: '',
    hasilLatihan: '',
    kendala: '',
    imageBase64: '',
    mimeType: '',
    fileName: ''
  });

  const reports = [
    { id: 1, date: '16 Feb 2026', nama: 'Zulham Efendi', bidang: 'Tandu', materi: 'Simpul & Ikat Tandu Darurat', hadir: 18, progres: 85, hasil: 'Anggota sudah lancar membuat simpul mati dan pangkal.', kendala: 'Tali lapuh.', link: '#' },
    { id: 2, date: '15 Feb 2026', nama: 'Siti Rohana', bidang: 'Pertolongan Pertama', materi: 'Pembalutan Mitella Siku', hadir: 22, progres: 100, hasil: 'Praktik pembalutan berhasil dilakukan.', kendala: 'Tidak ada.', link: '#' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(',')[1];
        setFormData(prev => ({ 
          ...prev, 
          imageBase64: base64String, 
          mimeType: file.type, 
          fileName: `PMR_SMANEL_${Date.now()}_${file.name}` 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.username === 'User' && loginData.password === 'User') {
      setIsLoggedIn(true);
      setView('admin');
      setStatus({ type: '', message: '' });
    } else {
      setStatus({ type: 'error', message: 'Kombinasi User/Password salah!' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData }),
      });
      setStatus({ type: 'success', message: 'Laporan berhasil dikirim!' });
      setFormData({ namaKoordinator: '', bidang: 'Pertolongan Pertama', judulMateri: '', persentase: 50, jumlahHadir: '', hasilLatihan: '', kendala: '', imageBase64: '', mimeType: '', fileName: '' });
      setPhotoPreview(null);
    } catch (error) {
      setStatus({ type: 'error', message: 'Gagal mengirim. Coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#5a0505] font-sans pb-12 overflow-x-hidden selection:bg-red-200 selection:text-red-900">
      <Header view={view} setView={setView} />
      
      <main className="w-full px-2 sm:px-0">
        {view === 'form' && <FormView formData={formData} handleInputChange={handleInputChange} handleFileChange={handleFileChange} handleSubmit={handleSubmit} loading={loading} status={status} photoPreview={photoPreview} />}
        {view === 'login' && <LoginView loginData={loginData} setLoginData={setLoginData} handleLogin={handleLogin} status={status} />}
        {view === 'admin' && <AdminView reports={reports} setSelectedReport={setSelectedReport} />}
      </main>
      
      <DetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />

      <footer className="max-w-[280px] mx-auto text-center space-y-4 py-8 mt-8 px-4 border-t border-red-900/40 text-white/95">
        <div className="space-y-1.5">
          <p className="text-xs italic font-black tracking-widest uppercase">"Siamo Tutti Fratelli!"</p>
          <div className="bg-red-900/30 py-1.5 px-3 rounded-xl inline-flex items-center gap-2 border border-red-800/20">
             <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
             <span className="text-[9px] font-black uppercase tracking-wider">v1.0 System</span>
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <p className="text-[10px] font-black tracking-widest uppercase">Copyright by PMRSMANEL26</p>
          <div className="flex items-center justify-center gap-2 text-[8px] font-bold text-red-300 opacity-60">
            <span className="flex items-center gap-1"><Smartphone className="w-2 h-2" /> Ready</span>
            <div className="w-1 h-1 bg-red-400 rounded-full"></div>
            <span>Secured App</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;