import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

const API = "https://dry-dash-qr.onrender.com";

export default function TrackPage() {
  const { code } = useParams();
  const [status, setStatus] = useState("requesting");
  // "requesting" | "locating" | "denied" | "unavailable"
  const redirectedRef = useRef(false);
  const watchIdRef    = useRef(null);
  const timerRef      = useRef(null);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const redirectUser = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    // clean up watch + timers before redirect
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearTimeout(timerRef.current);

    window.location.href = `${API}/api/qr/redirect/${code}/`;
  };

  const sendLocation = async (latitude, longitude, accuracy) => {
    try {
      await fetch(`${API}/api/qr/location/${code}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, accuracy }),
      });
    } catch (_) {}
  };

  const startLocationWatch = () => {
    // clear any previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearTimeout(timerRef.current);
    redirectedRef.current = false;

    setStatus("locating");

    if (!navigator.geolocation) {
      sendLocation(null, null, null).finally(redirectUser);
      return;
    }

    let bestPosition = null;

    // hard deadline — never keep user waiting more than 9s
    timerRef.current = setTimeout(async () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (bestPosition) {
        await sendLocation(
          bestPosition.latitude,
          bestPosition.longitude,
          bestPosition.accuracy
        );
      } else {
        await sendLocation(null, null, null);
      }
      redirectUser();
    }, 9000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // always keep the best fix we've seen
        if (!bestPosition || accuracy < bestPosition.accuracy) {
          bestPosition = { latitude, longitude, accuracy };
        }

        // accuracy within 150m is good enough — send and redirect
        if (accuracy <= 150) {
          clearTimeout(timerRef.current);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          await sendLocation(latitude, longitude, accuracy);
          redirectUser();
        }
        // between 150–800m — wait a bit more for a better fix
        else if (accuracy <= 800) {
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(async () => {
            const p = bestPosition;
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            await sendLocation(p.latitude, p.longitude, p.accuracy);
            redirectUser();
          }, 2000);
        }
        // worse than 800m — keep watching, hard deadline will catch it
      },

      async (error) => {
        clearTimeout(timerRef.current);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        if (error.code === 1) {
          // PERMISSION_DENIED — user explicitly blocked
          setStatus("denied");
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE — GPS hardware off or indoor
          setStatus("unavailable");
        } else {
          // TIMEOUT — but we may have a partial fix
          if (bestPosition) {
            await sendLocation(
              bestPosition.latitude,
              bestPosition.longitude,
              bestPosition.accuracy
            );
            redirectUser();
          } else {
            // no fix at all, treat like unavailable
            setStatus("unavailable");
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,       // more breathing room
        maximumAge: 60000,   // accept a cached fix up to 60s old — stops the retry loop
      }
    );
  };

  useEffect(() => {
    startLocationWatch();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearTimeout(timerRef.current);
    };
  }, [code]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Montserrat:wght@300;400;500;600&display=swap');

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spin-rev { to { transform: rotate(-360deg); } }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .tr-root {
          position: fixed; inset: 0;
          background: #0f2e29;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          font-family: 'Montserrat', sans-serif;
          z-index: 9999;
        }
        .tr-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(56,245,185,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,245,185,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .tr-glow-top {
          position: absolute; top: -140px; left: 50%;
          transform: translateX(-50%);
          width: 480px; height: 480px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,245,185,0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .tr-card {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center;
          padding: 52px 44px 44px; width: 100%; max-width: 360px;
        }

        .tr-logo-wrap {
          position: relative; margin-bottom: 40px;
          animation: fade-up 0.6s ease 0.1s both;
        }
        .tr-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(56,245,185,0.3);
          animation: pulse-ring 2.8s ease-in-out infinite;
        }
        .tr-ring-1 { inset: -13px; }
        .tr-ring-2 { inset: -26px; animation-delay: 0.9s; border-color: rgba(56,245,185,0.12); }
        .tr-logo {
          width: 76px; height: 76px; border-radius: 22px;
          background: #21453F;
          border: 1.5px solid rgba(56,245,185,0.35);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          box-shadow: 0 0 32px rgba(56,245,185,0.1), 0 8px 24px rgba(0,0,0,0.3);
        }
        .tr-logo img { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; }

        .tr-divider {
          width: 1px; height: 36px;
          background: linear-gradient(to bottom, transparent, rgba(56,245,185,0.5), transparent);
          margin-bottom: 32px;
          animation: fade-up 0.6s ease 0.25s both;
        }

        .tr-spinner {
          position: relative; width: 60px; height: 60px;
          margin-bottom: 40px;
          animation: fade-up 0.6s ease 0.35s both;
        }
        .tr-s-outer {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(56,245,185,0.12);
          border-top: 2px solid #38F5B9;
          animation: spin 1.5s linear infinite;
        }
        .tr-s-mid {
          position: absolute; inset: 9px; border-radius: 50%;
          border: 2px solid rgba(56,245,185,0.08);
          border-right: 2px solid rgba(56,245,185,0.7);
          animation: spin-rev 2.2s linear infinite;
        }
        .tr-s-inner {
          position: absolute; inset: 18px; border-radius: 50%;
          border: 2px solid rgba(56,245,185,0.05);
          border-bottom: 2px solid rgba(56,245,185,0.45);
          animation: spin 3s linear infinite;
        }
        .tr-s-dot {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .tr-s-dot::after {
          content: ''; width: 5px; height: 5px;
          border-radius: 50%; background: #38F5B9;
          animation: dot-pulse 1.5s ease-in-out infinite;
        }

        .tr-text { text-align: center; animation: fade-up 0.6s ease 0.5s both; }
        .tr-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 500;
          color: #ffffff; letter-spacing: 0.3px;
          margin: 0 0 10px; line-height: 1.3;
        }
        .tr-sub {
          font-size: 11px; font-weight: 600;
          color: #38F5B9; letter-spacing: 3px;
          text-transform: uppercase; margin: 0 0 26px;
        }
        .tr-status {
          display: flex; align-items: center;
          gap: 8px; justify-content: center;
        }
        .tr-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #38F5B9;
          animation: dot-pulse 1.9s ease-in-out infinite;
          flex-shrink: 0;
        }
        .tr-status-label {
          font-size: 10px; font-weight: 500;
          color: rgba(255,255,255,0.65);
          letter-spacing: 2.5px; text-transform: uppercase;
        }

        /* ── denied / unavailable shared styles ── */
        .tr-denied-icon {
          width: 72px; height: 72px; border-radius: 22px;
          background: rgba(56,245,185,0.08);
          border: 1.5px solid rgba(56,245,185,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; margin-bottom: 28px;
          animation: fade-up 0.6s ease 0.1s both;
        }
        .tr-denied-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; font-weight: 500;
          color: #ffffff; text-align: center;
          margin-bottom: 12px; line-height: 1.3;
          animation: fade-up 0.6s ease 0.2s both;
        }
        .tr-denied-desc {
          font-size: 12px; font-weight: 400;
          color: rgba(255,255,255,0.5);
          text-align: center; line-height: 1.7;
          margin-bottom: 32px; max-width: 280px;
          animation: fade-up 0.6s ease 0.3s both;
        }
        .tr-denied-desc span { color: #38F5B9; font-weight: 600; }

        .tr-btn-primary {
          width: 100%; padding: 14px 24px;
          background: #21453F;
          border: 1.5px solid rgba(56,245,185,0.4);
          border-radius: 14px;
          color: #38F5B9; font-size: 12px;
          font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 12px;
          animation: fade-up 0.6s ease 0.4s both;
          font-family: 'Montserrat', sans-serif;
        }
        .tr-btn-primary:hover {
          background: rgba(56,245,185,0.15);
          border-color: #38F5B9;
        }
        .tr-btn-primary:active { transform: scale(0.98); }

        .tr-btn-skip {
          background: none; border: none;
          color: rgba(255,255,255,0.3);
          font-size: 11px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          cursor: pointer; padding: 8px;
          font-family: 'Montserrat', sans-serif;
          animation: fade-up 0.6s ease 0.5s both;
          transition: color 0.2s;
        }
        .tr-btn-skip:hover { color: rgba(255,255,255,0.6); }

        .tr-steps {
          width: 100%; margin-bottom: 28px;
          animation: fade-up 0.6s ease 0.35s both;
        }
        .tr-step {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tr-step:last-child { border-bottom: none; }
        .tr-step-num {
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(56,245,185,0.1);
          border: 1px solid rgba(56,245,185,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #38F5B9;
          flex-shrink: 0; margin-top: 1px;
        }
        .tr-step-text {
          font-size: 12px; color: rgba(255,255,255,0.55);
          line-height: 1.5; font-weight: 400;
        }
        .tr-step-text strong { color: rgba(255,255,255,0.85); font-weight: 600; }

        .tr-footer {
          margin-top: 48px;
          display: flex; align-items: center; gap: 12px;
          animation: fade-up 0.6s ease 0.7s both;
        }
        .tr-footer-line { width: 32px; height: 1px; background: rgba(56,245,185,0.3); }
        .tr-footer-text {
          font-size: 9px; font-weight: 600; letter-spacing: 3px;
          color: rgba(255,255,255,0.45); text-transform: uppercase;
        }
      `}</style>

      <div className="tr-root">
        <div className="tr-grid" />
        <div className="tr-glow-top" />

        {/* ── LOADING / LOCATING STATE ── */}
        {(status === "requesting" || status === "locating") && (
          <div className="tr-card">
            <div className="tr-logo-wrap">
              <div className="tr-ring tr-ring-2" />
              <div className="tr-ring tr-ring-1" />
              <div className="tr-logo">
                <img src="/icon.png" alt="logo" />
              </div>
            </div>

            <div className="tr-divider" />

            <div className="tr-spinner">
              <div className="tr-s-outer" />
              <div className="tr-s-mid" />
              <div className="tr-s-inner" />
              <div className="tr-s-dot" />
            </div>

            <div className="tr-text">
              <p className="tr-headline">Preparing your experience</p>
              <p className="tr-sub">Redirecting to {isIOS ? "App Store" : "Play Store"}</p>
              <div className="tr-status">
                <div className="tr-dot" />
                <span className="tr-status-label">Fetching location</span>
              </div>
            </div>

            <div className="tr-footer">
              <div className="tr-footer-line" />
              <span className="tr-footer-text">Secured & Verified</span>
              <div className="tr-footer-line" />
            </div>
          </div>
        )}

        {/* ── PERMISSION DENIED — user blocked location in browser ── */}
        {status === "denied" && (
          <div className="tr-card">
            <div className="tr-denied-icon">🔒</div>

            <p className="tr-denied-title">Location Access Blocked</p>
            <p className="tr-denied-desc">
              You've blocked location access for this site.<br />
              Follow the steps below to enable it, then tap <span>Try Again</span>.
            </p>

            <div className="tr-steps">
              {isIOS ? (
                <>
                  <div className="tr-step">
                    <div className="tr-step-num">1</div>
                    <p className="tr-step-text">
                      Open <strong>Settings</strong> → <strong>Safari</strong>
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">2</div>
                    <p className="tr-step-text">
                      Tap <strong>Location</strong> → set to <strong>Allow</strong>
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">3</div>
                    <p className="tr-step-text">
                      Come back here and tap <strong>Try Again</strong>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="tr-step">
                    <div className="tr-step-num">1</div>
                    <p className="tr-step-text">
                      Tap the <strong>lock icon 🔒</strong> in your browser address bar
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">2</div>
                    <p className="tr-step-text">
                      Tap <strong>Permissions</strong> → <strong>Location</strong> → <strong>Allow</strong>
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">3</div>
                    <p className="tr-step-text">
                      Come back here and tap <strong>Try Again</strong>
                    </p>
                  </div>
                </>
              )}
            </div>

            <button className="tr-btn-primary" onClick={startLocationWatch}>
              🔓 &nbsp; Enable Location
            </button>
            <button className="tr-btn-skip" onClick={redirectUser}>
              Skip & Continue
            </button>
          </div>
        )}

        {/* ── GPS UNAVAILABLE — location off or no signal ── */}
        {status === "unavailable" && (
          <div className="tr-card">
            <div className="tr-denied-icon">📍</div>

            <p className="tr-denied-title">Turn On Location</p>
            <p className="tr-denied-desc">
              Your device's location service appears to be off.<br />
              Please enable GPS and tap <span>Try Again</span>.
            </p>

            <div className="tr-steps">
              {isIOS ? (
                <>
                  <div className="tr-step">
                    <div className="tr-step-num">1</div>
                    <p className="tr-step-text">
                      Open <strong>Settings</strong> → <strong>Privacy</strong> → <strong>Location Services</strong>
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">2</div>
                    <p className="tr-step-text">
                      Toggle <strong>Location Services</strong> on
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">3</div>
                    <p className="tr-step-text">
                      Come back and tap <strong>Try Again</strong>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="tr-step">
                    <div className="tr-step-num">1</div>
                    <p className="tr-step-text">
                      Pull down from the top and tap the <strong>Location</strong> icon to turn it on
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">2</div>
                    <p className="tr-step-text">
                      Or go to <strong>Settings</strong> → <strong>Location</strong> → turn on
                    </p>
                  </div>
                  <div className="tr-step">
                    <div className="tr-step-num">3</div>
                    <p className="tr-step-text">
                      Come back and tap <strong>Try Again</strong>
                    </p>
                  </div>
                </>
              )}
            </div>

            <button className="tr-btn-primary" onClick={startLocationWatch}>
              📍 &nbsp; Enable Location
            </button>
            <button className="tr-btn-skip" onClick={redirectUser}>
              Skip & Continue
            </button>
          </div>
        )}
      </div>
    </>
  );
}