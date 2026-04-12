// src/components/WinnerModal.jsx
import React, { useState, useMemo } from "react";

export default function WinnerModal({
  result,
  origin = { x: 0, y: 0 },
  onClose,
}) {
  const [closing, setClosing] = useState(false);

  const center = useMemo(
    () => ({
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
      y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
    }),
    []
  );

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  return (
    <>
      <style>{`
        .wm-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(15,16,40,0);
          backdrop-filter: blur(2px);
          animation: fadeIn 240ms ease forwards;
        }
        .wm-backdrop.close { animation: fadeOut 200ms ease forwards; }

        /* Mover travels in a straight line from origin(px) -> center(px) while scaling */
        .wm-mover {
          position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 60;
          transform-origin: 0 0;
          will-change: transform, opacity;
          animation: enterMove 520ms cubic-bezier(.22,1,.36,1) 80ms both;
        }
        .wm-mover.pop-to {
          animation: exitMove 300ms cubic-bezier(.3,.75,.4,1) 0ms forwards;
        }

        .wm-card {
          position: absolute; left: 0; top: 0;
          transform: translate(-50%, -50%); /* center at mover point */
          width: min(540px, 92vw);
          border-radius: 16px; padding: 24px 28px; background: #fff;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
        }
        .wm-close { align-self: flex-end; cursor: pointer; font-weight: 700; line-height: 1; color: #000; }
        .wm-btn { margin-top: 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid #ddd; background: #111; color: #fff; cursor: pointer; }
        .wm-title { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 2px; }
        .wm-prize { font-size: 30px; font-weight: 900; color: #000; line-height: 1.3; }
        .wm-empty { font-size: 18px; color: #111; font-weight: 700; }

        @keyframes fadeIn  { from { background: rgba(15,16,40,0);}    to { background: rgba(15,16,40,0.35);} }
        @keyframes fadeOut { from { background: rgba(15,16,40,0.35);} to { background: rgba(15,16,40,0);} }

        @keyframes enterMove {
          0%   { opacity: 0; transform: translate3d(var(--ox), var(--oy), 0) scale(0.3); }
          30%  { opacity: 1; }
          100% { opacity: 1; transform: translate3d(var(--cx), var(--cy), 0) scale(1); }
        }
        @keyframes exitMove {
          from { opacity: 1; transform: translate3d(var(--cx), var(--cy), 0) scale(1); }
          to   { opacity: 0; transform: translate3d(var(--ox), var(--oy), 0) scale(0.3); }
        }
      `}</style>

      <div
        className={`wm-backdrop ${closing ? "close" : ""}`}
        onClick={handleClose}
      />

      <div
        className={`wm-mover ${closing ? "pop-to" : ""}`}
        style={{
          ["--ox"]: `${origin.x}px`,
          ["--oy"]: `${origin.y}px`,
          ["--cx"]: `${center.x}px`,
          ["--cy"]: `${center.y}px`,
        }}
        onClick={handleClose}
      >
        <div className="wm-card" onClick={(e) => e.stopPropagation()}>
          <div
            className="wm-close"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </div>

          {result?.reason === "No entries left" ? (
            <>
              <div className="wm-empty">No entries left</div>
              <button className="wm-btn" onClick={handleClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <div className="wm-title">
                🎉 Congratulations{" "}
                <span style={{ color: "#0a7" }}>{result?.winner}</span>, you
                have won
              </div>
              <div className="wm-prize">
                {result?.prizeName ?? "— (no prizes remaining) —"}
              </div>
              <button className="wm-btn" onClick={handleClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
