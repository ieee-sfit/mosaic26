import './station3.css';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ASSET SYSTEM
const ASSETS = {
  hero_bg: "", city_night_bg: "", rain_overlay: "", logo_mark: "",
  role_operator: "", role_verifier: "", role_tactician: "",
  plate_bg: "", cam2_thumb_C3: "",
  road_sign_school: "", road_sign_residential: "", road_sign_urban: "", road_sign_highway: "",
  vehicle_ambulance: "", car_1: "", car_2: "", car_3: "", car_4: "", car_5: "", car_6: "",
  tier_rookie: "", tier_officer: "", tier_inspector: "", tier_dcp: "", ticket_texture: ""
};

// Data
const pA = [
  {q:"Which stage comes right after Threshold?", a:"Character segmentation", w:["Grayscale", "OCR", "Validation"]},
  {q:"Minimum confidence to auto-validate?", a:"90%", w:["75%", "89%", "100%"]},
  {q:"Which plate is valid?", a:"MH12AB4721", w:["MH1AB47212", "M12HAB4721", "12MHAB4721"]},
  {q:"School zone limit?", a:"30 km/h", w:["40 km/h", "50 km/h", "20 km/h"]},
  {q:"OCR reads MH 12 A8 4721; which character is misread?", a:"8 is really B", w:["A is really 4", "1 is really I", "2 is really Z"]},
  {q:"Code for a red-light violation?", a:"RLV-02", w:["SPD-01", "RLV-01", "RED-02"]}
];
const pB = [
  { id:"N1", p:"MH02XX1234", img: "assets/plate_1.jpg", d:0, sc:25, st:90, sd:false, tc:[60,75], tt:[80,110], cg:75, bg:132 },
  { id:"N2", p:"DL09YY5678", img: "assets/plate_2.jpg", d:1, sc:45, st:90, sd:false, tc:[35,50], tt:[150,180], cg:120, bg:220 },
  { id:"N3", p:"KA05ZZ9012", img: "assets/plate_3.jpg", d:2, sc:60, st:115, sd:false, tc:[55,65], tt:[100,130], cg:70, bg:160, fd:true },
  { id:"N4", p:"UP14AA3456", img: "assets/plate_4.jpg", d:3, sc:90, st:160, sd:false, tc:[70,85], tt:[70,95], cg:50, bg:146 },
  { id:"N5", p:"TN01XY9999", img: "assets/plate_5.jpg", d:1, sc:30, st:120, sd:false, tc:[60,80], tt:[90,130], cg:80, bg:200 },
  { id:"N6", p:"GJ05AB1111", img: "assets/plate_6.jpg", d:0, sc:20, st:100, sd:false, tc:[65,85], tt:[85,120], cg:90, bg:150 }
];
const pC = [
  {id:"C1", p:"MH12AB4721", c:96, dist:25, t:1.25, z:"U", o:1, ang:false, amb:false, ans:{ex:7, fn:500, rt:'Auto-validate', cd:'UA211'}},
  {id:"C2", p:"DL01CA0099", c:96, dist:30, t:2.0, z:"S", o:1, ang:false, amb:false, ans:{ex:19, fn:2000, rt:'Auto-validate', cd:'SB991'}},
  {id:"C3", p:"MH14KT3308", c:82, dist:20, t:1.0, z:"U", o:2, ang:true, amb:false, ans:{ex:7, fn:500, rt:'Manual bypass', cd:'UA082'}},
  {id:"C4", p:"TN09BX5516", c:71, dist:30, t:1.2, z:"H", o:1, ang:false, amb:false, ans:{ex:5, fn:500, rt:'Reject / re-tune', cd:'HA161'}},
  {id:"C5", p:"KA05MN7788", c:96, dist:null, spd:95, z:"U", o:1, ang:false, amb:true, ans:{ex:30, fn:2000, rt:'Void fine', cd:'EX-1'}}
];

// Helper Components
const GlitchText = ({ text, className="" }: { text, className? }) => (
  <span className={`glitch-text font-heading italic uppercase ${className}`} data-text={text}>{text}</span>
);
const Panel = ({ children, className="", style={} }) => (
  <div className={`panel-clip bg-gradient-to-br from-carbon to-carbon-light border border-[#334] p-5 shadow-2xl relative ${className}`} style={style}>
    <div className="absolute top-0 left-0 w-10 h-[3px] bg-neon-cyan" />
    {children}
  </div>
);
const Btn = ({ children, onClick, danger=false, className="" }) => (
  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
    className={`btn-clip font-heading italic text-xl px-8 py-4 border-2 uppercase relative overflow-hidden transition-colors ${danger ? 'border-danger-red text-danger-red hover:bg-danger-red/10 shadow-[0_0_10px_#ff1111_inset]' : 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 shadow-[0_0_10px_#00f3ff_inset]'} ${className}`}>
    {children}
  </motion.button>
);

