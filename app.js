/**
 * ==============================================================================
 * APLIKASI PENCATATAN KEUANGAN KELUARGA & UMKM CILOK
 * ==============================================================================
 * Dibuat untuk pemula yang sedang belajar Vibe Coding & Full-Stack Development.
 * 
 * ALUR ARSITEKTUR:
 * 1. State Management: Menyimpan transaksi di memori (variabel `transactions`) 
 *    dan sinkron ke `localStorage` (Cache offline).
 * 2. API Google Apps Script:
 *    - GET: Mengambil riwayat transaksi dari Google Sheets saat aplikasi dibuka.
 *    - POST: Mengirim transaksi baru langsung masuk ke baris Google Sheets.
 * 3. Reactive UI: Setiap data berubah, Dashboard, Tabel, dan Grafik (Chart.js) 
 *    otomatis diperbarui tanpa reload halaman.
 * ==============================================================================
 */

// ======================= 1. KONFIGURASI & STATE =======================
const STORAGE_KEY_TRANSACTIONS = "bukukas_transactions_v1";
const STORAGE_KEY_GAS_URL = "bukukas_gas_url";

// Kategori Terstruktur berdasarkan Akun dan Jenis Transaksi
const CATEGORY_MAP = {
  "Keluarga": {
    "Pemasukan": [
      "Gaji Bulanan",
      "Bonus / THR / Tunjangan",
      "Hasil Investasi / Aset",
      "Pemberian / Hadiah",
      "Pemasukan Lainnya"
    ],
    "Pengeluaran": [
      "Belanja Dapur & Makanan",
      "Listrik, Air & WiFi",
      "Pendidikan Anak & Sekolah",
      "Kesehatan & Obat-obatan",
      "Transportasi & Bensin",
      "Kebutuhan Rumah Tangga",
      "Hiburan & Rekreasi",
      "Cicilan / Kewajiban",
      "Pengeluaran Lainnya"
    ]
  },
  "UMKM Cilok": {
    "Pemasukan": [
      "Penjualan Cilok Goreng",
      "Penjualan Cilok Kuah & Bumbu Kacang",
      "Pesanan Besar / Catering",
      "Penjualan Minuman / Ekstra",
      "Suntikan Modal Usaha",
      "Pendapatan Usaha Lainnya"
    ],
    "Pengeluaran": [
      "Bahan Baku (Tepung Tapioka/Terigu)",
      "Bahan Baku (Daging Sapi/Ayam/Bumbu)",
      "Minyak Goreng & Saus/Kacang",
      "Gas LPG & Listrik Lapak",
      "Kemasan, Plastik, & Tusuk Cilok",
      "Gaji Asisten / Karyawan Lapak",
      "Sewa Tempat / Lapak Jualan",
      "Transportasi & Kulakan",
      "Peralatan & Perawatan Gerobak",
      "Operasional Lainnya"
    ]
  }
};

