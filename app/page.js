"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [csvData, setCsvData] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [result, setResult] = useState(null);
  const [currentPrice, setCurrentPrice] = useState("");
  const [displayText, setDisplayText] = useState("");

  const typewriterRef = useRef(null);

  // TYPEWRITER EFFECT
  const typeText = (text) => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }

    setDisplayText("");
    let i = 0;
    const speed = 10;

    typewriterRef.current = setInterval(() => {
      setDisplayText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    }, speed);
  };

  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  // FILE UPLOAD
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data || [];
        setCsvData(data);
        setResult(null);

        const uniqueTickers = [
          ...new Set(data.map((row) => row.Symbol).filter(Boolean)),
        ];

        setTickers(uniqueTickers);
        setSelectedTicker("");
        setCurrentPrice("");
        setDisplayText("");
      },
    });
  };

  // COST BASIS CALCULATION (IMPROVED + ACCURATE)
  const calculateCostBasis = () => {
    if (!selectedTicker || !currentPrice) return;

    // Filter rows by ticker + "Filled"
    const rows = csvData.filter(
      (r) =>
        r.Symbol === selectedTicker &&
        (r.Status || "").toLowerCase() === "filled"
    );

    let optionPremium = 0;
    let stockCost = 0;
    let shares = 0;

    rows.forEach((row) => {
      const desc = (row.Description || "").toLowerCase();
      const qty = Number(row.Quantity?.replace(/[^0-9-]/g, "")) || 0;
      const priceStr = row.Price || "";
      const value = Number(priceStr.replace(/[^0-9.]/g, ""));
      if (!value) return;

      const isCredit = priceStr.toLowerCase().includes("cr");
      // const isDebit = priceStr.toLowerCase().includes("db"); // not strictly needed

      // OPTION TRADES
      if (desc.includes("call") || desc.includes("put")) {
        // Tastytrade always multiplies by 100 per contract
        const cash = value * 100 * (isCredit ? 1 : -1);
        optionPremium += cash;
        return;
      }

      // STOCK TRADES (ONLY COUNT EXACTLY ±100 SHARES AS PURCHASES)
      if (Math.abs(qty) === 100) {
        const cost = value * Math.abs(qty);
        // If quantity is negative, it's a sale — do not add to cost basis
        if (qty > 0) {
          shares += qty;
          stockCost += cost;
        }
      }
    });

    if (shares === 0) {
      alert(
        "No 100-share stock purchases were detected for this ticker. Check your CSV or filters."
      );
      return;
    }

    const adjustedTotal = stockCost - optionPremium;
    const adjustedPerShare = adjustedTotal / shares;

    const cp = Number(currentPrice);
    const unrealized = cp - adjustedPerShare;
    const totalPL = unrealized * shares;

    const resultText = `
Results for ${selectedTicker}

Shares Held: ${shares}
Total Stock Cost: $${stockCost.toFixed(2)}
Net Option Premium: $${optionPremium.toFixed(2)}
Adjusted Total Cost Basis: $${adjustedTotal.toFixed(2)}
Adjusted Cost Basis Per Share: $${adjustedPerShare.toFixed(2)}
Unrealized P/L Per Share: $${unrealized.toFixed(2)}
Total Unrealized P/L: $${totalPL.toFixed(2)}
`.trim();

    setResult({
      shares,
      stockCost,
      optionPremium,
      adjustedTotal,
      adjustedPerShare,
      unrealized,
      totalPL,
      rawText: resultText,
    });

    typeText(resultText);
  };

  const canCalculate = Boolean(
    selectedTicker && currentPrice && csvData.length > 0
  );

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-black text-matrixGreen font-mono overflow-hidden">
      {/* MATRIX BACKGROUND GLOW / FLICKER LAYER */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-black to-emerald-900 opacity-60" />
      <div className="pointer-events-none matrix-noise absolute inset-0 mix-blend-soft-light" />
      <div className="pointer-events-none matrix-scanlines absolute inset-0" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col items-center mt-12 px-4 w-full">
        {/* PAGE TITLE */}
        <h1 className="text-3xl md:text-4xl font-bold mb-10 tracking-[0.4em] text-center drop-shadow-[0_0_12px_#00ff41] animate-title-glow">
          COST BASIS MATRIX TOOL
        </h1>

        {/* MAIN GRID */}
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT COLUMN — INFO PANEL */}
          <div className="crt-panel panel-enter-left bg-black/70 border border-matrixGreen p-6 md:p-8 rounded-md shadow-[0_0_25px_#00ff41] leading-relaxed">
            <h2 className="text-2xl underline mb-4 text-matrixGreen">
              About This Tool
            </h2>

            <p className="mb-4">
              This Matrix-style calculator analyzes your Tastytrade CSV export
              and computes:
            </p>

            <ul className="list-disc ml-6 mb-4 space-y-2 text-sm md:text-base">
              <li>Net option premium collected (credits – debits)</li>
              <li>Total stock cost from 100-share BTO fills</li>
              <li>Adjusted cost basis per share</li>
              <li>Unrealized P/L based on your entered price</li>
              <li>Total premium earned from Wheel trading</li>
            </ul>

            <h3 className="text-xl underline mb-2">Why Log In to Tastytrade?</h3>
            <ul className="list-disc ml-6 mb-4 space-y-2 text-sm md:text-base">
              <li>Download your latest CSV activity file</li>
              <li>Verify all option credits/debits</li>
              <li>Confirm 100-share stock purchases</li>
            </ul>

            <h3 className="text-xl underline mb-2">How To Use This Tool</h3>
            <ol className="list-decimal ml-6 mb-4 space-y-2 text-sm md:text-base">
              <li>Log in to Tastytrade → Download Activity CSV</li>
              <li>Upload the CSV using the file chooser</li>
              <li>Select your ticker (IBIT, MARA, SOFI, etc.)</li>
              <li>Enter the current stock price</li>
              <li>Click CALCULATE</li>
            </ol>

            <h3 className="text-xl underline mb-2">
              What This Tool Helps You Do
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-sm md:text-base">
              <li>See your REAL cost basis after all premium sold</li>
              <li>Choose your next Covered Call strike</li>
              <li>Understand Wheel profitability instantly</li>
              <li>Know if your account is net positive or negative</li>
            </ul>
          </div>

          {/* RIGHT COLUMN — TOOL */}
          <div className="panel-enter-right flex flex-col items-center">
            {/* FILE UPLOAD */}
            <div className="crt-panel w-full max-w-md bg-black/80 border border-matrixGreen p-4 rounded-md shadow-[0_0_18px_#00ff41] mb-6">
              <label className="block text-sm mb-2 tracking-widest">
                UPLOAD TASTYTRADE CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-matrixGreen file:text-black hover:file:bg-emerald-300 cursor-pointer bg-black/70 border border-matrixGreen p-1"
              />
            </div>

            {/* LOGIN BUTTON */}
            <a
              href="https://my.tastytrade.com/login.html"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_18px_#00ff41] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_25px_#00ff41]"
            >
              LOGIN TO TASTYTRADE
            </a>

            {/* TICKER SELECT */}
            {tickers.length > 0 && (
              <div className="mt-2 w-full max-w-md crt-panel bg-black/80 border border-matrixGreen p-4 rounded-md shadow-[0_0_15px_#00ff41]">
                <label className="block mb-2 text-sm tracking-widest">
                  SELECT TICKER
                </label>
                <select
                  className="w-full bg-black border border-matrixGreen p-2 text-sm outline-none focus:ring-2 focus:ring-matrixGreen"
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {tickers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CURRENT PRICE */}
            {selectedTicker && (
              <div className="mt-4 w-full max-w-md crt-panel bg-black/80 border border-matrixGreen p-4 rounded-md shadow-[0_0_15px_#00ff41]">
                <label className="block mb-2 text-sm tracking-widest">
                  CURRENT PRICE ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-black border border-matrixGreen p-2 text-sm outline-none focus:ring-2 focus:ring-matrixGreen"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="e.g. 55.27"
                />
              </div>
            )}

            {/* CALCULATE BUTTON */}
            <button
              onClick={calculateCostBasis}
              disabled={!canCalculate}
              className={`mt-6 border border-matrixGreen px-8 py-3 font-mono rounded-md shadow-[0_0_18px_#00ff41] transition-all duration-200 ${
                canCalculate
                  ? "hover:bg-matrixGreen hover:text-black hover:-translate-y-0.5 hover:shadow-[0_0_25px_#00ff41] cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              CALCULATE
            </button>

            {/* RESULTS */}
            {result && (
              <div className="mt-10 w-full crt-panel bg-black/80 border border-matrixGreen p-6 rounded-md shadow-[0_0_25px_#00ff41]">
                <h2 className="text-2xl mb-4 underline text-matrixGreen tracking-widest">
                  Results for {selectedTicker}
                </h2>

                <div className="typing whitespace-pre-line text-sm md:text-base leading-relaxed">
                  {displayText}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.rawText);
                    alert("Results copied to clipboard!");
                  }}
                  className="mt-6 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_18px_#00ff41] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_25px_#00ff41]"
                >
                  COPY RESULTS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STYLED-JSX FOR CRT + MATRIX EFFECTS */}
      <style jsx global>{`
        .matrix-noise {
          background-image: radial-gradient(
              circle at 0 0,
              rgba(0, 255, 65, 0.22),
              transparent 55%
            ),
            radial-gradient(
              circle at 100% 0,
              rgba(0, 255, 65, 0.18),
              transparent 55%
            ),
            radial-gradient(
              circle at 0 100%,
              rgba(0, 255, 65, 0.15),
              transparent 55%
            );
          animation: matrixFlicker 4s infinite alternate;
        }

        .matrix-scanlines {
          background-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 95%,
            rgba(0, 255, 65, 0.2) 96%,
            rgba(0, 0, 0, 0) 100%
          );
          background-size: 100% 3px;
          mix-blend-mode: soft-light;
          opacity: 0.35;
          pointer-events: none;
          animation: scanlineScroll 8s linear infinite;
        }

        .crt-panel {
          position: relative;
          overflow: hidden;
        }

        .crt-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.01)
          );
          mix-blend-mode: soft-light;
          pointer-events: none;
        }

        .crt-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.3) 0px,
            rgba(0, 0, 0, 0.3) 1px,
            transparent 2px,
            transparent 3px
          );
          opacity: 0.3;
          mix-blend-mode: multiply;
          pointer-events: none;
          animation: crtPulse 1.6s infinite alternate;
        }

        .animate-title-glow {
          animation: titleGlow 3s ease-in-out infinite;
        }

        .panel-enter-left {
          animation: panelEnterLeft 0.7s ease-out;
        }

        .panel-enter-right {
          animation: panelEnterRight 0.7s ease-out;
        }

        @keyframes scanlineScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100%;
          }
        }

        @keyframes matrixFlicker {
          0% {
            opacity: 0.25;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 0.28;
          }
        }

        @keyframes crtPulse {
          0% {
            opacity: 0.18;
          }
          50% {
            opacity: 0.32;
          }
          100% {
            opacity: 0.2;
          }
        }

        @keyframes titleGlow {
          0% {
            text-shadow: 0 0 8px #00ff41, 0 0 16px #00ff41;
          }
          50% {
            text-shadow: 0 0 2px #00ff41, 0 0 6px #00ff41;
          }
          100% {
            text-shadow: 0 0 10px #00ff41, 0 0 22px #00ff41;
          }
        }

        @keyframes panelEnterLeft {
          0% {
            opacity: 0;
            transform: translateX(-20px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes panelEnterRight {
          0% {
            opacity: 0;
            transform: translateX(20px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </main>
  );
}
