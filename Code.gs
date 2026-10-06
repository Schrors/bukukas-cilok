/**
 * BACKEND GOOGLE APPS SCRIPT
 * Aplikasi Pencatatan Keuangan Keluarga & UMKM Cilok
 * 
 * Skrip ini bertindak sebagai REST API untuk Google Sheets:
 * - doGet : Membaca seluruh data transaksi dari spreadsheet (format JSON)
 * - doPost: Menambahkan transaksi baru ke spreadsheet
 */

// Nama sheet default untuk menyimpan data
const SHEET_NAME = "Transaksi";

/**
 * Setup otomatis header tabel jika sheet masih baru/kosong
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Cek apakah header sudah ada
  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID", 
      "Timestamp", 
      "Tanggal", 
      "Akun", 
      "Jenis", 
      "Kategori", 
      "Nominal", 
      "Catatan"
    ];
    sheet.appendRow(headers);
    
    // Format header agar rapi
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0F766E"); // Dark Teal
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * Endpoint GET: Mengambil data transaksi untuk ditampilkan di web app
 */
function doGet(e) {
  try {
    const sheet = setupSheet();
    const rows = sheet.getDataRange().getValues();
    
    // Jika hanya ada header atau kosong
    if (rows.length <= 1) {
      return responseJSON({
        status: "success",
        total: 0,
        data: []
      });
    }
    
    const headers = rows[0];
    const data = [];
    
    // Looping setiap baris transaksi (mulai baris 2 / index 1)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const item = {};
      
      headers.forEach((header, index) => {
        let value = row[index];
        // Format tanggal jika objek Date agar konsisten YYYY-MM-DD
        if (value instanceof Date) {
          if (header === "Tanggal") {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
          } else {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
          }
        }
        item[header.toLowerCase()] = value;
      });
      
      data.push(item);
    }
    
    // Urutkan data dari yang paling baru (terbaru di atas)
    data.reverse();
    
    return responseJSON({
      status: "success",
      total: data.length,
      data: data
    });
    
  } catch (error) {
    return responseJSON({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Endpoint POST: Menambahkan transaksi baru atau Menghapus transaksi
 */
function doPost(e) {
  try {
    const sheet = setupSheet();
    
    // Parsing payload yang dikirim dari Web App
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    } else {
      throw new Error("Tidak ada data yang diterima.");
    }

    // ================= FITUR HAPUS TRANSAKSI OTOMATIS =================
    if (payload.action === "delete") {
      const targetId = payload.id ? String(payload.id).trim() : "";
      const targetTanggal = payload.tanggal ? String(payload.tanggal).trim() : "";
      const targetNominal = payload.nominal ? Number(payload.nominal) : null;
      const targetKategori = payload.kategori ? String(payload.kategori).trim() : "";
      
      const data = sheet.getDataRange().getValues();
      let deletedRowIndex = -1;

      // Cari baris transaksi yang cocok (dimulai dari baris 2 / index 1)
      for (let i = 1; i < data.length; i++) {
        const rowId = String(data[i][0]).trim(); // Kolom ID (kolom A)
        
        // 1. Cek kecocokan berdasarkan ID (TX-...)
        if (targetId && rowId === targetId) {
          deletedRowIndex = i + 1; // 1-indexed untuk Google Sheets
          break;
        }

        // 2. Fallback pencocokan jika ID kosong (berdasarkan Tanggal, Nominal & Kategori)
        if (!targetId || rowId === "") {
          const rowTanggal = data[i][2] instanceof Date 
            ? Utilities.formatDate(data[i][2], Session.getScriptTimeZone(), "yyyy-MM-dd")
            : String(data[i][2]).trim();
          const rowKategori = String(data[i][5]).trim();
          const rowNominal = Number(data[i][6]);

          if (rowTanggal === targetTanggal && rowKategori === targetKategori && rowNominal === targetNominal) {
            deletedRowIndex = i + 1;
            break;
          }
        }
      }

      if (deletedRowIndex !== -1) {
        sheet.deleteRow(deletedRowIndex);
        return responseJSON({
          status: "success",
          message: "Transaksi berhasil dihapus dari Google Sheets!",
          deletedRow: deletedRowIndex
        });
      } else {
        return responseJSON({
          status: "not_found",
          message: "Data transaksi tidak ditemukan di Google Sheets (mungkin sudah terhapus)."
        });
      }
    }
    
    // ================= FITUR TAMBAH TRANSAKSI BARU =================
    // Siapkan data baris baru
    const id = payload.id || "TX-" + Date.now();
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    const tanggal = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    const akun = payload.akun || "Keluarga"; // 'Keluarga' atau 'UMKM Cilok'
    const jenis = payload.jenis || "Pengeluaran"; // 'Pemasukan' atau 'Pengeluaran'
    const kategori = payload.kategori || "Umum";
    const nominal = Number(payload.nominal) || 0;
    const catatan = payload.catatan || "-";
    
    // Tambahkan baris baru ke sheet
    sheet.appendRow([
      id,
      timestamp,
      tanggal,
      akun,
      jenis,
      kategori,
      nominal,
      catatan
    ]);
    
    return responseJSON({
      status: "success",
      message: "Transaksi berhasil dicatat ke Google Sheets!",
      data: {
        id: id,
        timestamp: timestamp,
        tanggal: tanggal,
        akun: akun,
        jenis: jenis,
        kategori: kategori,
        nominal: nominal,
        catatan: catatan
      }
    });
    
  } catch (error) {
    return responseJSON({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Helper untuk mengembalikan output format JSON dengan header CORS yang tepat
 */
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