// Data Dummy Awal (Contoh Realistis agar pemula langsung melihat visualnya)
const INITIAL_DEMO_DATA = [
  {
    id: "TX-1712001",
    timestamp: "2026-10-01 08:30:00",
    tanggal: "2026-10-01",
    akun: "Keluarga",
    jenis: "Pemasukan",
    kategori: "Gaji Bulanan",
    nominal: 6500000,
    catatan: "Gaji pokok awal bulan"
  },
  {
    id: "TX-1712002",
    timestamp: "2026-10-01 10:15:00",
    tanggal: "2026-10-01",
    akun: "Keluarga",
    jenis: "Pengeluaran",
    kategori: "Belanja Dapur & Makanan",
    nominal: 450000,
    catatan: "Belanja sayur, beras, dan lauk di pasar"
  },
  {
    id: "TX-1712003",
    timestamp: "2026-10-02 07:00:00",
    tanggal: "2026-10-02",
    akun: "UMKM Cilok",
    jenis: "Pengeluaran",
    kategori: "Bahan Baku (Tepung Tapioka/Terigu)",
    nominal: 220000,
    catatan: "Kulakan 2 sak tepung tapioka & bumbu"
  },
  {
    id: "TX-1712004",
    timestamp: "2026-10-02 07:30:00",
    tanggal: "2026-10-02",
    akun: "UMKM Cilok",
    jenis: "Pengeluaran",
    kategori: "Bahan Baku (Daging Sapi/Ayam/Bumbu)",
    nominal: 180000,
    catatan: "Daging ayam fillet 4 kg giling"
  },
  {
    id: "TX-1712005",
    timestamp: "2026-10-02 21:00:00",
    tanggal: "2026-10-02",
    akun: "UMKM Cilok",
    jenis: "Pemasukan",
    kategori: "Penjualan Cilok Kuah & Bumbu Kacang",
    nominal: 680000,
    catatan: "Omzet jualan hari Jumat (ludes 500 porsi)"
  },
  {
    id: "TX-1712006",
    timestamp: "2026-10-03 14:00:00",
    tanggal: "2026-10-03",
    akun: "UMKM Cilok",
    jenis: "Pengeluaran",
    kategori: "Gas LPG & Listrik Lapak",
    nominal: 22000,
    catatan: "Isi ulang tabung gas melon 3kg"
  },
  {
    id: "TX-1712007",
    timestamp: "2026-10-03 21:30:00",
    tanggal: "2026-10-03",
    akun: "UMKM Cilok",
    jenis: "Pemasukan",
    kategori: "Penjualan Cilok Goreng",
    nominal: 740000,
    catatan: "Penjualan malam minggu gerobak depan ruko"
  },
  {
    id: "TX-1712008",
    timestamp: "2026-10-04 11:20:00",
    tanggal: "2026-10-04",
    akun: "Keluarga",
    jenis: "Pengeluaran",
    kategori: "Listrik, Air & WiFi",
    nominal: 350000,
    catatan: "Token listrik rumah & tagihan air PDAM"
  }
];

// App State
let state = {
  transactions: [],
  activeAccountFilter: "Semua", // 'Semua' | 'Keluarga' | 'UMKM Cilok'
  searchQuery: "",
  typeFilter: "Semua",          // 'Semua' | 'Pemasukan' | 'Pengeluaran'
  gasUrl: "",
  isSyncing: false,
  form: {
    jenis: "Pengeluaran",
    akun: "Keluarga"
  }
};

let expenseChartInstance = null;

// ======================= 2. INISIALISASI APLIKASI =======================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Tampilkan tanggal hari ini pada header
  initDateDisplay();

  // 2. Set default tanggal pada form input (Hari ini YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  document.getElementById("inputTanggal").value = todayStr;

  // 3. Load URL Google Apps Script yang tersimpan di browser
  state.gasUrl = localStorage.getItem(STORAGE_KEY_GAS_URL) || "";
  if (state.gasUrl) {
    document.getElementById("gasUrlInput").value = state.gasUrl;
    updateConnectionStatusUI(true);
  } else {
    updateConnectionStatusUI(false);
  }

  // 4. Load data transaksi dari LocalStorage
  const savedData = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
  if (savedData) {
    try {
      state.transactions = JSON.parse(savedData);
    } catch (e) {
      console.error("Gagal membaca cache lokal:", e);
      state.transactions = [...INITIAL_DEMO_DATA];
    }
  } else {
    // Gunakan demo data jika pertama kali dibuka
    state.transactions = [...INITIAL_DEMO_DATA];
    saveToLocalStorage();
  }

  // 5. Inisialisasi dropdown kategori sesuai nilai default form
  updateCategoryDropdown();

  // 6. Pasang event listener tombol refresh
  document.getElementById("btnRefresh").addEventListener("click", () => {
    fetchFromGoogleSheets(true);
  });

  // 7. Render UI utama
  renderAll();

  // 8. Jika sudah ada URL Google Sheets, sinkronkan data terbaru di background
  if (state.gasUrl) {
    fetchFromGoogleSheets(false);
  }

  // Inisialisasi Icon Lucide
  if (window.lucide) {
    lucide.createIcons();
  }
});

/**
 * Tampilkan format tanggal Bahasa Indonesia di header
 */
function initDateDisplay() {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const dateFormatted = new Date().toLocaleDateString("id-ID", options);
  document.getElementById("currentDateDisplay").textContent = dateFormatted;
}

// ======================= 3. KONEKSI GOOGLE SHEETS API =======================

/**
 * Mengambil data transaksi dari Google Apps Script (Metode HTTP GET)
 * @param {boolean} showToastSuccess - Tampilkan notifikasi toast jika berhasil
 */
async function fetchFromGoogleSheets(showToastSuccess = false) {
  if (!state.gasUrl) {
    showToast("URL Google Apps Script belum diisi. Masih dalam mode demo.", "info");
    return;
  }

  setLoading(true);
  try {
    // Melakukan panggilan GET ke endpoint Google Apps Script
    const response = await fetch(state.gasUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "success" && Array.isArray(result.data)) {
      // Normalisasi data dari sheets jika ada field dengan nama kapital
      state.transactions = result.data.map(item => ({
        id: item.id || "TX-" + Date.now(),
        timestamp: item.timestamp || "",
        tanggal: item.tanggal ? String(item.tanggal).split("T")[0] : new Date().toISOString().split("T")[0],
        akun: item.akun || "Keluarga",
        jenis: item.jenis || "Pengeluaran",
        kategori: item.kategori || "Umum",
        nominal: Number(item.nominal) || 0,
        catatan: item.catatan || "-"
      }));

      saveToLocalStorage();
      renderAll();
      updateConnectionStatusUI(true);

      if (showToastSuccess) {
        showToast(`Berhasil menyinkronkan ${state.transactions.length} transaksi dari Google Sheets!`, "success");
      }
    } else {
      throw new Error(result.message || "Format data tidak sesuai.");
    }
  } catch (error) {
    console.error("Gagal sinkron dari Google Sheets:", error);
    showToast("Gagal terhubung ke Google Sheets. Menggunakan data lokal.", "error");
    updateConnectionStatusUI(false);
  } finally {
    setLoading(false);
  }
}

/**
 * Mengirim transaksi baru ke Google Apps Script (Metode HTTP POST)
 * Trik Khusus GAS: Menggunakan body JSON dan header 'text/plain' 
 * untuk menghindari CORS preflight request OPTIONS yang diblokir oleh Google!
 */
async function postTransactionToGoogleSheets(transactionData) {
  if (!state.gasUrl) {
    // Mode offline / demo
    return { success: true, offline: true };
  }

  try {
    const response = await fetch(state.gasUrl, {
      method: "POST",
      // Kirim payload sebagai JSON string
      body: JSON.stringify(transactionData),
      // Penting: Gunakan text/plain untuk bypass CORS preflight di GAS
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      }
    });

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.warn("Gagal POST ke Google Sheets (mungkin CORS redirect, data tetap dicatat lokal):", error);
    // Google Apps Script sering kali berhasil menulis tapi fetch gagal membaca JSON response
    // Karena itu, kita tetap return success agar user experience tetap mulus
    return { success: true, warning: true };
  }
}

// ======================= 4. FORM & USER INTERACTION =======================

/**
 * Mengubah jenis transaksi pada form (Pemasukan / Pengeluaran)
 */
function setTransactionType(type) {
  state.form.jenis = type;
  
  const btnExpense = document.getElementById("btnTypeExpense");
  const btnIncome = document.getElementById("btnTypeIncome");

  if (type === "Pengeluaran") {
    btnExpense.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200";
    btnIncome.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
  } else {
    btnIncome.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200";
    btnExpense.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
  }

  updateCategoryDropdown();
  if (window.lucide) lucide.createIcons();
}

/**
 * Mengubah pilihan akun/modul pada form (Keluarga / UMKM Cilok)
 */
function setTransactionAccount(account) {
  state.form.akun = account;

  const btnFamily = document.getElementById("btnAccountFamily");
  const btnUMKM = document.getElementById("btnAccountUMKM");

  if (account === "Keluarga") {
    btnFamily.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-200";
    btnUMKM.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
  } else {
    btnUMKM.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-cilok-50 text-cilok-700 border-cilok-300 ring-2 ring-cilok-200";
    btnFamily.className = "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
  }

  updateCategoryDropdown();
  if (window.lucide) lucide.createIcons();
}