function Station3() {
  const [phase, setPhase] = useState(0); 
  const [team, setTeam] = useState({ name: '', size: 3 });
  const [score, setScore] = useState({ a:0, ap:0, b:0, bp:0, c:0, cp:0, bon:0 });
  const [time, setTime] = useState(720);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState|(null);

  const fxFail = () => { setShake(true); setTimeout(()=>setShake(false), 500); };
  const showToast = (msg, err=false) => { setToast({msg, err}); setTimeout(()=>setToast(null), 3000); };

  useEffect(() => {
    if (phase >= 2 && phase <= 4) {
      const t = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) { clearInterval(t); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase===2 && time<=630) setPhase(3);
    if (phase===3 && time<=360) setPhase(4);
    if (phase===4 && time===0) setPhase(5);
  }, [time, phase]);

  const totScore = Math.max(0, score.a - score.ap + score.b - score.bp + score.c - score.cp + score.bon);

  return (
    <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="h-full flex flex-col relative z-10" style={{ color: 'white' }}>
      <div className="ambient-layer bg-[radial-gradient(circle_at_center,#112_0%,#000_100%)] -z-10" />
      <div className="ambient-layer scanlines" />
      <div className="ambient-layer vignette" />
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
            className={`fixed top-5 right-5 p-4 border-l-4 panel-clip shadow-xl font-heading text-lg z-50 ${toast.err ? 'bg-danger-red/90 border-black text-black' : 'bg-carbon-light/95 border-neon-cyan text-white'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {phase >= 2 && phase <= 4 && (
        <header className="flex justify-between items-end p-6 pb-2 border-b-2 border-[#334] relative z-50">
          <div className="absolute bottom-[-2px] left-0 w-40 h-[2px] bg-neon-cyan" />
          <div className="font-heading text-2xl text-neon-cyan tracking-widest">OP: <span className="text-white">{team.name}</span></div>
          
          <div className="flex-1 mx-10 h-2 bg-[#223] relative rounded-full flex items-center">
            <motion.div className="h-full bg-neon-magenta shadow-[0_0_10px_#ff00ff]" animate={{ width: `${((720-time)/720)*100}%` }} transition={{ duration: 1 }} />
            <div className="absolute left-[12.5%] w-1 h-4 bg-[#556] -top-1" />
            <div className="absolute left-[50%] w-1 h-4 bg-[#556] -top-1" />
          </div>

          <div className={`w-20 h-20 rounded-full border-4 border-[#334] border-t-neon-cyan flex items-center justify-center font-heading text-3xl bg-carbon shadow-2xl -rotate-45 ${time<=15?'border-t-danger-red border-r-danger-red animate-pulse':''}`}>
            <span className="rotate-45 text-white drop-shadow-md">{Math.floor(time/60)}:{(time%60).toString().padStart(2,'0')}</span>
          </div>
          
          <div className="ml-8 font-heading text-4xl text-acid-green drop-shadow-[0_0_10px_#39ff14] flex flex-col items-end leading-none">
            <span className="text-sm text-text-muted tracking-widest mb-1">PTS</span>{totScore}
          </div>
        </header>
      )}

      <main className="flex-1 p-8 overflow-y-auto relative z-50 flex flex-col">
        {phase === 0 && <BootScreen onDone={() => setPhase(1)} />}
        {phase === 1 && <BriefingScreen onStart={(t) => { setTeam(t); setPhase(2); }} />}
        {phase === 2 && <ModuleA time={time} score={score} setScore={setScore} onComplete={(t) => { if(!t) setScore((s:any)=>({...s, bon: s.bon + Math.floor((time-630)/5)})); setPhase(3); }} fxFail={fxFail} />}
        {phase === 3 && <ModuleB time={time} score={score} setScore={setScore} onComplete={(t) => { if(!t) setScore((s:any)=>({...s, bon: s.bon + Math.floor((time-360)/5)})); setPhase(4); }} fxFail={fxFail} showToast={showToast} />}
        {phase === 4 && <ModuleC time={time} score={score} setScore={setScore} onComplete={() => { setScore((s:any)=>({...s, bon: s.bon + Math.floor(time/5)})); setPhase(5); }} fxFail={fxFail} showToast={showToast} />}
        {phase === 5 && <OutroScreen score={score} team={team} totScore={totScore} />}
      </main>
    </motion.div>
  );
}

