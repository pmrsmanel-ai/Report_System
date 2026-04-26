import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusSquare, Lock, LogOut, Edit, Search, Settings, 
  Bot, FileText, Printer, Send, CheckCircle, XCircle, 
  Clock, Camera, Image as ImageIcon, Check, X, AlertTriangle,
  Users, Activity, Trash2, Calendar, Eye
} from 'lucide-react';

// Mengosongkan data dummy
const INITIAL_MOCK_DATA = [];

export default function App() {
  // --- STATE MANAGEMENT ---
  const [currentView, setCurrentView] = useState('koordinator');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [reports, setReports] = useState(INITIAL_MOCK_DATA);
  const [filterBidang, setFilterBidang] = useState('Semua');
  
  // Filter Tanggal untuk Laporan Pembina / Print
  const [filterDate, setFilterDate] = useState('');

  // Modal & Notification State
  const [notif, setNotif] = useState({ isOpen: false, message: '', bgColor: '' });
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'alert', resolve: null });
  const [modalInput, setModalInput] = useState('');
  
  // Detail View Report State
  const [selectedReport, setSelectedReport] = useState(null);

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
        id: d['ID Laporan'] || '-',
        minggu: d['Minggu Ke'] || d['Minggu'] || '-', // Mengatasi jika kolom "Minggu Ke" tidak terbaca
        bidang: d['Nama Bidang'] || '-',
        jenis: d['Jenis Kegiatan'] || '-',
        tanggal: d['Tanggal Kegiatan'] || d['Tanggal'] || '', // Mengatasi jika kolom "Tanggal" kosong
        status: d['Status'] || 'Menunggu',
        deskripsi: d['Deskripsi Kegiatan'] || '-',
        jumlah: d['Jumlah Anggota Terlibat'] || '0',
        kendala: d['Kendala'] || '-',
        dokumentasi: d['Dokumentasi'] || '-'
      }));
      if (formattedData.length > 0) {
        setReports(formattedData);
      }
    } catch (error) {
      console.warn('Mode Preview: API diblokir oleh CORS/Sandbox, menggunakan data simulasi lokal.', error);
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

  const handleDeleteReport = async (id) => {
    const confirmed = await showModalPromise({
      title: 'Hapus Laporan',
      message: 'Apakah Anda yakin ingin menghapus laporan ini secara permanen? Data yang dihapus juga akan hilang dari database.',
      type: 'confirm'
    });

    if (confirmed) {
      setReports(prev => prev.filter(r => r.id !== id));
      
      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'delete', id: id })
        });
        if (!response.ok) throw new Error('API Error');
        showNotif('Laporan berhasil dihapus secara permanen.', 'bg-slate-800');
      } catch (error) {
        console.warn('Mode Preview: Delete API diblokir, menghapus secara lokal.', error);
        showNotif('Mode Lokal: Laporan berhasil dihapus', 'bg-slate-800');
      }
    }
  };

  // Fungsi Helper untuk memfilter laporan yang disetujui berdasarkan tanggal spesifik
  const getFilteredApprovedReports = () => {
    return reports.filter(r => {
      if (r.status !== 'Disetujui') return false;
      if (filterDate && r.tanggal !== filterDate) return false;
      return true;
    });
  };

  const analyzeWithAI = () => {
    const approvedReports = getFilteredApprovedReports();
    if (approvedReports.length === 0) {
      showModalPromise({ title: 'Data Kosong', message: 'Belum ada laporan lapangan yang disetujui pada tanggal tersebut untuk dianalisis oleh AI.', type: 'alert' });
      return;
    }

    setIsAnalyzing(true);
    setAiResultHTML('');

    let listMinggu = new Set();
    let totalAnggota = 0;
    let daftarKendala = [];

    const detailKegiatanRows = approvedReports.map(r => {
      listMinggu.add(r.minggu || '-');
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

    const ringkasanDinamis = `Alhamdulillah, kegiatan ekstrakurikuler PMR pada minggu ke-${arrayMinggu} telah terlaksana dengan melibatkan bidang ${bidangList}. Fokus utama kegiatan minggu ini meliputi <b>${jenisList}</b>. Tingkat partisipasi anggota sangat baik dengan total kehadiran mencapai <b>${totalAnggota} orang</b> secara keseluruhan.`;
    
    const hasilDinamis = approvedReports.map(r => `<div style="margin-bottom: 4px;">- <b>${r.bidang}</b> berhasil melaksanakan kegiatan dengan partisipasi ${r.jumlah} anggota.</div>`).join('');
    
    const solusiDinamis = daftarKendala.length > 0
        ? `Pengurus dan Pembina perlu menindaklanjuti kendala lapangan yang dilaporkan oleh masing-masing bidang. Disarankan untuk mengadakan koordinasi internal, memastikan kesiapan sarana prasarana, serta mencari solusi atas hambatan operasional tersebut sebelum jadwal latihan berikutnya.`
        : `Tidak ada masalah berarti. Kinerja, kedisiplinan, dan kesiapan sarana prasarana sudah sangat baik dan perlu dipertahankan untuk minggu berikutnya.`;

    const dokumentasiHTML = approvedReports
      .filter(r => r.dokumentasi && r.dokumentasi !== '-')
      .map(r => `
        <div style="display: inline-block; width: 45%; margin: 2%; text-align: center; vertical-align: top; border: 1px solid #ddd; padding: 10px; background: #fff; box-sizing: border-box; border-radius: 8px;">
          <div style="height: 200px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px; border-radius: 4px; background: #f8f9fa;">
            <img src="${r.dokumentasi}" alt="Foto ${r.bidang}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
          <p style="margin: 0; font-size: 11pt; font-weight: bold; font-family: 'Times New Roman', serif; color: #b10d11;">${r.bidang}</p>
          <a href="${r.dokumentasi}" target="_blank" style="font-size: 9pt; font-family: 'Times New Roman', serif; color: #2563eb; text-decoration: none; margin-top: 4px; display: inline-block;">Buka Lampiran Asli</a>
        </div>
      `).join('');

    const dokumentasiSection = dokumentasiHTML.length > 0
      ? `<div style="text-align: center; margin-top: 15px;">${dokumentasiHTML}</div>`
      : `<p style="font-family: 'Times New Roman', serif; font-size: 12pt;">Tidak ada lampiran foto dokumentasi untuk minggu ini.</p>`;

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
        ${dokumentasiSection}
        
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
    
    setTimeout(() => {
      printWindow.print();
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
      <span className={`inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold border shadow-sm whitespace-nowrap ${color}`}>
        <Icon size={14} className="mr-1 sm:mr-1.5" /> {status}
      </span>
    );
  };

  // UI Classes for Startup Vibe (Responsive)
  const inputClass = "w-full p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b10d11]/10 focus:border-[#b10d11] transition-all text-slate-700 text-sm font-medium placeholder:text-slate-400";
  const labelClass = "block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2 ml-1";

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

      {/* --- MODAL GLOBAL --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-xl sm:text-2xl font-extrabold mb-3 text-slate-800 tracking-tight">{modal.title}</h3>
            <p className="text-sm mb-5 sm:mb-6 text-slate-500 font-medium leading-relaxed">{modal.message}</p>
            {modal.type === 'prompt' && (
              <input 
                type="password" autoFocus
                value={modalInput} onChange={(e) => setModalInput(e.target.value)}
                className={inputClass + " mb-5 sm:mb-6 bg-slate-50"} 
                placeholder="Masukkan password..." 
              />
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-2">
              {modal.type !== 'alert' && (
                <button onClick={handleModalCancel} className="w-full sm:w-auto px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-colors">Batal</button>
              )}
              <button onClick={handleModalConfirm} className="w-full sm:w-auto px-5 py-3 bg-[#b10d11] text-white font-bold rounded-xl sm:rounded-2xl hover:bg-[#8c0a0d] shadow-lg shadow-[#b10d11]/25 transition-all hover:-translate-y-0.5">Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DETAIL LAPORAN (VIEW REPORT) --- */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Detail Lengkap</h3>
              <button onClick={() => setSelectedReport(null)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Bidang</span>
                  <span className="font-bold text-[#b10d11] text-sm sm:text-base">{selectedReport.bidang}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Jenis Kegiatan</span>
                  <span className="font-bold text-slate-700 text-sm sm:text-base">{selectedReport.jenis}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Waktu Pelaksanaan</span>
                  <span className="font-bold text-slate-700 text-sm sm:text-base">Minggu ke-{selectedReport.minggu || '-'}</span>
                  <span className="block text-xs font-semibold text-slate-500 mt-0.5">{selectedReport.tanggal || 'Belum diatur'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Kehadiran Anggota</span>
                  <span className="font-bold text-slate-700 text-sm sm:text-base">{selectedReport.jumlah} <span className="text-xs font-medium text-slate-500">Orang</span></span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Deskripsi Kegiatan</span>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{selectedReport.deskripsi}</p>
              </div>

              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <span className="text-[10px] sm:text-xs font-bold text-red-400 uppercase tracking-wider block mb-1.5 flex items-center"><AlertTriangle size={12} className="mr-1.5"/> Kendala Lapangan</span>
                <p className="text-sm font-bold text-[#b10d11] leading-relaxed">{selectedReport.kendala}</p>
              </div>

              {selectedReport.dokumentasi && selectedReport.dokumentasi !== '-' && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <span className="text-xs font-bold text-blue-800 flex items-center"><Camera size={16} className="mr-2"/> Bukti Terlampir</span>
                  <a href={selectedReport.dokumentasi} target="_blank" rel="noreferrer" className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors text-center">Buka File Dokumentasi</a>
                </div>
              )}
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="w-full px-5 py-3.5 bg-slate-900 text-white font-bold rounded-xl sm:rounded-2xl hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/20">Tutup Detail</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING NAVBAR --- */}
      <div className="sticky top-4 sm:top-6 z-40 px-3 sm:px-6 no-print">
        <nav className="max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-full shadow-lg px-3 sm:px-6 py-2.5 sm:py-3 transition-all duration-300">
          <div className="flex justify-between items-center h-10 sm:h-12">
            <div className="flex items-center space-x-2 sm:space-x-3 group cursor-pointer" onClick={() => !isAdminLoggedIn && setCurrentView('koordinator')}>
              <div className="bg-[#b10d11] p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-white shadow-md shadow-[#b10d11]/20 group-hover:rotate-12 group-hover:scale-110 transition-all">
                <PlusSquare size={18} strokeWidth={3} className="sm:w-5 sm:h-5"/>
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#b10d11] hidden md:block">
                PMR SMANEL
              </span>
            </div>
            <div className="flex space-x-1 text-xs sm:text-sm font-bold">
              {!isAdminLoggedIn ? (
                <>
                  <button onClick={() => setCurrentView('koordinator')} className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all whitespace-nowrap ${currentView==='koordinator' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Form<span className="hidden sm:inline"> Laporan</span></button>
                  <button onClick={() => setCurrentView('status')} className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all whitespace-nowrap ${currentView==='status' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Status</button>
                  <button onClick={handleLoginAdmin} className="ml-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20 transition-all flex items-center hover:-translate-y-0.5"><Lock size={14} className="sm:mr-1.5"/><span className="hidden sm:inline">Admin</span></button>
                </>
              ) : (
                <>
                  <button onClick={() => setCurrentView('admin')} className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all whitespace-nowrap ${currentView==='admin' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Rekap<span className="hidden sm:inline"> Laporan</span></button>
                  <button onClick={() => setCurrentView('pembina')} className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all whitespace-nowrap ${currentView==='pembina' ? 'bg-red-50 text-[#b10d11] shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Dasbor AI</button>
                  <button onClick={handleLogoutAdmin} className="ml-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-[#b10d11] transition-colors flex items-center justify-center"><LogOut size={16} className="sm:mr-1.5"/><span className="hidden sm:inline">Keluar</span></button>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pt-8 sm:pt-10 print-area">
        
        {/* STARTUP HERO SECTION */}
        <div className="text-center mb-10 sm:mb-14 mt-2 sm:mt-4 no-print animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="inline-flex items-center space-x-2 bg-[#8c0a0d]/80 backdrop-blur-md border border-[#8c0a0d] shadow-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 cursor-default hover:bg-[#b10d11] transition-colors">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-300"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-red-100 uppercase tracking-wider">Sistem Digitalisasi PMR</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4 sm:mb-5 leading-tight">
            PMR SMANEL <br className="hidden sm:block"/>
            <span className="text-red-200">
              REPORT SYSTEM
            </span>
          </h1>
          <p className="text-red-100/90 font-medium text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            Catat kegiatan rutin, pantau keaktifan anggota, dan evaluasi hasil lapangan dengan efisien menggunakan asisten AI terpadu.
          </p>
        </div>

        {/* NOTIFICATION FLOATING */}
        {notif.isOpen && (
          <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`${notif.bgColor} text-white px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-black/20 font-bold flex items-center text-sm sm:text-base`}>
              <CheckCircle size={20} className="mr-2 sm:mr-3 opacity-90"/>
              {notif.message}
            </div>
          </div>
        )}

        {/* ================= VIEW: KOORDINATOR ================= */}
        {currentView === 'koordinator' && (
          <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2">Form Kegiatan</h2>
                <p className="text-slate-500 font-medium text-xs sm:text-sm">Isi data laporan mingguan bidang Anda dengan lengkap.</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-red-50 rounded-2xl border border-red-100 shadow-sm items-center justify-center text-3xl rotate-3 hover:-rotate-3 transition-transform">
                📝
              </div>
            </div>
            
            <form id="form-laporan" onSubmit={handleSubmitReport}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-8">
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
                  <input type="text" id="minggu" value={formData.minggu ? `Minggu ke-${formData.minggu}` : ''} readOnly placeholder="Otomatis terisi..." className="w-full p-3 sm:p-4 bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-slate-400 cursor-not-allowed text-sm font-semibold" />
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
                    <input type="number" id="jumlah" min="1" required onChange={handleFormChange} className={inputClass + " pl-10 sm:pl-12"} placeholder="0" />
                    <Users className="absolute left-3 sm:left-4 top-3.5 sm:top-4 text-slate-400" size={18} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Unggah Bukti Kegiatan *</label>
                  <input type="file" id="dokumentasi" accept="image/*" required onChange={handleFormChange} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-[#b10d11] hover:file:bg-red-100 transition-all cursor-pointer text-slate-500" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className={labelClass}>Catatan & Kendala Lapangan *</label>
                  <textarea id="kendala" rows="2" required onChange={handleFormChange} placeholder="Tuliskan hambatan yang dialami (atau tulis 'Tidak ada kendala' jika lancar)..." className={inputClass}></textarea>
                </div>
              </div>
              <div className="mt-8 sm:mt-12 flex justify-end pt-5 sm:pt-6 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting} className={`w-full sm:w-auto justify-center bg-[#b10d11] hover:bg-[#8c0a0d] text-white font-bold py-3.5 sm:py-4 px-8 sm:px-10 rounded-xl sm:rounded-2xl shadow-lg shadow-[#b10d11]/30 flex items-center transition-all hover:-translate-y-1 ${isSubmitting && 'opacity-70 cursor-not-allowed hover:translate-y-0 shadow-none'}`}>
                  {isSubmitting ? <><Clock className="animate-spin mr-2 sm:mr-3" size={18}/> Memproses...</> : <><Send className="mr-2 sm:mr-3" size={18}/> Kirim Laporan</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= VIEW: CEK STATUS KOORDINATOR ================= */}
        {currentView === 'status' && (
          <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2">Status Laporan</h2>
                <p className="text-slate-500 font-medium text-xs sm:text-sm">Pantau proses persetujuan laporan yang telah Anda kirim.</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm items-center justify-center text-3xl -rotate-3 hover:rotate-3 transition-transform">
                🔍
              </div>
            </div>
            
            <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <label className="text-xs sm:text-sm font-bold text-slate-700 shrink-0">Filter Bidang:</label>
              <select value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)} className="w-full sm:w-72 p-2.5 sm:p-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs sm:text-sm font-bold text-slate-700 cursor-pointer shadow-sm">
                <option value="Semua">Semua Bidang Tampil</option>
                <option value="Pertolongan Pertama">Pertolongan Pertama</option>
                <option value="Perawatan Keluarga">Perawatan Keluarga</option>
                <option value="Pasang Bongkar Tenda">Pasang Bongkar Tenda</option>
                <option value="Tandu">Tandu</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm -mx-4 sm:mx-0">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400 whitespace-nowrap">Timeline</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400">Bidang</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400">Kegiatan</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingData ? (
                    <tr>
                      <td colSpan="4" className="p-8 sm:p-12 text-center text-slate-500 font-medium text-sm">
                        <Clock className="animate-spin inline mr-2" size={16}/> Mengambil data...
                      </td>
                    </tr>
                  ) : reports.filter(r => filterBidang === 'Semua' || r.bidang === filterBidang).map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 sm:p-5 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">Minggu {row.minggu || '-'}</div>
                        <div className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1 flex items-center"><Clock size={10} className="mr-1"/> {row.tanggal || 'Belum diatur'}</div>
                      </td>
                      <td className="p-4 sm:p-5 font-bold text-[#b10d11] text-xs sm:text-sm">{row.bidang}</td>
                      <td className="p-4 sm:p-5 text-xs sm:text-sm font-medium text-slate-600">{row.jenis}</td>
                      <td className="p-4 sm:p-5 text-center">{renderStatusBadge(row.status)}</td>
                    </tr>
                  ))}
                  {reports.filter(r => filterBidang === 'Semua' || r.bidang === filterBidang).length === 0 && !isLoadingData && (
                    <tr>
                      <td colSpan="4" className="p-10 sm:p-16 text-center">
                         <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 grayscale opacity-50">📂</div>
                         <div className="text-slate-500 font-bold text-base sm:text-lg">Belum ada laporan.</div>
                         <div className="text-slate-400 text-xs sm:text-sm mt-1">Data yang sesuai filter tidak ditemukan.</div>
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
          <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 pb-5 sm:pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-1 sm:mb-2">Panel Validasi Admin</h2>
                <p className="text-slate-500 font-medium text-xs sm:text-sm">Review dan berikan persetujuan untuk laporan yang masuk.</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 shadow-sm items-center justify-center text-3xl rotate-6 hover:-rotate-6 transition-transform">
                🛡️
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm -mx-4 sm:mx-0">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400 whitespace-nowrap">Timeline</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400">Bidang</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400">Detail Kegiatan</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400 whitespace-nowrap">Status</th>
                    <th className="p-4 sm:p-5 text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-slate-400 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingData ? (
                    <tr>
                      <td colSpan="5" className="p-8 sm:p-12 text-center text-slate-500 font-medium text-sm">
                        <Clock className="animate-spin inline mr-2" size={16}/> Memuat data...
                      </td>
                    </tr>
                  ) : reports.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 sm:p-5 font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">Mg ke-{row.minggu || '-'}</td>
                      <td className="p-4 sm:p-5 font-bold text-[#b10d11] text-xs sm:text-sm">{row.bidang}</td>
                      <td className="p-4 sm:p-5">
                        <div className="text-xs sm:text-sm font-bold text-slate-700 leading-tight">{row.jenis}</div>
                        <div className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1 mb-1.5 sm:mb-2">{row.tanggal || 'Belum diatur'}</div>
                      </td>
                      <td className="p-4 sm:p-5">{renderStatusBadge(row.status)}</td>
                      <td className="p-4 sm:p-5 text-center">
                        <div className="flex justify-center space-x-1.5 sm:space-x-2">
                          <button onClick={() => setSelectedReport(row)} className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-lg sm:rounded-xl transition-all border border-blue-100 hover:shadow-md hover:-translate-y-0.5" title="Detail Laporan"><Eye size={16} strokeWidth={2.5}/></button>
                          <button onClick={() => handleUbahStatus(row.id, 'Disetujui')} className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg sm:rounded-xl transition-all border border-emerald-100 hover:shadow-md hover:-translate-y-0.5" title="Setujui"><Check size={16} strokeWidth={2.5}/></button>
                          <button onClick={() => handleUbahStatus(row.id, 'Revisi')} className="p-2 sm:p-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg sm:rounded-xl transition-all border border-red-100 hover:shadow-md hover:-translate-y-0.5" title="Revisi"><X size={16} strokeWidth={2.5}/></button>
                          <button onClick={() => handleDeleteReport(row.id)} className="p-2 sm:p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-800 hover:text-white rounded-lg sm:rounded-xl transition-all border border-slate-200 hover:shadow-md hover:-translate-y-0.5" title="Hapus"><Trash2 size={16} strokeWidth={2.5}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && !isLoadingData && (
                     <tr>
                      <td colSpan="5" className="p-10 sm:p-16 text-center">
                         <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 grayscale opacity-50">📥</div>
                         <div className="text-slate-500 font-bold text-base sm:text-lg">Inbox Kosong.</div>
                         <div className="text-slate-400 text-xs sm:text-sm mt-1">Belum ada laporan baru yang dikirimkan.</div>
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
          <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl sm:rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-10 sm:mb-12 pb-6 sm:pb-8 border-b border-slate-100 relative">
              <div className="inline-flex bg-[#b10d11] p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] mb-4 sm:mb-6 shadow-xl shadow-[#b10d11]/20 rotate-3">
                <FileText className="text-white sm:w-10 sm:h-10" size={32} strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-800 leading-tight">Laporan Evaluasi PMR</h1>
              <p className="text-slate-500 mt-2 sm:mt-3 font-medium text-sm sm:text-lg">Ringkasan Eksekutif berbasis AI & Data Terpadu</p>
            </div>
            
            {/* Filter Tanggal AI & Print */}
            <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-end gap-4 no-print shadow-sm">
              <div className="w-full sm:w-auto">
                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5"><Calendar size={12} className="inline mr-1"/> Pilih Tanggal</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-[#b10d11] transition-all text-xs sm:text-sm font-medium text-slate-700" />
              </div>
              <div className="w-full sm:w-auto flex gap-2">
                <button onClick={() => { setFilterDate(''); setAiResultHTML(''); }} className="w-full sm:w-auto px-4 py-2.5 sm:py-3 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-colors text-xs sm:text-sm">Reset</button>
              </div>
            </div>

            <div className="mb-8 sm:mb-10 no-print flex flex-col sm:flex-row justify-center sm:justify-end gap-3 sm:gap-4">
              <button onClick={analyzeWithAI} disabled={isAnalyzing} className="w-full sm:w-auto justify-center bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-slate-900/20 flex items-center transition-all hover:-translate-y-1 disabled:opacity-70 disabled:transform-none disabled:shadow-none text-sm sm:text-base">
                {isAnalyzing ? <Bot className="animate-pulse mr-2 sm:mr-2.5 sm:w-5 sm:h-5" size={18} /> : <Bot className="mr-2 sm:mr-2.5 sm:w-5 sm:h-5" size={18} />}
                {isAnalyzing ? 'Menyusun Laporan...' : 'Susun dengan AI'}
              </button>
              {aiResultHTML && (
                <>
                  <button onClick={exportHTMLToWord} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/20 flex items-center transition-all hover:-translate-y-1 text-sm sm:text-base">
                    <FileText className="mr-2 sm:mr-2.5" size={18}/> Unduh .DOC
                  </button>
                  <button onClick={handlePrint} className="w-full sm:w-auto justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-sm flex items-center transition-all hover:-translate-y-1 text-sm sm:text-base">
                    <Printer className="mr-2 sm:mr-2.5" size={18}/> Cetak PDF
                  </button>
                </>
              )}
            </div>

            {/* Container Hasil Analisis AI */}
            {(isAnalyzing || aiResultHTML) && (
              <div className="mb-10 sm:mb-12 p-6 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-50 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 mb-5 sm:mb-6 flex items-center">
                  <span className="bg-slate-800 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl mr-2.5 sm:mr-3"><Bot size={18} className="sm:w-5 sm:h-5"/></span> Dokumen Final AI
                </h3>
                
                <div ref={aiContentRef} className="text-slate-800 leading-relaxed bg-white p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 relative z-10 overflow-x-auto">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 sm:py-16 opacity-70">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 sm:mb-6 animate-pulse">
                         <Bot className="text-[#b10d11] sm:w-10 sm:h-10" size={32} />
                      </div>
                      <p className="text-[#b10d11] font-bold text-sm sm:text-lg animate-pulse text-center">Merangkum Data Lapangan SMANEL...</p>
                    </div>
                  ) : (
                    <div className="prose max-w-none text-xs sm:text-sm md:text-base" dangerouslySetInnerHTML={{ __html: aiResultHTML }} />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-8 sm:space-y-10 mt-10 sm:mt-14 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 sm:pb-4 gap-3 sm:gap-0">
                 <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center">
                    Daftar Data Tervalidasi
                 </h3>
                 <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-red-100 text-[#b10d11] rounded-full text-xs sm:text-sm font-bold w-fit">{getFilteredApprovedReports().length} Laporan Ditemukan</span>
              </div>
              
              {getFilteredApprovedReports().length === 0 ? (
                 <div className="text-center py-12 sm:py-16 bg-slate-50 rounded-3xl sm:rounded-[2rem] border-2 border-dashed border-slate-200">
                   <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 grayscale opacity-40">📄</div>
                   <p className="text-slate-500 font-bold text-sm sm:text-lg">Belum ada laporan yang disetujui pada tanggal tersebut.</p>
                 </div>
              ) : (
                Array.from(new Set(getFilteredApprovedReports().map(r => r.minggu))).sort((a,b)=>a-b).map(minggu => (
                  <div key={minggu} className="p-6 sm:p-8 md:p-10 border border-slate-100 rounded-3xl sm:rounded-[2rem] bg-white shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 sm:w-3 h-full bg-[#b10d11]"></div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-6 sm:mb-8 flex items-center">
                       <Activity className="mr-2 sm:mr-3 text-[#b10d11] sm:w-7 sm:h-7" size={24} /> Minggu ke-{minggu || '-'}
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                      {getFilteredApprovedReports().filter(r => r.minggu === minggu).map(lap => (
                         <div key={lap.id} className="bg-slate-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 hover:shadow-md hover:border-red-100 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                <div>
                                  <h4 className="font-bold text-[#b10d11] text-base sm:text-lg leading-tight">{lap.bidang}</h4>
                                  <div className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1">{lap.tanggal || 'Belum diatur'}</div>
                                </div>
                                <span className="text-[10px] sm:text-xs font-extrabold text-red-800 bg-red-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-center shrink-0 ml-2">{lap.jenis}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 mb-5 sm:mb-6 leading-relaxed font-medium">{lap.deskripsi}</p>
                            
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-auto">
                                <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                  <div className="text-[10px] sm:text-xs font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-wider flex items-center"><Users size={12} className="mr-1 sm:mr-1.5"/> Kehadiran</div>
                                  <div className="font-extrabold text-slate-800 text-base sm:text-lg leading-none">{lap.jumlah} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">Orang</span></div>
                                </div>
                                <div className="bg-red-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center">
                                  <div className="text-[10px] sm:text-xs font-bold text-red-400 mb-1 sm:mb-1.5 uppercase tracking-wider flex items-center"><AlertTriangle size={12} className="mr-1 sm:mr-1.5"/> Kendala</div>
                                  <div className="text-xs sm:text-sm font-bold text-[#b10d11] line-clamp-2 leading-tight" title={lap.kendala}>{lap.kendala}</div>
                                </div>
                            </div>

                            {lap.dokumentasi && lap.dokumentasi !== '-' && (
                               <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-200/60">
                                 <a href={lap.dokumentasi} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"><Camera size={14} className="mr-1.5 sm:mr-2"/> Lihat Dokumentasi</a>
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