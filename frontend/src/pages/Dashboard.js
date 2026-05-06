import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ScanLine, Smartphone, Apple, Download,
  Copy, Check, TrendingUp,
  BarChart2, X, CircleDot,
  MapPin, ZoomIn, Building2, Globe,
} from "lucide-react";

const API = "https://dry-dash-qr.onrender.com";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function extractSectorCity(address) {
  if (!address) return null;

  // Extract sector
  const sectorMatch = address.match(/sector[\s-]*(\d+[A-Za-z]?)/i);
  const sector = sectorMatch ? `Sector ${sectorMatch[1]}` : null;

  // Extract city
  const cityMatch = address.match(/\b(Gurugram|Gurgaon|Noida|Delhi|New Delhi|Ghaziabad)\b/i);
  let city = cityMatch ? cityMatch[1] : null;
  if (city?.toLowerCase() === "gurgaon")   city = "Gurugram";
  if (city?.toLowerCase() === "new delhi") city = "Delhi";

  // Extract pin code
  const pinMatch = address.match(/\b(\d{6})\b/);
  const pin = pinMatch ? pinMatch[1] : null;

  // Extract building — split by comma, find first meaningful part
  const parts = address.split(",").map(p => p.trim());
  let building = null;

  for (const part of parts) {
    const lower = part.toLowerCase();

    // Skip noise
    if (
      lower.includes("sector") ||
      lower.includes("india") ||
      lower.includes("block") ||
      lower.includes("plot") ||
      lower.includes("uttar pradesh") ||
      lower.includes("haryana") ||
      lower.includes("noida") ||
      lower.includes("gurugram") ||
      lower.includes("delhi") ||
      lower.includes("ghaziabad") ||
      /^\d{5,}$/.test(lower)
    ) continue;

    // Skip very short or all-caps code-like tokens (e.g. "B627", "IS901")
    const words = part.split(/\s+/);
    if (part.length < 4) continue;
    if (words.every(w => /^[A-Z0-9\-]+$/.test(w))) continue;

    building = part
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    break;
  }

  // Build: Building, Sector, City PIN
  const pieces = [building, sector, city].filter(Boolean);
  if (pin) pieces.push(pin);

  return pieces.length > 0 ? pieces.join(", ") : null;
}

function extractSector(address) {
  if (!address) return null;
  const m = address.match(/sector[\s-]*(\d+[A-Za-z]?)/i);
  return m ? `Sector ${m[1]}` : null;
}

function extractCity(address) {
  if (!address) return null;
  const cityMatch = address.match(/\b(Gurugram|Gurgaon|Noida|Delhi|New Delhi|Ghaziabad)\b/i);
  if (!cityMatch) return null;
  const city = cityMatch[1];
  if (city.toLowerCase() === "gurgaon")   return "Gurugram";
  if (city.toLowerCase() === "new delhi") return "Delhi";
  return city;
}

function getTopSectorCity(scans) {
  const sectorMap = {};
  const cityMap   = {};
  (scans || []).forEach(s => {
    const sector = extractSector(s.address);
    const city   = extractCity(s.address);
    if (sector) sectorMap[sector] = (sectorMap[sector] || 0) + 1;
    if (city)   cityMap[city]     = (cityMap[city]     || 0) + 1;
  });
  const topSector = Object.entries(sectorMap).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—";
  const topCity   = Object.entries(cityMap).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—";
  return { topSector, topCity };
}