// ---------------- BOOT SCREEN ----------------
function BootScreen({ onDone }) {
  const [text, setText] = useState("");
  const fullText = "PATROL UNIT 03 ONLINE\nANPR GRID: LIVE\nTARGET: ILLEGAL STREET RACE, SECTOR 7\nESTABLISHING UPLINK...";
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setText(fullText.substring(0, i) + (Math.random()>0.5?'_':''));
      i++;
      if (i > fullText.length) { clearInterval(t); setTimeout(onDone, 1000); }
    }, 50);
    return () => clearInterval(t);
  }, []);
  return <div className="flex-1 flex items-center justify-center whitespace-pre-wrap font-plate text-neon-cyan text-xl leading-relaxed text-center drop-shadow-[0_0_5px_#00f3ff]" style={{ color: '#00f3ff' }}>{text}</div>;
}

// ---------------- BRIEFING SCREEN ----------------
function BriefingScreen({ onStart }) {
  const [name, setName] = useState("");
  const [size, setSize] = useState(3);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full my-auto py-10">
      <GlitchText text="OPERATION REDLINE" className="text-5xl mb-2" />
      <p className="font-plate text-neon-magenta tracking-[0.2em] mb-6 text-center text-sm">ANPR GRID: SECTOR 7 // ILLEGAL STREET RACE IN PROGRESS</p>
      
      <Panel className="w-full text-center mb-6 p-4">
        <p className="text-text-muted text-base">Target crews are running the highway loop tonight. You have <strong className="text-white">12 minutes</strong> to intercept, verify plates, and issue citations before they scatter. Precision is mandatory.</p>
      </Panel>

      <div className="flex gap-4 w-full mb-6">
        <Panel className="flex-1 p-4"><label className="font-heading text-neon-cyan block mb-2 text-sm">TEAM DESIGNATION</label><input type="text" className="w-full bg-black border border-[#334] text-white p-2 font-plate uppercase outline-none" placeholder="ENTER CALLSIGN" value={name} onChange={e=>setName(e.target.value.toUpperCase())} /></Panel>
        <Panel className="flex-1 p-4"><label className="font-heading text-neon-cyan block mb-2 text-sm">PERSONNEL COUNT</label><select className="w-full bg-black border border-[#334] text-white p-2 font-plate outline-none" value={size} onChange={e=>setSize(Number(e.target.value))}><option value={3}>3 OFFICERS</option><option value={2}>2 OFFICERS</option></select></Panel>
      </div>

      <div className="flex gap-6 mb-8 w-full justify-center">
        {[{t:"OPERATOR", c:"text-neon-cyan", d:"Controls terminal."}, {t:"VERIFIER", c:"text-neon-magenta", d:size===2?"Consults manual. Maths & codes.":"Consults manual. Validates plates."}, ...(size===3?[{t:"TACTICIAN", c:"text-amber", d:"Calculates speed & fines."}]:[])].map((r, i) => (
          <Panel key={i} className="w-48 flex flex-col items-center text-center p-4">
            <div className="w-full aspect-square bg-[#111] mb-3 border-b-2 border-neon-cyan flex items-center justify-center font-heading text-3xl text-[#333]">PIC</div>
            <h3 className={`text-lg ${r.c}`}>{r.t}</h3><p className="text-[10px] text-text-muted mt-1 leading-tight">{r.d}</p>
          </Panel>
        ))}
      </div>
      <Btn className="py-3 px-10 text-xl" onClick={() => onStart({ name: name||"ROGUE", size })}>START SHIFT</Btn>
    </motion.div>
  );
}

