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

  // TYPEWRITER EFFECT
  const typeText = (text) => {
    setDisplayText("");
    let i = 0;
    const speed = 10;

    const typer = setInterval(() => {
      setDisplayText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(typer);
    }, speed);
  };

  // FILE UPLOAD
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

  return (
    <main className="flex flex-col items-center mt-12 px-4 text-matrixGreen w-full">

      {/* PAGE TITLE */}
      <h1 className="text-3xl font-bold mb-12 tracking-widest">
        COST BASIS MATRIX TOOL
      </h1>

      {/* MAIN GRID */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* LEFT COLUMN — INFO PANEL */}
        <div className="bg-black/70 border border-matrixGreen p-6 rounded-md shadow-[0_0_15px_#00ff41] font-mono leading-relaxed">

          <h2 className="text-2xl underline mb-4 text-matrixGreen">
            About This Tool
          </h2>

          <p className="mb-4">
            This Matrix-style calculator analyzes your Tastytrade CSV export and computes:
          </p>

          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li>Net option premium collected (credits – debits)</li>
            <li>Total stock cost from 100-share BTO fills</li>
            <li>Adjusted cost basis per share</li>
            <li>Unrealized P/L based on your entered price</li>
            <li>Total premium earned from Wheel trading</li>
          </ul>

          <h3 className="text-xl underline mb-2">Why Log In to TastyTrade?</h3>
          <ul className="list-disc ml-6 mb-4 space-y-2">
            <li>Download your latest CSV activity file</li>
            <li>Verify all option credits/debits</li>
            <li>Confirm 100-share stock purchases</li>
          </ul>

          <h3 className="text-xl underline mb-2">How To Use This Tool</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2">
            <li>Log in to Tastytrade → Download Activity CSV</li>
            <li>Upload the CSV using the file chooser</li>
            <li>Select your ticker (IBIT, MARA, SOFI, etc.)</li>
            <li>Enter the current stock price</li>
            <li>Click CALCULATE</li>
          </ol>

          <h3 className="text-xl underline mb-2">What This Tool Helps You Do</h3>
          <ul className="list-disc ml-6 space-y-2">
            <li>See your REAL cost basis after all premium sold</li>
            <li>Choose your next Covered Call strike</li>
            <li>Understand Wheel profitability instantly</li>
            <li>Know if your account is net positive or negative</li>
          </ul>

        </div>

        {/* RIGHT COLUMN — TOOL */}
        <div className="flex flex-col items-center">

          {/* FILE UPLOAD */}
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="mb-4"
          />

          {/* LOGIN BUTTON */}
          <a
            href="https://my.tastytrade.com/login.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_10px_#00ff41]"
          >
            LOGIN TO TASTYTRADE
          </a>

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
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CURRENT PRICE */}
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

          {/* RESULTS */}
          {result && (
            <div className="mt-10 w-full bg-black/70 border border-matrixGreen p-6 rounded-md shadow-[0_0_15px_#00ff41] font-mono">

              <h2 className="text-2xl mb-4 underline text-matrixGreen">
                Results for {selectedTicker}
              </h2>

              <div className="typing whitespace-pre-line text-md">
                {displayText}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.rawText);
                  alert("Results copied to clipboard!");
                }}
                className="mt-6 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black text-matrixGreen font-mono rounded-md shadow-[0_0_10px_#00ff41]"
              >
                COPY RESULTS
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
