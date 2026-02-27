import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const FONT = "'IBM Plex Mono', monospace";
const TF = { "1W":["7d","1d"], "1M":["1mo","1d"], "3M":["3mo","1d"], "6M":["6mo","1wk"], "1Y":["1y","1wk"] };
const DEFAULT_TICKERS = ["NVDA","AAPL","MSFT","META","TSLA","AMZN","GOOGL","BRK-B"];

const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function displayT(t) { return t === "BRK-B" ? "BRK.B" : t; }
function yfT(t)      { return t === "BRK.B"  ? "BRK-B" : t; }
function fmtB(n) {
  if (n == null || isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n/1e12).toFixed(2)+"T";
  if (a >= 1e9)  return (n/1e9).toFixed(2)+"B";
  if (a >= 1e6)  return (n/1e6).toFixed(2)+"M";
  return n.toFixed(2);
}
function fmtPct(n) { return n == null || isNaN(n) ? "—" : (n*100).toFixed(2)+"%" }
function fmtNum(n, dec=2) { return n == null || isNaN(n) ? "—" : Number(n).toFixed(dec); }
function raw(obj) { return obj?.raw ?? obj ?? null; }

function computeScore(fd, sd, ks) {
  if (!fd && !sd) return 50;
  let s = 50;
  const pe   = raw(sd?.trailingPE);
  const peg  = raw(ks?.pegRatio);
  const gm   = raw(fd?.grossMargins);
  const roe  = raw(fd?.returnOnEquity);
  const de   = raw(fd?.debtToEquity);
  const rg   = raw(fd?.revenueGrowth);
  const rec  = raw(fd?.recommendationMean);
  if (pe)  s += pe < 25 ? 8 : pe < 40 ? 4 : pe < 60 ? 0 : -6;
  if (peg) s += peg < 1 ? 8 : peg < 2 ? 4 : -4;
  if (gm)  s += gm > .6 ? 8 : gm > .35 ? 4 : gm > .15 ? 0 : -6;
  if (roe) s += roe > .25 ? 8 : roe > .12 ? 4 : -4;
  if (de != null) s += de < 50 ? 6 : de < 150 ? 2 : -4;
  if (rg)  s += rg > .2 ? 6 : rg > .08 ? 3 : rg > 0 ? 0 : -6;
  if (rec) s += rec < 2 ? 6 : rec < 3 ? 3 : rec < 4 ? -2 : -6;
  return Math.max(10, Math.min(99, Math.round(s)));
}