// ---------------- MODULE A ----------------
function ModuleA({ score, setScore, onComplete, fxFail }) {
  const [qs] = useState(() => [...pA].sort(()=>Math.random()-0.5).slice(0,2));
  const [qIdx, setQIdx] = useState(0);
  const [opts, setOpts] = useState<string[]>([]);
  const [ansd, setAnsd] = useState<string|(null);

  useEffect(() => {
    if(qIdx < 2) setOpts([qs[qIdx].a, ...qs[qIdx].w].sort(()=>Math.random()-0.5));
    else onComplete(false);
  }, [qIdx]);

  if(qIdx >= 2) return null;
  const q = qs[qIdx];

  const handleAns = (opt) => {
    if(ansd) return;
    setAnsd(opt);
    if(opt === q.a) { setScore((s:any)=>({...s, a: s.a+10})); }
    else { setScore((s:any)=>({...s, ap: s.ap+3})); fxFail(); }
    setTimeout(() => { setAnsd(null); setQIdx(i=>i+1); }, 1000);
  };

  return (
    <motion.div key={qIdx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
      <Panel className="w-full">
        <h3 className="text-neon-magenta mb-4">SYS_CHK {qIdx+1}/2</h3>
        <p className="text-3xl mb-8">{q.q}</p>
        <div className="grid grid-cols-2 gap-4">
          {opts.map((o, i) => {
            let st = "bg-white/5 border-[#445] hover:bg-neon-cyan/10 hover:border-neon-cyan text-white";
            if(ansd) {
              if(o===q.a) st = "bg-acid-green/20 border-acid-green text-acid-green font-bold";
              else if(o===ansd) st = "bg-danger-red/20 border-danger-red text-danger-red line-through";
              else st = "opacity-50 border-[#445]";
            }
            return <button key={i} onClick={()=>handleAns(o)} className={`panel-clip border p-6 text-left text-xl transition-all ${st}`}>{o}</button>;
          })}
        </div>
      </Panel>
    </motion.div>
  );
}

// ---------------- MODULE B ----------------
function ModuleB({ score, setScore, onComplete, fxFail, showToast }) {
  const [cap] = useState(() => pB[Math.floor(Math.random()*pB.length)]);
  const [c, setC] = useState(cap.sc);
  const [t, setT] = useState(cap.st);
  const [d, setD] = useState(cap.sd);
  const [diagDone, setDiagDone] = useState(false);
  const [ocrRunning, setOcr] = useState(false);
  const [sliderX, setSliderX] = useState(300);
  const [imgFailed, setImgFailed] = useState(false);
  const vWrapRef = useRef<HTMLDivElement>(null);

  let cf = 96;
  if(c<cap.tc[0]) cf -= 1.2*(cap.tc[0]-c); else if(c>cap.tc[1]) cf -= 1.2*(c-cap.tc[1]);
  if(t<cap.tt[0]) cf -= 0.6*(cap.tt[0]-t); else if(t>cap.tt[1]) cf -= 0.6*(t-cap.tt[1]);
  if(cap.fd && !d) cf -= 15;
  const conf = Math.max(0, Math.min(100, Math.floor(cf)));

  const handleDrag = (e) => {
    if(!vWrapRef.current) return;
    const rect = vWrapRef.current.getBoundingClientRect();
    let x = e.clientX || (e.touches && e.touches[0].clientX);
    if(!x) return;
    x = x - rect.left;
    setSliderX(Math.max(0, Math.min(600, x)));
  };

  const cssRaw = `grayscale(100%) contrast(${cap.sc}%) brightness(${cap.st}%) ${(!cap.sd && cap.fd)?'blur(3px)':''}`;
  const cssProc = `grayscale(100%) contrast(${c}%) brightness(${t}%) ${(!d && cap.fd)?'blur(3px)':''}`;

  let borderColorClass = 'border-[#445]';
  let colorVar = 'none';
  if(diagDone) {
    if(conf>=90) { borderColorClass = 'border-acid-green'; colorVar = 'var(--color-acid-green, #39ff14)'; }
    else if(conf>=75) { borderColorClass = 'border-amber'; colorVar = 'var(--color-amber, #ff9900)'; }
    else { borderColorClass = 'border-danger-red'; colorVar = 'var(--color-danger-red, #ff1111)'; }
  }

  return (
    <div className="grid grid-cols-3 gap-6 h-full">
      <div className="col-span-2 flex flex-col gap-6">
        <Panel className="p-4 flex-1 max-h-[500px]">
          <div className="relative bg-black h-full border border-[#334] overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[#112] opacity-30 blur-sm" />
            <div className="absolute inset-0 border-2 border-white/10 pointer-events-none" />
            <div className="absolute top-4 left-4 text-danger-red font-heading text-xl animate-pulse tracking-widest drop-shadow-[0_0_5px_red]">REC</div>
            
            <div ref={vWrapRef} className="relative w-[600px] h-[150px] z-10 select-none" onMouseMove={(e)=>e.buttons===1 && handleDrag(e)} onTouchMove={handleDrag}>
              <div className="absolute inset-0 flex items-center justify-center bg-[#888]" style={{ filter: cssProc }}>
                {(!cap.img || imgFailed) ? <span className="font-plate font-bold text-7xl text-[#333]">{cap.p}</span> : <img src={cap.img} onError={()=>setImgFailed(true)} className="w-full h-full object-cover" />}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-[#888]" style={{ filter: cssRaw, clipPath: `inset(0 ${600-sliderX}px 0 0)` }}>
                {(!cap.img || imgFailed) ? <span className="font-plate font-bold text-7xl text-[#333]">{cap.p}</span> : <img src={cap.img} onError={()=>setImgFailed(true)} className="w-full h-full object-cover" />}
              </div>
              <div className="absolute top-0 bottom-0 w-1 bg-neon-cyan shadow-[0_0_10px_#00f3ff] cursor-ew-resize flex items-center justify-center" style={{ left: sliderX }} onMouseDown={(e)=>e.preventDefault()}>
                <div className="bg-neon-cyan text-black text-[10px] py-1 px-2 rounded-full font-bold">◀ ▶</div>
              </div>
              {ocrRunning && <motion.div initial={{left:'-5%'}} animate={{left:'105%'}} transition={{duration:1, ease:"linear"}} className="absolute top-[-10%] w-5 h-[120%] bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_20px_#00f3ff] -skew-x-[15deg] z-20" />}
            </div>
          </div>
        </Panel>
        
        <Panel className="flex items-center gap-8 p-6">
          <div className="relative w-48 h-24 overflow-hidden mx-auto">
            <div className="absolute top-0 w-48 h-48 rounded-full border-[12px] border-[#223] box-border" />
            <div className="absolute top-0 w-48 h-48 rounded-full border-[12px] border-transparent border-r-acid-green/30 border-b-acid-green/30 rotate-45 box-border" />
            <div className={`absolute top-0 w-48 h-48 rounded-full border-[12px] border-transparent border-t-2 border-l-2 ${borderColorClass} transition-all duration-500 box-border`} style={{ borderTopWidth: '12px', borderLeftWidth: '12px', transform: `rotate(${-45 + (diagDone ? (conf/100)*180 : 0)}deg)`, boxShadow: diagDone ? `inset 0 0 10px ${colorVar}` : 'none' }} />
            <div className="absolute bottom-0 w-full text-center font-heading text-4xl leading-none">{diagDone ? conf : '--'}%</div>
          </div>
          <div className="flex-1">
            <div className="font-plate text-text-muted bg-black p-3 border border-[#334] mb-4">CHAR GRAY: <span className="text-white">{cap.cg}</span> | BG GRAY: <span className="text-white">{cap.bg}</span></div>
            <Btn danger className="w-full" onClick={() => {
              if(!diagDone || ocrRunning) return;
              setOcr(true);
              setTimeout(() => {
                setOcr(false);
                if(conf>=90) { setScore((s:any)=>({...s, b: s.b+20})); showToast("PLATE VERIFIED"); setTimeout(()=>onComplete(false),1000); }
                else { fxFail(); showToast("CONFIDENCE REJECTED", true); }
              }, 1100);
            }}>SEND TO OCR</Btn>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel>
          <h2 className="text-neon-cyan mb-4 text-xl">1. DIAGNOSTICS</h2>
          <div className="grid grid-cols-2 gap-3">
            {["CONTRAST LOW", "THRESH LOW", "DENOISE OFF", "BOTH HIGH"].map((dTxt, i) => (
              <button key={i} onClick={() => {
                if(diagDone) return;
                if(i===cap.d) { setDiagDone(true); setScore((s:any)=>({...s, b: s.b+10})); }
                else { fxFail(); setScore((s:any)=>({...s, bp: s.bp+3})); }
              }} className={`panel-clip font-heading p-3 transition-colors ${diagDone ? (i===cap.d ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00f3ff]' : 'bg-[#1a1a22] opacity-50') : 'bg-[#1a1a22] hover:bg-[#2a2a35] border border-[#445]'}`}>{dTxt}</button>
            ))}
          </div>
        </Panel>

        <Panel className={`flex-1 relative ${!diagDone ? 'opacity-40 pointer-events-none' : ''}`}>
          {!diagDone && <div className="absolute inset-0 flex items-center justify-center font-heading text-danger-red text-2xl z-10 text-center px-4 leading-tight drop-shadow-md">DIAGNOSE FAULT TO UNLOCK</div>}
          <h2 className="text-neon-cyan mb-6 text-xl">2. REPAIR PARAMS</h2>
          <div className="mb-6"><div className="flex justify-between font-heading text-text-muted mb-2"><span>CONTRAST</span><span className="font-plate text-neon-cyan">{c}</span></div><input type="range" min="10" max="100" value={c} onChange={e=>setC(Number(e.target.value))} /></div>
          <div className="mb-6"><div className="flex justify-between font-heading text-text-muted mb-2"><span>THRESHOLD</span><span className="font-plate text-neon-cyan">{t}</span></div><input type="range" min="50" max="200" value={t} onChange={e=>setT(Number(e.target.value))} /></div>
          <label className="flex items-center gap-4 cursor-pointer font-heading text-xl mt-8">
            <input type="checkbox" className="w-6 h-6 accent-neon-cyan" checked={d} onChange={e=>setD(e.target.checked)} /> DENOISE FILTER
          </label>
        </Panel>
      </div>
    </div>
  );
}

// ---------------- MODULE C ----------------
function ModuleC({ score, setScore, onComplete, fxFail, showToast }) {
  const [cap] = useState(() => pC[Math.floor(Math.random()*pC.length)]);
  const [step, setStep] = useState(1);
  const [ex, setEx] = useState(0);
  const [fn, setFn] = useState(0);
  const [pc, setPc] = useState("");
  const [showTkt, setTkt] = useState(false);
  const [rt, setRt] = useState("");

  const zMap = { 'S':'SCHOOL', 'R':'RESIDENTIAL', 'U':'URBAN', 'H':'HIGHWAY' };

  const handleS1 = () => {
    if(ex===cap.ans.ex && fn===cap.ans.fn) { setScore((s:any)=>({...s, c: s.c+20})); setStep(2); }
    else { fxFail(); setScore((s:any)=>({...s, cp: s.cp+3})); }
  };
  const handleS2 = (r, e) => {
    if(r===cap.ans.rt) { setScore((s:any)=>({...s, c: s.c+15})); setRt(r); setStep(3); }
    else { fxFail(); setScore((s:any)=>({...s, cp: s.cp+3})); e.currentTarget.classList.add('opacity-30', 'pointer-events-none', 'border-danger-red'); }
  };
  const handleS3 = () => {
    if(pc===cap.ans.cd) { setScore((s:any)=>({...s, c: s.c+15})); setTkt(true); }
    else { fxFail(); setScore((s:any)=>({...s, cp: s.cp+3})); setPc(""); }
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex justify-between relative px-10 mb-4">
        <div className="absolute top-1/2 left-14 right-14 h-[2px] bg-[#334] -z-10" />
        {[1,2,3].map(i => (
          <div key={i} className={`w-8 h-8 border-2 flex items-center justify-center font-heading rotate-45 bg-carbon ${step>i ? 'border-acid-green bg-acid-green/20 text-acid-green' : step===i ? 'border-neon-magenta text-neon-magenta shadow-[0_0_15px_#ff00ff]' : 'border-[#556] text-[#556]'}`}><span className="-rotate-45">{i}</span></div>
        ))}
      </div>

      <div className="flex gap-4">
        <Panel className="flex-1 flex flex-col items-center justify-center py-4 bg-black/50"><div className="font-heading text-text-muted text-sm mb-1">TARGET PLATE</div><div className="font-plate text-2xl font-bold">{cap.p}</div></Panel>
        <Panel className="flex-1 flex flex-col items-center justify-center py-4 bg-black/50"><div className="font-heading text-text-muted text-sm mb-1">CONFIDENCE</div><div className={`font-plate text-2xl font-bold ${cap.c>=90?'text-acid-green':'text-amber'}`}>{cap.c}%</div></Panel>
        <Panel className="flex-1 flex flex-col items-center justify-center py-4 bg-black/50"><div className="font-heading text-text-muted text-sm mb-1">ZONE</div><div className="font-plate text-2xl font-bold">{zMap[cap.z]}</div></Panel>
        <Panel className="flex-1 flex flex-col items-center justify-center py-4 bg-black/50"><div className="font-heading text-text-muted text-sm mb-1">OFFICER</div><div className="font-plate text-2xl font-bold">LVL {cap.o}</div></Panel>
        {cap.ang && <Panel className="flex-1 flex flex-col items-center justify-center py-4 bg-black/50 border-neon-cyan"><div className="font-heading text-text-muted text-sm mb-1">CAM 2</div><div className="font-plate text-2xl font-bold text-neon-cyan">MATCH</div></Panel>}
        {cap.amb && <Panel className="flex-1 flex flex-col items-center justify-center py-4 bg-black/50 border-danger-red animate-pulse"><div className="font-heading text-text-muted text-sm mb-1">EMERGENCY</div><div className="font-plate text-2xl font-bold text-danger-red">BEACON ON</div></Panel>}
      </div>

      <div className="h-20 bg-[#0a0a0f] border border-[#223] relative overflow-hidden flex items-center">
        <div className="absolute w-[2px] h-full bg-amber shadow-[0_0_10px_#ff9900]" style={{left:'30%'}} />
        <div className="absolute w-[2px] h-full bg-amber shadow-[0_0_10px_#ff9900]" style={{left:'70%'}} />
        <div className="absolute bottom-1 left-2 font-plate text-xs text-neon-cyan">{cap.dist ? `RADAR A->B: ${cap.dist}m | TIME: ${cap.t}s` : `LASER MEASURED: ${cap.spd} KM/H`}</div>
        {cap.dist && <motion.div animate={{left:[' -20%','120%']}} transition={{duration:cap.t, repeat:Infinity, repeatDelay:1.5, ease:"linear"}} className="absolute w-20 h-10 bg-gradient-to-r from-neon-magenta to-neon-cyan shadow-[0_0_20px_#00f3ff] opacity-80" />}
      </div>

      <Panel className="flex-1 flex flex-col justify-center px-10">
        {step===1 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="text-neon-magenta text-2xl mb-8">SEC 1: TOLERANCE & FINE</h2>
            <div className="flex gap-10 items-center">
              <div>
                <div className="font-heading text-text-muted mb-4">EXCESS SPEED (KM/H)</div>
                <div className="flex items-center gap-4">
                  <button onClick={()=>setEx(Math.max(0,ex-1))} className="panel-clip w-12 h-12 bg-[#223] text-neon-cyan border border-neon-cyan font-heading text-2xl hover:bg-neon-cyan/20">-</button>
                  <input type="text" readOnly value={ex} className="w-32 h-12 bg-black border border-[#445] text-white font-plate text-2xl text-center outline-none" />
                  <button onClick={()=>setEx(Math.min(200,ex+1))} className="panel-clip w-12 h-12 bg-[#223] text-neon-cyan border border-neon-cyan font-heading text-2xl hover:bg-neon-cyan/20">+</button>
                </div>
              </div>
              <div className="flex-1">
                <div className="font-heading text-text-muted mb-4">FINE SLAB SELECTOR</div>
                <select value={fn} onChange={e=>setFn(Number(e.target.value))} className="w-full h-12 bg-black text-white border border-[#445] font-plate text-xl px-4 outline-none appearance-none">
                  <option value={0}>Rs 0 (NO FINE)</option><option value={500}>Rs 500 (SLAB A)</option><option value={1000}>Rs 1000 (SLAB B)</option>
                  <option value={2000}>Rs 2000 (SLAB C / Ax2)</option><option value={4000}>Rs 4000 (SLAB D / Bx2)</option><option value={8000}>Rs 8000 (SLAB Dx2)</option>
                </select>
              </div>
            </div>
            <Btn className="mt-10" onClick={handleS1}>COMMIT SEC 1</Btn>
          </motion.div>
        )}
        
        {step===2 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <h2 className="text-neon-magenta text-2xl mb-6">SEC 2: ROUTING</h2>
            <div className="grid grid-cols-2 gap-4">
              {[{t:'Auto-validate',d:'DIRECT TO SYSTEM'},{t:'Manual bypass',d:'OFFICER OVERRIDE'},{t:'Reject / re-tune',d:'DISCARD CAPTURE'},{t:'Void fine',d:'EMERGENCY ONLY'}].map(r => (
                <button key={r.t} onClick={(e)=>handleS2(r.t, e)} className="panel-clip bg-[#111] border border-[#334] p-8 text-center hover:bg-white/5 hover:border-neon-magenta transition-all">
                  <h3 className="text-white text-xl">{r.t}</h3><p className="text-[#667] text-sm mt-2">{r.d}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step===3 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center">
            <h2 className="text-neon-magenta text-2xl mb-6">SEC 3: AUTHORIZATION CODE</h2>
            <div className="w-full max-w-md h-20 bg-black border border-neon-magenta mb-6 flex items-center justify-center font-plate text-4xl text-neon-magenta tracking-[0.5em] shadow-[inset_0_0_15px_rgba(255,0,255,0.2)]">{(pc+"_____").slice(0,5).split('').join(' ')}</div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-md">
              {['U','S','H','A','B','E','1','2','3','8','9','0','X','-','DEL'].map(k => (
                <button key={k} onClick={()=>{ if(k==='DEL') setPc(p=>p.slice(0,-1)); else if(pc.length<5) setPc(p=>p+k); }} className={`p-4 font-heading text-2xl transition-colors border ${k==='DEL'?'text-danger-red border-[#445] hover:bg-[#2a2a35]':'bg-[#1a1a22] border-[#334] text-white hover:border-neon-cyan hover:bg-[#2a2a35]'}`}>{k}</button>
              ))}
              <button onClick={handleS3} className="col-span-3 p-4 font-heading text-2xl bg-neon-cyan/10 border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20">AUTHORIZE</button>
            </div>
          </motion.div>
        )}
      </Panel>

      {showTkt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} className="bg-[#eef] text-[#111] w-96 p-8 font-plate relative shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="text-center border-b-2 border-dashed border-[#889] pb-4 mb-4 font-bold"><h2>eCHALLAN CITATION</h2><p className="text-xs text-[#555] mt-1">REDLINE SURVEILLANCE GRID</p></div>
            <div className="flex justify-between mb-2"><span>PLATE:</span><strong>{cap.p}</strong></div>
            <div className="flex justify-between mb-2"><span>VIOLATION:</span><strong>{cap.ans.fn>0 && !cap.amb ? 'SPD-01' : 'NONE'}</strong></div>
            <div className="flex justify-between mb-2"><span>FINE:</span><strong>{rt==='Void fine' ? '0' : cap.ans.fn}</strong></div>
            <div className="flex justify-between mb-2"><span>ISSUER:</span><strong>LVL-{cap.o}</strong></div>
            <div className="flex justify-between mb-2"><span>CODE:</span><strong>{cap.ans.cd}</strong></div>
            {cap.ans.fn>=4000 && <div className="bg-black text-danger-red text-center p-3 font-heading tracking-widest border-2 border-danger-red animate-pulse mt-4">VEHICLE IMPOUND FLAG</div>}
            <motion.div initial={{scale:3, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:0.3}} className={`absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 -rotate-[20deg] border-4 p-2 px-4 font-heading text-3xl rounded-md ${rt==='Void fine'?'text-amber border-amber':rt==='Reject / re-tune'?'text-danger-red border-danger-red':'text-danger-red border-danger-red'}`}>
              {rt==='Void fine' ? 'VOID: EX-1' : rt==='Reject / re-tune' ? 'REJECTED' : 'CHALLAN ISSUED'}
            </motion.div>
          </motion.div>
          <Btn className="mt-10 text-2xl" onClick={onComplete}>CLEAR DASHBOARD</Btn>
        </div>
      )}
    </div>
  );
}

// ---------------- OUTRO SCREEN ----------------
function OutroScreen({ score:S, team, totScore }) {
  let tr = "ROOKIE";
  if(totScore>=120) tr="DCP"; else if(totScore>=90) tr="INSPECTOR"; else if(totScore>=60) tr="OFFICER";

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex-1 flex flex-col items-center justify-center">
      <GlitchText text="SHIFT TERMINATED" className="text-6xl text-acid-green mb-10" />
      
      <div className="bg-gradient-to-br from-[#112] to-black border-2 border-[#445] flex w-[700px] p-6 gap-6 relative overflow-hidden shadow-2xl">
        <div className="w-40 h-40 bg-[#223] flex items-center justify-center border border-neon-cyan">
          <span className="font-heading text-2xl text-neon-cyan -rotate-15">{tr}</span>
        </div>
        <div className="flex-1">
          <div className="font-heading text-2xl text-white border-b-2 border-[#445] pb-2 mb-4">OFFICER RECORD</div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334]"><span>SEC A BASE:</span><span>{S.a}</span></div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334] text-danger-red"><span>SEC A PENALTY:</span><span>-{S.ap}</span></div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334]"><span>SEC B BASE:</span><span>{S.b}</span></div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334] text-danger-red"><span>SEC B PENALTY:</span><span>-{S.bp}</span></div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334]"><span>SEC C BASE:</span><span>{S.c}</span></div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334] text-danger-red"><span>SEC C PENALTY:</span><span>-{S.cp}</span></div>
          <div className="flex justify-between font-plate text-lg mb-1 border-b border-dashed border-[#334] text-neon-cyan"><span>SPEED BONUS:</span><span>+{S.bon}</span></div>
          <div className="flex justify-between font-plate text-3xl font-bold mt-4 pt-4 border-t-2 border-neon-cyan text-acid-green"><span>TOTAL RATING:</span><span>{totScore}</span></div>
        </div>
      </div>

      <div className="bg-black border border-[#445] py-4 px-8 font-plate text-xl text-text-muted my-10">
        <span className="text-white">SYNC CODE:</span> <span className="text-neon-magenta select-all">{`${team.name} | ${team.size} | ${Math.max(0, S.a+S.b+S.c-S.ap-S.bp-S.cp)} | ${S.bon} | ${totScore}`}</span>
      </div>

      <Btn danger onClick={() => window.location.reload()}>NEXT TEAM [RESET]</Btn>
    </motion.div>
  );
}

export default Station3;





