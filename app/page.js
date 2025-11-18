"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [csvData, setCsvData] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [result, setResult] = useState(null);
  const [currentPrice, setCurrentPrice] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        setCsvData(data);

        const uniqueTickers = [
          ...new Set(data.map((row) => row.Symbol).filter(Boolean)),
        ];
        setTickers(uniqueTickers);
        setSelectedTicker("");
        setResult(null);
      },
    });
  };

  const calculateCostBasis = () => {
    if (!selectedTicker || !currentPrice) return;

    // Only rows for this ticker & FILLED trades
    const rows = csvData.filter(
      (r) =>
        r.Symbol === selectedTicker &&
        (r.Status || "").toLowerCase() === "filled"
    );

    let optionPremium = 0;
    let stockCost = 0;
    let shares = 0;

    rows.forEach((row) => {
      const priceStr = row.Price?.trim();
      const desc = (row.Description || "").toLowerCase();

      if (!priceStr) return;

      const value = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      if (isNaN(value)) return;

      const isCredit = priceStr.toLowerCase().includes("cr");
      const isDebit = priceStr.toLowerCase().includes("db");

      // ----- OPTION LOGIC -----
      if (desc.includes("call") || desc.includes("put")) {
        // treat each row as net for that option leg/roll
        if (!isCredit && !isDebit) return; // safety

        const cash = value * 100 * (isCredit ? 1 : -1);
        optionPremium += cash;
      }

      // ----- STOCK LOGIC (100 BTO only) -----
      if (desc.includes("100 bto")) {
        shares += 100;
        stockCost += value * 100;
      }
      // If you ever want to handle 100 STO (shares called away),
      // we can extend this later.
    });

    if (shares === 0) {
      setResult({
        error:
          "No 100 BTO stock rows detected for this ticker with Status = Filled.",
      });
      return;
    }

    const adjustedTotal = stockCost - optionPremium;
    const adjustedPerShare = adjustedTotal / shares;

    const cp = Number(currentPrice);
    const unrealizedPerShare = cp - adjustedPerShare;
    const totalPL = unrealizedPerShare * shares;

    setResult({
      shares,
      optionPremium,
      stockCost,
      adjustedTotal,
      adjustedPerShare,
      unrealizedPerShare,
      totalPL,
    });
  };

  return (
    <main className="flex flex-col items-center mt-12 px-4 text-matrixGreen">
      <h1 className="text-3xl font-bold mb-4 tracking-widest">
        COST BASIS MATRIX TOOL
      </h1>

      <input type="file" accept=".csv" onChange={handleFileUpload} />

      {tickers.length > 0 && (
        <div className="mt-6">
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

      {selectedTicker && (
        <div className="mt-6">
          <label>Current Price ($): </label>
          <input
            className="bg-black border border-matrixGreen ml-2 p-2"
            type="number"
            step="0.01"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </div>
      )}

      <button
        onClick={calculateCostBasis}
        className="mt-6 border border-matrixGreen px-6 py-3 hover:bg-matrixGreen hover:text-black"
      >
        CALCULATE
      </button>

      {result && !result.error && (
        <div className="mt-8 text-left w-full max-w-xl border-t border-matrixGreen pt-6">
          <h2 className="text-2xl mb-4">Results for {selectedTicker}</h2>
          <p>Shares Held: {result.shares}</p>
          <p>Total Stock Cost: ${result.stockCost.toFixed(2)}</p>
          <p>Net Option Premium: ${result.optionPremium.toFixed(2)}</p>
          <p>Adjusted Total Cost Basis: ${result.adjustedTotal.toFixed(2)}</p>
          <p>
            Adjusted Cost Basis Per Share: $
            {result.adjustedPerShare.toFixed(2)}
          </p>
          <p>
            Unrealized P/L Per Share: $
            {result.unrealizedPerShare.toFixed(2)}
          </p>
          <p>Total Unrealized P/L: ${result.totalPL.toFixed(2)}</p>
        </div>
      )}

      {result && result.error && (
        <div className="mt-8 text-red-400">{result.error}</div>
      )}
    </main>
  );
}