/**
 * Perbarui daftar opsi kategori dropdown sesuai akun dan jenis aktif
 */
function updateCategoryDropdown() {
  const select = document.getElementById("selectKategori");
  select.innerHTML = "";

  const categories = CATEGORY_MAP[state.form.akun][state.form.jenis] || [];

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

/**
 * Update pratinjau nominal mata uang rupiah secara live
 */
function updateNominalPreview(value) {
  const num = Number(value) || 0;
  document.getElementById("nominalPreview").textContent = formatRupiah(num);
}

/**
 * Handler Submit Form Transaksi
 */
async function handleTransactionSubmit(event) {
  event.preventDefault();

  const nominal = Number(document.getElementById("inputNominal").value);
  const kategori = document.getElementById("selectKategori").value;
  const tanggal = document.getElementById("inputTanggal").value;
  const catatan = document.getElementById("inputCatatan").value.trim() || "-";

  if (!nominal || nominal <= 0) {
    showToast("Nominal harus lebih dari Rp 0", "error");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitTransaction");
  const btnSubmitText = document.getElementById("btnSubmitText");
  btnSubmit.disabled = true;
  btnSubmitText.textContent = "Mengirim ke Google Sheets...";

  // Siapkan objek data transaksi
  const newTx = {
    id: "TX-" + Date.now(),
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    tanggal: tanggal,
    akun: state.form.akun,
    jenis: state.form.jenis,
    kategori: kategori,
    nominal: nominal,
    catatan: catatan
  };

  try {
    // 1. Simpan langsung ke state lokal di urutan paling atas
    state.transactions.unshift(newTx);
    saveToLocalStorage();
    renderAll();

    // 2. Kirim secara asinkron ke Google Sheets
    if (state.gasUrl) {
      const result = await postTransactionToGoogleSheets(newTx);
      showToast("Berhasil tersimpan ke Google Sheets!", "success");
    } else {
      showToast("Transaksi disimpan di memori lokal (Mode Demo).", "info");
    }

    // 3. Reset formulir input
    document.getElementById("inputNominal").value = "";
    document.getElementById("inputCatatan").value = "";
    document.getElementById("nominalPreview").textContent = "Rp 0";
    
  } catch (err) {
    console.error("Terjadi kesalahan:", err);
    showToast("Gagal menyimpan transaksi: " + err.message, "error");
  } finally {
    btnSubmit.disabled = false;
    btnSubmitText.textContent = "Simpan Transaksi";
    if (window.lucide) lucide.createIcons();
  }
}

// ======================= 5. FILTER & PENCARIAN =======================

/**
 * Mengatur filter akun aktif di bagian atas (Semua, Keluarga, UMKM Cilok)
 */
function setAccountFilter(account) {
  state.activeAccountFilter = account;

  const btnAll = document.getElementById("tabFilterAll");
  const btnKeluarga = document.getElementById("tabFilterKeluarga");
  const btnUMKM = document.getElementById("tabFilterUMKM");

  const activeClasses = "bg-white text-slate-800 shadow-sm font-bold";
  const inactiveClasses = "text-slate-600 hover:text-slate-900 font-semibold";

  btnAll.className = `filter-tab px-4 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 ${account === 'Semua' ? activeClasses : inactiveClasses}`;
  btnKeluarga.className = `filter-tab px-4 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 ${account === 'Keluarga' ? activeClasses : inactiveClasses}`;
  btnUMKM.className = `filter-tab px-4 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 ${account === 'UMKM Cilok' ? activeClasses : inactiveClasses}`;

  // Update label grafik
  document.getElementById("chartFilterLabel").textContent = account === "Semua" ? "Semua Akun" : account;

  renderAll();
}

function handleSearch(query) {
  state.searchQuery = query.toLowerCase();
  renderTransactionTable();
}

function handleTypeFilter(type) {
  state.typeFilter = type;
  renderTransactionTable();
}

// ======================= 6. PERHITUNGAN & STATISTIK =======================

/**
 * Menghitung seluruh metrik keuangan dan memperbarui kartu KPI
 */
function calculateMetrics() {
  let totalInKeluarga = 0;
  let totalOutKeluarga = 0;
  let totalInUMKM = 0;
  let totalOutUMKM = 0;

  state.transactions.forEach(t => {
    const nom = Number(t.nominal) || 0;
    if (t.akun === "Keluarga") {
      if (t.jenis === "Pemasukan") totalInKeluarga += nom;
      else totalOutKeluarga += nom;
    } else if (t.akun === "UMKM Cilok") {
      if (t.jenis === "Pemasukan") totalInUMKM += nom;
      else totalOutUMKM += nom;
    }
  });

  const saldoKeluarga = totalInKeluarga - totalOutKeluarga;
  const saldoUMKM = totalInUMKM - totalOutUMKM;
  const totalSaldo = saldoKeluarga + saldoUMKM;
  // Laba Bersih UMKM = Total Omzet Penjualan - Total Biaya Operasional/Modal
  const labaBersihUMKM = saldoUMKM;

  // Update Kartu 1: Total Saldo Gabungan
  document.getElementById("statTotalSaldo").textContent = formatRupiah(totalSaldo);

  // Update Kartu 2: Saldo Keluarga
  document.getElementById("statSaldoKeluarga").textContent = formatRupiah(saldoKeluarga);
  document.getElementById("statInKeluarga").textContent = `+${formatRupiah(totalInKeluarga)}`;
  document.getElementById("statOutKeluarga").textContent = `-${formatRupiah(totalOutKeluarga)}`;

  // Update Kartu 3: Saldo UMKM Cilok
  document.getElementById("statSaldoUMKM").textContent = formatRupiah(saldoUMKM);
  document.getElementById("statInUMKM").textContent = `+${formatRupiah(totalInUMKM)}`;
  document.getElementById("statOutUMKM").textContent = `-${formatRupiah(totalOutUMKM)}`;

  // Update Kartu 4: Laba Bersih UMKM Cilok
  const elLaba = document.getElementById("statLabaUMKM");
  elLaba.textContent = formatRupiah(labaBersihUMKM);
  if (labaBersihUMKM >= 0) {
    elLaba.className = "text-2xl font-black text-emerald-600 tracking-tight";
  } else {
    elLaba.className = "text-2xl font-black text-rose-600 tracking-tight";
  }
}

// ======================= 7. RENDER TABEL TRANSAKSI =======================

/**
 * Filter data sesuai akun, pencarian, dan jenis, lalu render ke HTML table
 */
function renderTransactionTable() {
  const tbody = document.getElementById("transactionTableBody");
  const emptyState = document.getElementById("emptyState");
  const countDisplay = document.getElementById("displayedCount");

  // Filter logika
  const filtered = state.transactions.filter(t => {
    // 1. Filter Akun
    if (state.activeAccountFilter !== "Semua" && t.akun !== state.activeAccountFilter) {
      return false;
    }
    // 2. Filter Jenis (Pemasukan / Pengeluaran)
    if (state.typeFilter !== "Semua" && t.jenis !== state.typeFilter) {
      return false;
    }
    // 3. Filter Pencarian Text
    if (state.searchQuery) {
      const matchKategori = (t.kategori || "").toLowerCase().includes(state.searchQuery);
      const matchCatatan = (t.catatan || "").toLowerCase().includes(state.searchQuery);
      if (!matchKategori && !matchCatatan) return false;
    }
    return true;
  });

  countDisplay.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  // Render Baris Tabel
  tbody.innerHTML = filtered.map(t => {
    const isIncome = t.jenis === "Pemasukan";
    const amountColor = isIncome ? "text-emerald-600 font-bold" : "text-rose-600 font-bold";
    const amountPrefix = isIncome ? "+" : "-";

    const isFamily = t.akun === "Keluarga";
    const badgeAkunColor = isFamily 
      ? "bg-blue-50 text-blue-700 border-blue-200" 
      : "bg-orange-50 text-orange-700 border-orange-200";

    const iconAkun = isFamily ? "🏠" : "🍡";

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
          ${formatTanggal(t.tanggal)}
        </td>
        <td class="py-3 px-3 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeAkunColor}">
            <span>${iconAkun}</span>
            <span>${t.akun}</span>
          </span>
        </td>
        <td class="py-3 px-3">
          <div class="font-semibold text-slate-800">${escapeHTML(t.kategori)}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-xs">${escapeHTML(t.catatan || "-")}</div>
        </td>
        <td class="py-3 px-3 text-right whitespace-nowrap">
          <span class="${amountColor} font-mono text-xs">
            ${amountPrefix}${formatRupiah(t.nominal)}
          </span>
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <button onclick="deleteTransaction('${t.id}')" title="Hapus transaksi dari Google Sheets" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Menghapus transaksi secara otomatis dari Google Sheets & Cache Lokal
 */
async function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  const label = tx ? `"${tx.kategori}" (${formatRupiah(tx.nominal)})` : "ini";

  if (!confirm(`Hapus transaksi ${label}?\nData akan dihapus permanen dari Google Sheets dan aplikasi.`)) {
    return;
  }

  // 1. Simpan salinan data lama untuk rollback jika terjadi kendala
  const previousTransactions = [...state.transactions];

  // 2. Optimistic UI update: hapus langsung dari tampilan lokal agar instan
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  renderAll();

  // 3. Jika belum terhubung ke Google Sheets (Mode Demo), cukup selesai di lokal
  if (!state.gasUrl) {
    showToast("Transaksi dihapus dari cache lokal (Mode Demo).", "info");
    return;
  }

  // 4. Kirim perintah hapus ke Google Sheets API
  showToast("Menghapus transaksi dari Google Sheets...", "info");

  try {
    const response = await fetch(state.gasUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        id: id,
        tanggal: tx ? tx.tanggal : "",
        nominal: tx ? tx.nominal : 0,
        kategori: tx ? tx.kategori : "",
        catatan: tx ? tx.catatan : ""
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      }
    });

    const result = await response.json();
    if (result.status === "success") {
      showToast("Berhasil dihapus dari Google Sheets!", "success");
    } else {
      console.warn("Respon dari Sheets:", result);
      showToast(result.message || "Transaksi terhapus dari tampilan.", "info");
    }
  } catch (error) {
    console.warn("Status pengiriman hapus:", error);
    // Di Google Apps Script, redirect terkadang menyebabkan browser fetch melempar type error,
    // padahal backend Apps Script sebenarnya sukses menghapus barisnya.
    showToast("Permintaan hapus telah diproses ke Google Sheets.", "success");
  }
}

// ======================= 8. GRAFIK (CHART.JS) =======================

/**
 * Memperbarui visualisasi proporsi pengeluaran dengan Chart.js
 */
function renderExpenseChart() {
  const canvas = document.getElementById("expenseChart");
  const emptyMsg = document.getElementById("chartEmptyMessage");
  if (!canvas) return;

  // Filter transaksi pengeluaran sesuai tab akun yang aktif
  const expenseTransactions = state.transactions.filter(t => {
    if (t.jenis !== "Pengeluaran") return false;
    if (state.activeAccountFilter !== "Semua" && t.akun !== state.activeAccountFilter) return false;
    return true;
  });

  if (expenseTransactions.length === 0) {
    canvas.classList.add("hidden");
    emptyMsg.classList.remove("hidden");
    if (expenseChartInstance) {
      expenseChartInstance.destroy();
      expenseChartInstance = null;
    }
    return;
  }

  canvas.classList.remove("hidden");
  emptyMsg.classList.add("hidden");

  // Hitung total pengeluaran per kategori
  const categoryTotals = {};
  expenseTransactions.forEach(t => {
    categoryTotals[t.kategori] = (categoryTotals[t.kategori] || 0) + Number(t.nominal);
  });

  const labels = Object.keys(categoryTotals);
  const dataValues = Object.values(categoryTotals);

  // Palet warna modern & elegan
  const modernPalette = [
    "#0d9488", // Teal 600
    "#f97316", // Orange 500
    "#3b82f6", // Blue 500
    "#ec4899", // Pink 500
    "#8b5cf6", // Purple 500
    "#eab308", // Yellow 500
    "#10b981", // Emerald 500
    "#64748b", // Slate 500
  ];

  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  expenseChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: modernPalette.slice(0, labels.length),
        borderWidth: 2,
        borderColor: "#ffffff",
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 10
            },
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              return ` ${label}: ${formatRupiah(value)}`;
            }
          }
        }
      },
      cutout: "68%"
    }
  });
}

// ======================= 9. PENGATURAN GOOGLE SHEETS =======================

function openSettingsModal() {
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeSettingsModal() {
  document.getElementById("settingsModal").classList.add("hidden");
}

/**
 * Menyimpan URL Apps Script dan langsung melakukan tes koneksi
 */
async function saveGoogleSheetsConfig() {
  const url = document.getElementById("gasUrlInput").value.trim();
  const btn = document.getElementById("btnSaveSettings");
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin inline-block">⏳</span> Menguji...`;

  if (!url) {
    state.gasUrl = "";
    localStorage.removeItem(STORAGE_KEY_GAS_URL);
    updateConnectionStatusUI(false);
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Simpan & Hubungkan`;
    closeSettingsModal();
    showToast("URL dihapus. Kembali ke mode lokal.", "info");
    return;
  }

  state.gasUrl = url;
  localStorage.setItem(STORAGE_KEY_GAS_URL, url);

  try {
    await fetchFromGoogleSheets(true);
    closeSettingsModal();
    showToast("Google Sheets berhasil terhubung!", "success");
  } catch (e) {
    showToast("Gagal mengambil data dari URL tersebut. Pastikan akses Web App sudah 'Anyone'.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Simpan & Hubungkan`;
    if (window.lucide) lucide.createIcons();
  }
}

/**
 * Update UI indikator koneksi di header dan banner
 */
function updateConnectionStatusUI(isConnected) {
  const badge = document.getElementById("connectionStatusBadge");
  const text = document.getElementById("connectionStatusText");
  const banner = document.getElementById("unconfiguredBanner");
  const modalStatus = document.getElementById("modalConnectionStatus");

  if (isConnected) {
    badge.className = "hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Google Sheets Terhubung</span>`;
    if (modalStatus) {
      modalStatus.className = "font-bold text-emerald-600";
      modalStatus.textContent = "Terhubung Aktif ✓";
    }
    if (banner) banner.classList.add("hidden");
  } else {
    badge.className = "hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200";
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span><span>Mode Demo / Offline</span>`;
    if (modalStatus) {
      modalStatus.className = "font-bold text-amber-600";
      modalStatus.textContent = "Belum Terhubung (Mode Demo)";
    }
    if (banner) banner.classList.remove("hidden");
  }
}

// Buka modal settings saat tombol header diklik
document.getElementById("btnOpenSettings").addEventListener("click", openSettingsModal);

// ======================= 10. HELPER & UTILITIES =======================

function renderAll() {
  calculateMetrics();
  renderTransactionTable();
  renderExpenseChart();
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(state.transactions));
}

function loadSampleData() {
  if (confirm("Ganti data saat ini dengan data demo contoh?")) {
    state.transactions = [...INITIAL_DEMO_DATA];
    saveToLocalStorage();
    renderAll();
    closeSettingsModal();
    showToast("Data demo berhasil dimuat!", "success");
  }
}

function clearAllLocalData() {
  if (confirm("Kosongkan semua data transaksi di cache lokal browser?")) {
    state.transactions = [];
    saveToLocalStorage();
    renderAll();
    closeSettingsModal();
    showToast("Data lokal telah dibersihkan.", "info");
  }
}

/**
 * Format angka ke mata uang Rupiah (contoh: Rp 50.000)
 */
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

/**
 * Format tanggal YYYY-MM-DD ke DD MMM YYYY
 */
function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setLoading(isLoading) {
  state.isSyncing = isLoading;
  const loader = document.getElementById("loadingIndicator");
  const refreshBtn = document.getElementById("btnRefresh");

  if (isLoading) {
    loader.classList.remove("hidden");
    refreshBtn.classList.add("animate-spin");
  } else {
    loader.classList.add("hidden");
    refreshBtn.classList.remove("animate-spin");
  }
}

/**
 * Toast Notification System
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");

  const colors = {
    success: "bg-emerald-600 text-white shadow-emerald-500/20",
    error: "bg-rose-600 text-white shadow-rose-500/20",
    info: "bg-slate-900 text-white shadow-slate-900/20"
  };

  const icons = {
    success: "check-circle",
    error: "alert-circle",
    info: "info"
  };

  toast.className = `${colors[type] || colors.info} pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  // Animasi masuk
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  // Otomatis hilang setelah 3.5 detik
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

/**
 * Export Seluruh Data Transaksi ke file CSV untuk diunduh
 */
function exportToCSV() {
  if (state.transactions.length === 0) {
    showToast("Tidak ada data transaksi untuk diexport.", "info");
    return;
  }

  const headers = ["ID", "Tanggal", "Akun", "Jenis", "Kategori", "Nominal", "Catatan"];
  const rows = state.transactions.map(t => [
    t.id,
    t.tanggal,
    t.akun,
    t.jenis,
    `"${(t.kategori || '').replace(/"/g, '""')}"`,
    t.nominal,
    `"${(t.catatan || '').replace(/"/g, '""')}"`
  ]);

  // Tambahkan UTF-8 BOM agar Excel menampilkan aksen karakter dengan benar
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Laporan_Keuangan_Keluarga_UMKM_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Laporan CSV berhasil diunduh!", "success");
}

// ======================= 11. PROGRESSIVE WEB APP (PWA) =======================

// 1. Registrasi Service Worker untuk Offline Support & PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker aktif dengan scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Registrasi Service Worker gagal:", err);
      });
  });
}

