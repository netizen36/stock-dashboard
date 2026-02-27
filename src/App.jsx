import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const FONT = "'IBM Plex Mono', monospace";
const TF = {"1W":["7d","1d"],"1M":["1mo","1d"],"3M":["3mo","1d"],"6M":["6mo","1wk"],"1Y":["1y","1wk"]};
const DEFAULT_TICKERS = ["NVDA","AAPL","MSFT","META","TSLA","AMZN","GOOGL","BRK-B"];
const DISPLAY_MAP = { "BRK-B": "BRK.B", "BRK.B": "BRK-B" };

// ── STORAGE HELPERS ───────────────────────────────────────────────────────────
const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body,#root{background:#080b0f;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;min-height:100vh}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1e2d3d;border-radius:2px}

  .dash{display:grid;grid-template-rows:48px 1fr;grid-template-columns:260px 1fr 320px;height:100vh;overflow:hidden}

  /* TOPBAR */
  .topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#0a0e14;border-bottom:1px solid #151d27;z-index:100}
  .logo{font-size:13px;font-weight:600;color:#4af0a0;letter-spacing:2px;white-space:nowrap}
  .pills{display:flex;gap:8px}
  .pill{font-size:11px;padding:3px 10px;border:1px solid #1e2d3d;border-radius:2px;color:#6e8aa0;display:flex;gap:6px;align-items:center}
  .pill .v{color:#c8d6e5}
  .up{color:#4af0a0!important}.dn{color:#f04a6a!important}
  .tr{display:flex;align-items:center;gap:10px}
  .sb{background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 12px;width:140px;outline:none;border-radius:2px}
  .sb:focus{border-color:#4af0a0}
  .clk{font-size:11px;color:#3d5068;white-space:nowrap}
  .btn{font-family:'IBM Plex Mono',monospace;font-size:10px;background:none;border:1px solid #1e2d3d;color:#3d5068;padding:3px 10px;cursor:pointer;border-radius:2px;white-space:nowrap}
  .btn:hover{color:#4af0a0;border-color:#4af0a0}
  .btn.danger:hover{color:#f04a6a;border-color:#f04a6a}

  /* LEFT PANEL */
  .lp{background:#090d12;border-right:1px solid #111923;overflow-y:auto;display:flex;flex-direction:column}
  .ph{font-size:10px;letter-spacing:1.5px;color:#3d5068;padding:10px 14px 8px;border-bottom:1px solid #111923;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .ph-add{color:#4af0a0;cursor:pointer;font-size:14px;line-height:1}
  .add-ticker-row{display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid #111923;flex-shrink:0}
  .add-input{flex:1;background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:4px 8px;outline:none;border-radius:2px;text-transform:uppercase}
  .add-input:focus{border-color:#4af0a0}
  .add-btn{background:#4af0a020;border:1px solid #4af0a0;color:#4af0a0;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:4px 10px;cursor:pointer;border-radius:2px}

  .wi{padding:10px 14px;border-bottom:1px solid #0e1620;cursor:pointer;transition:background 0.1s;display:grid;grid-template-columns:1fr auto;gap:2px;position:relative}
  .wi:hover{background:#0d1520}.wi.act{background:#0d1f2e;border-left:2px solid #4af0a0}
  .wi:hover .wi-del{opacity:1}
  .wi-del{position:absolute;top:6px;right:6px;color:#f04a6a;font-size:14px;opacity:0;cursor:pointer;line-height:1;z-index:2}
  .wt{font-size:12px;font-weight:600;color:#e8f0f8}.wn{font-size:10px;color:#3d5068;margin-top:1px}
  .wp{font-size:12px;color:#c8d6e5;text-align:right;padding-right:16px}.wc{font-size:10px;text-align:right;margin-top:1px;padding-right:16px}
  .sbar{margin:5px 0 0;height:3px;background:#111923;border-radius:1px;overflow:hidden}
  .sfill{height:100%;border-radius:1px}
  .wi-pt{font-size:9px;color:#3d5068;margin-top:2px}
  .wi-pt.hit{color:#4af0a0}

  /* CENTER */
  .cp{display:flex;flex-direction:column;overflow:hidden;background:#080b0f}
  .th{padding:12px 20px 10px;border-bottom:1px solid #111923;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  .tt{font-size:20px;font-weight:600;color:#e8f0f8}.tn{font-size:11px;color:#3d5068}
  .tp{font-size:20px;color:#e8f0f8;margin-left:auto}.tc{font-size:13px}
  .sub{padding:4px 20px;border-bottom:1px solid #111923;font-size:10px;color:#3d5068;display:flex;gap:16px;flex-wrap:wrap}
  .tabs{display:flex;gap:2px;padding:6px 20px;border-bottom:1px solid #111923}
  .tab{font-size:10px;padding:3px 10px;cursor:pointer;color:#3d5068;border-radius:2px;transition:all 0.1s}
  .tab:hover{color:#6e8aa0}.tab.act{background:#0d1520;color:#4af0a0}
  .cc{flex:1;padding:10px 10px 0;min-height:0}
  .fs{display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid #111923;background:#090d12;flex-shrink:0}
  .fc{padding:7px 10px;border-right:1px solid #111923}.fc:last-child{border-right:none}
  .fl{font-size:9px;color:#3d5068;letter-spacing:1px;text-transform:uppercase}
  .fv{font-size:11px;color:#c8d6e5;margin-top:3px}
  .fv.good{color:#4af0a0}.fv.warn{color:#f0c14a}.fv.bad{color:#f04a6a}

  /* RIGHT PANEL — TABS */
  .rp{background:#090d12;border-left:1px solid #111923;overflow:hidden;display:flex;flex-direction:column}
  .rp-tabs{display:flex;border-bottom:1px solid #111923;flex-shrink:0}
  .rp-tab{flex:1;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#3d5068;padding:10px 4px;text-align:center;cursor:pointer;border-right:1px solid #111923;transition:all 0.1s}
  .rp-tab:last-child{border-right:none}
  .rp-tab:hover{color:#6e8aa0}
  .rp-tab.act{color:#4af0a0;background:#0d1520}
  .rp-body{flex:1;overflow-y:auto}

  /* SCORE */
  .sc{padding:14px;border-bottom:1px solid #111923}
  .sct{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase}
  .scn{font-size:40px;font-weight:600;margin:4px 0 2px;line-height:1}
  .scn.hi{color:#4af0a0}.scn.mid{color:#f0c14a}.scn.lo{color:#f04a6a}
  .scl{font-size:10px;color:#3d5068}
  .scb{margin-top:8px;height:4px;background:#111923;border-radius:2px;overflow:hidden}
  .scbf{height:100%;border-radius:2px;transition:width 0.5s}
  .ms{padding:12px 14px;border-bottom:1px solid #111923}
  .mst{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase;margin-bottom:10px}
  .mr{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #0e1620}
  .mr:last-child{border-bottom:none}
  .mrl{font-size:10px;color:#3d5068;display:flex;align-items:center;gap:4px}
  .mrv{font-size:11px;color:#c8d6e5}
  .mrv.good{color:#4af0a0}.mrv.warn{color:#f0c14a}.mrv.bad{color:#f04a6a}
  .dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}

  /* NOTES TAB */
  .notes-wrap{padding:14px;display:flex;flex-direction:column;gap:12px;height:100%}
  .notes-label{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase;margin-bottom:6px}
  .pt-row{display:flex;gap:8px;align-items:center}
  .pt-input{flex:1;background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:6px 10px;outline:none;border-radius:2px}
  .pt-input:focus{border-color:#4af0a0}
  .pt-label{font-size:10px;color:#3d5068;white-space:nowrap}
  .mos-bar{height:6px;background:#111923;border-radius:3px;overflow:hidden;margin-top:6px}
  .mos-fill{height:100%;border-radius:3px;transition:width 0.4s}
  .mos-text{font-size:10px;color:#3d5068;margin-top:4px}
  .notes-ta{width:100%;flex:1;min-height:160px;background:#0a0e14;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:10px;outline:none;border-radius:2px;resize:none;line-height:1.6}
  .notes-ta:focus{border-color:#4af0a040}
  .notes-saved{font-size:9px;color:#3d5068;text-align:right}

  /* INSIDER */
  .insider-row{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid #0e1620;font-size:10px}
  .insider-row:last-child{border-bottom:none}
  .ir-name{color:#6e8aa0;margin-bottom:2px}
  .ir-title{color:#2a3d52;font-size:9px}
  .ir-right{text-align:right}
  .ir-type{font-weight:600;margin-bottom:2px}
  .ir-shares{color:#3d5068}

  /* RISK */
  .risk-gauge{padding:14px;border-bottom:1px solid #111923}
  .rg-label{font-size:10px;letter-spacing:1px;color:#3d5068;text-transform:uppercase;margin-bottom:8px}
  .rg-bar{height:8px;background:#111923;border-radius:4px;overflow:hidden;position:relative;margin-bottom:4px}
  .rg-fill{height:100%;border-radius:4px}
  .rg-val{font-size:12px;color:#c8d6e5}
  .rg-sub{font-size:9px;color:#3d5068;margin-top:2px}
  .earnings-box{padding:14px;border-bottom:1px solid #111923;text-align:center}
  .eb-days{font-size:32px;font-weight:600;color:#f0c14a;line-height:1}
  .eb-label{font-size:10px;color:#3d5068;margin-top:4px}
  .eb-date{font-size:11px;color:#6e8aa0;margin-top:6px}

  .lding{color:#3d5068;font-size:11px;padding:20px;text-align:center}
  .ctip{background:#0d1520;border:1px solid #1e2d3d;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-size:11px}
  .ctp{color:#e8f0f8;font-weight:500}.ctd{color:#3d5068;font-size:10px;margin-top:2px}
  .ldot{width:6px;height:6px;border-radius:50%;background:#4af0a0;display:inline-block;margin-right:6px;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  .err{color:#f04a6a;font-size:10px;padding:6px 14px}
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function sc(v){ return v>=75?"#4af0a0":v>=55?"#f0c14a":"#f04a6a"; }
function scCls(v){ return v>=75?"hi":v>=55?"mid":"lo"; }
function fmtB(n){ if(n==null||isNaN(n))return"—"; if(Math.abs(n)>=1e12)return(n/1e12).toFixed(1)+"T"; if(Math.abs(n)>=1e9)return(n/1e9).toFixed(1)+"B"; if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1)+"M"; return n.toFixed(0); }
function pct(n){ return n==null||isNaN(n)?"—":(n*100).toFixed(1)+"%"; }
function yfTicker(t){ return t==="BRK.B"?"BRK-B":t; }
function displayTicker(t){ return t==="BRK-B"?"BRK.B":t; }

function computeScore(q){
  if(!q||!q.regularMarketPrice) return 50;
  let s=50;
  const {trailingPE:pe,trailingPegRatio:peg,grossMargins:gm,returnOnEquity:roe,debtToEquity:de,revenueGrowth:rg,recommendationMean:rec}=q;
  if(pe)  s+=pe<25?8:pe<40?4:pe<60?0:-6;
  if(peg) s+=peg<1?8:peg<2?4:-4;
  if(gm)  s+=gm>.6?8:gm>.35?4:gm>.15?0:-6;
  if(roe) s+=roe>.25?8:roe>.12?4:-4;
  if(de!=null) s+=de<50?6:de<150?2:-4;
  if(rg)  s+=rg>.2?6:rg>.08?3:rg>0?0:-6;
  if(rec) s+=rec<2?6:rec<3?3:rec<4?-2:-6;
  return Math.max(10,Math.min(99,Math.round(s)));
}

const Tip = ({active,payload}) => {
  if(!active||!payload?.length) return null;
  return <div className="ctip"><div className="ctp">${payload[0].value?.toFixed(2)}</div><div className="ctd">{payload[0].payload.date}</div></div>;
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Dashboard(){
  const [tickers, setTickers]   = useState(()=> LS.get("wl_tickers", DEFAULT_TICKERS));
  const [sel, setSel]           = useState("NVDA");
  const [tf, setTf]             = useState("3M");
  const [filter, setFilter]     = useState("");
  const [now, setNow]           = useState(new Date());
  const [quotes, setQ]          = useState({});
  const [chart, setChart]       = useState([]);
  const [cLoad, setCLoad]       = useState(false);
  const [qLoad, setQLoad]       = useState(true);
  const [err, setErr]           = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addVal, setAddVal]     = useState("");
  const [rpTab, setRpTab]       = useState("score");     // score | notes | insider | risk
  const [notes, setNotes]       = useState(()=> LS.get("notes", {}));
  const [targets, setTargets]   = useState(()=> LS.get("targets", {}));
  const [insiders, setInsiders] = useState([]);
  const [iLoad, setILoad]       = useState(false);
  const notesTimer = useRef(null);

  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);

  // Persist tickers
  useEffect(()=>{ LS.set("wl_tickers", tickers); },[tickers]);

  // Fetch quotes
  const fetchQuotes = useCallback(async()=>{
    if(!tickers.length) return;
    try{
      setQLoad(true);
      const fields="regularMarketPrice,regularMarketChangePercent,trailingPE,forwardPE,trailingPegRatio,grossMargins,returnOnEquity,debtToEquity,revenueGrowth,freeCashflow,marketCap,recommendationMean,fiftyTwoWeekLow,fiftyTwoWeekHigh,shortName,regularMarketVolume,trailingAnnualDividendYield,enterpriseToEbitda,beta,earningsTimestamp,sharesShort,sharesOutstanding,floatShares,heldPercentInsiders,trailingEps,priceToBook";
      const res = await fetch(`/api/quotes?symbols=${tickers.join(",")}&fields=${fields}`);
      const json = await res.json();
      const map={};
      (json?.quoteResponse?.result||[]).forEach(q=>{ map[q.symbol]=q; });
      if(Object.keys(map).length===0) throw new Error("Empty response");
      setQ(map); setErr(null);
    }catch(e){ setErr("⚠ "+e.message); }
    finally{ setQLoad(false); }
  },[tickers]);

  useEffect(()=>{ fetchQuotes(); },[fetchQuotes]);
  useEffect(()=>{ const t=setInterval(fetchQuotes,60000); return()=>clearInterval(t); },[fetchQuotes]);

  // Fetch chart
  useEffect(()=>{
    const go=async()=>{
      setCLoad(true);
      try{
        const [range,interval]=TF[tf]||["3mo","1d"];
        const res=await fetch(`/api/chart?symbol=${sel}&range=${range}&interval=${interval}`);
        const json=await res.json();
        const ts=json?.chart?.result?.[0]?.timestamp;
        const closes=json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if(!ts||!closes){setChart([]);return;}
        setChart(ts.map((t,i)=>({
          date:new Date(t*1000).toLocaleDateString("en-US",{month:"short",day:"numeric"}),
          price:closes[i]!=null?parseFloat(closes[i].toFixed(2)):null
        })).filter(d=>d.price!=null));
      }catch{setChart([]);}
      finally{setCLoad(false);}
    };
    go();
  },[sel,tf]);

  // Fetch insider transactions when insider tab opens
  useEffect(()=>{
    if(rpTab!=="insider") return;
    const go=async()=>{
      setILoad(true);
      try{
        const res=await fetch(`/api/insiders?symbol=${sel}`);
        const json=await res.json();
        setInsiders(json?.insiders||[]);
      }catch{ setInsiders([]); }
      finally{ setILoad(false); }
    };
    go();
  },[rpTab,sel]);

  // Add ticker
  const addTicker = ()=>{
    const t = addVal.trim().toUpperCase();
    if(!t||tickers.includes(t)) { setAddVal(""); setShowAdd(false); return; }
    setTickers(prev=>[...prev,t]);
    setAddVal(""); setShowAdd(false); setSel(t);
  };

  // Remove ticker
  const removeTicker = (t,e)=>{
    e.stopPropagation();
    setTickers(prev=>prev.filter(x=>x!==t));
    if(sel===t) setSel(tickers.find(x=>x!==t)||"");
  };

  // Notes autosave
  const handleNotes = (val)=>{
    setNotes(prev=>{ const n={...prev,[sel]:val}; LS.set("notes",n); return n; });
  };

  // Price target
  const handleTarget = (val)=>{
    setTargets(prev=>{ const n={...prev,[sel]:val}; LS.set("targets",n); return n; });
  };

  const q    = quotes[sel]||{};
  const price= q.regularMarketPrice;
  const chg  = q.regularMarketChangePercent;
  const isUp = chg>=0;
  const score= computeScore(q);
  const cMin = chart.length?Math.min(...chart.map(d=>d.price))*.985:0;
  const cMax = chart.length?Math.max(...chart.map(d=>d.price))*1.015:1;
  const cUp  = chart.length>=2?chart[chart.length-1].price>=chart[0].price:true;

  const filtered = tickers.filter(t=>
    displayTicker(t).toLowerCase().includes(filter.toLowerCase())||
    (quotes[t]?.shortName||"").toLowerCase().includes(filter.toLowerCase())
  );
  const topStocks = tickers.slice(0,3).map(t=>quotes[t]).filter(Boolean);

  // Target / margin of safety
  const pt = parseFloat(targets[sel]);
  const mos = price&&pt&&pt>0 ? ((pt-price)/pt*100) : null;

  // Earnings countdown
  const earningsTs = q.earningsTimestamp;
  const earningsDays = earningsTs ? Math.round((earningsTs*1000 - Date.now())/(1000*60*60*24)) : null;

  // Short interest
  const shortPct = q.sharesShort&&q.floatShares ? (q.sharesShort/q.floatShares*100) : null;

  const fvClsLow=(v,g,w)=>!v&&v!==0?"":v<=g?"good":v<=w?"warn":"bad";
  const fvCls=(v,g,w)=>!v&&v!==0?"":v>=g?"good":v>=w?"warn":"bad";

  return <>
    <style>{styles}</style>
    <div className="dash">

      {/* TOPBAR */}
      <div className="topbar">
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div className="logo">◈ TERMINAL</div>
          <div className="pills">
            {topStocks.map(s=>(
              <div className="pill" key={s.symbol}>
                <span style={{color:"#4d6478"}}>{displayTicker(s.symbol)}</span>
                <span className="v">${s.regularMarketPrice?.toFixed(2)}</span>
                <span className={s.regularMarketChangePercent>=0?"up":"dn"}>
                  {s.regularMarketChangePercent>=0?"+":""}{s.regularMarketChangePercent?.toFixed(2)}%
                </span>
              </div>
            ))}
            {qLoad&&<div className="pill"><span style={{color:"#2a3d52"}}>Loading…</span></div>}
          </div>
        </div>
        <div className="tr">
          <button className="btn" onClick={fetchQuotes}>↻</button>
          <input className="sb" placeholder="Filter…" value={filter} onChange={e=>setFilter(e.target.value)}/>
          <div className="clk"><span className="ldot"/>{now.toLocaleTimeString("en-US",{hour12:false})} EST</div>
        </div>
      </div>

      {/* LEFT — WATCHLIST */}
      <div className="lp">
        <div className="ph">
          Watchlist
          <span className="ph-add" onClick={()=>setShowAdd(v=>!v)}>{showAdd?"✕":"+"}</span>
        </div>
        {showAdd&&(
          <div className="add-ticker-row">
            <input
              className="add-input" placeholder="TICKER" value={addVal}
              onChange={e=>setAddVal(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter"&&addTicker()}
              autoFocus maxLength={6}
            />
            <button className="add-btn" onClick={addTicker}>Add</button>
          </div>
        )}
        {err&&<div className="err">{err}</div>}
        {filtered.map(t=>{
          const dq=quotes[t]||{};
          const dp=dq.regularMarketPrice;
          const dc=dq.regularMarketChangePercent;
          const ds=computeScore(dq);
          const dpt=parseFloat(targets[t]);
          const ptHit=dpt>0&&dp>=dpt;
          return (
            <div key={t} className={`wi${sel===t?" act":""}`} onClick={()=>setSel(t)}>
              <div>
                <div className="wt">{displayTicker(t)}</div>
                <div className="wn">{dq.shortName||t}</div>
                {dpt>0&&<div className={`wi-pt${ptHit?" hit":""}`}>
                  {ptHit?"✓ Target hit":"Target: $"+dpt.toFixed(2)}
                </div>}
                <div className="sbar">
                  <div className="sfill" style={{width:`${qLoad?20:ds}%`,background:`linear-gradient(90deg,${sc(ds)}44,${sc(ds)})`}}/>
                </div>
              </div>
              <div>
                <div className="wp">{dp?`$${dp.toFixed(2)}`:"—"}</div>
                <div className={`wc${dc>=0?" up":" dn"}`}>{dc!=null?`${dc>=0?"▲":"▼"} ${Math.abs(dc).toFixed(2)}%`:"—"}</div>
                <div className="wi-del" onClick={e=>removeTicker(t,e)}>×</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTER */}
      <div className="cp">
        <div className="th">
          <span className="tt">{displayTicker(sel)}</span>
          <span className="tn">{q.shortName||sel}</span>
          <span className="tp">{price?`$${price.toFixed(2)}`:"—"}</span>
          <span className={`tc${isUp?" up":" dn"}`}>{chg!=null?`${isUp?"+":""}${chg.toFixed(2)}%`:"—"}</span>
        </div>
        {q.fiftyTwoWeekLow&&(
          <div className="sub">
            <span>52W: ${q.fiftyTwoWeekLow?.toFixed(2)} – ${q.fiftyTwoWeekHigh?.toFixed(2)}</span>
            <span>Vol: {fmtB(q.regularMarketVolume)}</span>
            <span>Cap: {fmtB(q.marketCap)}</span>
            {q.beta!=null&&<span>Beta: {q.beta?.toFixed(2)}</span>}
            {shortPct!=null&&<span>Short: {shortPct.toFixed(1)}%</span>}
          </div>
        )}
        <div className="tabs">
          {["1W","1M","3M","6M","1Y"].map(t=>(
            <div key={t} className={`tab${tf===t?" act":""}`} onClick={()=>setTf(t)}>{t}</div>
          ))}
        </div>
        <div className="cc">
          {cLoad?<div className="lding">Loading chart…</div>:chart.length>0?(
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{top:8,right:16,bottom:4,left:0}}>
                <XAxis dataKey="date" tick={{fill:"#2a3d52",fontSize:10,fontFamily:FONT}} tickLine={false} axisLine={false} interval={Math.floor(chart.length/6)}/>
                <YAxis domain={[cMin,cMax]} tick={{fill:"#2a3d52",fontSize:10,fontFamily:FONT}} tickLine={false} axisLine={false} width={65} tickFormatter={v=>`$${v.toFixed(0)}`}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine y={chart[0]?.price} stroke="#1e2d3d" strokeDasharray="3 3"/>
                {pt>0&&<ReferenceLine y={pt} stroke="#4af0a040" strokeDasharray="4 2" label={{value:"Target",fill:"#4af0a060",fontSize:9,fontFamily:FONT}}/>}
                <Line type="monotone" dataKey="price" stroke={cUp?"#4af0a0":"#f04a6a"} strokeWidth={1.5} dot={false} activeDot={{r:3,fill:cUp?"#4af0a0":"#f04a6a"}}/>
              </LineChart>
            </ResponsiveContainer>
          ):<div className="lding">No chart data</div>}
        </div>
        <div className="fs">
          {[
            {l:"P/E (TTM)",   v:q.trailingPE?.toFixed(1),           cls:fvClsLow(q.trailingPE,25,50)},
            {l:"Fwd P/E",    v:q.forwardPE?.toFixed(1),             cls:fvClsLow(q.forwardPE,20,40)},
            {l:"EV/EBITDA",  v:q.enterpriseToEbitda?.toFixed(1),    cls:fvClsLow(q.enterpriseToEbitda,15,30)},
            {l:"Gross Mgn",  v:q.grossMargins?pct(q.grossMargins):null,    cls:fvCls(q.grossMargins,.5,.25)},
            {l:"ROE",        v:q.returnOnEquity?pct(q.returnOnEquity):null,cls:fvCls(q.returnOnEquity,.2,.08)},
            {l:"Rev Growth", v:q.revenueGrowth?pct(q.revenueGrowth):null, cls:fvCls(q.revenueGrowth,.15,0)},
            {l:"P/FCF",      v:q.freeCashflow&&price?(price/(q.freeCashflow/q.sharesOutstanding||1)).toFixed(1):null, cls:""},
          ].map(f=>(
            <div className="fc" key={f.l}>
              <div className="fl">{f.l}</div>
              <div className={`fv${f.cls?" "+f.cls:""}`}>{f.v||"—"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="rp">
        <div className="rp-tabs">
          {[["score","Score"],["notes","Notes"],["insider","Insider"],["risk","Risk"]].map(([id,label])=>(
            <div key={id} className={`rp-tab${rpTab===id?" act":""}`} onClick={()=>setRpTab(id)}>{label}</div>
          ))}
        </div>
        <div className="rp-body">

          {/* SCORE TAB */}
          {rpTab==="score"&&<>
            <div className="sc">
              <div className="sct">Investment Score</div>
              <div className={`scn ${scCls(score)}`}>{qLoad?"…":score}</div>
              <div className="scl">out of 100 · live data</div>
              <div className="scb"><div className="scbf" style={{width:`${score}%`,background:`linear-gradient(90deg,${sc(score)}44,${sc(score)})`}}/></div>
            </div>
            <div className="ms">
              <div className="mst">Live Metrics</div>
              {[
                {l:"Insider Own",  v:q.heldPercentInsiders?pct(q.heldPercentInsiders):"—", cls:fvCls(q.heldPercentInsiders,.1,.03)},
                {l:"D/E Ratio",    v:q.debtToEquity!=null?q.debtToEquity.toFixed(1):"—",  cls:fvClsLow(q.debtToEquity,50,150)},
                {l:"PEG Ratio",    v:q.trailingPegRatio?q.trailingPegRatio.toFixed(2):"—",cls:fvClsLow(q.trailingPegRatio,1.5,2.5)},
                {l:"Analyst",      v:q.recommendationMean?["","Strong Buy","Buy","Hold","Underperform","Sell"][Math.round(q.recommendationMean)]||q.recommendationMean.toFixed(1):"—", cls:fvClsLow(q.recommendationMean,2,3)},
                {l:"Div Yield",    v:q.trailingAnnualDividendYield?pct(q.trailingAnnualDividendYield):"None", cls:""},
              ].map(m=>(
                <div className="mr" key={m.l}>
                  <div className="mrl"><span className="dot" style={{background:sc(score),marginRight:6}}/>{m.l}</div>
                  <div className={`mrv${m.cls?" "+m.cls:""}`}>{m.v}</div>
                </div>
              ))}
            </div>
            <div className="ms">
              <div className="mst">Framework Signals</div>
              {[
                {l:"Pricing Power",v:!q.grossMargins?"—":q.grossMargins>.5?"✓ Strong":q.grossMargins>.25?"~ Moderate":"✗ Weak",  cls:!q.grossMargins?"":q.grossMargins>.5?"good":q.grossMargins>.25?"warn":"bad"},
                {l:"Valuation",    v:!q.trailingPE?"—":q.trailingPE<25?"✓ Cheap":q.trailingPE<45?"~ Fair":"✗ Expensive",         cls:!q.trailingPE?"":q.trailingPE<25?"good":q.trailingPE<45?"warn":"bad"},
                {l:"Balance Sheet",v:q.debtToEquity==null?"—":q.debtToEquity<50?"✓ Clean":q.debtToEquity<150?"~ Moderate":"✗ Leveraged",cls:q.debtToEquity==null?"":q.debtToEquity<50?"good":q.debtToEquity<150?"warn":"bad"},
                {l:"Growth",       v:q.revenueGrowth==null?"—":q.revenueGrowth>.15?"✓ Strong":q.revenueGrowth>0?"~ Slow":"✗ Declining",  cls:q.revenueGrowth==null?"":q.revenueGrowth>.15?"good":q.revenueGrowth>0?"warn":"bad"},
                {l:"Profitability", v:!q.returnOnEquity?"—":q.returnOnEquity>.2?"✓ High":q.returnOnEquity>.08?"~ Moderate":"✗ Low",      cls:!q.returnOnEquity?"":q.returnOnEquity>.2?"good":q.returnOnEquity>.08?"warn":"bad"},
              ].map(m=>(
                <div className="mr" key={m.l}>
                  <div className="mrl">{m.l}</div>
                  <div className={`mrv${m.cls?" "+m.cls:""}`}>{m.v}</div>
                </div>
              ))}
            </div>
          </>}

          {/* NOTES TAB */}
          {rpTab==="notes"&&(
            <div className="notes-wrap">
              <div>
                <div className="notes-label">Price Target</div>
                <div className="pt-row">
                  <span className="pt-label">$</span>
                  <input
                    className="pt-input" type="number" placeholder="0.00"
                    value={targets[sel]||""}
                    onChange={e=>handleTarget(e.target.value)}
                  />
                </div>
                {price&&pt>0&&(
                  <>
                    <div className="mos-bar">
                      <div className="mos-fill" style={{
                        width:`${Math.min(100,Math.abs(mos))}%`,
                        background: mos>0?"#4af0a0":mos<-20?"#f04a6a":"#f0c14a"
                      }}/>
                    </div>
                    <div className="mos-text">
                      {mos>0?`${mos.toFixed(1)}% upside`:`${Math.abs(mos).toFixed(1)}% above target`}
                      {" · "}{mos>15?"✓ MoS OK":mos>0?"~ Thin MoS":"✗ No MoS"}
                    </div>
                  </>
                )}
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                <div className="notes-label">Thesis / Notes</div>
                <textarea
                  className="notes-ta"
                  placeholder={"Moat thesis:\nCatalyst:\nRisks:\nPosition size:"}
                  value={notes[sel]||""}
                  onChange={e=>handleNotes(e.target.value)}
                />
                <div className="notes-saved">Auto-saved locally</div>
              </div>
            </div>
          )}

          {/* INSIDER TAB */}
          {rpTab==="insider"&&(
            <div className="ms">
              <div className="mst">Insider Ownership</div>
              <div className="mr">
                <div className="mrl">% Held by Insiders</div>
                <div className={`mrv ${fvCls(q.heldPercentInsiders,.1,.03)}`}>{q.heldPercentInsiders?pct(q.heldPercentInsiders):"—"}</div>
              </div>
              <div style={{marginTop:14}}>
                <div className="mst">Recent Transactions</div>
                {iLoad?<div className="lding">Loading…</div>:insiders.length===0?(
                  <div className="lding" style={{fontSize:10}}>No recent transactions found</div>
                ):insiders.slice(0,8).map((ins,i)=>(
                  <div className="insider-row" key={i}>
                    <div>
                      <div className="ir-name">{ins.name||"Unknown"}</div>
                      <div className="ir-title">{ins.relation||""}</div>
                    </div>
                    <div className="ir-right">
                      <div className={`ir-type ${ins.transactionText?.includes("Sale")?"dn":"up"}`}>
                        {ins.transactionText?.includes("Sale")?"SELL":"BUY"}
                      </div>
                      <div className="ir-shares">{ins.shares?fmtB(ins.shares)+" sh":""}</div>
                      <div className="ir-shares">{ins.startDate?.fmt||""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RISK TAB */}
          {rpTab==="risk"&&<>
            {earningsDays!=null&&(
              <div className="earnings-box">
                <div className="eb-days">{earningsDays<0?"—":earningsDays}</div>
                <div className="eb-label">days until earnings</div>
                {q.earningsTimestamp&&<div className="eb-date">{new Date(q.earningsTimestamp*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>}
              </div>
            )}
            <div className="risk-gauge">
              <div className="rg-label">Beta (Market Sensitivity)</div>
              <div className="rg-bar">
                <div className="rg-fill" style={{width:`${Math.min(100,(q.beta||0)/3*100)}%`,background:q.beta>2?"#f04a6a":q.beta>1.5?"#f0c14a":"#4af0a0"}}/>
              </div>
              <div className="rg-val">{q.beta?.toFixed(2)||"—"}</div>
              <div className="rg-sub">{q.beta<1?"Lower volatility than market":q.beta<1.5?"Roughly market volatility":q.beta<2?"Higher volatility":"Very high volatility"}</div>
            </div>
            {shortPct!=null&&(
              <div className="risk-gauge">
                <div className="rg-label">Short Interest</div>
                <div className="rg-bar">
                  <div className="rg-fill" style={{width:`${Math.min(100,shortPct*2.5)}%`,background:shortPct>20?"#f04a6a":shortPct>10?"#f0c14a":"#4af0a0"}}/>
                </div>
                <div className="rg-val">{shortPct.toFixed(1)}% of float</div>
                <div className="rg-sub">{shortPct<5?"Low short interest":shortPct<15?"Moderate — watch":shortPct<25?"High — elevated risk":"Very high — squeeze potential or deep concern"}</div>
              </div>
            )}
            <div className="ms">
              <div className="mst">52-Week Position</div>
              {price&&q.fiftyTwoWeekLow&&(()=>{
                const pos=(price-q.fiftyTwoWeekLow)/(q.fiftyTwoWeekHigh-q.fiftyTwoWeekLow)*100;
                return <>
                  <div className="rg-bar" style={{margin:"8px 0 4px"}}>
                    <div className="rg-fill" style={{width:`${pos}%`,background:`linear-gradient(90deg,#4af0a0,#f0c14a,#f04a6a)`}}/>
                  </div>
                  <div style={{fontSize:11,color:"#c8d6e5"}}>{pos.toFixed(0)}% of 52-week range</div>
                  <div className="rg-sub">${q.fiftyTwoWeekLow?.toFixed(2)} → ${q.fiftyTwoWeekHigh?.toFixed(2)}</div>
                </>;
              })()}
            </div>
            <div className="ms">
              <div className="mst">Risk Summary</div>
              {[
                {l:"Volatility",   v:q.beta<1?"✓ Low":q.beta<1.5?"~ Medium":"✗ High",           cls:q.beta<1?"good":q.beta<1.5?"warn":"bad"},
                {l:"Short Pressure",v:!shortPct?"—":shortPct<10?"✓ Low":shortPct<20?"~ Moderate":"✗ High", cls:!shortPct?"":shortPct<10?"good":shortPct<20?"warn":"bad"},
                {l:"Leverage",     v:q.debtToEquity==null?"—":q.debtToEquity<50?"✓ Clean":q.debtToEquity<150?"~ Moderate":"✗ Leveraged", cls:q.debtToEquity==null?"":q.debtToEquity<50?"good":q.debtToEquity<150?"warn":"bad"},
                {l:"Earnings Risk",v:earningsDays==null?"—":earningsDays<14?"⚠ Soon":earningsDays<30?"~ Coming":"✓ Far",  cls:earningsDays<14?"bad":earningsDays<30?"warn":"good"},
              ].map(m=>(
                <div className="mr" key={m.l}>
                  <div className="mrl">{m.l}</div>
                  <div className={`mrv ${m.cls}`}>{m.v}</div>
                </div>
              ))}
            </div>
          </>}

        </div>
      </div>

    </div>
  </>;
}
