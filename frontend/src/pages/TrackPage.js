import { useEffect } from "react";
import { useParams } from "react-router-dom";

const API = "https://dry-dash-qr.onrender.com";

export default function TrackPage() {
  const { code } = useParams();

  useEffect(() => {
    let redirected = false;

    const redirectUser = () => {
      if (!redirected) {
        redirected = true;
        window.location.href = `${API}/api/qr/redirect/${code}/`;
      }
    };

    if (!navigator.geolocation) {
      redirectUser();
      return;
    }

    const fallbackTimer = setTimeout(redirectUser, 5000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(fallbackTimer);
        try {
          await fetch(`${API}/api/qr/location/${code}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
        } catch (_) {}
        redirectUser();
      },
      () => { clearTimeout(fallbackTimer); redirectUser(); },
      { enableHighAccuracy: true, timeout: 4500 }
    );
  }, [code]);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Montserrat:wght@300;400;500;600&display=swap');

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spin-rev { to { transform: rotate(-360deg); } }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
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

        .tr-glow-bottom {
          position: absolute; bottom: -160px; left: 50%;
          transform: translateX(-50%);
          width: 360px; height: 360px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,245,185,0.08) 0%, transparent 65%);
          pointer-events: none;
        }

        .tr-card {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center;
          padding: 52px 44px 44px;
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
        .tr-logo img {
          width: 50px; height: 50px;
          border-radius: 10px; object-fit: cover;
        }

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

        .tr-text {
          text-align: center;
          animation: fade-up 0.6s ease 0.5s both;
        }

        .tr-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 500;
          color: #ffffff;
          letter-spacing: 0.3px;
          margin: 0 0 10px; line-height: 1.3;
        }

        .tr-sub {
          font-size: 11px; font-weight: 600;
          color: #38F5B9;
          letter-spacing: 3px; text-transform: uppercase;
          margin: 0 0 26px;
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

        .tr-footer {
          margin-top: 56px;
          display: flex; align-items: center;
          gap: 12px;
          animation: fade-up 0.6s ease 0.7s both;
        }
        .tr-footer-line {
          width: 32px; height: 1px;
          background: rgba(56,245,185,0.3);
        }
        .tr-footer-text {
          font-size: 9px; font-weight: 600;
          letter-spacing: 3px;
          color: rgba(255,255,255,0.45);
          text-transform: uppercase;
        }
      `}</style>

      <div className="tr-root">
        <div className="tr-grid" />
        <div className="tr-glow-top" />
        <div className="tr-glow-bottom" />

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
              <span className="tr-status-label">Establishing connection</span>
            </div>
          </div>

          <div className="tr-footer">
            <div className="tr-footer-line" />
            <span className="tr-footer-text">Secured & Verified</span>
            <div className="tr-footer-line" />
          </div>
        </div>
      </div>
    </>
  );
}