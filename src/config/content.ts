// ============================================================
// Content / Copy — Ported from Ver01 gas_project/content.js
// All Vietnamese text centralized here for easy editing
// ============================================================

export const CONTENT = {
  // --- Brand ---
  org: 'PHONG TONG HOP — ESUHAI GROUP',
  tagline: 'Moi chuyen xe la mot chuyen yeu thuong',
  autoEmail: 'Thu tu dong tu he thong quan ly Van Hanh O To Esuhai.',

  // --- Email Subjects ---
  subject: {
    newBooking: '[Yeu cau xe moi]',
    driverAssign: '[Phan cong xe]',
    confirmBooker: '[Xe da san sang]',
    confirmStaff: '[Lich xe da xac nhan]',
    confirmManager: '[Hoan tat]',
    driverReject: '[Can phan bo lai]',
    rejectBooker: '[Khong duyet]',
    cancellation: '[Huy chuyen]',
    preTrip: '[Nhac lich]',
    completion: '[Xac nhan hoan thanh]',
    evaluation: '[Danh gia chuyen di]',
    morningSummary: '[Tong hop sang]',
    weeklyReport: '[Bao cao tuan]',
    approvalL2: '[Cho duyet cap 2]',
    approvalL3: '[Cho duyet cap 3]',
  },

  // --- Dashboard ---
  dashboard: {
    title: 'Quan ly Xe',
    subtitle: 'Phong Tong Hop — Esuhai Group',
    steps: [
      { title: 'TIEP NHAN YEU CAU', label: 'Tiep nhan yeu cau' },
      { title: 'DUYET & PHAN BO', label: 'Duyet & Phan bo' },
      { title: 'TAI XE XAC NHAN', label: 'Tai xe xac nhan' },
      { title: 'SAN SANG PHUC VU', label: 'San sang phuc vu' },
    ],
  },

  // --- Driver Response ---
  driver: {
    loadingTitle: 'Dang xu ly...',
    loadingMsg: 'Vui long cho trong giay lat.',
    rejectTitle: 'Vui long cho biet ly do',
    rejectMsg: 'Ban Dieu Phoi se sap xep tai xe khac.',
    rejectPlaceholder: 'Vi du: Nghi phep, trung lich, xe dang bao tri...',
    rejectBtn: 'Gui ly do tu choi',
    invalidTitle: 'Duong dan khong hop le',
    invalidMsg: 'Vui long su dung duong dan tu email goc.',
  },

  // --- Badges ---
  badge: {
    doiTac: 'DOI TAC',
    noiBo: 'NOI BO',
  },
} as const;
