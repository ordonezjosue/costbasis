"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [csvData, setCsvData] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [result, setResult] = useState(null);
  const [currentPrice, setCurrentPrice] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // TYPEWRITER EFFECT
  const typeText = (text) => {
    setDisplayText("");
    let i = 0;
    const speed = 10;

    const typer = setInterval(() => {
      setDisplayText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(typer);
      }
    }, speed);
  };

  // FILE UPLOADER
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        setCsvData(data);
        setResult(null);

        const uniqueTickers = [
          ...new Set(data.map((row) => row.Symbol).filter(Boolean)),
        ];
        setTickers(uniqueTickers);
      },
    });
  };

  // COST BASIS CALCULATION
  const calculateCostBasis = () => {
    if (!selectedTicker || !currentPrice) return;

    const rows = csvData.filter(
      (r) =>
        r.Symbol === selectedTicker &&
        (r.Status || "").toLowerCase() === "filled"
    );

    let optionPremium = 0;
    let stockCost = 0;
    let shares = 0;

    rows.forEach((row) => {
      const priceStr = row.Price?.trim() || "";
      const desc = (row.Description || "").toLowerCase();

      const value = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      if (isNaN(value)) return;

      const isCredit = priceStr.toLowerCase().includes("cr");

      // OPTION TRADES
      if (desc.includes("call") || desc.includes("put")) {
        const cash = value * 100 * (isCredit ? 1 : -1);
        optionPremium += cash;
      }

      // STOCK TRADES (100 BTO)
      if (desc.includes("100 bto")) {
        shares += 100;
        stockCost += value * 100;
      }
    });

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

  // UI
  return (
    <main className="flex flex-col items-center mt-12 px-4 text-matrixGreen">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6 tracking-widest">
        COST BASIS MATRIX TOOL
      </h1>

      {/* CSV UPLOADER */}
      <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />

      {/* LOGIN BUTTON */}
      <a
        href="https://my.tastytrade.com/login.html"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_10px_#00ff41]"
      >
        LOGIN TO TASTYTRADE
      </a>

      {/* INFO PANEL TOGGLE */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="mb-6 border border-matrixGreen px-6 py-2 text-matrixGreen hover:bg-matrixGreen hover:text-black font-mono rounded-md shadow-[0_0_10px_#00ff41]"
      >
        {showInfo ? "HIDE INFO" : "HOW TO USE THIS TOOL"}
      </button>

      {/* INFO PANEL */}
      {showInfo && (
        <div className="w-full max-w-2xl bg-black/70 p-6 border border-matrixGreen rounded-md shadow-[0_0_15px_#00ff41] font-mono mb-10 leading-relaxed whitespace-pre-line">
          <h2 className="text-xl underline mb-4 text-matrixGreen">About This Tool</h2>
          <p>
            This Matrix-style calculator reads your Tastytrade CSV export and computes:
            • Net option premium collected (credits – debits)
            • Total stock cost from 100-share BTO fills
            • Adjusted cost basis per share
            • Unrealized P/L based on your current price input
            • Total Wheel premium income

            It is designed for Wheel traders and Covered Call sellers who want a fast,
            accurate way to calculate cost basis after rolling, selling premium,
            adjusting strikes, or accumulating shares.

            Why log in to Tastytrade?
            • To download your most recent CSV Activity Report
            • To verify your trade history
            • To confirm your filled credits/debits and 100-share stock purchases

            How to use this tool:
            1. Log in to Tastytrade → Download Activity CSV (All Fills)
            2. Upload the CSV using the Choose File button
            3. Select your ticker (IBIT, MARA, SOFI, etc.)
            4. Enter the current stock price
            5. Hit CALCULATE

            What this accomplishes:
            • Shows your REAL cost basis after all premium sold
            • Helps you choose your next Covered Call strike
            • Shows if you’re net positive or negative on a Wheel campaign
            • Shows your total P/L including premium collected
          </p>
        </div>
      )}

      {/* TICKER SELECT */}
      {tickers.length > 0 && (
        <div className="mt-2">
          <label>Select Ticker:</label>
          <select
            className="bg-black border border-matrixGreen ml-2 p-2"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
          >
            <option value="">-- Select --</option>
            {tickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* CURRENT PRICE INPUT */}
      {selectedTicker && (
        <div className="mt-4">
          <label>Current Price ($):</label>
          <input
            type="number"
            step="0.01"
            className="bg-black border border-matrixGreen ml-2 p-2"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </div>
      )}

      {/* CALCULATE BUTTON */}
      <button
        onClick={calculateCostBasis}
        className="mt-6 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_10px_#00ff41]"
      >
        CALCULATE
      </button>

      {/* RESULTS PANEL */}
      {result && (
        <div className="mt-10 w-full max-w-xl flex flex-col items-start gap-4">

          <div className="w-full bg-black/70 border border-matrixGreen p-6 rounded-md shadow-[0_0_15px_#00ff41] font-mono">
            <h2 className="text-2xl mb-4 underline text-matrixGreen">Results for {selectedTicker}</h2>

            <div className="typing text-md whitespace-pre-line">
              {displayText}
            </div>
          </div>

          {/* COPY BUTTON */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.rawText);
              alert("Results copied to clipboard!");
            }}
            className="border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_10px_#00ff41]"
          >
            COPY RESULTS
          </button>

        </div>
      )}
    </main>
  );
}
