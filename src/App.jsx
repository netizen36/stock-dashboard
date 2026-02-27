import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const FONT = "'IBM Plex Mono', monospace";

const TICKERS = ["NVDA","AAPL","MSFT","META","TSLA","AMZN","GOOGL","BRK-B"];
const DISPLAY = { "BRK-B": "BRK.B" };
const NAMES = {
  NVDA:"NVIDIA Corp", AAPL:"Apple Inc", MSFT:"Microsoft Corp",
  META:"Meta Platforms", TSLA:"Tesla Inc", AMZN:"Amazon.com",
  GOOGL:"Alphabet Inc", "BRK-B":"Berkshire Hathaway"
};
const PORTFOLIO = [
  {ticker:"NVDA",alloc:"32%"},{ticker:"MSFT",alloc:"24%"},
  {ticker:"META",alloc:"18%"},{ticker:"GOOGL",alloc:"14%"},{ticker:"TSLA",alloc:"12%"},
];
const TF = {"1W":["7d","1d"],"1M":["1mo","1d"],"3M":["3mo","1d"],"6M":["6mo","1wk"],"1Y":["1y","1wk"]};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body,#root{background:#080b0f;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;min-height:100vh}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1e2d3d;border-radius:2px}
  .dash{display:grid;grid-template-rows:48px 1fr;grid-template-columns:260px 1fr 300px;height:100vh}
  .topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#0a0e14;border-bottom:1px solid #151d27}
  .logo{font-size:13px;font-weight:600;color:#4af0a0;letter-spacing:2px}
  .pills{display:flex;gap:8px}
  .pill{font-size:11px;padding:3px 10px;border:1px solid #1e2d3d;border-radius:2px;color:#6e8aa0;display:flex;gap:6px;align-items:center}
  .pill .v{color:#c8d6e5}
  .up{color:#4af0a0!important}.dn{color:#f04a6a!important}
  .tr{display:flex;align-items:center;gap:12px}
  .sb{background:#0d1520;border:1px solid #1e2d3d;color:#c8d6e5;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 12px;width:160px;outline:none;border-radius:2px}
  .sb:focus{border-color:#4af0a0}
  .clk{font-size:11px;color:#3d5068}
  .lp{background:#090d12;border-right:1px solid #111923;overflow-y:auto}
  .ph{font-size:10px;letter-spacing:1.5px;color:#3d5068;padding:12px 14px 8px;border-bottom:1px solid #111923;text-transform:uppercase}
  .wi{padding:10px 14px;border-bottom:1px solid #0e1620;cursor:pointer;transition:background 0.1s;display:grid;grid-template-columns:1fr auto;gap:2px}
  .wi:hover{background:#0d1520}.wi.act{background:#0d1f2e;border-left:2px solid #4af0a0}
  .wt{font-size:12px;font-weight:600;color:#e8f0f8}.wn{font-size:10px;color:#3d5068;margin-top:1px}
  .wp{font-size:12px;color:#c8d6e5;text-align:right}.wc{font-size:10px;text-align:right;margin-top:1px}
  .sbar{margin:5px 0 0;height:3px;background:#111923;border-radius:1px;overflow:hidden}
  .sfill{height:100%;border-radius:1px}
  .cp{display:flex;flex-direction:column;overflow:hidden;background:#080b0f}
  .th{padding:14px 20px 10px;border-bottom:1px solid #111923;display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
  .tt{font-size:22px;font-weight:600;color:#e8f0f8}.tn{font-size:11px;color:#3d5068}
  .tp{font-size:22px;color:#e8f0f8;margin-left:auto}.tc{font-size:13px}
  .sub{padding:4px 20px;border-bottom:1px solid #111923;font-size:10px;color:#3d5068}
  .tabs{display:flex;gap:2px;padding:6px 20px;border-bottom:1px solid #111923}
  .tab{font-size:10px;padding:3px 10px;cursor:pointer;color:#3d5068;border-radius:2px;transition:all 0.1s}
  .tab:hover{color:#6e8aa0}.tab.act{background:#0d1520;color:#4af0a0}
  .cc{flex:1;padding:10px 10px 0;min-height:0}
  .fs{display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid #111923;background:#090d12}
  .fc{padding:8px 12px;border-right:1px solid #111923}.fc:last-child{border-right:none}
  .fl{font-size:9px;color:#3d5068;letter-spacing:1px;text-transform:uppercase}
  .fv{font-size:12px;color:#c8d6e5;margin-top:3px}
  .fv.good{color:#4af0a0}.fv.warn{color:#f0c14a}.fv.bad{color:#f04a6a}
  .rp{background:#090d12;border-left:1px solid #111923;overflow-y:auto;display:flex;flex-direction:column}
  .sc{padding:14px;border-bottom:1px solid #111923}
  .sct{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase}
  .scn{font-size:42px;font-weight:600;margin:6px 0 4px;line-height:1}
  .scn.hi{color:#4af0a0}.scn.mid{color:#f0c14a}.scn.lo{color:#f04a6a}
  .scl{font-size:11px;color:#3d5068}
  .scb{margin-top:10px;height:4px;background:#111923;border-radius:2px;overflow:hidden}
  .scbf{height:100%;border-radius:2px;transition:width 0.5s}
  .ms{padding:12px 14px;border-bottom:1px solid #111923}
  .mst{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase;margin-bottom:10px}
  .mr{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #0e1620}
  .mr:last-child{border-bottom:none}
  .mrl{font-size:10px;color:#3d5068}.mrv{font-size:11px;color:#c8d6e5}
  .mrv.good{color:#4af0a0}.mrv.warn{color:#f0c14a}.mrv.bad{color:#f04a6a}
  .dot{width:6px;height:6px;border-radius:50%;margin-right:6px;display:inline-block}
  .ps{padding:12px 14px}
  .pst{font-size:10px;letter-spacing:1.5px;color:#3d5068;text-transform:uppercase;margin-bottom:10px}
  .pr{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:6px 0;border-bottom:1px solid #0e1620;align-items:center;font-size:11px;cursor:pointer}
  .pr:last-child{border-bottom:none}
  .prt{color:#e8f0f8;font-weight:500}.pra{color:#3d5068}
  .lding{color:#3d5068;font-size:11px;padding:20px;text-align:center}
  .ctip{background:#0d1520;border:1px solid #1e2d3d;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-size:11px}
  .ctp{color:#e8f0f8;font-weight:500}.ctd{color:#3d5068;font-size:10px;margin-top:2px}
  .ldot{width:6px;height:6px;border-radius:50%;background:#4af0a0;display:inline-block;margin-right:6px;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  .err{color:#f04a6a;font-size:10px;padding:6px 14px}
  .refresh-btn{font-family:'IBM Plex Mono',monospace;font-size:10px;background:none;border:1px solid #1e2d3d;color:#3d5068;padding:3px 10px;cursor:pointer;border-radius:2px}
  .refresh-btn:hover{color:#4af0a0;border-color:#4af0a0}
`;

function sc(v){ return v>=75?"#4af0a0":v>=55?"#f0c14a":"#f04a6a"; }
function scCls(v){ return v>=75?"hi":v>=55?"mid":"lo"; }
function fmtB(n){ if(n==null||isNaN(n))return"—"; if(Math.abs(n)>=1e12)return(n/1e12).toFixed(1)+"T"; if(Math.abs(n)>=1e9)return(n/1e9).toFixed(1)+"B"; if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1)+"M"; return n.toFixed(0); }
function pct(n){ return n==null||isNaN(n)?"—":(n*100).toFixed(1)+"%"; }

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

export default function Dashboard(){
  const [sel,setSel]    = useState("NVDA");
  const [tf,setTf]      = useState("3M");
  const [filter,setFilter] = useState("");
  const [now,setNow]    = useState(new Date());
  const [quotes,setQ]   = useState({});
  const [chart,setChart]= useState([]);
  const [cLoad,setCLoad]= useState(false);
  const [qLoad,setQLoad]= useState(true);
  const [err,setErr]    = useState(null);

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);

  const fetchQuotes = useCallback(async()=>{
    try{
      setQLoad(true);
      const res = await fetch(`/api/quotes?symbols=${TICKERS.join(",")}`);
      const json = await res.json();
      const map={};
      (json?.quoteResponse?.result||[]).forEach(q=>{map[q.symbol]=q;});
      if(Object.keys(map).length===0) throw new Error("Empty response");
      setQ(map); setErr(null);
    }catch(e){
      setErr("⚠ Failed to load quotes — " + e.message);
    }finally{ setQLoad(false); }
  },[]);

  useEffect(()=>{ fetchQuotes(); },[fetchQuotes]);
  useEffect(()=>{ const t=setInterval(fetchQuotes,60000); return()=>clearInterval(t); },[fetchQuotes]);

  useEffect(()=>{
    const go=async()=>{
      setCLoad(true);
      try{
        const [range,interval]=TF[tf]||["3mo","1d"];
        const res = await fetch(`/api/chart?symbol=${sel}&range=${range}&interval=${interval}`);
        const json = await res.json();
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

  const q=quotes[sel]||{};
  const price=q.regularMarketPrice;
  const chg=q.regularMarketChangePercent;
  const isUp=chg>=0;
  const score=computeScore(q);
  const cMin=chart.length?Math.min(...chart.map(d=>d.price))*.985:0;
  const cMax=chart.length?Math.max(...chart.map(d=>d.price))*1.015:1;
  const cUp=chart.length>=2?chart[chart.length-1].price>=chart[0].price:true;

  const filtered=TICKERS.filter(t=>
    (DISPLAY[t]||t).toLowerCase().includes(filter.toLowerCase())||
    (NAMES[t]||"").toLowerCase().includes(filter.toLowerCase())
  );

  const topStocks=["NVDA","AAPL","MSFT"].map(t=>quotes[t]).filter(Boolean);
  const fvClsLow=(v,g,w)=>!v&&v!==0?"":v<=g?"good":v<=w?"warn":"bad";
  const fvCls=(v,g,w)=>!v&&v!==0?"":v>=g?"good":v>=w?"warn":"bad";

  return <>
    <style>{styles}</style>
    <div className="dash">

      <div className="topbar">
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div className="logo">◈ TERMINAL</div>
          <div className="pills">
            {topStocks.map(s=>(
              <div className="pill" key={s.symbol}>
                <span style={{color:"#4d6478"}}>{DISPLAY[s.symbol]||s.symbol}</span>
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
          <button className="refresh-btn" onClick={fetchQuotes}>↻ Refresh</button>
          <input className="sb" placeholder="Filter tickers…" value={filter} onChange={e=>setFilter(e.target.value)}/>
          <div className="clk"><span className="ldot"/>{now.toLocaleTimeString("en-US",{hour12:false})} EST</div>
        </div>
      </div>

      <div className="lp">
        <div className="ph">Watchlist</div>
        {err&&<div className="err">{err}</div>}
        {filtered.map(t=>{
          const dq=quotes[t]||{};
          const dp=dq.regularMarketPrice;
          const dc=dq.regularMarketChangePercent;
          const ds=computeScore(dq);
          return (
            <div key={t} className={`wi${sel===t?" act":""}`} onClick={()=>setSel(t)}>
              <div>
                <div className="wt">{DISPLAY[t]||t}</div>
                <div className="wn">{NAMES[t]}</div>
                <div className="sbar">
                  <div className="sfill" style={{width:`${qLoad?20:ds}%`,background:`linear-gradient(90deg,${sc(ds)}44,${sc(ds)})`}}/>
                </div>
              </div>
              <div>
                <div className="wp">{dp?`$${dp.toFixed(2)}`:"—"}</div>
                <div className={`wc${dc>=0?" up":" dn"}`}>{dc!=null?`${dc>=0?"▲":"▼"} ${Math.abs(dc).toFixed(2)}%`:"—"}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cp">
        <div className="th">
          <span className="tt">{DISPLAY[sel]||sel}</span>
          <span className="tn">{q.shortName||NAMES[sel]}</span>
          <span className="tp">{price?`$${price.toFixed(2)}`:"—"}</span>
          <span className={`tc${isUp?" up":" dn"}`}>{chg!=null?`${isUp?"+":""}${chg.toFixed(2)}%`:"—"}</span>
        </div>
        {q.fiftyTwoWeekLow&&(
          <div className="sub">
            52W: ${q.fiftyTwoWeekLow?.toFixed(2)} – ${q.fiftyTwoWeekHigh?.toFixed(2)}
            &nbsp;·&nbsp; Vol: {fmtB(q.regularMarketVolume)}
            &nbsp;·&nbsp; Cap: {fmtB(q.marketCap)}
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
                <Line type="monotone" dataKey="price" stroke={cUp?"#4af0a0":"#f04a6a"} strokeWidth={1.5} dot={false} activeDot={{r:3,fill:cUp?"#4af0a0":"#f04a6a"}}/>
              </LineChart>
            </ResponsiveContainer>
          ):<div className="lding">No chart data</div>}
        </div>
        <div className="fs">
          {[
            {l:"P/E (TTM)",   v:q.trailingPE?.toFixed(1),            cls:fvClsLow(q.trailingPE,25,50)},
            {l:"Fwd P/E",    v:q.forwardPE?.toFixed(1),              cls:fvClsLow(q.forwardPE,20,40)},
            {l:"EV/EBITDA",  v:q.enterpriseToEbitda?.toFixed(1),     cls:fvClsLow(q.enterpriseToEbitda,15,30)},
            {l:"Gross Mgn",  v:q.grossMargins?pct(q.grossMargins):null,     cls:fvCls(q.grossMargins,.5,.25)},
            {l:"ROE",        v:q.returnOnEquity?pct(q.returnOnEquity):null, cls:fvCls(q.returnOnEquity,.2,.08)},
            {l:"Rev Growth", v:q.revenueGrowth?pct(q.revenueGrowth):null,  cls:fvCls(q.revenueGrowth,.15,0)},
            {l:"FCF",        v:fmtB(q.freeCashflow), cls:""},
          ].map(f=>(
            <div className="fc" key={f.l}>
              <div className="fl">{f.l}</div>
              <div className={`fv${f.cls?" "+f.cls:""}`}>{f.v||"—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rp">
        <div className="sc">
          <div className="sct">Investment Score</div>
          <div className={`scn ${scCls(score)}`}>{qLoad?"…":score}</div>
          <div className="scl">out of 100 · live data</div>
          <div className="scb"><div className="scbf" style={{width:`${score}%`,background:`linear-gradient(90deg,${sc(score)}44,${sc(score)})`}}/></div>
        </div>

        <div className="ms">
          <div className="mst">Live Metrics</div>
          {[
            {l:"D/E Ratio",   v:q.debtToEquity!=null?q.debtToEquity.toFixed(1):"—",  cls:fvClsLow(q.debtToEquity,50,150)},
            {l:"PEG Ratio",   v:q.trailingPegRatio?q.trailingPegRatio.toFixed(2):"—",cls:fvClsLow(q.trailingPegRatio,1.5,2.5)},
            {l:"Analyst",     v:q.recommendationMean?["","Strong Buy","Buy","Hold","Underperform","Sell"][Math.round(q.recommendationMean)]||q.recommendationMean.toFixed(1):"—", cls:fvClsLow(q.recommendationMean,2,3)},
            {l:"Market Cap",  v:fmtB(q.marketCap), cls:""},
            {l:"Div Yield",   v:q.trailingAnnualDividendYield?pct(q.trailingAnnualDividendYield):"None", cls:""},
          ].map(m=>(
            <div className="mr" key={m.l}>
              <div className="mrl"><span className="dot" style={{background:sc(score)}}/>{m.l}</div>
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

        <div className="ps">
          <div className="pst">My Portfolio</div>
          {PORTFOLIO.map(p=>{
            const pq=quotes[p.ticker]||{};
            const pc=pq.regularMarketChangePercent;
            return (
              <div className="pr" key={p.ticker} onClick={()=>setSel(p.ticker)}>
                <div className="prt">{p.ticker}</div>
                <div className="pra">{p.alloc}</div>
                <div className={pc>=0?"up":"dn"}>{pc!=null?`${pc>=0?"+":""}${pc.toFixed(2)}%`:"—"}</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  </>;
}