/* ─────────────────────────────────────────────
   FONT + GLOBAL STYLES
───────────────────────────────────────────── */
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
    .font-display { font-family: 'Fraunces', serif; }
    .font-body    { font-family: 'IBM Plex Sans', sans-serif; }
    * { font-family: 'IBM Plex Sans', sans-serif; }
    select { -webkit-appearance: none; }
    input::placeholder { color: #2d3a4e; }

    .scan-table { width: 100%; border-collapse: collapse; }
    .scan-table th {
      text-align: left; font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em; color: #475569;
      padding: 0 14px 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .scan-table td {
      padding: 10px 14px; font-size: 12.5px; color: #cbd5e1;
      border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle;
    }
    .scan-table tr:last-child td { border-bottom: none; }
    .scan-table tr:hover td { background: rgba(255,255,255,0.02); }

    .city-table { width: 100%; border-collapse: collapse; }
    .city-table th {
      text-align: left; font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em; color: #475569;
      padding: 0 14px 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .city-table td {
      padding: 9px 14px; font-size: 12.5px; color: #cbd5e1;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .city-table tr:last-child td { border-bottom: none; }
    .city-table tr:hover td { background: rgba(255,255,255,0.02); }

    .bar-fill {
      height: 4px; border-radius: 99px;
      background: linear-gradient(90deg, #4338ca, #60a5fa);
      transition: width 0.4s ease;
    }
    .bar-track {
      flex: 1; height: 4px; border-radius: 99px;
      background: rgba(255,255,255,0.06); overflow: hidden;
    }

    .qr-img-wrap { position: relative; cursor: zoom-in; display: inline-block; }
    .qr-img-wrap:hover .qr-zoom-hint { opacity: 1; }
    .qr-zoom-hint {
      position: absolute; inset: 0; border-radius: 12px;
      background: rgba(10,15,30,0.55);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s ease;
    }
  `}</style>
);

/* ─────────────────────────────────────────────
   DEVICE LABEL
───────────────────────────────────────────── */
function DeviceLabel({ device }) {
  const d = (device || "").toLowerCase();
  const isIOS     = d.includes("ios") || d.includes("iphone") || d.includes("ipad");
  const isAndroid = d.includes("android");
  const label = isIOS ? "iOS" : isAndroid ? "Android" : (device || "Unknown");
  const color = isIOS ? "#60a5fa" : isAndroid ? "#34d399" : "#64748b";
  return <span style={{ fontSize: 12.5, fontWeight: 500, color }}>{label}</span>;
}

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */
function StatCard({ title, value, icon: Icon, iconColor, iconBg, iconBorder, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="relative overflow-hidden bg-[#0d1526]/70 border border-white/[0.06]
                rounded-2xl p-5 backdrop-blur-2xl hover:-translate-y-0.5
                hover:border-indigo-500/20 transition-all duration-200"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/[0.04] to-transparent" />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${iconBg} ${iconBorder} border`}>
        <Icon size={15} color={iconColor} strokeWidth={2} />
      </div>
      <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{title}</p>
      <h2 className="font-display text-[26px] font-bold text-slate-100 leading-none">{value ?? "—"}</h2>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   CHART TOOLTIP
───────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1526] border border-indigo-500/30 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className="font-display text-base font-bold text-indigo-400">{payload[0].value} scans</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RECENT SCANS TABLE
───────────────────────────────────────────── */
function RecentScansTable({ scans }) {
  return (
    <motion.div
      className="bg-[#0d1526]/55 border border-white/[0.06] rounded-[18px] px-7 pt-6 pb-3 backdrop-blur-2xl"
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22 }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-display text-base font-semibold text-slate-100 mb-0.5">Recent Scans</p>
          <p className="text-[11px] text-slate-500">Last 10 scan events</p>
        </div>
      </div>

      {(!scans || scans.length === 0) ? (
        <p className="text-center text-slate-600 text-sm py-8">No scan data yet</p>
      ) : (
        <table className="scan-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Device</th>
              <th>Location</th>
              <th style={{ textAlign: "right" }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {scans.slice(0, 10).map((scan, i) => {
              const location = extractSectorCity(scan.address);
              const time = scan.timestamp
                ? new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "—";
              return (
                <tr key={i}>
                  <td style={{ color: "#334155", fontWeight: 600, width: 32 }}>{i + 1}</td>
                  <td><DeviceLabel device={scan.device} /></td>
                  <td>
                    {location ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <MapPin size={11} color="#4f5e7a" strokeWidth={2} />
                        <span style={{ color: "#94a3b8" }}>{location}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>
                        Location permission denied
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", color: "#475569", fontSize: 11 }}>{time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   CITY TABLE  ← replaces SectorTable
───────────────────────────────────────────── */
function CityTable({ scans }) {
  const cityMap = {};
  (scans || []).forEach(scan => {
    const city = extractCity(scan.address);
    if (!city) return;
    cityMap[city] = (cityMap[city] || 0) + 1;
  });

  const rows   = Object.entries(cityMap).sort((a, b) => b[1] - a[1]);
  const maxVal = rows.length ? rows[0][1] : 1;

  return (
    <motion.div
      className="bg-[#0d1526]/55 border border-white/[0.06] rounded-[18px] px-6 pt-6 pb-4 backdrop-blur-2xl"
      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
    >
      <div className="mb-4">
        <p className="font-display text-[15px] font-semibold text-slate-100 mb-0.5">Scans by City</p>
        <p className="text-[11px] text-slate-500">Breakdown per city</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-slate-600 text-xs py-6">No location data yet</p>
      ) : (
        <table className="city-table">
          <thead>
            <tr>
              <th>City</th>
              <th style={{ textAlign: "right" }}>Scans</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([city, count]) => (
              <tr key={city}>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ color: "#cbd5e1", fontSize: 12.5 }}>{city}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(count / maxVal) * 100}%` }} />
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: 14, fontWeight: 700, color: "#a5b4fc" }}>
                    {count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   QR LIGHTBOX
───────────────────────────────────────────── */
function QRLightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ background: "rgba(5,10,20,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 24 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.82, opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: -16, right: -16,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#94a3b8", transition: "background 0.2s", zIndex: 2,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
        >
          <X size={16} strokeWidth={2} />
        </button>
        <div style={{
          background: "#fff", borderRadius: 20, padding: 20,
          boxShadow: "0 0 80px rgba(79,70,229,0.25), 0 32px 64px rgba(0,0,0,0.5)",
        }}>
          <img src={src} alt="QR Code" style={{ width: 260, height: 260, display: "block" }} />
        </div>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(148,163,184,0.5)",
        }}>
          Click outside or press Esc to close
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function Dashboard() {
  const { code }    = useParams();
  const location    = useLocation();

  const [data,         setData]         = useState(null);
  const [playstore,    setPlaystore]    = useState("");
  const [appstore,     setAppstore]     = useState("");
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [timeFilter,   setTimeFilter]   = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [qrOpen,       setQrOpen]       = useState(false);

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API}/api/analytics/${code}/?time=${timeFilter}&device=${deviceFilter}`)
        .then(r => r.json())
        .then(res => {
          setData(res);
          setPlaystore(res.playstore_link || "");
          setAppstore(res.appstore_link  || "");
        });
    };
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [code, timeFilter, deviceFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("edit") === "true" && data) {
      setEditing(true);
      window.history.replaceState({}, "", `/dashboard/${code}`);
    }
  }, [location.search, code, data]);

  const downloadQR = () => window.open(`${API}/api/qr/download/${code}/`);

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const updateQR = async () => {
    setSaving(true);
    await fetch(`${API}/api/qr/update/${code}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playstore_link: playstore || data.playstore_link,
        appstore_link:  appstore  || data.appstore_link,
      }),
    });
    setSaving(false);
    setEditing(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1e] gap-4">
      <FontStyle />
      <div className="w-9 h-9 rounded-full border-2 border-indigo-500/15 border-t-indigo-500 animate-spin" />
      <p className="text-slate-500 text-sm">Loading dashboard…</p>
    </div>
  );

  const recentScans = data.recent_scans || [];
  const allScans    = data.all_scans || data.recent_scans || [];
  const pieData     = [{ name: "Android", value: data.android }, { name: "iOS", value: data.ios }];
  const topDevice   = data.android >= data.ios ? "Android" : "iOS";
  const avgScans    = (data.total_scans / 7).toFixed(1);

  const { topSector, topCity } = getTopSectorCity(allScans);

  const insights = [
    { label: "Top Device",    value: topDevice,  icon: TrendingUp, green: false },
    { label: "Daily Avg",     value: avgScans,   icon: BarChart2,  green: false },
    { label: "Active Sector", value: topSector,  icon: Building2,  green: false },
    { label: "Active City",   value: topCity,    icon: Globe,      green: false },
  ];

  const selectClass = `
    bg-[#0d1526]/90 text-slate-400 border border-white/[0.07]
    text-xs font-medium rounded-[9px] px-3 py-2.5 pr-8
    cursor-pointer outline-none
    focus:border-indigo-500/40 hover:border-indigo-500/40
    hover:text-slate-200 transition-all duration-200
    bg-no-repeat bg-[right_11px_center]
  `;
  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;
  const qrSrc = `${API}/api/qr/download/${code}/`;

  return (
    <>
      <FontStyle />

      <div className="relative min-h-screen bg-[#0a0f1e] text-slate-300 px-12 py-11 overflow-x-hidden">

        <div className="pointer-events-none fixed top-[-80px] left-[-80px] w-[480px] h-[480px] rounded-full bg-indigo-600/10 blur-[110px] z-0" />
        <div className="pointer-events-none fixed bottom-0 right-[-60px] w-[360px] h-[360px] rounded-full bg-sky-400/7 blur-[110px] z-0" />

        <div className="relative z-10">

          {/* HEADER */}
          <header className="flex items-end justify-between mb-11">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500 mb-1.5">
                Analytics <span className="mx-1.5 text-slate-700">/</span> {code}
              </p>
              <h1 className="font-display text-[30px] font-bold text-slate-100 tracking-[-0.3px] flex items-center gap-3">
                {data?.name || code}
                <span className="inline-flex items-center gap-1.5 bg-emerald-400/8 border border-emerald-400/22
                                text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.1em]
                                px-2.5 py-1 rounded-full">
                  <CircleDot size={10} strokeWidth={3} /> Live
                </span>
              </h1>
            </div>
            <div className="flex gap-2.5">
              <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
                className={selectClass} style={{ backgroundImage: chevronSvg }}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)}
                className={selectClass} style={{ backgroundImage: chevronSvg }}>
                <option value="all">All Devices</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
            </div>
          </header>

          {/* MAIN GRID */}
          <div className="grid grid-cols-[1fr_296px] gap-6 items-start">

            {/* LEFT */}
            <div className="flex flex-col gap-[18px]">

              <div className="grid grid-cols-3 gap-3.5">
                <StatCard title="Total Scans"   value={data.total_scans} icon={ScanLine}   iconColor="#a78bfa" iconBg="bg-violet-400/10"  iconBorder="border-violet-400/25"  delay={0}    />
                <StatCard title="Android Users" value={data.android}     icon={Smartphone} iconColor="#34d399" iconBg="bg-emerald-400/10" iconBorder="border-emerald-400/25" delay={0.07} />
                <StatCard title="iOS Users"     value={data.ios}         icon={Apple}      iconColor="#60a5fa" iconBg="bg-sky-400/10"     iconBorder="border-sky-400/25"     delay={0.14} />
              </div>

              <motion.div className="grid grid-cols-4 gap-3"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}>
                {insights.map(({ label, value, icon: Icon, green }) => (
                  <div key={label}
                    className="bg-[#0d1526]/55 border border-white/[0.055] rounded-xl
                              px-4 py-3.5 hover:border-indigo-500/20 transition-colors duration-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon size={12} strokeWidth={2} color={green ? "#34d399" : "#64748b"} />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-500">{label}</p>
                    </div>
                    <p className="font-display text-[13px] font-semibold text-slate-200 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </motion.div>

              <RecentScansTable scans={recentScans} />

              <motion.div
                className="bg-[#0d1526]/55 border border-white/[0.06] rounded-[18px] px-7 pt-7 pb-5 backdrop-blur-2xl"
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.34 }}>
                <p className="font-display text-base font-semibold text-slate-100 mb-0.5">Scan Analytics</p>
                <p className="text-[11px] text-slate-500 mb-6">Daily scan volume over time</p>
                <ResponsiveContainer width="100%" height={255}>
                  <LineChart data={data.daily_scans || []} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#4338ca" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="5 4" vertical={false} />
                    <XAxis dataKey="date" stroke="#1e293b" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'IBM Plex Sans',sans-serif" }} axisLine={false} tickLine={false} />
                    <YAxis                stroke="#1e293b" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'IBM Plex Sans',sans-serif" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="url(#lineGrad)" strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#4338ca", strokeWidth: 2, stroke: "#0a0f1e" }}
                      activeDot={{ r: 6, fill: "#60a5fa", stroke: "#0a0f1e", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

            </div>

            {/* RIGHT */}
            <div className="flex flex-col gap-[18px]">

              <motion.div
                className="bg-[#0d1526]/70 border border-white/[0.07] rounded-[18px] p-6 backdrop-blur-2xl text-center"
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}>
                <div
                  className="qr-img-wrap bg-white rounded-xl p-3 inline-block mb-5 shadow-[0_0_36px_rgba(79,70,229,0.12)]"
                  onClick={() => setQrOpen(true)}
                  title="Click to enlarge"
                >
                  <img src={qrSrc} alt="QR Code" className="w-[136px] h-[136px] block" />
                  <div className="qr-zoom-hint">
                    <ZoomIn size={28} color="#fff" strokeWidth={1.5} />
                  </div>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5">QR Code ID</p>
                <div className="inline-flex items-center gap-2 bg-indigo-500/8 border border-indigo-500/20 rounded-lg px-3 py-1.5 mb-5">
                  <span className="font-body text-[13px] font-semibold text-indigo-400 tracking-[0.04em]">{code}</span>
                  <button onClick={copyCode}
                    className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/8
                              hover:bg-indigo-500/15 hover:border-indigo-500/30 transition-all duration-200 cursor-pointer">
                    <AnimatePresence mode="wait">
                      {copied
                        ? <motion.span key="chk" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex"><Check size={12} color="#34d399" strokeWidth={2.5} /></motion.span>
                        : <motion.span key="cpy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex"><Copy  size={12} color="#64748b" strokeWidth={2}   /></motion.span>
                      }
                    </AnimatePresence>
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button onClick={downloadQR}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px]
                              bg-gradient-to-r from-indigo-700 to-indigo-500
                              text-white text-[13px] font-semibold tracking-wide
                              hover:opacity-85 hover:-translate-y-px active:translate-y-0
                              transition-all duration-150 cursor-pointer border-0">
                    <Download size={14} strokeWidth={2} /> Download QR
                  </button>
                </div>
              </motion.div>

              {/* ── CITY TABLE ── */}
              <CityTable scans={allScans} />

              <motion.div
                className="bg-[#0d1526]/55 border border-white/[0.06] rounded-[18px] px-6 pt-6 pb-5 backdrop-blur-2xl"
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.28 }}>
                <p className="font-display text-[15px] font-semibold text-slate-100 mb-0.5">Device Distribution</p>
                <p className="text-[11px] text-slate-500 mb-1">Android vs iOS share</p>
                <ResponsiveContainer width="100%" height={168}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={4} strokeWidth={0}>
                      <Cell fill="#34d399" /><Cell fill="#60a5fa" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 12 }}
                      itemStyle={{ color: "#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-2">
                  {[{ label: "Android", color: "#34d399", value: data.android }, { label: "iOS", color: "#60a5fa", value: data.ios }].map(({ label, color, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-slate-500 font-medium">{label}</span>
                      </div>
                      <span className="font-display text-[13px] font-semibold text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {qrOpen && <QRLightbox src={qrSrc} onClose={() => setQrOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 bg-[#050a14]/82 backdrop-blur-[14px] flex items-center justify-center z-[9999]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setEditing(false)}>
            <motion.div
              className="bg-[#0d1526] border border-white/[0.09] rounded-[22px] p-9 w-[420px]"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.96, y: 14 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}>
              <div className="flex items-start justify-between mb-7">
                <div>
                  <p className="font-display text-xl font-bold text-slate-100 mb-1">Edit Store Links</p>
                  <p className="text-xs text-slate-500">Update redirect destinations for this QR code</p>
                </div>
                <button onClick={() => setEditing(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/8
                            text-slate-500 hover:bg-white/10 hover:text-slate-200 transition-all duration-200 cursor-pointer flex-shrink-0">
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
              {[
                { label: "Google Play URL", icon: Smartphone, state: playstore, set: setPlaystore, fallback: data.playstore_link, ph: "https://play.google.com/store/apps/…" },
                { label: "App Store URL",   icon: Apple,      state: appstore,  set: setAppstore,  fallback: data.appstore_link,  ph: "https://apps.apple.com/…" },
              ].map(({ label, icon: Icon, state, set, fallback, ph }) => (
                <div key={label} className="mb-4">
                  <label className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">
                    <Icon size={11} strokeWidth={2} /> {label}
                  </label>
                  <input value={state || fallback || ""} onChange={e => set(e.target.value)} placeholder={ph}
                    className="w-full bg-[#050a14]/70 border border-white/[0.07] rounded-[10px] px-4 py-3
                              text-slate-200 text-[13px] outline-none focus:border-indigo-500/45 transition-colors duration-200" />
                </div>
              ))}
              <div className="flex gap-2.5 justify-end mt-7">
                <button onClick={() => setEditing(false)}
                  className="px-5 py-2.5 rounded-[9px] bg-white/[0.04] border border-white/8 text-slate-500
                            text-xs font-semibold tracking-wide hover:bg-white/[0.08] hover:text-slate-400
                            transition-all duration-200 cursor-pointer">
                  Cancel
                </button>
                <button onClick={updateQR}
                  className="px-6 py-2.5 rounded-[9px] bg-gradient-to-r from-indigo-700 to-indigo-500
                            text-white text-xs font-semibold tracking-wide hover:opacity-88 hover:-translate-y-px
                            transition-all duration-150 cursor-pointer border-0">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-6 right-6 z-[99999] flex items-center gap-2 px-5 py-3 rounded-[11px]
                      bg-gradient-to-r from-emerald-800 to-emerald-600 text-emerald-50 text-[13px] font-semibold
                      shadow-[0_6px_28px_rgba(5,150,105,0.25)]"
            initial={{ opacity: 0, y: -14, scale: 0.95 }}
            animate={{ opacity: 1,  y: 0,  scale: 1    }}
            exit={{    opacity: 0,  y: -14, scale: 0.95 }}>
            <Check size={14} strokeWidth={2.5} /> Links updated successfully
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}