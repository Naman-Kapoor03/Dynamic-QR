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
    Pencil, Copy, Check, TrendingUp,
    BarChart2, Zap, Activity, X, CircleDot,
  } from "lucide-react";

  const API = "https://dry-dash-qr.onrender.com";

  /* ── Custom font injection (Tailwind doesn't ship Fraunces / IBM Plex) ── */
  const FontStyle = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
      .font-display { font-family: 'Fraunces', serif; }
      .font-body    { font-family: 'IBM Plex Sans', sans-serif; }
      * { font-family: 'IBM Plex Sans', sans-serif; }
      select { -webkit-appearance: none; }
      input::placeholder { color: #2d3a4e; }
    `}</style>
  );

  /* ── Stat Card ── */
  function StatCard({ title, value, icon: Icon, iconColor, iconBg, iconBorder, delay = 0 }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay }}
        className="relative overflow-hidden bg-[#0d1526]/70 border border-white/[0.06]
                  rounded-2xl p-5 backdrop-blur-2xl
                  hover:-translate-y-0.5 hover:border-indigo-500/20
                  transition-all duration-200 group"
      >
        {/* shimmer overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/[0.04] to-transparent" />

        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${iconBg} ${iconBorder} border`}>
          <Icon size={15} color={iconColor} strokeWidth={2} />
        </div>
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
          {title}
        </p>
        <h2 className="font-display text-[26px] font-bold text-slate-100 leading-none">
          {value ?? "—"}
        </h2>
      </motion.div>
    );
  }

  /* ── Custom Chart Tooltip ── */
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#0d1526] border border-indigo-500/30 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-[11px] text-slate-500 mb-1">{label}</p>
        <p className="font-display text-base font-bold text-indigo-400">{payload[0].value} scans</p>
      </div>
    );
  }

  export default function Dashboard() {
    const { code } = useParams();
    const location = useLocation();

    const [data, setData] = useState(null);
    const [playstore, setPlaystore] = useState("");
    const [appstore, setAppstore] = useState("");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(false);
    const [copied, setCopied] = useState(false);
    const [timeFilter, setTimeFilter] = useState("all");
    const [deviceFilter, setDeviceFilter] = useState("all");

    useEffect(() => {
      const fetchData = () => {
        fetch(`${API}/api/analytics/${code}/?time=${timeFilter}&device=${deviceFilter}`)
          .then(r => r.json())
          .then(res => {
            setData(res);
            setPlaystore(res.playstore_link || "");
            setAppstore(res.appstore_link || "");
          });
      };
      fetchData();
      const id = setInterval(fetchData, 3000);
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
          appstore_link: appstore || data.appstore_link,
        }),
      });
      setSaving(false);
      setEditing(false);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    };

    /* ── Loading state ── */
    if (!data) return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1e] gap-4">
        <FontStyle />
        <div className="w-9 h-9 rounded-full border-2 border-indigo-500/15 border-t-indigo-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    );

    const pieData = [
      { name: "Android", value: data.android },
      { name: "iOS",     value: data.ios },
    ];
    const topDevice  = data.android >= data.ios ? "Android" : "iOS";
    const avgScans   = (data.total_scans / 7).toFixed(1);
    const engagement = data.total_scans > 10 ? "High" : "Low";

    const insights = [
      { label: "Top Device",  value: topDevice,   icon: TrendingUp, green: false },
      { label: "Daily Avg",   value: avgScans,     icon: BarChart2,  green: false },
      { label: "Engagement",  value: engagement,   icon: Zap,        green: false },
      { label: "Status",      value: "Active",     icon: Activity,   green: true  },
    ];

    const selectClass = `
      bg-[#0d1526]/90 text-slate-400 border border-white/[0.07]
      text-xs font-medium rounded-[9px] px-3 py-2.5
      pr-8 cursor-pointer outline-none
      focus:border-indigo-500/40 hover:border-indigo-500/40
      hover:text-slate-200 transition-all duration-200
      bg-no-repeat bg-[right_11px_center]
    `;

    return (
      <>
        <FontStyle />

        <div className="relative min-h-screen bg-[#0a0f1e] text-slate-300 px-12 py-11 overflow-x-hidden">

          {/* Ambient blobs */}
          <div className="pointer-events-none fixed top-[-80px] left-[-80px] w-[480px] h-[480px] rounded-full bg-indigo-600/10 blur-[110px] z-0" />
          <div className="pointer-events-none fixed bottom-0 right-[-60px] w-[360px] h-[360px] rounded-full bg-sky-400/7 blur-[110px] z-0" />

          <div className="relative z-10">

            {/* ── HEADER ── */}
            <header className="flex items-end justify-between mb-11">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500 mb-1.5">
                  Analytics
                  <span className="mx-1.5 text-slate-700">/</span>
                  {code}
                </p>
                <h1 className="font-display text-[30px] font-bold text-slate-100 tracking-[-0.3px] flex items-center gap-3">
                  {data?.name || code}
                  <span className="inline-flex items-center gap-1.5 bg-emerald-400/8 border border-emerald-400/22
                                  text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.1em]
                                  px-2.5 py-1 rounded-full">
                    <CircleDot size={10} strokeWidth={3} />
                    Live
                  </span>
                </h1>
              </div>

              {/* Filters */}
              <div className="flex gap-2.5">
                <select
                  value={timeFilter}
                  onChange={e => setTimeFilter(e.target.value)}
                  className={selectClass}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")` }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <select
                  value={deviceFilter}
                  onChange={e => setDeviceFilter(e.target.value)}
                  className={selectClass}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")` }}
                >
                  <option value="all">All Devices</option>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                </select>
              </div>
            </header>

            {/* ── MAIN GRID ── */}
            <div className="grid grid-cols-[1fr_296px] gap-6 items-start">

              {/* LEFT COL */}
              <div className="flex flex-col gap-[18px]">

                {/* STAT CARDS */}
                <div className="grid grid-cols-3 gap-3.5">
                  <StatCard title="Total Scans"   value={data.total_scans} icon={ScanLine}   iconColor="#a78bfa" iconBg="bg-violet-400/10"  iconBorder="border-violet-400/25" delay={0}    />
                  <StatCard title="Android Users" value={data.android}     icon={Smartphone} iconColor="#34d399" iconBg="bg-emerald-400/10" iconBorder="border-emerald-400/25" delay={0.07} />
                  <StatCard title="iOS Users"     value={data.ios}         icon={Apple}      iconColor="#60a5fa" iconBg="bg-sky-400/10"     iconBorder="border-sky-400/25"     delay={0.14} />
                </div>

                {/* INSIGHT CHIPS */}
                <motion.div
                  className="grid grid-cols-4 gap-3"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                >
                  {insights.map(({ label, value, icon: Icon, green }) => (
                    <div
                      key={label}
                      className="bg-[#0d1526]/55 border border-white/[0.055] rounded-xl
                                px-4 py-3.5 hover:border-indigo-500/20 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={12} strokeWidth={2} color={green ? "#34d399" : "#64748b"} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                          {label}
                        </p>
                      </div>
                      <p className={`font-display text-[15px] font-semibold ${green ? "text-emerald-400" : "text-slate-200"}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </motion.div>

                {/* CHART CARD */}
                <motion.div
                  className="bg-[#0d1526]/55 border border-white/[0.06] rounded-[18px]
                            px-7 pt-7 pb-5 backdrop-blur-2xl"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.28 }}
                >
                  <p className="font-display text-base font-semibold text-slate-100 mb-0.5">
                    Scan Analytics
                  </p>
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
                      <XAxis dataKey="date" stroke="#1e293b" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#1e293b" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone" dataKey="count"
                        stroke="url(#lineGrad)" strokeWidth={2.5}
                        dot={{ r: 3.5, fill: "#4338ca", strokeWidth: 2, stroke: "#0a0f1e" }}
                        activeDot={{ r: 6, fill: "#60a5fa", stroke: "#0a0f1e", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

              </div>

              {/* RIGHT COL */}
              <div className="flex flex-col gap-[18px]">

                {/* QR CARD */}
                <motion.div
                  className="bg-[#0d1526]/70 border border-white/[0.07] rounded-[18px]
                            p-6 backdrop-blur-2xl text-center"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                >
                  {/* QR Frame */}
                  <div className="bg-white rounded-xl p-3 inline-block mb-5
                                  shadow-[0_0_36px_rgba(79,70,229,0.12)]">
                    <img
                      src={`${API}/api/qr/download/${code}/`}
                      alt="QR Code"
                      className="w-[136px] h-[136px] block"
                    />
                  </div>

                  {/* Code ID + Copy */}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5">
                    QR Code ID
                  </p>
                  <div className="inline-flex items-center gap-2 bg-indigo-500/8 border border-indigo-500/20
                                  rounded-lg px-3 py-1.5 mb-5">
                    <span className="font-body text-[13px] font-semibold text-indigo-400 tracking-[0.04em]">
                      {code}
                    </span>
                    <button
                      onClick={copyCode}
                      title="Copy ID"
                      className="flex items-center justify-center w-6 h-6 rounded-md
                                bg-white/5 border border-white/8
                                hover:bg-indigo-500/15 hover:border-indigo-500/30
                                transition-all duration-200 cursor-pointer"
                    >
                      <AnimatePresence mode="wait">
                        {copied
                          ? <motion.span key="chk" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex"><Check  size={12} color="#34d399" strokeWidth={2.5} /></motion.span>
                          : <motion.span key="cpy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex"><Copy   size={12} color="#64748b" strokeWidth={2}   /></motion.span>
                        }
                      </AnimatePresence>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={downloadQR}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px]
                                bg-gradient-to-r from-indigo-700 to-indigo-500
                                text-white text-[13px] font-semibold tracking-wide
                                hover:opacity-85 hover:-translate-y-px active:translate-y-0
                                transition-all duration-150 cursor-pointer border-0"
                    >
                      <Download size={14} strokeWidth={2} /> Download QR
                    </button>
                    
                  </div>
                </motion.div>

                {/* PIE CARD */}
                <motion.div
                  className="bg-[#0d1526]/55 border border-white/[0.06] rounded-[18px]
                            px-6 pt-6 pb-5 backdrop-blur-2xl"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                >
                  <p className="font-display text-[15px] font-semibold text-slate-100 mb-0.5">
                    Device Distribution
                  </p>
                  <p className="text-[11px] text-slate-500 mb-1">Android vs iOS share</p>

                  <ResponsiveContainer width="100%" height={168}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={4} strokeWidth={0}>
                        <Cell fill="#34d399" />
                        <Cell fill="#60a5fa" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12 }}
                        itemStyle={{ color: "#e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex flex-col gap-2 mt-2">
                    {[
                      { label: "Android", color: "#34d399", value: data.android },
                      { label: "iOS",     color: "#60a5fa", value: data.ios     },
                    ].map(({ label, color, value }) => (
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

        {/* ── EDIT MODAL ── */}
        <AnimatePresence>
          {editing && (
            <motion.div
              className="fixed inset-0 bg-[#050a14]/82 backdrop-blur-[14px]
                        flex items-center justify-center z-[9999]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => e.target === e.currentTarget && setEditing(false)}
            >
              <motion.div
                className="bg-[#0d1526] border border-white/[0.09] rounded-[22px] p-9 w-[420px]"
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{    opacity: 0, scale: 0.96, y: 14 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              >
                {/* Modal Head */}
                <div className="flex items-start justify-between mb-7">
                  <div>
                    <p className="font-display text-xl font-bold text-slate-100 mb-1">
                      Edit Store Links
                    </p>
                    <p className="text-xs text-slate-500">
                      Update redirect destinations for this QR code
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                              bg-white/5 border border-white/8 text-slate-500
                              hover:bg-white/10 hover:text-slate-200
                              transition-all duration-200 cursor-pointer flex-shrink-0"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>

                {/* Inputs */}
                {[
                  { label: "Google Play URL", icon: Smartphone, state: playstore, set: setPlaystore, fallback: data.playstore_link, ph: "https://play.google.com/store/apps/…" },
                  { label: "App Store URL",   icon: Apple,      state: appstore,  set: setAppstore,  fallback: data.appstore_link,  ph: "https://apps.apple.com/…" },
                ].map(({ label, icon: Icon, state, set, fallback, ph }) => (
                  <div key={label} className="mb-4">
                    <label className="flex items-center gap-1.5 text-[10.5px] font-semibold
                                      uppercase tracking-[0.08em] text-slate-500 mb-2">
                      <Icon size={11} strokeWidth={2} />
                      {label}
                    </label>
                    <input
                      value={state || fallback || ""}
                      onChange={e => set(e.target.value)}
                      placeholder={ph}
                      className="w-full bg-[#050a14]/70 border border-white/[0.07]
                                rounded-[10px] px-4 py-3 text-slate-200 text-[13px]
                                outline-none focus:border-indigo-500/45
                                transition-colors duration-200"
                    />
                  </div>
                ))}

                {/* Actions */}
                <div className="flex gap-2.5 justify-end mt-7">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-5 py-2.5 rounded-[9px] bg-white/[0.04] border border-white/8
                              text-slate-500 text-xs font-semibold tracking-wide
                              hover:bg-white/[0.08] hover:text-slate-400
                              transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateQR}
                    className="px-6 py-2.5 rounded-[9px]
                              bg-gradient-to-r from-indigo-700 to-indigo-500
                              text-white text-xs font-semibold tracking-wide
                              hover:opacity-88 hover:-translate-y-px
                              transition-all duration-150 cursor-pointer border-0"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TOAST ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="fixed top-6 right-6 z-[99999]
                        flex items-center gap-2 px-5 py-3 rounded-[11px]
                        bg-gradient-to-r from-emerald-800 to-emerald-600
                        text-emerald-50 text-[13px] font-semibold
                        shadow-[0_6px_28px_rgba(5,150,105,0.25)]"
              initial={{ opacity: 0, y: -14, scale: 0.95 }}
              animate={{ opacity: 1,  y: 0,  scale: 1    }}
              exit={{    opacity: 0,  y: -14, scale: 0.95 }}
            >
              <Check size={14} strokeWidth={2.5} />
              Links updated successfully
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }