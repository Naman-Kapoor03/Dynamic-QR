import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Download, Pencil, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API = "https://dry-dash-qr.onrender.com";

export default function History() {
  const [data, setData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedCode, setCopiedCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/analytics/history/?page=${page}`)
      .then(res => res.json())
      .then(res => {
        setData(res.data || []);
        setTotalPages(res.total_pages || 1);
      })
      .catch(() => setData([]));
  }, [page]);

  const handleCopy = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleDeleteClick = (qr, e) => {
    e.stopPropagation();
    setDeleteTarget(qr);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await fetch(`${API}/api/qr/delete/${deleteTarget.code}/`, { method: "DELETE" });
      setData(prev => prev.filter(qr => qr.code !== deleteTarget.code));
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 px-6 py-8 font-sans">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-medium text-slate-100 tracking-tight">QR Codes</h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage and monitor your generated codes</p>
        </div>
        <span className="text-[12px] text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
          {data.length} codes
        </span>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden">

        {/* Column headings */}
        <div className="grid grid-cols-[2fr_1.2fr_1fr_auto] items-center px-5 py-2.5 bg-slate-900 border-b border-slate-800">
          {["Name", "Code ID", "Actions", ""].map((h, i) => (
            <span key={i} className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {data.length === 0 ? (
          <div className="text-center text-slate-500 py-14 text-sm">No QR codes yet</div>
        ) : (
          data.map((qr, i) => (
            <div
              key={i}
              onClick={() => navigate(`/dashboard/${qr.code}`)}
              className="grid grid-cols-[2fr_1.2fr_1fr_auto] items-center px-5 py-3.5 border-b border-slate-900 bg-[#0d1424] hover:bg-[#131c30] transition-colors cursor-pointer gap-2"
            >
              {/* Name */}
              <p className="text-[14px] font-medium text-slate-200">{qr.name}</p>

              {/* Code ID + Copy */}
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <span className="text-[12px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {qr.code}
                </span>
                <button
                  onClick={e => handleCopy(e, qr.code)}
                  className={`p-1.5 rounded transition-colors ${
                    copiedCode === qr.code
                      ? "text-emerald-400"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                  title="Copy code ID"
                >
                  {copiedCode === qr.code
                    ? <Check size={13} strokeWidth={2.5} />
                    : <Copy size={13} />
                  }
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => window.open(`${API}/api/qr/download/${qr.code}/`)}
                  className="p rounded-lg border border-transparent hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300 transition-all"
                  title="Download"
                >
                  <Download size={15} />
                </button>
                
                <button
                  onClick={e => handleDeleteClick(qr, e)}
                  className="p-2 rounded-lg border border-transparent hover:bg-red-950/50 hover:border-red-900/50 text-slate-600 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={() => setPage(p => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 text-[13px] bg-slate-900 border border-slate-800 text-slate-400 rounded-lg disabled:opacity-35 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          Previous
        </button>
        <span className="text-[13px] text-slate-500 w-24 text-center">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
          className="px-4 py-2 text-[13px] bg-slate-900 border border-slate-800 text-slate-400 rounded-lg disabled:opacity-35 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          Next
        </button>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative bg-[#0d1424] border border-slate-800 rounded-2xl p-7 w-[340px] shadow-2xl"
            >
              <h2 className="text-[16px] font-medium text-slate-100 mb-2">Delete QR code</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                This will permanently remove{" "}
                <span className="text-slate-200 font-medium">{deleteTarget?.name}</span>
                {" "}and all associated scan data. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-[13px] bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-[13px] bg-red-950 border border-red-900 text-red-300 rounded-lg hover:bg-red-900 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="fixed top-5 right-5 bg-emerald-950 border border-emerald-900 text-emerald-300 text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xl"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Deleted successfully
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}