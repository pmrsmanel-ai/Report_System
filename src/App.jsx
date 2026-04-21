import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusSquare, Lock, LogOut, Edit, Search, Settings, 
  Bot, FileText, Printer, Send, CheckCircle, XCircle, 
  Clock, Camera, Image as ImageIcon, Check, X, AlertTriangle,
  Users, Activity
} from 'lucide-react';

const INITIAL_MOCK_DATA = [
  {
    id: 'LAP-1', minggu: '1', bidang: 'Pertolongan Pertama', jenis: 'Latihan Rutin', 
    tanggal: '2026-04-19', status: 'Disetujui', deskripsi: 'Latihan dasar pembalutan luka pendarahan luar.', 
    jumlah: '15', kendala: 'Tidak ada kendala', dokumentasi: '-'
  },
  {
    id: 'LAP-2', minggu: '1', bidang: 'Perawatan Keluarga', jenis: 'Rapat/Evaluasi', 
    tanggal: '2026-04-18', status: 'Menunggu', deskripsi: 'Rapat penyusunan proker PK semester genap.', 
    jumlah: '10', kendala: 'Waktu pertemuan terbatas, banyak yang izin', dokumentasi: '-'
  }
];

export default function App() {
  // --- STATE MANAGEMENT ---
  const [currentView, setCurrentView] = useState('koordinator');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [reports, setReports] = useState(INITIAL_MOCK_DATA);
  const [filterBidang, setFilterBidang] = useState('Semua');
  
  // Modal & Notification State
  const [notif, setNotif] = useState({ isOpen: false, message: '', bgColor: '' });
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', resolve: null });
  const [modalInput, setModalInput] = useState('');

  // AI & Export State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResultHTML, setAiResultHTML] = useState('');
  const aiContentRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    bidang: '', tanggal: '', minggu: '', jenis: '', deskripsi: '', jumlah: '', kendala: '', file: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- KONFIGURASI API GOOGLE APPS SCRIPT ---
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFebgDDF3nMM7QHLxMcnxqwCwtRKPJwaiFVixYfg8Ao3f3K4-y0RMc5mR61bHhJmXr/exec';

  // --- FETCH DATA DARI GOOGLE SHEETS VIA API ---
  const fetchReports = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getReports`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const formattedData = data.map(d => ({
        id: d['ID Laporan'],
        minggu: d['Minggu Ke'],
        bidang: d['Nama Bidang'],
        jenis: d['Jenis Kegiatan'],
        tanggal: d['Tanggal Kegiatan'],
        status: d['Status'],
        deskripsi: d['Deskripsi Kegiatan'],
        jumlah: d['Jumlah Anggota Terlibat'],
        kendala: d['Kendala'],
        dokumentasi: d['Dokumentasi']
      }));
      if (formattedData.length > 0) {
        setReports(formattedData);
      }
    } catch (error) {
      console.warn('Mode Preview: API diblokir oleh CORS/Sandbox, menggunakan data simulasi lokal.', error);
      // Fallback jika API gagal dimuat (CORS/Sandbox)
      setReports(INITIAL_MOCK_DATA);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- HELPERS ---
  const showNotif = (message, bgColor) => {
    setNotif({ isOpen: true, message, bgColor });
    setTimeout(() => setNotif({ isOpen: false, message: '', bgColor: '' }), 4000);
  };

  const showModalPromise = (options) => {
    return new Promise((resolve) => {
      setModalInput('');
      setModal({ isOpen: true, ...options, resolve });
    });
  };

  const handleModalConfirm = () => {
    const { type, resolve } = modal;
    setModal({ ...modal, isOpen: false });
    if (type === 'prompt') resolve(modalInput);
    else resolve(true);
  };

  const handleModalCancel = () => {
    modal.resolve(null);
    setModal({ ...modal, isOpen: false });
  };

  const getWeekNumber = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7).toString();
  };

  // --- ACTIONS ---
  const handleLoginAdmin = async () => {
    const password = await showModalPromise({
      title: '🔐 Verifikasi Akses',
      message: 'Masukkan Password Administrator untuk membuka rekapitulasi data.',
      type: 'prompt'
    });

    if (password === 'adminpmr') {
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
      showNotif('Berhasil masuk sebagai Admin!', 'bg-emerald-500');
    } else if (password !== null) {
      await showModalPromise({ title: 'Akses Ditolak', message: 'Password yang Anda masukkan tidak valid.', type: 'alert' });
    }
  };

  const handleLogoutAdmin = () => {
    setIsAdminLoggedIn(false);
    setCurrentView('koordinator');
    showNotif('Sesi Admin telah diakhiri.', 'bg-slate-800');
    setAiResultHTML(''); 
  };

  const handleFormChange = (e) => {
    const { id, value, files } = e.target;
    if (id === 'dokumentasi') {
      setFormData(prev => ({ ...prev, file: files[0] }));
    } else if (id === 'tanggal') {
      setFormData(prev => ({ ...prev, tanggal: value, minggu: getWeekNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let fileBase64 = '';
    let fileName = '';

    if (formData.file) {
      fileName = formData.file.name;
      fileBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(formData.file);
      });
    }

    const payload = {
      bidang: formData.bidang,
      minggu: formData.minggu,
      tanggal: formData.tanggal,
      jenis: formData.jenis,
      deskripsi: formData.deskripsi,
      jumlah: formData.jumlah,
      kendala: formData.kendala || '-',
      dokumentasi: fileName ? fileName : "-",
      fileData: fileBase64 
    };

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify({ action: 'submit', data: payload })
      });
      
      if (!response.ok) throw new Error('API Error');
      const res = await response.json();
      
      if(res.status === 'success') {
        showNotif('🎉 Laporan Mingguan berhasil dikirim ke server!', 'bg-emerald-500');
        setFormData({ bidang: '', tanggal: '', minggu: '', jenis: '', deskripsi: '', jumlah: '', kendala: '', file: null });
        document.getElementById('form-laporan').reset();
        fetchReports(); 
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      console.warn('Mode Preview: Menyimpan data secara lokal (Server diblokir CORS)', error);
      
      // Fallback lokal jika fetch ke Google Apps Script diblokir oleh iframe/CORS
      const newReport = {
        id: 'LAP-' + Date.now(),
        ...payload,
        status: 'Menunggu',
        dokumentasi: formData.file ? URL.createObjectURL(formData.file) : '-'
      };
      
      setReports([newReport, ...reports]);
      setFormData({ bidang: '', tanggal: '', minggu: '', jenis: '', deskripsi: '', jumlah: '', kendala: '', file: null });
      document.getElementById('form-laporan').reset();
      showNotif('🎉 Mode Lokal: Laporan berhasil ditambahkan!', 'bg-emerald-500');

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUbahStatus = async (id, status) => {
    const confirmed = await showModalPromise({
      title: 'Ubah Status Laporan',
      message: `Tandai laporan ini sebagai "${status}"?`,
      type: 'confirm'
    });

    if (confirmed) {
      // Update UI seketika
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      
      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'updateStatus', id: id, status: status })
        });
        if (!response.ok) throw new Error('API Error');
        showNotif(`Laporan ditandai sebagai ${status}`, status === 'Disetujui' ? 'bg-emerald-500' : 'bg-red-600');
      } catch (error) {
        console.warn('Mode Preview: Update API diblokir, memperbarui secara lokal.', error);
        showNotif(`Mode Lokal: Laporan ditandai sebagai ${status}`, status === 'Disetujui' ? 'bg-emerald-500' : 'bg-red-600');
      }
    }
  };

  const analyzeWithAI = () => {
    const approvedReports = reports.filter(r => r.status === 'Disetujui');
    if (approvedReports.length === 0) {
      showModalPromise({ title: 'Data Kosong', message: 'Belum ada laporan lapangan yang disetujui untuk dianalisis oleh AI.', type: 'alert' });
      return;
    }

    setIsAnalyzing(true);
    setAiResultHTML('');

    let listMinggu = new Set();
    let totalAnggota = 0;
    let daftarKendala = [];

    // Membuat baris detail kegiatan secara dinamis berdasarkan jumlah laporan yang masuk
    const detailKegiatanRows = approvedReports.map(r => {
      listMinggu.add(r.minggu);
      totalAnggota += parseInt(r.jumlah) || 0;
      if (r.kendala && r.kendala !== '-') {
        daftarKendala.push(`<b>${r.bidang}</b>: ${r.kendala}`);
      }
      return `
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #000; vertical-align: top;"><strong>${r.bidang}</strong></td>
          <td style="padding: 8px 10px; border: 1px solid #000; vertical-align: top;">${r.jenis}</td>
          <td style="padding: 8px 10px; border: 1px solid #000; text-align: center; vertical-align: top;">${r.jumlah}</td>
          <td style="padding: 8px 10px; border: 1px solid #000; vertical-align: top; text-align: justify;">${r.deskripsi}</td>
        </tr>
      `;
    }).join('');

    const arrayMinggu = Array.from(listMinggu).join(", ");
    const bidangList = Array.from(new Set(approvedReports.map(r => r.bidang))).join(', ');
    const jenisList = Array.from(new Set(approvedReports.map(r => r.jenis))).join(' dan ');
    
    const kendalaHTML = daftarKendala.length > 0 
        ? daftarKendala.join('<br/>') 
        : 'Seluruh kegiatan dari masing-masing bidang berjalan lancar tanpa kendala yang berarti.';

    // Menyusun teks laporan secara dinamis berdasarkan data yang masuk
    const ringkasanDinamis = `Alhamdulillah, kegiatan ekstrakurikuler PMR pada minggu ke-${arrayMinggu} telah terlaksana dengan melibatkan bidang ${bidangList}. Fokus utama kegiatan minggu ini meliputi <b>${jenisList}</b>. Tingkat partisipasi anggota sangat baik dengan total kehadiran mencapai <b>${totalAnggota} orang</b> secara keseluruhan.`;
    
    const hasilDinamis = approvedReports.map(r => `<div style="margin-bottom: 4px;">- <b>${r.bidang}</b> berhasil melaksanakan kegiatan dengan partisipasi ${r.jumlah} anggota.</div>`).join('');
    
    const solusiDinamis = daftarKendala.length > 0
        ? `Pengurus dan Pembina perlu menindaklanjuti kendala lapangan yang dilaporkan oleh masing-masing bidang. Disarankan untuk mengadakan koordinasi internal, memastikan kesiapan sarana prasarana, serta mencari solusi atas hambatan operasional tersebut sebelum jadwal latihan berikutnya.`
        : `Tidak ada masalah berarti. Kinerja, kedisiplinan, dan kesiapan sarana prasarana sudah sangat baik dan perlu dipertahankan untuk minggu berikutnya.`;

    setTimeout(() => {
      const generatedHTML = `
        <div style="text-align: center; margin-bottom: 24px; font-family: 'Times New Roman', serif;">
            <h2 style="margin: 0; font-size: 14pt; font-weight: bold; letter-spacing: 0.5px;">LAPORAN KEGIATAN LATIHAN</h2>
            <h2 style="margin: 0; font-size: 14pt; font-weight: bold; letter-spacing: 0.5px;">PMR SMAN 1 AIKMEL</h2>
        </div>
        
        <table style="width:100%; margin-bottom: 20px; border:none; text-align: left; font-family: 'Times New Roman', serif; font-size: 12pt;">
            <tr><td style="width: 130px; padding-bottom: 4px;"><strong>Bidang</strong></td><td style="padding-bottom: 4px;">: ${bidangList}</td></tr>
            <tr><td style="padding-bottom: 4px;"><strong>Koordinator</strong></td><td style="padding-bottom: 4px;">: Gabungan Seluruh Bidang</td></tr>
            <tr><td style="padding-bottom: 4px;"><strong>Minggu ke-</strong></td><td style="padding-bottom: 4px;">: ${arrayMinggu}</td></tr>
            <tr><td style="padding-bottom: 4px;"><strong>Tanggal</strong></td><td style="padding-bottom: 4px;">: Laporan Terkonsolidasi</td></tr>
        </table>
        
        <h4 style="border-bottom: 2px solid #b10d11; padding-bottom: 6px; color:#b10d11; margin-top: 24px; font-family: 'Times New Roman', serif; font-size: 12pt;">RINGKASAN KEGIATAN</h4>
        <p style="text-align: justify; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">${ringkasanDinamis}</p>
        
        <h4 style="border-bottom: 2px solid #b10d11; padding-bottom: 6px; color:#b10d11; margin-top: 24px; font-family: 'Times New Roman', serif; font-size: 12pt;">DETAIL KEGIATAN</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; font-family: 'Times New Roman', serif; font-size: 12pt;">
            <thead>
                <tr>
                    <th style="padding: 10px; border: 1px solid #000; background-color: #f1f5f9; width: 25%;">Bidang</th>
                    <th style="padding: 10px; border: 1px solid #000; background-color: #f1f5f9; width: 25%;">Jenis Kegiatan</th>
                    <th style="padding: 10px; border: 1px solid #000; background-color: #f1f5f9; width: 10%; text-align: center;">Kehadiran</th>
                    <th style="padding: 10px; border: 1px solid #000; background-color: #f1f5f9; width: 40%;">Materi / Deskripsi</th>
                </tr>
            </thead>
            <tbody>
                ${detailKegiatanRows}
            </tbody>
        </table>
        
        <h4 style="border-bottom: 2px solid #b10d11; padding-bottom: 6px; color:#b10d11; margin-top: 24px; font-family: 'Times New Roman', serif; font-size: 12pt;">HASIL & EVALUASI</h4>
        <table style="width: 100%; border:none; text-align: left; font-family: 'Times New Roman', serif; font-size: 12pt;">
            <tr><td style="width: 80px; vertical-align: top; padding-bottom: 8px;"><strong>Hasil</strong></td><td style="vertical-align: top; padding-bottom: 8px;">:<br/> ${hasilDinamis}</td></tr>
            <tr><td style="vertical-align: top; padding-bottom: 8px;"><strong>Kendala</strong></td><td style="vertical-align: top; padding-bottom: 8px;">:<br/> ${kendalaHTML}</td></tr>
            <tr><td style="vertical-align: top; padding-bottom: 8px;"><strong>Solusi</strong></td><td style="vertical-align: top; padding-bottom: 8px; text-align: justify;">: ${solusiDinamis}</td></tr>
        </table>
        
        <h4 style="border-bottom: 2px solid #b10d11; padding-bottom: 6px; color:#b10d11; margin-top: 24px; font-family: 'Times New Roman', serif; font-size: 12pt;">DOKUMENTASI</h4>
        <p style="font-family: 'Times New Roman', serif; font-size: 12pt;">Link / Keterangan: Seluruh bukti dokumentasi lapangan per bidang telah diunggah dan diarsipkan secara digital di dalam SIP-PMR SMANEL.</p>
        
        <br>
        <p style="font-family: 'Times New Roman', serif; font-size: 12pt;">Demikian laporan evaluasi ini disusun sebagai bentuk pertanggungjawaban kegiatan mingguan PMR.</p>
        <br><br>
        
        <table style="width: 100%; text-align: center; margin-top: 30px; border:none; font-family: 'Times New Roman', serif; font-size: 12pt;">
            <tr>
                <td style="width: 50%;"><strong>Pembina PMR</strong></td>
                <td style="width: 50%;"><strong>Ketua PMR</strong></td>
            </tr>
            <tr>
                <td style="height: 100px;"></td>
                <td style="height: 100px;"></td>
            </tr>
            <tr>
                <td>(...................................)</td>
                <td>(...................................)</td>
            </tr>
        </table>
      `;
      setAiResultHTML(generatedHTML);
      setIsAnalyzing(false);
      showNotif('✨ Laporan eksekutif berhasil dirangkum secara dinamis!', 'bg-emerald-500');
    }, 2000);
  };

  const handlePrint = () => {
    if (!aiResultHTML) {
      showNotif("Belum ada laporan yang disusun untuk dicetak!", "bg-rose-500");
      return;
    }
    
    // Membuat jendela baru khusus untuk mencetak dokumen AI saja
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Laporan PMR</title>
          <style>
            @media print {
              @page { margin: 1.5cm; }
              body { -webkit-print-color-adjust: exact; }
            }
            body { 
              font-family: 'Times New Roman', serif; 
              color: black; 
              padding: 20px; 
              max-width: 800px; 
              margin: auto; 
            }
          </style>
        </head>
        <body>
          ${aiResultHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Memberikan jeda waktu agar CSS ter-load sebelum membuka dialog print
    setTimeout(() => {
      printWindow.print();
      // Opsional: printWindow.close(); jika ingin tab langsung tertutup setelah print dialog muncul
    }, 250);
  };

  const exportHTMLToWord = () => {
    if (!aiContentRef.current) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Laporan Kegiatan Latihan PMR</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + aiContentRef.current.innerHTML + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'Laporan_PMR_SMAN1Aikmel.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
    
    showNotif("📄 Berkas Microsoft Word mulai diunduh!", "bg-blue-600");
  };

  // --- RENDERERS ---
  const renderStatusBadge = (status) => {
    let color = status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10' : 
                status === 'Revisi' ? 'bg-red-50 text-red-700 border-red-200 shadow-red-500/10' : 
                'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-500/10';
    let Icon = status === 'Disetujui' ? CheckCircle : status === 'Revisi' ? XCircle : Clock;
    return (
      <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm ${color}`}>
        <Icon size={14} className="mr-1.5" /> {status}
      </span>
    );
  };

  // UI Classes for Startup Vibe
  const inputClass = "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b10d11]/10 focus:border-[#b10d11] transition-all text-slate-700 text-sm font-medium placeholder:text-slate-400";
  const labelClass = "block text-sm font-bold text-slate-700 mb-2 ml-1";

  return (
    <div className="relative bg-[#b10d11] min-h-screen font-poppins selection:bg-red-200 selection:text-[#b10d11] overflow-x-hidden">
      
      {/* INJECT FONT & BACKGROUND DOTS */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
          .bg-dotted { background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px); background-size: 24px 24px; }
        `}
      </style>

      {/* BACKGROUND DECORATIONS (Solid Dots Only) */}
      <div className="fixed inset-0 bg-dotted z-0 pointer-events-none"></div>

      {/* --- MODAL --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-2xl font-extrabold mb-3 text-slate-800 tracking-tight">{modal.title}</h3>
            <p className="text-sm mb-6 text-slate-500 font-medium leading-relaxed">{modal.message}</p>
            {modal.type === 'prompt' && (
              <input 
                type="password" autoFocus
                value={modalInput} onChange={(e) => setModalInput(e.target.value)}
                className={inputClass + " mb-6 bg-slate-50"} 
                placeholder="Masukkan password..." 
              />
            )}
            <div className="flex justify-end space-x-3 mt-2">
              {modal.type !== 'alert' && (
                <button onClick={handleModalCancel} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">Batal</button>
              )}
              <button onClick={handleModalConfirm} className="px-6 py-3 bg-[#b10d11] text-white font-bold rounded-2xl hover:bg-[#8c0a0d] shadow-lg shadow-[#b10d11]/25 transition-all hover:-translate-y-0.5">Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING NAVBAR --- */}
      <div className="sticky top-6 z-40 px-4 sm:px-6 no-print">
        <nav className="max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-full shadow-lg px-4 sm:px-6 py-3 transition-all duration-300">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => !isAdminLoggedIn && setCurrentView('koordinator')}>
              <div className="bg-[#b10d11] p-2 rounded-xl text-white shadow-md shadow-[#b10d11]/20 group-hover:rotate-12 group-hover:scale-110 transition-all">
                <PlusSquare size={20} strokeWidth={3} />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-[#b10d11] hidden sm:block">
                PMR SMANEL
              </span>
            </div>
            <div className="flex space-x-1 sm:space-x-2 text-sm font-bold">
              {!isAdminLoggedIn ? (
                <>
                  <button onClick={() => setCurrentView('koordinator')} className={`px-4 py-2.5 rounded-full transition-all ${currentView==='koordinator' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Form Laporan</button>
                  <button onClick={() => setCurrentView('status')} className={`px-4 py-2.5 rounded-full transition-all ${currentView==='status' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Cek Status</button>
                  <button onClick={handleLoginAdmin} className="ml-1 px-4 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20 transition-all flex items-center hover:-translate-y-0.5"><Lock size={14} className="mr-1.5"/> Admin</button>
                </>
              ) : (
                <>
                  <button onClick={() => setCurrentView('admin')} className={`px-4 py-2.5 rounded-full transition-all ${currentView==='admin' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Rekap Laporan</button>
                  <button onClick={() => setCurrentView('pembina')} className={`px-4 py-2.5 rounded-full transition-all ${currentView==='pembina' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Dasbor AI</button>
                  <button onClick={handleLogoutAdmin} className="ml-1 w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-[#b10d11] transition-colors flex items-center justify-center"><LogOut size={16} className="sm:mr-1.5"/><span className="hidden sm:inline">Keluar</span></button>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pt-10 print-area">
        
        {/* STARTUP HERO SECTION */}
        <div className="text-center mb-14 mt-4 no-print animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="inline-flex items-center space-x-2 bg-[#8c0a0d]/80 backdrop-blur-md border border-[#8c0a0d] shadow-sm px-4 py-2 rounded-full mb-6 cursor-default hover:bg-[#b10d11] transition-colors">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-300"></span>
            </span>
            <span className="text-xs font-bold text-red-100 uppercase tracking-wider">Sistem Digitalisasi PMR</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-5 leading-tight">
            PMR SMANEL <br className="hidden sm:block"/>
            <span className="text-red-200">
              REPORT SYSTEM
            </span>
          </h1>
          <p className="text-red-100/90 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
            Catat kegiatan rutin, pantau keaktifan anggota, dan evaluasi hasil lapangan dengan efisien menggunakan asisten AI terpadu.
          </p>
        </div>

        {/* NOTIFICATION FLOATING */}
        {notif.isOpen && (
          <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`${notif.bgColor} text-white px-6 py-4 rounded-2xl shadow-xl shadow-black/20 font-bold flex items-center`}>
              <CheckCircle size={20} className="mr-3 opacity-90"/>
              {notif.message}
            </div>
          </div>
        )}

        {/* ================= VIEW: KOORDINATOR ================= */}
        {currentView === 'koordinator' && (
          <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Form Kegiatan</h2>
                <p className="text-slate-500 font-medium text-sm">Isi data laporan mingguan bidang Anda dengan lengkap.</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-red-50 rounded-2xl border border-red-100 shadow-sm items-center justify-center text-3xl rotate-3 hover:-rotate-3 transition-transform">
                📝
              </div>
            </div>
            
            <form id="form-laporan" onSubmit={handleSubmitReport}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Bidang *</label>
                  <select id="bidang" required onChange={handleFormChange} className={inputClass}>
                    <option value="">Pilih Bidang Anda...</option>
                    <option value="Pertolongan Pertama">Pertolongan Pertama</option>
                    <option value="Perawatan Keluarga">Perawatan Keluarga</option>
                    <option value="Pasang Bongkar Tenda">Pasang Bongkar Tenda</option>
                    <option value="Tandu">Tandu</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tanggal Pelaksanaan *</label>
                  <input type="date" id="tanggal" required onChange={handleFormChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Minggu Ke-</label>
                  <input type="text" id="minggu" value={formData.minggu ? `Minggu ke-${formData.minggu}` : ''} readOnly placeholder="Otomatis terisi..." className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-400 cursor-not-allowed text-sm font-semibold" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Kategori Kegiatan *</label>
                  <select id="jenis" required onChange={handleFormChange} className={inputClass}>
                    <option value="">Pilih Kategori...</option>
                    <option value="Latihan Rutin">Latihan Rutin (Penyampaian Materi)</option>
                    <option value="Simulasi Bencana">Simulasi Bencana / Praktik Lapangan</option>
                    <option value="Bakti Sosial">Bakti Sosial / Donor Darah</option>
                    <option value="Siaga Medis">Siaga Medis (Upacara/Event)</option>
                    <option value="Rapat/Evaluasi">Rapat Koordinasi / Evaluasi</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Deskripsi Detail *</label>
                  <textarea id="deskripsi" rows="3" required onChange={handleFormChange} placeholder="Ceritakan detail kegiatan, materi yang dipelajari, atau tindakan yang diambil..." className={inputClass}></textarea>
                </div>
                <div>
                  <label className={labelClass}>Total Anggota Hadir *</label>
                  <div className="relative">
                    <input type="number" id="jumlah" min="1" required onChange={handleFormChange} className={inputClass + " pl-12"} placeholder="0" />
                    <Users className="absolute left-4 top-4 text-slate-400" size={20} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Unggah Bukti Kegiatan</label>
                  <input type="file" id="dokumentasi" accept="image/*" onChange={handleFormChange} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-[#b10d11] hover:file:bg-red-100 transition-all cursor-pointer text-slate-500" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Catatan & Kendala Lapangan</label>
                  <textarea id="kendala" rows="2" onChange={handleFormChange} placeholder="Opsional: Tuliskan hambatan yang dialami (misal: alat mitela kurang)..." className={inputClass}></textarea>
                </div>
              </div>
              <div className="mt-12 flex justify-end pt-6 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting} className={`bg-[#b10d11] hover:bg-[#8c0a0d] text-white font-bold py-4 px-10 rounded-2xl shadow-lg shadow-[#b10d11]/30 flex items-center transition-all hover:-translate-y-1 ${isSubmitting && 'opacity-70 cursor-not-allowed hover:translate-y-0 shadow-none'}`}>
                  {isSubmitting ? <><Clock className="animate-spin mr-3" size={20}/> Memproses...</> : <><Send className="mr-3" size={20}/> Kirim Laporan</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= VIEW: CEK STATUS KOORDINATOR ================= */}
        {currentView === 'status' && (
          <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Status Laporan</h2>
                <p className="text-slate-500 font-medium text-sm">Pantau proses persetujuan laporan yang telah Anda kirim.</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm items-center justify-center text-3xl -rotate-3 hover:rotate-3 transition-transform">
                🔍
              </div>
            </div>
            
            <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-bold text-slate-700 shrink-0">Filter Bidang:</label>
              <select value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)} className="w-full sm:w-72 p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold text-slate-700 cursor-pointer shadow-sm">
                <option value="Semua">Semua Bidang Tampil</option>
                <option value="Pertolongan Pertama">Pertolongan Pertama</option>
                <option value="Perawatan Keluarga">Perawatan Keluarga</option>
                <option value="Pasang Bongkar Tenda">Pasang Bongkar Tenda</option>
                <option value="Tandu">Tandu</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Timeline</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Bidang</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Kegiatan</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingData ? (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-500 font-medium">
                        <Clock className="animate-spin inline mr-2" size={18}/> Mengambil data...
                      </td>
                    </tr>
                  ) : reports.filter(r => filterBidang === 'Semua' || r.bidang === filterBidang).map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-5">
                        <div className="font-bold text-slate-800">Minggu {row.minggu}</div>
                        <div className="text-xs font-medium text-slate-400 mt-1 flex items-center"><Clock size={12} className="mr-1"/> {row.tanggal}</div>
                      </td>
                      <td className="p-5 font-bold text-[#b10d11] text-sm">{row.bidang}</td>
                      <td className="p-5 text-sm font-medium text-slate-600">{row.jenis}</td>
                      <td className="p-5 text-center">{renderStatusBadge(row.status)}</td>
                    </tr>
                  ))}
                  {reports.filter(r => filterBidang === 'Semua' || r.bidang === filterBidang).length === 0 && !isLoadingData && (
                    <tr>
                      <td colSpan="4" className="p-16 text-center">
                         <div className="text-4xl mb-4 grayscale opacity-50">📂</div>
                         <div className="text-slate-500 font-bold text-lg">Belum ada laporan.</div>
                         <div className="text-slate-400 text-sm mt-1">Data yang sesuai filter tidak ditemukan.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= VIEW: ADMIN ================= */}
        {currentView === 'admin' && isAdminLoggedIn && (
          <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Panel Validasi Admin</h2>
                <p className="text-slate-500 font-medium text-sm">Review dan berikan persetujuan untuk laporan yang masuk.</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm items-center justify-center text-3xl rotate-6 hover:-rotate-6 transition-transform">
                🛡️
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Timeline</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Bidang</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Detail Kegiatan</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400">Status</th>
                    <th className="p-5 text-xs uppercase tracking-wider font-extrabold text-slate-400 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingData ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-500 font-medium">
                        <Clock className="animate-spin inline mr-2" size={18}/> Memuat data...
                      </td>
                    </tr>
                  ) : reports.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 font-bold text-slate-800 text-sm">Mg ke-{row.minggu}</td>
                      <td className="p-5 font-bold text-[#b10d11] text-sm">{row.bidang}</td>
                      <td className="p-5">
                        <div className="text-sm font-bold text-slate-700">{row.jenis}</div>
                        <div className="text-xs font-medium text-slate-400 mt-1 mb-2">{row.tanggal}</div>
                        {row.dokumentasi !== '-' && (
                           <a href={row.dokumentasi} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"><ImageIcon size={14} className="mr-1.5"/> Buka Foto</a>
                        )}
                      </td>
                      <td className="p-5">{renderStatusBadge(row.status)}</td>
                      <td className="p-5 text-center whitespace-nowrap">
                        <div className="flex justify-center space-x-2">
                          <button onClick={() => handleUbahStatus(row.id, 'Disetujui')} className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-100 hover:shadow-md hover:-translate-y-0.5" title="Setujui"><Check size={18} strokeWidth={3}/></button>
                          <button onClick={() => handleUbahStatus(row.id, 'Revisi')} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 hover:shadow-md hover:-translate-y-0.5" title="Revisi"><X size={18} strokeWidth={3}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && !isLoadingData && (
                     <tr>
                      <td colSpan="5" className="p-16 text-center">
                         <div className="text-4xl mb-4 grayscale opacity-50">📥</div>
                         <div className="text-slate-500 font-bold text-lg">Inbox Kosong.</div>
                         <div className="text-slate-400 text-sm mt-1">Belum ada laporan baru yang dikirimkan.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= VIEW: PEMBINA ================= */}
        {currentView === 'pembina' && isAdminLoggedIn && (
          <div className="bg-white p-6 sm:p-12 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12 pb-8 border-b border-slate-100 relative">
              <div className="inline-flex bg-[#b10d11] p-4 rounded-[2rem] mb-6 shadow-xl shadow-[#b10d11]/20 rotate-3">
                <FileText className="text-white" size={40} strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-800">Laporan Evaluasi PMR</h1>
              <p className="text-slate-500 mt-3 font-medium text-lg">Ringkasan Eksekutif berbasis AI & Data Terpadu</p>
            </div>
            
            <div className="mb-10 no-print flex flex-wrap justify-center sm:justify-end gap-4">
              <button onClick={analyzeWithAI} disabled={isAnalyzing} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-slate-900/20 flex items-center transition-all hover:-translate-y-1 disabled:opacity-70 disabled:transform-none disabled:shadow-none">
                {isAnalyzing ? <Bot className="animate-pulse mr-2.5" size={20}/> : <Bot className="mr-2.5" size={20}/>}
                {isAnalyzing ? 'Menyusun Laporan...' : 'Susun dengan AI'}
              </button>
              {aiResultHTML && (
                <>
                  <button onClick={exportHTMLToWord} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center transition-all hover:-translate-y-1">
                    <FileText className="mr-2.5" size={20}/> Unduh .DOC
                  </button>
                  {/* Tombol Cetak PDF yang diubah menggunakan handlePrint */}
                  <button onClick={handlePrint} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6 py-3.5 rounded-2xl shadow-sm flex items-center transition-all hover:-translate-y-1">
                    <Printer className="mr-2.5" size={20}/> Cetak PDF
                  </button>
                </>
              )}
            </div>

            {/* Container Hasil Analisis AI */}
            {(isAnalyzing || aiResultHTML) && (
              <div className="mb-12 p-8 sm:p-10 rounded-[2rem] bg-slate-50 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center">
                  <span className="bg-slate-800 text-white p-2 rounded-xl mr-3"><Bot size={20}/></span> Dokumen Final AI
                </h3>
                
                <div ref={aiContentRef} className="text-slate-800 leading-relaxed bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 relative z-10">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-70">
                      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                         <Bot className="text-[#b10d11]" size={40}/>
                      </div>
                      <p className="text-[#b10d11] font-bold text-lg animate-pulse">Merangkum Data Lapangan SMANEL...</p>
                    </div>
                  ) : (
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: aiResultHTML }} />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-10 mt-14 no-print">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                 <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                    Daftar Data Tervalidasi
                 </h3>
                 <span className="px-4 py-1.5 bg-red-100 text-[#b10d11] rounded-full text-sm font-bold">{reports.filter(r => r.status === 'Disetujui').length} Laporan</span>
              </div>
              
              {reports.filter(r => r.status === 'Disetujui').length === 0 ? (
                 <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                   <div className="text-5xl mb-4 grayscale opacity-40">📄</div>
                   <p className="text-slate-500 font-bold text-lg">Belum ada laporan yang disetujui.</p>
                 </div>
              ) : (
                Array.from(new Set(reports.filter(r => r.status === 'Disetujui').map(r => r.minggu))).sort((a,b)=>a-b).map(minggu => (
                  <div key={minggu} className="p-8 sm:p-10 border border-slate-100 rounded-[2rem] bg-white shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-3 h-full bg-[#b10d11]"></div>
                    <h3 className="text-2xl font-extrabold text-slate-800 mb-8 flex items-center">
                       <Activity className="mr-3 text-[#b10d11]" size={28}/> Minggu ke-{minggu}
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {reports.filter(r => r.status === 'Disetujui' && r.minggu === minggu).map(lap => (
                         <div key={lap.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:shadow-md hover:border-red-100 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-[#b10d11] text-lg">{lap.bidang}</h4>
                                  <div className="text-xs font-semibold text-slate-400 mt-1">{lap.tanggal}</div>
                                </div>
                                <span className="text-xs font-extrabold text-red-800 bg-red-100 px-3 py-1.5 rounded-xl">{lap.jenis}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">{lap.deskripsi}</p>
                            
                            <div className="grid grid-cols-2 gap-4 mt-auto">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center"><Users size={14} className="mr-1.5"/> Kehadiran</div>
                                  <div className="font-extrabold text-slate-800 text-lg">{lap.jumlah} <span className="text-xs font-semibold text-slate-500">Orang</span></div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                                  <div className="text-xs font-bold text-red-400 mb-1.5 uppercase tracking-wider flex items-center"><AlertTriangle size={14} className="mr-1.5"/> Kendala</div>
                                  <div className="text-sm font-bold text-[#b10d11] line-clamp-1" title={lap.kendala}>{lap.kendala}</div>
                                </div>
                            </div>

                            {lap.dokumentasi !== '-' && (
                               <div className="mt-5 pt-5 border-t border-slate-200/60">
                                 <a href={lap.dokumentasi} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"><Camera size={16} className="mr-2"/> Lihat Dokumentasi</a>
                               </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}