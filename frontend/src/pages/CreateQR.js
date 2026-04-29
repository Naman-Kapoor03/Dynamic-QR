import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Download, Copy, Check, Tag, Play, Apple } from "lucide-react";

const API = "https://dry-dash-qr.onrender.com/";

export default function App() {
  const [name, setName] = useState("");
  const [playstore, setPlaystore] = useState("");
  const [appstore, setAppstore] = useState("");
  const [qrImage, setQrImage] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateQR = async () => {
    if (!playstore && !appstore) {
      alert("Add at least one store link");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/qr/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          playstore_link: playstore,
          appstore_link: appstore,
        }),
      });
      const data = await res.json();
      setQrImage(data.qr_image);
      setQrCode(data.code);
    } catch {
      alert("Something went wrong");
    }
    setLoading(false);
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${qrImage}`;
    link.download = `${name || "qr"}.png`;
    link.click();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(qrCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-[420px] bg-[#0d1220] border border-slate-800/60 rounded-2xl px-8 py-10 text-slate-200"
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-b" />

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center">
            <QrCode size={16} className="text-indigo-400" />
          </div>
          <h1 className="text-[18px] font-medium tracking-tight text-slate-100">Smart QR</h1>
        </div>
        <p className="text-center text-[13px] text-slate-500 mb-8">
          Generate dynamic QR codes with built-in analytics
        </p>

        {/* Fields */}
        <div className="space-y-4">

          <Field label="QR Name" icon={<Tag size={14} className="text-slate-600" />}>
            <input
              type="text"
              placeholder="e.g. Product Launch 2025"
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#090d18] border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-600 transition-colors font-sans"
            />
          </Field>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] text-slate-600 uppercase tracking-widest">Store links</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <Field label="Play Store" hint="Optional — for Android users" icon={<Play size={13} className="text-slate-600" />}>
            <input
              type="text"
              placeholder="https://play.google.com/store/apps/..."
              onChange={e => setPlaystore(e.target.value)}
              className="w-full bg-[#090d18] border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-600 transition-colors font-sans"
            />
          </Field>

          <Field label="App Store" hint="Optional — for iOS users" icon={<Apple size={14} className="text-slate-600" />}>
            <input
              type="text"
              placeholder="https://apps.apple.com/app/..."
              onChange={e => setAppstore(e.target.value)}
              className="w-full bg-[#090d18] border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-600 transition-colors font-sans"
            />
          </Field>

        </div>

        {/* Generate button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={generateQR}
          disabled={loading}
          className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg text-[14px] font-medium text-indigo-100 flex items-center justify-center gap-2 transition-colors"
        >
          <QrCode size={15} />
          {loading ? "Generating..." : "Generate QR Code"}
        </motion.button>

        {/* QR Preview */}
        <AnimatePresence>
          {qrImage && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 bg-[#090d18] border border-slate-800 rounded-xl p-5 text-center"
            >
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mb-4">
                Generated Code
              </p>

              {/* QR image */}
              <div className="bg-white rounded-lg inline-block p-3 mb-4 shadow-lg">
                <img
                  src={`data:image/png;base64,${qrImage}`}
                  alt="QR Code"
                  className="w-36 h-36 block"
                />
              </div>

              {/* Code ID + Copy */}
              {qrCode && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-[12px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
                    {qrCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all font-sans ${
                      copied
                        ? "border-emerald-800 text-emerald-400 bg-emerald-950/40"
                        : "border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy ID"}
                  </button>
                </div>
              )}

              {/* Download */}
              <button
                onClick={downloadQR}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-950/60 border border-emerald-900/70 text-emerald-400 rounded-lg text-[13px] font-medium hover:bg-emerald-950 transition-colors"
              >
                <Download size={14} />
                Download PNG
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

// Field wrapper component
function Field({ label, hint, icon, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
      {hint && <p className="text-[11px] text-slate-600 mt-1.5">{hint}</p>}
    </div>
  );
}