function scoreColor(v) { return v >= 75 ? "#4af0a0" : v >= 55 ? "#f0c14a" : "#f04a6a"; }
function scoreClass(v) { return v >= 75 ? "hi" : v >= 55 ? "mid" : "lo"; }
function cls3(v, good, warn) {
  if (v == null) return "";
  return v >= good ? "good" : v >= warn ? "warn" : "bad";
}
function cls3Lo(v, good, warn) {
  if (v == null) return "";
  return v <= good ? "good" : v <= warn ? "warn" : "bad";
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#0d1520",border:"1px solid #1e2d3d",padding:"8px 12px",fontFamily:FONT,fontSize:11}}>
      <div style={{color:"#e8f0f8",fontWeight:500}}>${payload[0].value?.toFixed(2)}</div>
      <div style={{color:"#3d5068",fontSize:10,marginTop:2}}>{payload[0].payload.date}</div>
    </div>
  );
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body,#root{background:#080b0f;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;min-height:100vh}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1e2d3d;border-radius:2px}
.dash{display:grid;grid-template-rows:48px 1fr;grid-template-columns:260px 1fr 320px;height:100vh;overflow:hidden}
.topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#0a0e14;border-bottom:1px solid #151d27;z-index:100}
.logo{font-size:13px;font-weight:600;color:#4af0a0;letter-spacing:2px}
.pills{display:flex;gap:8px}
.pill{font-size:11px;padding:3px 10px;border:1px solid #1e2d3d;border-radius:2px;color:#6e8aa0;display:flex;gap:6px;align-items:center}
.pv{color:#c8d6e5}
.up{color:#4af0a0!important}.dn{color:#f04a6a!important}
.tr{display:flex;align-items:center;gap:10px}
.isb{background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 12px;width:130px;outline:none;border-radius:2px}
.isb:focus{border-color:#4af0a0}
.clk{font-size:11px;color:#3d5068;white-space:nowrap}
.btn{font-family:'IBM Plex Mono',monospace;font-size:10px;background:none;border:1px solid #1e2d3d;color:#3d5068;padding:3px 10px;cursor:pointer;border-radius:2px}
.btn:hover{color:#4af0a0;border-color:#4af0a0}

.lp{background:#090d12;border-right:1px solid #111923;overflow-y:auto;display:flex;flex-direction:column}
.ph{font-size:10px;letter-spacing:1.5px;color:#3d5068;padding:10px 14px 8px;border-bottom:1px solid #111923;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.ph-add{color:#4af0a0;cursor:pointer;font-size:16px;line-height:1;font-weight:300}
.add-row{display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid #111923;flex-shrink:0;flex-direction:column}
.add-inner{display:flex;gap:6px}
.ai{flex:1;background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;outline:none;border-radius:2px;text-transform:uppercase}
.ai:focus{border-color:#4af0a0}
.add-status{font-size:10px;padding:2px 0}
.abtn{background:#4af0a020;border:1px solid #4af0a0;color:#4af0a0;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:5px 12px;cursor:pointer;border-radius:2px;white-space:nowrap}
.abtn:disabled{opacity:0.4;cursor:not-allowed}

.wi{padding:10px 14px;border-bottom:1px solid #0e1620;cursor:pointer;transition:background 0.1s;display:grid;grid-template-columns:1fr auto;gap:2px;position:relative}
.wi:hover{background:#0d1520}.wi.act{background:#0d1f2e;border-left:2px solid #4af0a0}
.wi:hover .wdel{opacity:1}
.wdel{position:absolute;top:8px;right:8px;color:#3d5068;font-size:15px;opacity:0;cursor:pointer;line-height:1;transition:color 0.1s}
.wdel:hover{color:#f04a6a}
.wt{font-size:12px;font-weight:600;color:#e8f0f8}.wn{font-size:10px;color:#3d5068;margin-top:1px}
.wp{font-size:12px;color:#c8d6e5;text-align:right;padding-right:18px}.wch{font-size:10px;text-align:right;margin-top:1px;padding-right:18px}
.sbar{margin:5px 0 0;height:3px;background:#111923;border-radius:1px;overflow:hidden}
.sfill{height:100%;border-radius:1px}
.wpt{font-size:9px;color:#3d5068;margin-top:2px}.wpt.hit{color:#4af0a0}

.cp{display:flex;flex-direction:column;overflow:hidden;background:#080b0f}
.th{padding:12px 20px 10px;border-bottom:1px solid #111923;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.tt{font-size:20px;font-weight:600;color:#e8f0f8}.tn{font-size:11px;color:#3d5068}
.tprice{font-size:20px;color:#e8f0f8;margin-left:auto}.tchg{font-size:13px}
.sub{padding:4px 20px;border-bottom:1px solid #111923;font-size:10px;color:#3d5068;display:flex;gap:16px;flex-wrap:wrap}
.tftabs{display:flex;gap:2px;padding:6px 20px;border-bottom:1px solid #111923}
.tftab{font-size:10px;padding:3px 10px;cursor:pointer;color:#3d5068;border-radius:2px;transition:all 0.1s}
.tftab:hover{color:#6e8aa0}.tftab.act{background:#0d1520;color:#4af0a0}
.cc{flex:1;padding:10px 10px 0;min-height:0}
.fs{display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid #111923;background:#090d12;flex-shrink:0}
.fc{padding:7px 10px;border-right:1px solid #111923}.fc:last-child{border-right:none}
.fl{font-size:9px;color:#3d5068;letter-spacing:1px;text-transform:uppercase}
.fv{font-size:11px;color:#c8d6e5;margin-top:3px}
.fv.good{color:#4af0a0}.fv.warn{color:#f0c14a}.fv.bad{color:#f04a6a}

.rp{background:#090d12;border-left:1px solid #111923;overflow:hidden;display:flex;flex-direction:column}
.rptabs{display:flex;border-bottom:1px solid #111923;flex-shrink:0}
.rptab{flex:1;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#3d5068;padding:10px 4px;text-align:center;cursor:pointer;border-right:1px solid #111923;transition:all 0.1s}
.rptab:last-child{border-right:none}
.rptab:hover{color:#6e8aa0}.rptab.act{color:#4af0a0;background:#0d1520}
.rpbody{flex:1;overflow-y:auto}

.sc{padding:14px;border-bottom:1px solid #111923}
.sct{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase}
.scnum{font-size:40px;font-weight:600;margin:4px 0 2px;line-height:1}
.scnum.hi{color:#4af0a0}.scnum.mid{color:#f0c14a}.scnum.lo{color:#f04a6a}
.scl{font-size:10px;color:#3d5068}
.scbar{margin-top:8px;height:4px;background:#111923;border-radius:2px;overflow:hidden}
.scbarf{height:100%;border-radius:2px;transition:width 0.5s}
.ms{padding:12px 14px;border-bottom:1px solid #111923}
.mst{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase;margin-bottom:10px}
.mr{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #0e1620}
.mr:last-child{border-bottom:none}
.mrl{font-size:10px;color:#3d5068;display:flex;align-items:center;gap:6px}
.mrv{font-size:11px;color:#c8d6e5}
.mrv.good{color:#4af0a0}.mrv.warn{color:#f0c14a}.mrv.bad{color:#f04a6a}
.dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}

.nwrap{padding:14px;display:flex;flex-direction:column;gap:12px}
.nlabel{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase;margin-bottom:6px}
.ptrow{display:flex;gap:8px;align-items:center}
.ptinput{flex:1;background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:6px 10px;outline:none;border-radius:2px}
.ptinput:focus{border-color:#4af0a0}
.mosbar{height:6px;background:#111923;border-radius:3px;overflow:hidden;margin-top:6px}
.mosfill{height:100%;border-radius:3px;transition:width 0.4s}
.mostxt{font-size:10px;color:#3d5068;margin-top:4px}
.nta{width:100%;min-height:180px;background:#0a0e14;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:10px;outline:none;border-radius:2px;resize:none;line-height:1.6}
.nta:focus{border-color:#1e2d3d}
.nsaved{font-size:9px;color:#2a3d52;text-align:right}

.irow{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid #0e1620;font-size:10px}
.irow:last-child{border-bottom:none}
.iname{color:#6e8aa0;margin-bottom:2px;font-size:11px}
.irole{color:#2a3d52;font-size:9px}
.irt{text-align:right}
.itype{font-weight:600;margin-bottom:2px;font-size:11px}
.ishares{color:#3d5068;font-size:9px}

.rgauge{padding:12px 14px;border-bottom:1px solid #111923}
.rglabel{font-size:10px;letter-spacing:1px;color:#3d5068;text-transform:uppercase;margin-bottom:8px}
.rgbar{height:8px;background:#111923;border-radius:4px;overflow:hidden;position:relative;margin-bottom:4px}
.rgfill{height:100%;border-radius:4px}
.rgval{font-size:12px;color:#c8d6e5}
.rgsub{font-size:9px;color:#3d5068;margin-top:2px}
.ebox{padding:14px;border-bottom:1px solid #111923;text-align:center}
.edays{font-size:32px;font-weight:600;color:#f0c14a;line-height:1}
.elabel{font-size:10px;color:#3d5068;margin-top:4px}
.edate{font-size:11px;color:#6e8aa0;margin-top:6px}

.loading{color:#3d5068;font-size:11px;padding:20px;text-align:center}
.err{color:#f04a6a;font-size:10px;padding:6px 14px}
.ldot{width:6px;height:6px;border-radius:50%;background:#4af0a0;display:inline-block;margin-right:6px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
`;

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tickers, setTickers] = useState(() => LS.get("wl_v3", DEFAULT_TICKERS));
  const [tickerNames, setTickerNames] = useState(() => LS.get("wl_names_v3", {}));
  const [tickerPrices, setTickerPrices] = useState({});   // ticker -> {price, chg, score}
  const [sel, setSel]     = useState("NVDA");
  const [tf, setTf]       = useState("3M");
  const [filter, setFilter] = useState("");
  const [now, setNow]     = useState(new Date());

  // Selected ticker full data
  const [qdata, setQdata]   = useState(null);   // full quoteSummary result
  const [qLoading, setQL]   = useState(false);
  const [qErr, setQErr]     = useState(null);

  // Chart
  const [chart, setChart]   = useState([]);
  const [cLoad, setCLoad]   = useState(false);

  // Right panel
  const [rpTab, setRpTab]   = useState("score");
  const [notes, setNotes]   = useState(() => LS.get("notes_v3", {}));
  const [targets, setTargets] = useState(() => LS.get("targets_v3", {}));

  // Add ticker UI
  const [showAdd, setShowAdd] = useState(false);
  const [addVal, setAddVal]   = useState("");
  const [addStatus, setAddStatus] = useState(null); // null | "checking" | "ok" | "error"
  const [addName, setAddName]  = useState("");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // Persist
  useEffect(() => { LS.set("wl_v3", tickers); }, [tickers]);
  useEffect(() => { LS.set("wl_names_v3", tickerNames); }, [tickerNames]);

  // ── Fetch selected ticker full data ──────────────────────────────────────
  const fetchSelected = useCallback(async (ticker) => {
    setQL(true); setQErr(null); setQdata(null);
    try {
      const res = await fetch(`/api/quote?symbol=${yfT(ticker)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      setQdata(json.data);
      // Update watchlist price for this ticker
      const p = json.data?.price;
      if (p) {
        setTickerPrices(prev => ({
          ...prev,
          [ticker]: {
            price: raw(p.regularMarketPrice),
            chg:   raw(p.regularMarketChangePercent),
            name:  p.shortName || p.longName || ticker,
          }
        }));
        setTickerNames(prev => ({ ...prev, [ticker]: p.shortName || p.longName || ticker }));
      }
    } catch (e) {
      setQErr("⚠ " + e.message);
    } finally {
      setQL(false);
    }
  }, []);

  // Fetch all watchlist prices (lightweight — just for the list)
  const fetchAllPrices = useCallback(async () => {
    for (const t of tickers) {
      try {
        const res = await fetch(`/api/quote?symbol=${yfT(t)}`);
        const json = await res.json();
        if (!json.ok) continue;
        const p = json.data?.price;
        const fd = json.data?.financialData;
        const sd = json.data?.summaryDetail;
        const ks = json.data?.defaultKeyStatistics;
        if (p) {
          setTickerPrices(prev => ({
            ...prev,
            [t]: {
              price: raw(p.regularMarketPrice),
              chg:   raw(p.regularMarketChangePercent),
              name:  p.shortName || p.longName || t,
              score: computeScore(fd, sd, ks),
            }
          }));
        }
      } catch {}
    }
  }, [tickers]);

  useEffect(() => { fetchSelected(sel); }, [sel, fetchSelected]);
  useEffect(() => { fetchAllPrices(); }, [fetchAllPrices]);
  useEffect(() => { const t = setInterval(fetchAllPrices, 90000); return () => clearInterval(t); }, [fetchAllPrices]);

  // Chart
  useEffect(() => {
    const go = async () => {
      setCLoad(true);
      try {
        const [range, interval] = TF[tf] || ["3mo", "1d"];
        const res = await fetch(`/api/chart?symbol=${yfT(sel)}&range=${range}&interval=${interval}`);
        const json = await res.json();
        const ts = json?.chart?.result?.[0]?.timestamp;
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if (!ts || !closes) { setChart([]); return; }
        setChart(ts.map((t, i) => ({
          date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          price: closes[i] != null ? parseFloat(closes[i].toFixed(2)) : null
        })).filter(d => d.price != null));
      } catch { setChart([]); }
      finally { setCLoad(false); }
    };
    go();
  }, [sel, tf]);

  // Validate & add ticker
  const validateTicker = async () => {
    const t = addVal.trim().toUpperCase();
    if (!t) return;
    setAddStatus("checking"); setAddName("");
    try {
      const res = await fetch(`/api/validate?symbol=${yfT(t)}`);
      const json = await res.json();
      if (json.ok) {
        setAddStatus("ok");
        setAddName(json.name);
      } else {
        setAddStatus("error");
      }
    } catch { setAddStatus("error"); }
  };

  const confirmAdd = () => {
    const t = addVal.trim().toUpperCase();
    if (!t || tickers.includes(t)) { resetAdd(); return; }
    setTickers(prev => [...prev, t]);
    if (addName) setTickerNames(prev => ({ ...prev, [t]: addName }));
    setSel(t);
    resetAdd();
  };

  const resetAdd = () => { setAddVal(""); setAddStatus(null); setAddName(""); setShowAdd(false); };

  const removeTicker = (t, e) => {
    e.stopPropagation();
    setTickers(prev => prev.filter(x => x !== t));
    if (sel === t) setSel(tickers.find(x => x !== t) || DEFAULT_TICKERS[0]);
  };

  const handleNotes   = v => { const n = { ...notes,   [sel]: v }; setNotes(n);   LS.set("notes_v3", n); };
  const handleTarget  = v => { const n = { ...targets, [sel]: v }; setTargets(n); LS.set("targets_v3", n); };

  // ── Derived data from qdata ───────────────────────────────────────────────
  const price_mod = qdata?.price;
  const fd        = qdata?.financialData;
  const sd        = qdata?.summaryDetail;
  const ks        = qdata?.defaultKeyStatistics;
  const insiderTx = qdata?.insiderTransactions?.transactions || [];
  const insiderHolders = qdata?.insiderHolders?.holders || [];

  const price  = raw(price_mod?.regularMarketPrice);
  const chg    = raw(price_mod?.regularMarketChangePercent);
  const isUp   = chg >= 0;
  const score  = computeScore(fd, sd, ks);
  const name   = price_mod?.shortName || price_mod?.longName || sel;

  const w52lo  = raw(sd?.fiftyTwoWeekLow);
  const w52hi  = raw(sd?.fiftyTwoWeekHigh);
  const beta   = raw(sd?.beta);
  const mktCap = raw(price_mod?.marketCap);
  const vol    = raw(price_mod?.regularMarketVolume);

  const pe       = raw(sd?.trailingPE);
  const fwdPE    = raw(sd?.forwardPE);
  const evEbitda = raw(ks?.enterpriseToEbitda);
  const gm       = raw(fd?.grossMargins);
  const roe      = raw(fd?.returnOnEquity);
  const rg       = raw(fd?.revenueGrowth);
  const fcf      = raw(fd?.freeCashflow);
  const sharesOut= raw(ks?.sharesOutstanding);
  const pfcf     = price && fcf && sharesOut ? price / (fcf / sharesOut) : null;

  const de       = raw(fd?.debtToEquity);
  const peg      = raw(ks?.pegRatio);
  const rec      = raw(fd?.recommendationMean);
  const recText  = rec ? ["","Strong Buy","Buy","Hold","Underperform","Sell"][Math.round(rec)] || rec.toFixed(1) : "—";
  const insiderOwn = raw(ks?.heldPercentInsiders);
  const shortPct   = raw(ks?.shortPercentOfFloat);
  const divYield   = raw(sd?.dividendYield);

  const earningsTs   = raw(ks?.nextFiscalYearEnd) || raw(price_mod?.earningsTimestamp);
  const earningsDays = earningsTs ? Math.round((earningsTs * 1000 - Date.now()) / 86400000) : null;

  const pt  = parseFloat(targets[sel]);
  const mos = price && pt > 0 ? ((pt - price) / pt * 100) : null;

  const cMin = chart.length ? Math.min(...chart.map(d => d.price)) * .985 : 0;
  const cMax = chart.length ? Math.max(...chart.map(d => d.price)) * 1.015 : 1;
  const cUp  = chart.length >= 2 ? chart[chart.length - 1].price >= chart[0].price : true;

  const filtered = tickers.filter(t =>
    displayT(t).toLowerCase().includes(filter.toLowerCase()) ||
    (tickerNames[t] || "").toLowerCase().includes(filter.toLowerCase())
  );

  const topStocks = tickers.slice(0, 3);

  return <>
    <style>{S}</style>
    <div className="dash">

      {/* TOPBAR */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div className="logo">◈ TERMINAL</div>
          <div className="pills">
            {topStocks.map(t => {
              const tp = tickerPrices[t];
              return (
                <div className="pill" key={t}>
                  <span style={{ color: "#4d6478" }}>{displayT(t)}</span>
                  <span className="pv">{tp?.price ? `$${tp.price.toFixed(2)}` : "—"}</span>
                  {tp?.chg != null && <span className={tp.chg >= 0 ? "up" : "dn"}>{tp.chg >= 0 ? "+" : ""}{tp.chg.toFixed(2)}%</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="tr">
          <button className="btn" onClick={() => fetchSelected(sel)}>↻</button>
          <input className="isb" placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} />
          <div className="clk"><span className="ldot" />{now.toLocaleTimeString("en-US", { hour12: false })} EST</div>
        </div>
      </div>

      {/* LEFT — WATCHLIST */}
      <div className="lp">
        <div className="ph">
          Watchlist
          <span className="ph-add" onClick={() => { setShowAdd(v => !v); setAddStatus(null); setAddVal(""); }}>{showAdd ? "×" : "+"}</span>
        </div>

        {showAdd && (
          <div className="add-row">
            <div className="add-inner">
              <input
                className="ai" placeholder="TICKER" value={addVal}
                onChange={e => { setAddVal(e.target.value.toUpperCase()); setAddStatus(null); }}
                onKeyDown={e => e.key === "Enter" && (addStatus === "ok" ? confirmAdd() : validateTicker())}
                maxLength={6} autoFocus
              />
              {addStatus !== "ok"
                ? <button className="abtn" onClick={validateTicker} disabled={!addVal || addStatus === "checking"}>
                    {addStatus === "checking" ? "…" : "Check"}
                  </button>
                : <button className="abtn" onClick={confirmAdd}>Add</button>
              }
            </div>
            {addStatus === "ok"   && <div className="add-status" style={{ color: "#4af0a0" }}>✓ {addName}</div>}
            {addStatus === "error"&& <div className="add-status" style={{ color: "#f04a6a" }}>✗ Ticker not found</div>}
          </div>
        )}

        {filtered.map(t => {
          const tp  = tickerPrices[t] || {};
          const ds  = tp.score ?? 50;
          const dpt = parseFloat(targets[t]);
          const ptHit = dpt > 0 && tp.price >= dpt;
          return (
            <div key={t} className={`wi${sel === t ? " act" : ""}`} onClick={() => setSel(t)}>
              <div>
                <div className="wt">{displayT(t)}</div>
                <div className="wn">{tickerNames[t] || tp.name || t}</div>
                {dpt > 0 && <div className={`wpt${ptHit ? " hit" : ""}`}>{ptHit ? "✓ Target hit" : `Target: $${dpt.toFixed(2)}`}</div>}
                <div className="sbar">
                  <div className="sfill" style={{ width: `${ds}%`, background: `linear-gradient(90deg,${scoreColor(ds)}44,${scoreColor(ds)})` }} />
                </div>
              </div>
              <div>
                <div className="wp">{tp.price ? `$${tp.price.toFixed(2)}` : "—"}</div>
                <div className={`wch${tp.chg >= 0 ? " up" : " dn"}`}>{tp.chg != null ? `${tp.chg >= 0 ? "▲" : "▼"} ${Math.abs(tp.chg).toFixed(2)}%` : "—"}</div>
                <span className="wdel" onClick={e => removeTicker(t, e)}>×</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTER */}
      <div className="cp">
        <div className="th">
          <span className="tt">{displayT(sel)}</span>
          <span className="tn">{qLoading ? "Loading…" : name}</span>
          <span className="tprice">{price ? `$${price.toFixed(2)}` : "—"}</span>
          <span className={`tchg${isUp ? " up" : " dn"}`}>{chg != null ? `${isUp ? "+" : ""}${chg.toFixed(2)}%` : ""}</span>
        </div>

        {(w52lo || beta || mktCap) && (
          <div className="sub">
            {w52lo && <span>52W: ${w52lo.toFixed(2)} – ${w52hi?.toFixed(2)}</span>}
            {vol   && <span>Vol: {fmtB(vol)}</span>}
            {mktCap&& <span>Cap: {fmtB(mktCap)}</span>}
            {beta  && <span>β: {beta.toFixed(2)}</span>}
            {shortPct&&<span>Short: {fmtPct(shortPct)}</span>}
          </div>
        )}

        <div className="tftabs">
          {["1W","1M","3M","6M","1Y"].map(t => (
            <div key={t} className={`tftab${tf === t ? " act" : ""}`} onClick={() => setTf(t)}>{t}</div>
          ))}
        </div>

        <div className="cc">
          {cLoad ? <div className="loading">Loading chart…</div> : chart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "#2a3d52", fontSize: 10, fontFamily: FONT }} tickLine={false} axisLine={false} interval={Math.floor(chart.length / 6)} />
                <YAxis domain={[cMin, cMax]} tick={{ fill: "#2a3d52", fontSize: 10, fontFamily: FONT }} tickLine={false} axisLine={false} width={65} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip content={<Tip />} />
                <ReferenceLine y={chart[0]?.price} stroke="#1e2d3d" strokeDasharray="3 3" />
                {pt > 0 && <ReferenceLine y={pt} stroke="#4af0a060" strokeDasharray="4 2" label={{ value: "Target", fill: "#4af0a060", fontSize: 9, fontFamily: FONT, position: "right" }} />}
                <Line type="monotone" dataKey="price" stroke={cUp ? "#4af0a0" : "#f04a6a"} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: cUp ? "#4af0a0" : "#f04a6a" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="loading">No chart data</div>}
        </div>

        {/* FUNDAMENTALS STRIP */}
        <div className="fs">
          {[
            { l: "P/E (TTM)",  v: fmtNum(pe),      c: cls3Lo(pe, 25, 50) },
            { l: "Fwd P/E",    v: fmtNum(fwdPE),    c: cls3Lo(fwdPE, 20, 40) },
            { l: "EV/EBITDA",  v: fmtNum(evEbitda), c: cls3Lo(evEbitda, 15, 30) },
            { l: "Gross Mgn",  v: fmtPct(gm),       c: cls3(gm, .5, .25) },
            { l: "ROE",        v: fmtPct(roe),      c: cls3(roe, .2, .08) },
            { l: "Rev Growth", v: fmtPct(rg),       c: cls3(rg, .15, 0) },
            { l: "P/FCF",      v: pfcf ? fmtNum(pfcf) : "—", c: cls3Lo(pfcf, 20, 35) },
          ].map(f => (
            <div className="fc" key={f.l}>
              <div className="fl">{f.l}</div>
              <div className={`fv${f.c ? " " + f.c : ""}`}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="rp">
        <div className="rptabs">
          {[["score","Score"],["notes","Notes"],["insider","Insider"],["risk","Risk"]].map(([id, label]) => (
            <div key={id} className={`rptab${rpTab === id ? " act" : ""}`} onClick={() => setRpTab(id)}>{label}</div>
          ))}
        </div>
        <div className="rpbody">

          {/* SCORE */}
          {rpTab === "score" && <>
            <div className="sc">
              <div className="sct">Investment Score</div>
              <div className={`scnum ${scoreClass(score)}`}>{qLoading ? "…" : score}</div>
              <div className="scl">out of 100 · live fundamentals</div>
              <div className="scbar"><div className="scbarf" style={{ width: `${score}%`, background: `linear-gradient(90deg,${scoreColor(score)}44,${scoreColor(score)})` }} /></div>
            </div>
            <div className="ms">
              <div className="mst">Key Metrics</div>
              {[
                { l: "Insider Own",  v: fmtPct(insiderOwn), c: cls3(insiderOwn, .1, .03) },
                { l: "D/E Ratio",    v: fmtNum(de),         c: cls3Lo(de, 50, 150) },
                { l: "PEG Ratio",    v: fmtNum(peg),        c: cls3Lo(peg, 1.5, 2.5) },
                { l: "Analyst",      v: recText,             c: cls3Lo(rec, 2, 3) },
                { l: "Div Yield",    v: divYield ? fmtPct(divYield) : "None", c: "" },
                { l: "FCF",          v: fmtB(fcf),           c: "" },
              ].map(m => (
                <div className="mr" key={m.l}>
                  <div className="mrl"><span className="dot" style={{ background: scoreColor(score) }} />{m.l}</div>
                  <div className={`mrv${m.c ? " " + m.c : ""}`}>{m.v}</div>
                </div>
              ))}
            </div>
            <div className="ms">
              <div className="mst">Framework Signals</div>
              {[
                { l: "Pricing Power",  v: gm == null ? "—" : gm > .5 ? "✓ Strong" : gm > .25 ? "~ Moderate" : "✗ Weak",           c: gm == null ? "" : gm > .5 ? "good" : gm > .25 ? "warn" : "bad" },
                { l: "Valuation",      v: pe == null  ? "—" : pe < 25  ? "✓ Cheap"  : pe < 45   ? "~ Fair"     : "✗ Expensive",      c: pe == null  ? "" : pe < 25  ? "good" : pe < 45   ? "warn" : "bad" },
                { l: "Balance Sheet",  v: de == null  ? "—" : de < 50  ? "✓ Clean"  : de < 150  ? "~ Moderate" : "✗ Leveraged",      c: de == null  ? "" : de < 50  ? "good" : de < 150  ? "warn" : "bad" },
                { l: "Growth",         v: rg == null  ? "—" : rg > .15 ? "✓ Strong" : rg > 0    ? "~ Slow"     : "✗ Declining",      c: rg == null  ? "" : rg > .15 ? "good" : rg > 0    ? "warn" : "bad" },
                { l: "Profitability",  v: roe == null ? "—" : roe > .2 ? "✓ High"   : roe > .08 ? "~ Moderate" : "✗ Low",            c: roe == null ? "" : roe > .2 ? "good" : roe > .08 ? "warn" : "bad" },
              ].map(m => (
                <div className="mr" key={m.l}>
                  <div className="mrl">{m.l}</div>
                  <div className={`mrv ${m.c}`}>{m.v}</div>
                </div>
              ))}
            </div>
          </>}

          {/* NOTES */}
          {rpTab === "notes" && (
            <div className="nwrap">
              <div>
                <div className="nlabel">Price Target</div>
                <div className="ptrow">
                  <span style={{ fontSize: 12, color: "#3d5068" }}>$</span>
                  <input className="ptinput" type="number" placeholder="0.00" value={targets[sel] || ""} onChange={e => handleTarget(e.target.value)} />
                </div>
                {price && pt > 0 && <>
                  <div className="mosbar">
                    <div className="mosfill" style={{ width: `${Math.min(100, Math.abs(mos))}%`, background: mos > 0 ? "#4af0a0" : mos < -20 ? "#f04a6a" : "#f0c14a" }} />
                  </div>
                  <div className="mostxt">{mos > 0 ? `${mos.toFixed(1)}% upside` : `${Math.abs(mos).toFixed(1)}% above target`} · {mos > 15 ? "✓ MoS OK" : mos > 0 ? "~ Thin MoS" : "✗ No MoS"}</div>
                </>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="nlabel">Thesis / Notes</div>
                <textarea className="nta" placeholder={"Moat:\nCatalyst:\nRisks:\nPosition size:"} value={notes[sel] || ""} onChange={e => handleNotes(e.target.value)} />
                <div className="nsaved">↳ Auto-saved locally</div>
              </div>
            </div>
          )}

          {/* INSIDER */}
          {rpTab === "insider" && (
            <div>
              <div className="ms">
                <div className="mst">Ownership</div>
                <div className="mr">
                  <div className="mrl">% Held by Insiders</div>
                  <div className={`mrv ${cls3(insiderOwn, .1, .03)}`}>{fmtPct(insiderOwn)}</div>
                </div>
                <div className="mr">
                  <div className="mrl">Short % of Float</div>
                  <div className={`mrv ${cls3Lo(shortPct, .05, .15)}`}>{fmtPct(shortPct)}</div>
                </div>
              </div>
              <div className="ms">
                <div className="mst">Recent Transactions</div>
                {qLoading ? <div className="loading">Loading…</div>
                  : insiderTx.length === 0
                    ? <div className="loading" style={{ fontSize: 10 }}>No recent transactions</div>
                    : insiderTx.slice(0, 10).map((ins, i) => (
                      <div className="irow" key={i}>
                        <div>
                          <div className="iname">{ins.name?.fmt || ins.name || "—"}</div>
                          <div className="irole">{ins.relation || ""}</div>
                        </div>
                        <div className="irt">
                          <div className={`itype ${ins.transactionText?.toLowerCase().includes("sale") ? "dn" : "up"}`}>
                            {ins.transactionText?.toLowerCase().includes("sale") ? "SELL" : "BUY"}
                          </div>
                          <div className="ishares">{ins.shares?.fmt ? ins.shares.fmt + " sh" : ""}</div>
                          <div className="ishares">{ins.startDate?.fmt || ""}</div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* RISK */}
          {rpTab === "risk" && <>
            {earningsDays != null && earningsDays > 0 && (
              <div className="ebox">
                <div className="edays">{earningsDays}</div>
                <div className="elabel">days until earnings</div>
              </div>
            )}
            {beta != null && (
              <div className="rgauge">
                <div className="rglabel">Beta</div>
                <div className="rgbar"><div className="rgfill" style={{ width: `${Math.min(100, (beta / 3) * 100)}%`, background: beta > 2 ? "#f04a6a" : beta > 1.5 ? "#f0c14a" : "#4af0a0" }} /></div>
                <div className="rgval">{beta.toFixed(2)}</div>
                <div className="rgsub">{beta < 1 ? "Lower vol than market" : beta < 1.5 ? "Roughly market vol" : beta < 2 ? "High vol" : "Very high vol"}</div>
              </div>
            )}
            {shortPct != null && (
              <div className="rgauge">
                <div className="rglabel">Short Interest</div>
                <div className="rgbar"><div className="rgfill" style={{ width: `${Math.min(100, shortPct * 400)}%`, background: shortPct > .2 ? "#f04a6a" : shortPct > .1 ? "#f0c14a" : "#4af0a0" }} /></div>
                <div className="rgval">{fmtPct(shortPct)}</div>
                <div className="rgsub">{shortPct < .05 ? "Low short interest" : shortPct < .15 ? "Moderate" : shortPct < .25 ? "High — watch" : "Very high"}</div>
              </div>
            )}
            {w52lo && price && (
              <div className="ms">
                <div className="mst">52-Week Position</div>
                {(() => {
                  const pos = ((price - w52lo) / (w52hi - w52lo)) * 100;
                  return <>
                    <div className="rgbar" style={{ margin: "8px 0 4px", height: 8 }}><div className="rgfill" style={{ width: `${pos}%`, background: "linear-gradient(90deg,#4af0a0,#f0c14a,#f04a6a)" }} /></div>
                    <div style={{ fontSize: 11, color: "#c8d6e5" }}>{pos.toFixed(0)}% of range</div>
                    <div className="rgsub">${w52lo.toFixed(2)} → ${w52hi?.toFixed(2)}</div>
                  </>;
                })()}
              </div>
            )}
            <div className="ms">
              <div className="mst">Risk Summary</div>
              {[
                { l: "Volatility",     v: beta == null ? "—" : beta < 1 ? "✓ Low" : beta < 1.5 ? "~ Medium" : "✗ High",                c: beta == null ? "" : beta < 1 ? "good" : beta < 1.5 ? "warn" : "bad" },
                { l: "Short Pressure", v: shortPct == null ? "—" : shortPct < .1 ? "✓ Low" : shortPct < .2 ? "~ Moderate" : "✗ High",  c: shortPct == null ? "" : shortPct < .1 ? "good" : shortPct < .2 ? "warn" : "bad" },
                { l: "Leverage",       v: de == null ? "—" : de < 50 ? "✓ Clean" : de < 150 ? "~ Moderate" : "✗ Leveraged",             c: de == null ? "" : de < 50 ? "good" : de < 150 ? "warn" : "bad" },
                { l: "Earnings Risk",  v: earningsDays == null ? "—" : earningsDays < 14 ? "⚠ Soon" : earningsDays < 30 ? "~ Coming" : "✓ Far", c: earningsDays < 14 ? "bad" : earningsDays < 30 ? "warn" : "good" },
              ].map(m => (
                <div className="mr" key={m.l}>
                  <div className="mrl">{m.l}</div>
                  <div className={`mrv ${m.c}`}>{m.v}</div>
                </div>
              ))}
            </div>
          </>}

        </div>
      </div>

    </div>
  </>;
}
