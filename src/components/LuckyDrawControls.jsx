import React from "react";

export default function LuckyDrawControls({
  isMobile,
  panelOpen,
  setPanelOpen,
  entriesText,
  setEntriesText,
  applyEntries,
  entries,
  prizesText,
  setPrizesText,
  applyPrizes,
  prizes,
  isSpinning,
}) {
  return (
    <>
      {/* Floating open button (mobile & desktop when closed) */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            padding: "12px 14px",
            borderRadius: 999,
            border: "none",
            background: "#111",
            color: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            zIndex: 5,
            fontWeight: 700,
            cursor: "pointer",
          }}
          aria-label="Open controls"
          title="Open controls"
        >
          Controls
        </button>
      )}

      {/* Controls Panel */}
      {panelOpen && (
        <div
          style={{
            position: "fixed",
            ...(isMobile
              ? {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  border: "1px solid #ccc",
                  background: "rgba(255,255,255,0.98)",
                  maxHeight: "75vh",
                  padding: 16,
                  boxShadow: "0 -12px 32px rgba(0,0,0,0.25)",
                }
              : {
                  top: 20,
                  right: 20,
                  width: 320,
                  background: "rgba(255,255,255,0.92)",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                }),
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontFamily: "system-ui, sans-serif",
            overflow: "auto",
            zIndex: 4,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, color: "#000" }}>
              {isMobile ? "Controls" : "Lucky Draw Controls"}
            </div>

            <button
              onClick={() => setPanelOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 22,
                lineHeight: 1,
                cursor: "pointer",
                color: "#000",
                fontWeight: 700,
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Close controls"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Entries */}
          {!isMobile && (
            <div style={{ fontWeight: 800, fontSize: 16, color: "#000" }}>
              Lucky Draw Entries
            </div>
          )}
          <textarea
            value={entriesText}
            onChange={(e) => setEntriesText(e.target.value)}
            placeholder="Enter numbers separated by commas or new lines"
            rows={isMobile ? 4 : 5}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              resize: "vertical",
              fontSize: 16,
              lineHeight: 1.4,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={applyEntries}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Update Entries ({entries.length})
          </button>

          <hr style={{ border: "none", borderTop: "1px solid #eee" }} />

          {/* Prizes */}
          <div style={{ fontWeight: 800, fontSize: 16, color: "#000" }}>
            Prizes &amp; Quantities
          </div>
          <textarea
            value={prizesText}
            onChange={(e) => setPrizesText(e.target.value)}
            placeholder={`One per line, e.g.\niPhone 16 Pro Max x1\nCoffee Voucher x3\nCap,2\nSticker - 5\nTote Bag`}
            rows={isMobile ? 5 : 6}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              resize: "vertical",
              fontSize: 16,
              lineHeight: 1.4,
              boxSizing: "border-box",
              whiteSpace: "pre",
            }}
          />
          <button
            onClick={applyPrizes}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Update Prizes (total {prizes.reduce((s, p) => s + p.qty, 0)})
          </button>

          {/* Remaining Prizes */}
          {prizes.length > 0 && (
            <div
              style={{
                marginTop: 4,
                padding: 10,
                borderRadius: 10,
                background: "#f1f1f1",
                border: "1px solid #ccc",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 6,
                  color: "#000",
                  fontSize: 18,
                }}
              >
                Remaining Prizes
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {prizes.map((p, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#111",
                      marginBottom: 6,
                    }}
                  >
                    {p.name}{" "}
                    <span style={{ color: "#000", fontWeight: 800 }}>
                      ×{p.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Status */}
          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              background: "#f7f7f7",
              border: "1px solid #eee",
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>
              Status: {isSpinning ? "Spinning..." : "Idle"}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Pull the lever to roll. Close the result to reset.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