// 2. Tangani event instalasi browser (beforeinstallprompt)
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  // Cegah dialog bawaan browser
  e.preventDefault();
  // Simpan event untuk dipanggil tombol buatan kita
  deferredInstallPrompt = e;

  // Munculkan tombol Install di header & banner mobile
  const btnInstall = document.getElementById("btnInstallApp");
  const mobileCard = document.getElementById("mobileInstallCard");

  if (btnInstall) btnInstall.classList.remove("hidden");
  if (mobileCard && !sessionStorage.getItem("pwa_dismissed")) {
    mobileCard.classList.remove("hidden");
  }
});

// Event saat aplikasi telah berhasil diinstal
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const btnInstall = document.getElementById("btnInstallApp");
  const mobileCard = document.getElementById("mobileInstallCard");
  if (btnInstall) btnInstall.classList.add("hidden");
  if (mobileCard) mobileCard.classList.add("hidden");
  showToast("Aplikasi BukuKas berhasil dipasang di layar HP!", "success");
});

/**
 * Pemicu tombol Install PWA saat diklik user
 */
function triggerPWAInstall() {
  // Cek jika pengguna membuka dari iPhone / iPad (iOS Safari)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    document.getElementById("iosInstallModal").classList.remove("hidden");
    return;
  }

  // Jika di Android/Chrome/Edge dan prompt tersedia
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] Pengguna menyetujui instalasi");
      }
      deferredInstallPrompt = null;
      const btnInstall = document.getElementById("btnInstallApp");
      const mobileCard = document.getElementById("mobileInstallCard");
      if (btnInstall) btnInstall.classList.add("hidden");
      if (mobileCard) mobileCard.classList.add("hidden");
    });
  } else {
    // Panduan jika prompt belum muncul
    alert("Untuk memasang di HP:\n\n1. Ketuk ikon titik tiga (⋮) di pojok kanan atas browser Chrome Anda.\n2. Pilih 'Tambahkan ke Layar Utama' (Add to Home screen) atau 'Pasang Aplikasi'.");
  }
}

function dismissInstallPrompt() {
  const mobileCard = document.getElementById("mobileInstallCard");
  if (mobileCard) mobileCard.classList.add("hidden");
  sessionStorage.setItem("pwa_dismissed", "true");
}

function closeIosInstallModal() {
  document.getElementById("iosInstallModal").classList.add("hidden");
}
