import './station3.css';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ================================================================
   ASSET SYSTEM — unchanged refs
   ================================================================ */
const ASSETS = {
  hero_bg:"", city_night_bg:"", rain_overlay:"", logo_mark:"",
  role_operator:"", role_verifier:"", role_tactician:"",
  plate_bg:"", cam2_thumb_C3:"",
  road_sign_school:"", road_sign_residential:"", road_sign_urban:"", road_sign_highway:"",
  vehicle_ambulance:"", car_1:"", car_2:"", car_3:"", car_4:"", car_5:"", car_6:"",
  tier_rookie:"", tier_officer:"", tier_inspector:"", tier_dcp:"", ticket_texture:""
};

/* ================================================================
   DATA — unchanged game data
   ================================================================ */
const pA = [
  {q:"Which stage comes right after Threshold?",         a:"Character segmentation", w:["Grayscale","OCR","Validation"]},
  {q:"Minimum confidence to auto-validate?",             a:"90%",                    w:["75%","89%","100%"]},
  {q:"Which plate is valid?",                             a:"MH12AB4721",             w:["MH1AB47212","M12HAB4721","12MHAB4721"]},
  {q:"School zone limit?",                               a:"30 km/h",                w:["40 km/h","50 km/h","20 km/h"]},
  {q:"OCR reads MH 12 A8 4721; which character is misread?", a:"8 is really B",      w:["A is really 4","1 is really I","2 is really Z"]},
  {q:"Code for a red-light violation?",                  a:"RLV-02",                 w:["SPD-01","RLV-01","RED-02"]}
];
const pB = [
  {id:"N1",p:"MH47R1105", img:"/plate1.jpg",d:0,sc:25,st:90, sd:false,tc:[60,75], tt:[80,110], cg:75, bg:132},
  {id:"N2",p:"MH02CN4901",img:"/plate2.jpg",d:1,sc:45,st:90, sd:false,tc:[35,50], tt:[150,180],cg:120,bg:220},
  {id:"N3",p:"MH02DE1544",img:"/plate3.jpg",d:2,sc:60,st:115,sd:false,tc:[55,65], tt:[100,130],cg:70, bg:160,fd:true},
  {id:"N4",p:"MH47R1105", img:"/plate1.jpg",d:3,sc:90,st:160,sd:false,tc:[70,85], tt:[70,95],  cg:50, bg:146},
  {id:"N5",p:"MH02CN4901",img:"/plate2.jpg",d:1,sc:30,st:120,sd:false,tc:[60,80], tt:[90,130], cg:80, bg:200},
  {id:"N6",p:"MH02DE1544",img:"/plate3.jpg",d:0,sc:20,st:100,sd:false,tc:[65,85], tt:[85,120], cg:90, bg:150}
];
const pC = [
  {id:"C1",p:"MH12AB4721",c:96,dist:25,  t:1.25,z:"U",o:1,ang:false,amb:false,ans:{ex:7, fn:500, rt:'Auto-validate',   cd:'UA211'}},
  {id:"C2",p:"DL01CA0099",c:96,dist:30,  t:2.0, z:"S",o:1,ang:false,amb:false,ans:{ex:19,fn:2000,rt:'Auto-validate',   cd:'SB991'}},
  {id:"C3",p:"MH14KT3308",c:82,dist:20,  t:1.0, z:"U",o:2,ang:true, amb:false,ans:{ex:7, fn:500, rt:'Manual bypass',   cd:'UA082'}},
  {id:"C4",p:"TN09BX5516",c:71,dist:30,  t:1.2, z:"H",o:1,ang:false,amb:false,ans:{ex:5, fn:500, rt:'Reject / re-tune',cd:'HA161'}},
  {id:"C5",p:"KA05MN7788",c:96,dist:null,spd:95,z:"U",o:1,ang:false,amb:true, ans:{ex:30,fn:2000,rt:'Void fine',       cd:'EX-1'}}
];

/* ================================================================
   DESIGN TOKENS — exact palette from spec
   ================================================================ */
const C = {
  red:    '#FF3038',
  orange: '#FF6B2C',
  blue:   '#00C8FF',
  green:  '#22C55E',
  amber:  '#F59E0B',
  bg0:    '#08090D',
  bg1:    '#12151C',
  bg2:    '#0E1118',
  text:   '#F5F5F5',
  muted:  '#9298A5',
  dim:    '#5A6070',
  border: 'rgba(255,255,255,0.10)',
};

/* ================================================================
   SHARED STYLE HELPERS
   ================================================================ */
const S = {
  orbitron: { fontFamily: "'Orbitron', monospace" } as React.CSSProperties,
  inter:    { fontFamily: "'Inter', sans-serif"   } as React.CSSProperties,
  label: {
    fontFamily: "'Orbitron', monospace",
    fontSize: '0.6rem', fontWeight: 700,
    letterSpacing: '0.2em', textTransform: 'uppercase' as const,
    color: C.muted, marginBottom: 4
  } as React.CSSProperties,
};

/* ================================================================
   HIGHWAY CAR TRANSITION
   The car zooms across the screen between phases; headlights bloom
   as a wipe effect to reveal the next screen.
   ================================================================ */
function HighwayTransition({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'enter'|'bloom'|'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('bloom'),  850);
    const t2 = setTimeout(() => setPhase('exit'),  1100);
    const t3 = setTimeout(onDone,                  1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      className="highway-transition"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Black overlay fades to white on bloom */}
      <motion.div
        style={{ position: 'absolute', inset: 0 }}
        animate={{
          background: phase === 'bloom'
            ? 'radial-gradient(ellipse at 50% 50%, rgba(255,220,160,0.96) 0%, rgba(255,107,44,0.7) 30%, rgba(0,0,0,0.9) 70%)'
            : 'rgba(0,0,0,0.88)'
        }}
        transition={{ duration: phase === 'bloom' ? 0.12 : 0.25 }}
      />

      {/* Road band across center */}
      <div style={{
        position: 'absolute', top: '44%', left: 0, right: 0, height: '12%',
        background: 'rgba(16,18,24,0.95)',
        borderTop:    '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        {/* Dashed center line scrolling */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
          transform: 'translateY(-50%)',
          background: 'repeating-linear-gradient(90deg, transparent 0, transparent 32px, rgba(255,107,44,0.25) 32px, rgba(255,107,44,0.25) 64px)',
          animation: 'roadScroll 0.18s linear infinite',
        }} />
      </div>

      {/* Moving car silhouette (Dodge Charger profile) */}
      <motion.div
        style={{ position: 'absolute', top: '38%', transform: 'translateY(-50%)' }}
        initial={{ left: '-25%' }}
        animate={{
          left: phase === 'enter' ? '35%'
              : phase === 'bloom' ? '50%'
              : '125%',
        }}
        transition={{
          duration: phase === 'enter' ? 0.85 : phase === 'bloom' ? 0.18 : 0.42,
          ease: phase === 'enter' ? [0.05, 0.6, 0.3, 1]
              : phase === 'exit'  ? [0.7, 0, 1, 0.3] : 'linear',
        }}
      >
        {/* Motion blur trail */}
        {phase === 'enter' && (
          <div style={{
            position: 'absolute', right: '98%', top: '25%',
            width: 280, height: '50%',
            background: 'linear-gradient(90deg, transparent, rgba(255,107,44,0.35), rgba(255,48,56,0.2))',
            filter: 'blur(6px)',
          }} />
        )}

        {/* SVG Car — side-on Dodge Charger silhouette */}
        <svg width="240" height="96" viewBox="0 0 240 96" fill="none">
          {/* Underglow */}
          <ellipse cx="120" cy="91" rx="100" ry="5" fill="rgba(255,107,44,0.25)" />

          {/* Body */}
          <path d="M20 64 L28 44 L60 30 L98 24 L150 24 L175 32 L208 50 L214 64 Z"
            fill={C.bg1} stroke={C.orange} strokeWidth="1.2" />

          {/* Roof */}
          <path d="M64 43 L80 26 L150 26 L168 42 Z"
            fill={C.bg0} stroke="rgba(255,107,44,0.5)" strokeWidth="0.8" />

          {/* Windshield */}
          <path d="M84 41 L95 26 L148 26 L163 41 Z"
            fill="rgba(0,200,255,0.08)" stroke="rgba(0,200,255,0.25)" strokeWidth="0.7" />

          {/* Door windows */}
          <path d="M86 40 L97 27 L126 27 L126 40 Z"
            fill="rgba(0,200,255,0.06)" stroke="rgba(0,200,255,0.2)" strokeWidth="0.6" />
          <path d="M130 27 L148 27 L160 40 L130 40 Z"
            fill="rgba(0,200,255,0.06)" stroke="rgba(0,200,255,0.2)" strokeWidth="0.6" />

          {/* Body crease line */}
          <line x1="55" y1="52" x2="208" y2="52" stroke="rgba(255,107,44,0.3)" strokeWidth="0.8" />

          {/* Headlights */}
          <rect x="207" y="50" width="7" height="10" rx="1"
            fill={phase === 'enter' ? 'rgba(255,220,160,0.7)' : 'rgba(255,240,200,1)'}
            filter={phase !== 'enter' ? 'blur(1px)' : undefined}
          />
          {phase !== 'enter' && (
            <ellipse cx="211" cy="55" rx="22" ry="16"
              fill="rgba(255,240,180,0.3)" filter="url(#bl)" />
          )}
          <defs><filter id="bl"><feGaussianBlur stdDeviation="4" /></filter></defs>

          {/* Tail lights */}
          <rect x="19" y="54" width="6" height="8" rx="1" fill={C.red} opacity="0.85" />

          {/* Wheels */}
          <circle cx="58"  cy="73" r="17" fill={C.bg0} stroke={C.orange} strokeWidth="1.5" />
          <circle cx="58"  cy="73" r="9"  fill={C.bg1} stroke="rgba(255,107,44,0.3)" strokeWidth="1" />
          <circle cx="58"  cy="73" r="3"  fill="#333" />

          <circle cx="175" cy="73" r="17" fill={C.bg0} stroke={C.orange} strokeWidth="1.5" />
          <circle cx="175" cy="73" r="9"  fill={C.bg1} stroke="rgba(255,107,44,0.3)" strokeWidth="1" />
          <circle cx="175" cy="73" r="3"  fill="#333" />
        </svg>
      </motion.div>

      {/* Skid marks on road */}
      <div style={{
        position: 'absolute', top: '54%', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 5%, rgba(40,40,40,0.7) 25%, rgba(55,55,55,0.85) 50%, rgba(40,40,40,0.5) 80%, transparent 95%)',
      }} />
    </motion.div>
  );
}

/* ================================================================
   SHARED UI PRIMITIVES
   ================================================================ */
const GlitchText = ({ text, className = "", style = {} }: { text: string; className?: string; style?: React.CSSProperties }) => (
  <span
    className={`glitch-text ${className}`}
    data-text={text}
    style={{ color: C.text, ...style }}
  >
    {text}
  </span>
);

const Panel = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`ff-panel panel-clip p-5 ${className}`} style={style}>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', className = "" }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'orange' | 'ghost';
  className?: string;
}) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -1 }}
    whileTap={{ scale: 0.98, y: 0 }}
    onClick={onClick}
    className={`ff-btn btn-clip ${variant === 'orange' ? 'ff-btn-orange' : variant === 'ghost' ? 'ff-btn-ghost' : ''} ${className}`}
  >
    {children}
  </motion.button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <div style={{ width: 3, height: 16, background: C.red, flexShrink: 0 }} />
    <span style={{ ...S.orbitron, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.22em', color: C.muted, textTransform: 'uppercase' }}>
      {children}
    </span>
  </div>
);

/* ================================================================
   STATION 3 ROOT
   ================================================================ */
function Station3() {
  const [phase, setPhase] = useState(0);
  const [team,  setTeam]  = useState({ name: '', size: 3 });
  const [score, setScore] = useState({ a:40, ap:0, b:60, bp:0, c:50, cp:0, bon:0 });
  const [time,  setTime]  = useState(1800);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<{msg:string; err:boolean}|null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [nextPhase, setNextPhase] = useState<number|null>(null);

  const fxFail = () => { setShake(true); setTimeout(() => setShake(false), 500); };
  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  /* Trigger highway car wipe between phases */
  const goToPhase = (p: number) => {
    setNextPhase(p);
    setTransitioning(true);
  };
  const handleTransitionDone = () => {
    if (nextPhase !== null) setPhase(nextPhase);
    setTransitioning(false);
    setNextPhase(null);
  };

  /* Countdown timer — only active during modules */
  useEffect(() => {
    if (phase >= 2 && phase <= 4) {
      const t = setInterval(() => {
        setTime(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [phase]);

  /* Auto-advance phases when time gates are crossed */
  useEffect(() => {
    if (phase === 2 && time <= 1680) goToPhase(3);
    if (phase === 3 && time <= 1200) goToPhase(4);
    if (phase === 4 && time === 0)   goToPhase(5);
  }, [time, phase]);

  const totScore    = Math.max(0, score.a - score.ap + score.b - score.bp + score.c - score.cp + score.bon);
  const timeProgress = (1800 - time) / 1800;
  const isRedline   = time <= 60;

  /* ── RENDER ── */
  return (
    <motion.div
      animate={shake ? { x: [-10, 10, -7, 7, -3, 3, 0] } : {}}
      transition={{ duration: 0.45 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, color: C.text }}
    >
      {/* Background layers */}
      <div className="ambient-layer asphalt-bg" />
      <div className="ambient-layer road-grid"  />
      <div className="ambient-layer underglow"  />
      <div className="ambient-layer vignette"   />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0,   opacity: 1 }}
            exit={{   x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`panel-clip-sm ${toast.err ? 'toast-error' : 'toast-success'}`}
            style={{ position:'fixed', top:20, right:20, padding:'14px 20px', minWidth:260, zIndex:9000 }}
          >
            {toast.err ? '⚠ ' : '✓ '}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highway Transition */}
      <AnimatePresence>
        {transitioning && <HighwayTransition onDone={handleTransitionDone} />}
      </AnimatePresence>

      {/* ── HUD Header — shown only during active modules ── */}
      {phase >= 2 && phase <= 4 && (
        <header className="hud-header" style={{ display:'flex', alignItems:'center', padding:'10px 24px', gap:24, position:'relative', zIndex:50 }}>

          {/* Left: Team callsign */}
          <div style={{ minWidth:140 }}>
            <div style={S.label}>Crew</div>
            <div style={{ ...S.orbitron, fontSize:'1rem', fontWeight:700, color:C.text, letterSpacing:'0.08em' }}>
              <span style={{ color:C.red }}>OP:</span> {team.name}
            </div>
          </div>

          {/* Center: gear progress + phase label */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ ...S.label, marginBottom:0 }}>Mission Progress</div>
            <div style={{ display:'flex', gap:5 }}>
              {Array.from({length:6}, (_,i) => {
                const active = i < Math.ceil(timeProgress * 6);
                return (
                  <div key={i} className={`gear-pip ${active ? (isRedline ? 'redline' : 'active') : ''}`} />
                );
              })}
            </div>
            <div style={{ ...S.orbitron, fontSize:'0.5rem', letterSpacing:'0.3em', color:C.dim }}>
              {phase === 2 ? 'MODULE A — SYSTEM CHECK' : phase === 3 ? 'MODULE B — PLATE CAL.' : 'MODULE C — CITATION'}
            </div>
          </div>

          {/* Right: Timer + Score */}
          <div style={{ display:'flex', gap:28, alignItems:'center' }}>
            <div style={{ textAlign:'right' }}>
              <div style={S.label}>Time Remaining</div>
              <div style={{
                ...S.orbitron, fontSize:'1.8rem', fontWeight:900, lineHeight:1,
                color: isRedline ? C.red : C.text,
                letterSpacing:'0.04em',
                textShadow: isRedline ? `0 0 18px ${C.red}` : 'none',
                animation: isRedline ? 'redlinePulse 0.4s ease infinite alternate' : 'none',
              }}>
                {Math.floor(time/60)}:{(time%60).toString().padStart(2,'0')}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width:1, height:36, background:C.border }} />

            <div style={{ textAlign:'right' }}>
              <div style={S.label}>Score</div>
              <div style={{ ...S.orbitron, fontSize:'1.8rem', fontWeight:900, lineHeight:1, color:C.green, letterSpacing:'0.04em' }}>
                {totScore}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ── Main content area ── */}
      <main style={{ flex:1, padding:'24px 28px', overflowY:'auto', position:'relative', zIndex:50, display:'flex', flexDirection:'column' }}>
        {phase === 0 && <BootScreen onDone={() => goToPhase(1)} />}
        {phase === 1 && <BriefingScreen onStart={(t) => { setTeam(t); goToPhase(2); }} />}
        {phase === 2 && (
          <ModuleA score={score} setScore={setScore}
            onComplete={(t) => { if(!t) setScore((s:any) => ({...s, bon: s.bon + Math.floor((time-1680)/5)})); goToPhase(3); }}
            fxFail={fxFail} />
        )}
        {phase === 3 && (
          <ModuleB score={score} setScore={setScore}
            onComplete={(t) => { if(!t) setScore((s:any) => ({...s, bon: s.bon + Math.floor((time-1200)/5)})); goToPhase(4); }}
            fxFail={fxFail} showToast={showToast} />
        )}
        {phase === 4 && (
          <ModuleC score={score} setScore={setScore}
            onComplete={() => { setScore((s:any) => ({...s, bon: s.bon + Math.floor(time/5)})); goToPhase(5); }}
            fxFail={fxFail} showToast={showToast} />
        )}
        {phase === 5 && <OutroScreen score={score} team={team} totScore={totScore} />}
      </main>
    </motion.div>
  );
}

/* ================================================================
   BOOT SCREEN — Cinematic opening
   ================================================================ */
function BootScreen({ onDone }: { onDone: () => void }) {
  const [text,   setText]   = useState('');
  const [lights, setLights] = useState(false);
  const fullText = 'OPERATION REDLINE — INITIATED\nANPR SURVEILLANCE GRID: ONLINE\nTARGET: ILLEGAL STREET RACE — SECTOR 7\nFAST CREW VEHICLES DETECTED ON LOOP\nESTABLISHING PURSUIT UPLINK...';

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setText(fullText.slice(0, i) + (Math.random() > 0.5 ? '█' : ''));
      i++;
      if (i > fullText.length) {
        clearInterval(t);
        setLights(true);
        setTimeout(onDone, 1500);
      }
    }, 38);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:40 }}>

      {/* Title block */}
      <motion.div
        initial={{ opacity:0, y:-16 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.6 }}
        style={{ textAlign:'center' }}
      >
        {/* Sub-label above */}
        <div style={{ ...S.orbitron, fontSize:'0.6rem', fontWeight:600, letterSpacing:'0.5em', color:C.muted, marginBottom:8 }}>
          FAST &amp; FURIOUS // ANPR PURSUIT GRID
        </div>

        {/* Giant title */}
        <div style={{
          fontFamily:"'Orbitron', monospace",
          fontSize: 'clamp(3rem,8vw,5.5rem)',
          fontWeight: 900,
          lineHeight: 1,
          background: `linear-gradient(135deg, ${C.red} 0%, ${C.orange} 60%, #FFB840 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 0 32px rgba(255,48,56,0.35))`,
          letterSpacing: '0.04em',
        }}>
          OPERATION<br />REDLINE
        </div>

        {/* Thin red rule */}
        <motion.div
          initial={{ scaleX:0 }}
          animate={{ scaleX:1 }}
          transition={{ duration:0.6, delay:0.3 }}
          style={{ height:1, background:`linear-gradient(90deg, transparent, ${C.red}, ${C.orange}, transparent)`, marginTop:16 }}
        />
      </motion.div>

      {/* Terminal output */}
      <motion.div
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        transition={{ delay:0.4 }}
        className="terminal-text"
        style={{ textAlign:'center', whiteSpace:'pre-wrap', maxWidth:560, lineHeight:2 }}
      >
        {text}
      </motion.div>

      {/* Drag-race staging lights */}
      <AnimatePresence>
        {lights && (
          <motion.div
            initial={{ opacity:0, scale:0.8 }}
            animate={{ opacity:1, scale:1 }}
            style={{ display:'flex', gap:6, alignItems:'center' }}
          >
            {[C.red, C.amber, C.amber, C.green].map((_, i) => (
              <motion.div
                key={i}
                className={`drag-light ${i===0?'red':i===3?'green':'yellow'}`}
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                transition={{ delay: i * 0.14 }}
              />
            ))}
            <span style={{ ...S.orbitron, fontSize:'0.55rem', letterSpacing:'0.3em', color:C.green, marginLeft:10 }}>
              GO
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   BRIEFING SCREEN — Mission start
   ================================================================ */
function BriefingScreen({ onStart }: { onStart: (t:{name:string;size:number}) => void }) {
  const [name, setName] = useState('');
  const [size, setSize] = useState(3);

  const roles = [
    { t:'OPERATOR',  c:C.orange, d:'Controls the terminal.',                  icon:'⌨' },
    { t:'VERIFIER',  c:C.blue,   d:size===2?'Maths & codes.':'Validates plates.',  icon:'🔍' },
    ...(size===3 ? [{ t:'TACTICIAN', c:C.amber, d:'Calculates speed & fines.', icon:'⚡' }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity:0, y:20 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.45 }}
      style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', maxWidth:860, margin:'0 auto', width:'100%', paddingBlock:24 }}
    >
      {/* Page heading */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ ...S.orbitron, fontSize:'0.6rem', letterSpacing:'0.4em', color:C.muted, marginBottom:10 }}>
          ANPR GRID: SECTOR 7 // ILLEGAL STREET RACE IN PROGRESS
        </div>
        <GlitchText text="OPERATION REDLINE" style={{ fontSize:'clamp(2rem,5vw,3.2rem)', fontWeight:900 }} />
      </div>

      {/* Mission brief card */}
      <Panel className="w-full" style={{ marginBottom:16 }}>
        <SectionLabel>Mission Brief</SectionLabel>
        <p style={{ ...S.inter, fontSize:'1rem', color:C.muted, lineHeight:1.75, margin:0 }}>
          The <strong style={{color:C.text}}>Fast Crew</strong> is running the highway loop tonight —
          no permits, no limits. You have{' '}
          <strong style={{color:C.orange}}>30 minutes</strong> to intercept, scan plates, verify
          identities, and issue citations before they scatter.{' '}
          <span style={{color:C.blue}}>Precision is mandatory. Speed is everything.</span>
        </p>
      </Panel>

      {/* Team setup row */}
      <div style={{ display:'flex', gap:12, width:'100%', marginBottom:16 }}>
        <Panel style={{ flex:1 }}>
          <SectionLabel>Crew Callsign</SectionLabel>
          <input
            type="text"
            placeholder="ENTER CALLSIGN"
            value={name}
            onChange={e => setName(e.target.value.toUpperCase())}
            style={{
              width:'100%', background:'rgba(0,0,0,0.5)',
              border:`1px solid ${C.border}`, borderRadius:0,
              color:C.text, padding:'10px 14px',
              fontFamily:"'Orbitron', monospace", fontSize:'0.85rem',
              letterSpacing:'0.1em', outline:'none',
              clipPath:'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          />
        </Panel>
        <Panel style={{ flex:1 }}>
          <SectionLabel>Crew Size</SectionLabel>
          <select
            value={size}
            onChange={e => setSize(Number(e.target.value))}
            style={{
              width:'100%', background:'rgba(0,0,0,0.5)',
              border:`1px solid ${C.border}`,
              color:C.text, padding:'10px 14px',
              fontFamily:"'Orbitron', monospace", fontSize:'0.85rem',
              outline:'none', appearance:'none',
            }}
          >
            <option value={3}>3 Officers</option>
            <option value={2}>2 Officers</option>
          </select>
        </Panel>
      </div>

      {/* Role cards */}
      <div style={{ display:'flex', gap:12, width:'100%', marginBottom:28 }}>
        {roles.map((r,i) => (
          <motion.div
            key={i}
            initial={{ opacity:0, y:12 }}
            animate={{ opacity:1,  y:0  }}
            transition={{ delay: 0.1 + i*0.08 }}
            style={{ flex:1 }}
          >
            <Panel style={{ textAlign:'center' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>{r.icon}</div>
              <div style={{ ...S.orbitron, fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.12em', color:r.c, marginBottom:4 }}>
                {r.t}
              </div>
              <div style={{ ...S.inter, fontSize:'0.82rem', color:C.muted, lineHeight:1.5 }}>{r.d}</div>
            </Panel>
          </motion.div>
        ))}
      </div>

      <Btn onClick={() => onStart({ name: name || 'ROGUE', size })} className="text-xl px-16 py-4">
        START MISSION
      </Btn>
    </motion.div>
  );
}

/* ================================================================
   MODULE A — System knowledge quiz
   ================================================================ */
function ModuleA({ score, setScore, onComplete, fxFail }:any) {
  const [qs]   = useState(() => [...pA].sort(() => Math.random()-0.5).slice(0,2));
  const [qIdx, setQIdx] = useState(0);
  const [opts, setOpts] = useState<string[]>([]);
  const [ansd, setAnsd] = useState<string|null>(null);

  useEffect(() => {
    if (qIdx < 2) setOpts([qs[qIdx].a, ...qs[qIdx].w].sort(() => Math.random()-0.5));
    else onComplete(false);
  }, [qIdx]);

  if (qIdx >= 2) return null;
  const q = qs[qIdx];

  const handleAns = (opt: string) => {
    if (ansd) return;
    setAnsd(opt);
    if (opt === q.a) setScore((s:any) => ({...s, a: s.a+10}));
    else { setScore((s:any) => ({...s, ap: s.ap+3})); fxFail(); }
    setTimeout(() => { setAnsd(null); setQIdx(i => i+1); }, 1200);
  };

  return (
    <motion.div
      key={qIdx}
      initial={{ x:50, opacity:0 }}
      animate={{ x:0,  opacity:1 }}
      style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', maxWidth:780, margin:'0 auto', width:'100%', gap:20 }}
    >
      {/* Module header */}
      <div style={{ width:'100%', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:3, height:20, background:C.red }} />
        <span style={{ ...S.orbitron, fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.25em', color:C.muted }}>
          MODULE A — SYSTEM CHECK {qIdx+1} / 2
        </span>
        <div style={{ flex:1, height:1, background:C.border }} />
        {/* Mini progress pips */}
        <div style={{ display:'flex', gap:4 }}>
          {[0,1].map(i => (
            <div key={i} style={{ width:16, height:4, background: i < qIdx ? C.green : i === qIdx ? C.orange : C.border, borderRadius:1, transition:'background 0.3s' }} />
          ))}
        </div>
      </div>

      <Panel className="w-full">
        <div style={{ ...S.orbitron, fontSize:'0.55rem', letterSpacing:'0.25em', color:C.dim, marginBottom:16 }}>
          INTEL QUERY
        </div>
        <p style={{ ...S.inter, fontSize:'1.35rem', fontWeight:500, color:C.text, marginBottom:28, lineHeight:1.5 }}>
          {q.q}
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {opts.map((o,i) => {
            let cls = 'option-card';
            if (ansd) {
              if (o === q.a) cls += ' correct';
              else if (o === ansd) cls += ' wrong';
              else cls += ' dimmed';
            }
            return (
              <motion.button
                key={i}
                whileHover={!ansd ? { x:4 } : {}}
                whileTap={!ansd ? { scale:0.98 } : {}}
                onClick={() => handleAns(o)}
                className={cls}
              >
                {o}
              </motion.button>
            );
          })}
        </div>
      </Panel>
    </motion.div>
  );
}

/* ================================================================
   MODULE B — Camera calibration & Tuning
   ================================================================ */
function ModuleB({ score, setScore, onComplete, fxFail, showToast }:any) {
  const [cap]      = useState(() => pB[Math.floor(Math.random()*pB.length)]);
  const [c, setC]  = useState(cap.sc);
  const [t, setT]  = useState(cap.st);
  
  // New Creative States
  const [visionMode, setVisionMode] = useState('OPTICAL');
  const [focus, setFocus] = useState(10);
  const [tracking, setTracking] = useState(15);
  
  // Randomize targets for each plate
  const targetFocus = React.useMemo(() => Math.floor(Math.random() * 60) + 20, []);
  const targetTracking = React.useMemo(() => Math.floor(Math.random() * 60) + 20, []);

  const [diagDone, setDiagDone]   = useState(false);
  const [ocrRunning, setOcr]      = useState(false);
  const [sliderX, setSliderX]     = useState(300);
  const [imgFailed, setImgFailed] = useState(false);
  const vWrapRef = useRef<HTMLDivElement>(null);

  // Confidence calculation
  let cf = 100;
  
  // Contrast / Brightness penalty
  if (c < cap.tc[0]) cf -= 0.8*(cap.tc[0]-c); else if (c > cap.tc[1]) cf -= 0.8*(c-cap.tc[1]);
  if (t < cap.tt[0]) cf -= 0.4*(cap.tt[0]-t); else if (t > cap.tt[1]) cf -= 0.4*(t-cap.tt[1]);
  
  // Focus penalty
  const focusError = Math.abs(focus - targetFocus);
  if (focusError > 20) cf -= (focusError - 20) * 0.8;

  // Tracking penalty
  const trackError = Math.abs(tracking - targetTracking);
  if (trackError > 20) cf -= (trackError - 20) * 0.8;

  if (visionMode === 'THERMAL') cf -= 2; 

  const conf = Math.max(0, Math.min(100, Math.floor(cf)));

  const handleDrag = (e:any) => {
    if (!vWrapRef.current) return;
    const rect = vWrapRef.current.getBoundingClientRect();
    let x = e.clientX || (e.touches && e.touches[0].clientX);
    if (!x) return;
    setSliderX(Math.max(0, Math.min(rect.width, x - rect.left)));
  };

  // Build the CSS filters
  const focusBlur = focusError > 10 ? (focusError - 10) * 0.1 : 0;
  
  let modeFilter = `grayscale(100%)`;
  if (visionMode === 'NIGHT') modeFilter = `sepia(100%) hue-rotate(90deg) saturate(300%) contrast(110%)`;
  if (visionMode === 'THERMAL') modeFilter = `sepia(100%) hue-rotate(180deg) saturate(400%) invert(90%)`;

  const cssRaw  = `grayscale(100%) blur(5px) contrast(${cap.sc}%) brightness(${cap.st}%)`;
  const cssProc = `${modeFilter} contrast(${c}%) brightness(${t}%) blur(${focusBlur}px)`;

  const [scannedConf, setScannedConf] = useState<number | null>(null);
  const confColor = scannedConf !== null ? (scannedConf>=90 ? C.green : scannedConf>=75 ? C.amber : C.red) : C.dim;
  
  // Tracking glitch opacity
  const glitchOpacity = trackError > 10 ? Math.min(1, (trackError - 10) / 40) : 0;
  const isJittering = trackError > 25;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, height:'100%' }}>

      {/* ── Left column: camera + OCR ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Panel style={{ flex:1, maxHeight:440 }}>
          <div style={{ position:'relative', background:'#000', height:'100%', minHeight:300, border:`1px solid ${C.border}`, overflow:'hidden' }}
            className={`cam-bracket ${isJittering ? 'glitch-shake' : 'cam-scanlines'}`}>

            <div style={{ position:'absolute', inset:0, background:'rgba(5,6,8,0.5)', zIndex:1 }} />

            {/* REC badge + Camera ID */}
            <div style={{ position:'absolute', top:10, left:10, zIndex:10 }}>
              <div className="rec-indicator"><div className="rec-dot" />REC</div>
            </div>
            <div style={{ position:'absolute', top:10, right:10, ...S.orbitron, fontSize:'0.55rem', color:'rgba(0,200,255,0.45)', letterSpacing:'0.15em', zIndex:10 }}>
              CAM-B // {cap.id} // {visionMode}
            </div>

            {/* Comparison slider */}
            <div
              ref={vWrapRef}
              className="cam-noise"
              style={{ position:'relative', width:'100%', height:'100%', zIndex:5, userSelect:'none', overflow:'hidden' }}
              onMouseMove={e => e.buttons===1 && handleDrag(e)}
              onTouchMove={handleDrag}
            >
              {/* Processed image */}
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#1a1a22', filter:cssProc }}>
                {(!cap.img||imgFailed)
                  ? <span style={{ ...S.orbitron, fontSize:'3rem', fontWeight:700, color:'#6a6a8a' }}>{cap.p}</span>
                  : <img src={cap.img} onError={() => setImgFailed(true)} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                }
              </div>
              
              {/* Tracking Glitch Overlay */}
              {glitchOpacity > 0 && (
                <div style={{
                  position:'absolute', inset:0, 
                  background:'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, transparent 2px, transparent 10px)',
                  opacity: glitchOpacity,
                  mixBlendMode: 'overlay',
                  pointerEvents: 'none'
                }} />
              )}

              {/* Raw image clipped */}
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#1a1a22', filter:cssRaw, clipPath:`inset(0 calc(100% - ${sliderX}px) 0 0)` }}>
                {(!cap.img||imgFailed)
                  ? <span style={{ ...S.orbitron, fontSize:'3rem', fontWeight:700, color:'#6a6a8a' }}>{cap.p}</span>
                  : <img src={cap.img} onError={() => setImgFailed(true)} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                }
              </div>

              {/* OCR scan line */}
              {ocrRunning && (
                <motion.div
                  initial={{ left:'-4%' }}
                  animate={{ left:'104%' }}
                  transition={{ duration:1, ease:'linear' }}
                  style={{ position:'absolute', top:'-5%', width:5, height:'110%', background:`linear-gradient(180deg, transparent, ${C.blue}, transparent)`, boxShadow:`0 0 16px ${C.blue}`, transform:'skewX(-10deg)', zIndex:20 }}
                />
              )}

              {/* Slider handle */}
              <div
                style={{ position:'absolute', top:0, bottom:0, left:sliderX, width:1.5, background:C.orange, cursor:'ew-resize' }}
                onMouseDown={e => e.preventDefault()}
              >
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:C.orange, color:'#000', fontSize:'0.55rem', padding:'2px 6px', ...S.orbitron, whiteSpace:'nowrap', letterSpacing:'0.1em' }}>
                  ◀▶
                </div>
              </div>
            </div>

            {/* Labels */}
            <div style={{ position:'absolute', bottom:8, left:12, ...S.orbitron, fontSize:'0.5rem', color:`rgba(255,107,44,0.5)`, letterSpacing:'0.1em', zIndex:10 }}>RAW</div>
            <div style={{ position:'absolute', bottom:8, right:12, ...S.orbitron, fontSize:'0.5rem', color:`rgba(0,200,255,0.5)`, letterSpacing:'0.1em', zIndex:10 }}>PROCESSED</div>
          </div>
        </Panel>

        {/* Confidence gauge + OCR trigger */}
        <Panel style={{ display:'flex', alignItems:'center', gap:24 }}>
          {/* Arc gauge */}
          <div style={{ position:'relative', width:150, height:80, flexShrink:0 }}>
            <svg width="150" height="80" viewBox="0 0 150 80">
              <path d="M10 76 A60 60 0 0 1 140 76" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
              {scannedConf !== null && (
                <motion.path
                  d="M10 76 A60 60 0 0 1 140 76"
                  fill="none" stroke={confColor} strokeWidth="10"
                  strokeDasharray="195"
                  initial={{ strokeDashoffset:195 }}
                  animate={{ strokeDashoffset: 195 - (scannedConf/100)*195 }}
                  transition={{ duration:0.7, ease:'easeOut' }}
                />
              )}
            </svg>
            <div style={{ position:'absolute', bottom:0, width:'100%', textAlign:'center', ...S.orbitron, fontSize:'1.8rem', fontWeight:900, lineHeight:1, color: confColor }}>
              {scannedConf !== null ? scannedConf : '--'}%
            </div>
          </div>

          <div style={{ flex:1 }}>
            <div className="sys-assist" style={{ marginBottom:12, fontSize:'0.72rem' }}>
              Char gray: <strong style={{color:C.text}}>{cap.cg}</strong> &nbsp;|&nbsp; BG gray: <strong style={{color:C.text}}>{cap.bg}</strong>
            </div>
            <Btn variant="primary" className="w-full" onClick={() => {
              if (!diagDone || ocrRunning) return;
              setScannedConf(null); // Reset before animating
              setOcr(true);
              setTimeout(() => {
                setOcr(false);
                setScannedConf(conf);
                if (conf >= 90) {
                  setScore((s:any) => ({...s, b:s.b+20}));
                  showToast('PLATE VERIFIED — SENDING TO CHALLAN');
                  setTimeout(() => onComplete(false), 1200);
                } else {
                  fxFail();
                  showToast('CONFIDENCE TOO LOW — RECALIBRATE', true);
                  setScore((s:any) => ({...s, cp:s.cp+3}));
                }
              }, 1100);
            }}>
              SEND TO OCR
            </Btn>
          </div>
        </Panel>
      </div>

      {/* ── Right column: controls ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Diagnostic Lock */}
        <Panel>
          <SectionLabel>1 · System Uplink</SectionLabel>
          <div style={{ display:'flex', gap:10, marginBottom:8 }}>
            <Btn variant={diagDone ? 'ghost' : 'orange'} className="w-full" style={{ padding:'12px' }} onClick={() => {
              if (diagDone) return;
              setDiagDone(true);
              setScore((s:any) => ({...s,b:s.b+5}));
              showToast('UPLINK ESTABLISHED');
            }}>
              {diagDone ? 'UPLINK ACTIVE' : 'INITIALIZE UPLINK'}
            </Btn>
          </div>
        </Panel>

        {/* Repair params */}
        <Panel style={{ flex:1, position:'relative', opacity: diagDone ? 1 : 0.45, pointerEvents: diagDone ? 'auto' : 'none', overflowY:'auto' }}>
          {!diagDone && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, ...S.orbitron, fontSize:'0.75rem', color:C.red, textAlign:'center', padding:16 }}>
              ESTABLISH UPLINK FIRST
            </div>
          )}
          
          <SectionLabel>2 · Signal Tuning</SectionLabel>
          
          {/* Vision Modes */}
          <div style={{ marginBottom:18 }}>
            <div style={{ ...S.orbitron, fontSize:'0.6rem', letterSpacing:'0.15em', color:C.muted, marginBottom:8 }}>SENSOR SPECTRUM</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
              {[ { id:'OPTICAL', label:'RGB' }, { id:'NIGHT', label:'NVG' }, { id:'THERMAL', label:'FLIR' } ].map(mode => (
                <div 
                  key={mode.id} 
                  onClick={() => { setVisionMode(mode.id); setScannedConf(null); }}
                  style={{ 
                    padding:'8px 4px', textAlign:'center', cursor:'pointer',
                    background: visionMode === mode.id ? 'rgba(0,200,255,0.1)' : C.bg2,
                    border: `1px solid ${visionMode === mode.id ? C.blue : C.border}`,
                    color: visionMode === mode.id ? C.blue : C.muted,
                    ...S.orbitron, fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em'
                  }}>
                  {mode.label}
                </div>
              ))}
            </div>
          </div>

          {/* Tracking slider */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ ...S.orbitron, fontSize:'0.55rem', letterSpacing:'0.15em', color:C.muted }}>FRAME SYNC (Hz)</span>
              <span style={{ ...S.orbitron, fontSize:'0.65rem', color: trackError <= 20 ? C.blue : C.text }}>
                {(tracking * 1.44).toFixed(1)}
              </span>
            </div>
            <input type="range" min="0" max="100" value={tracking} onChange={e => { setTracking(Number(e.target.value)); setScannedConf(null); }} />
          </div>

          {/* Focus slider */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ ...S.orbitron, fontSize:'0.55rem', letterSpacing:'0.15em', color:C.muted }}>FOCAL ARRAY (μm)</span>
              <span style={{ ...S.orbitron, fontSize:'0.65rem', color: focusError <= 20 ? C.blue : C.text }}>
                0x{focus.toString(16).toUpperCase().padStart(2, '0')}
              </span>
            </div>
            <input type="range" min="0" max="100" value={focus} onChange={e => { setFocus(Number(e.target.value)); setScannedConf(null); }} />
          </div>

          {/* Contrast slider */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ ...S.orbitron, fontSize:'0.55rem', letterSpacing:'0.15em', color:C.muted }}>GAIN (dB)</span>
              <span style={{ ...S.orbitron, fontSize:'0.65rem', color: (c >= cap.tc[0] && c <= cap.tc[1]) ? C.blue : C.text }}>
                {(c / 10).toFixed(1)}
              </span>
            </div>
            <input type="range" min="10" max="100" value={c} onChange={e => { setC(Number(e.target.value)); setScannedConf(null); }} />
          </div>

          {/* Brightness/Threshold slider */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ ...S.orbitron, fontSize:'0.55rem', letterSpacing:'0.15em', color:C.muted }}>EXPOSURE (ms)</span>
              <span style={{ ...S.orbitron, fontSize:'0.65rem', color: (t >= cap.tt[0] && t <= cap.tt[1]) ? C.blue : C.text }}>
                {t}
              </span>
            </div>
            <input type="range" min="50" max="200" value={t} onChange={e => { setT(Number(e.target.value)); setScannedConf(null); }} />
          </div>

        </Panel>
      </div>
    </div>
  );
}

/* ================================================================
   MODULE C — Citation processing (Interceptor Redesign)
   ================================================================ */
function ModuleC({ score, setScore, onComplete, fxFail, showToast }:any) {
  const [cap] = useState(() => pC[Math.floor(Math.random()*pC.length)]);
  
  // Calculate actual speed since some plates use dist/time instead of raw spd
  const actualSpeed = cap.dist ? Math.round((cap.dist/cap.t)*3.6) : cap.spd;
  const speedLimit = cap.z==='S'?30:cap.z==='R'?40:cap.z==='U'?60:80;

  // Game phases: 'SCAN' -> 'SYNC' -> 'DONE'
  const [phase, setPhase] = useState('SCAN');
  
  // SCAN Phase: Timing bar
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const reqRef = useRef(0);
  
  // SYNC Phase: Frequency matcher
  const [freq, setFreq] = useState(0);
  const [targetFreq] = useState(() => Math.floor(Math.random() * 60) + 20);
  const isFreqMatched = Math.abs(freq - targetFreq) < 4;

  const [showTkt, setTkt] = useState(false);

  useEffect(() => {
    if (phase !== 'SCAN') return;
    const loop = () => {
      // Base speed + slightly faster if speed is higher
      const speed = 1.0 + (actualSpeed / 120); 
      posRef.current += dirRef.current * speed;
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
      reqRef.current = requestAnimationFrame(loop);
    };
    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, [phase, actualSpeed]);

  const handleIntercept = () => {
    if (phase !== 'SCAN') return;
    // Widened sweet spot for better playability (65 to 90)
    if (posRef.current >= 65 && posRef.current <= 90) {
      setScore((s:any) => ({...s, c: s.c + 15}));
      showToast('TARGET LOCKED');
      setPhase('SYNC');
    } else {
      fxFail();
      showToast('LOCK FAILED — RECALIBRATING', true);
      setScore((s:any) => ({...s, cp: s.cp + 5}));
    }
  };

  const handleBeam = () => {
    if (!isFreqMatched) return;
    setScore((s:any) => ({...s, c: s.c + 20}));
    setPhase('DONE');
    setTkt(true);
  };

  // SVG Sine Wave Generator
  const generateWave = (f: number, offset: number, amp: number, stroke: string, width: number) => {
    const points = [];
    for (let x = 0; x <= 100; x++) {
      // Map 0-100 to SVG coordinates
      const y = 50 + Math.sin((x + offset) * f * 0.1) * amp;
      points.push(`${x*3},${y}`);
    }
    return (
      <polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, height:'100%' }}>

      {/* Target Data Header */}
      <div style={{ display:'flex', gap:10 }}>
        {[
          { label:'Target Plate', value:cap.p, color:C.text },
          { label:'Recorded Speed', value:`${actualSpeed} KM/H`, color:C.red },
          { label:'Zone Limit', value:`${speedLimit} KM/H`, color:C.blue },
          { label:'Status', value: phase==='SCAN'?'TRACKING':phase==='SYNC'?'LOCKED':'CITATION ISSUED', color: phase==='SCAN'?C.orange:C.green },
        ].map((item, i) => (
          <div key={i} style={{ flex:1, background:C.bg2, border:`1px solid ${C.border}`, padding:'10px 14px', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ ...S.label, marginBottom:4 }}>{item.label}</div>
            <div style={{ ...S.orbitron, fontSize:'0.95rem', fontWeight:700, color:item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <Panel style={{ flex:1, display:'flex', flexDirection:'column', padding:0, overflow:'hidden', position:'relative' }}>
        
        {/* PHASE 1: SCANNING (Radar Timing) */}
        {phase === 'SCAN' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
            <div style={{ ...S.orbitron, fontSize:'1.2rem', color:C.red, letterSpacing:'0.2em', marginBottom:40, textAlign:'center' }}>
              INTERCEPT VECTOR REQUIRED
              <div style={{ fontSize:'0.6rem', color:C.muted, marginTop:8 }}>ENGAGE LOCK WHEN BLIP IS IN THE ZONE</div>
            </div>

            {/* Radar Bar */}
            <div style={{ width:'100%', maxWidth:500, height:40, background:'rgba(0,0,0,0.5)', border:`1px solid ${C.border}`, position:'relative', borderRadius:20, overflow:'hidden', marginBottom:40 }}>
              {/* Sweet spot zone (65 to 90) */}
              <div style={{ position:'absolute', left:'65%', width:'25%', top:0, bottom:0, background:'rgba(34,197,94,0.2)', borderLeft:`2px solid ${C.green}`, borderRight:`2px solid ${C.green}` }} />
              
              {/* Moving Blip */}
              <div style={{ position:'absolute', left:`${pos}%`, top:0, bottom:0, width:4, background:C.orange, transform:'translateX(-50%)', boxShadow:`0 0 12px ${C.orange}` }} />
            </div>

            <Btn variant="primary" style={{ padding:'20px 60px', fontSize:'1rem' }} onClick={handleIntercept}>
              ENGAGE TARGET LOCK
            </Btn>
          </div>
        )}

        {/* PHASE 2: SYNC (Frequency Match) */}
        {phase === 'SYNC' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
            <div style={{ ...S.orbitron, fontSize:'1.2rem', color:C.blue, letterSpacing:'0.2em', marginBottom:30, textAlign:'center' }}>
              DATA LINK SYNCHRONIZATION
              <div style={{ fontSize:'0.6rem', color:C.muted, marginTop:8 }}>MATCH LOCAL FREQUENCY WITH TARGET TRANSPONDER</div>
            </div>

            {/* Oscilloscope View */}
            <div style={{ width:'100%', maxWidth:500, height:120, background:'rgba(0,0,0,0.8)', border:`1px solid ${C.blue}`, position:'relative', marginBottom:40, overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg, transparent 0px, transparent 19px, rgba(0,200,255,0.1) 20px)', backgroundSize:'100% 20px' }} />
              <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(90deg, transparent 0px, transparent 19px, rgba(0,200,255,0.1) 20px)', backgroundSize:'20px 100%' }} />
              
              <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0 }}>
                {/* Target Wave (Red) */}
                {generateWave(targetFreq * 0.05 + 1, Date.now() / 1000, 30, 'rgba(255,48,56,0.5)', 3)}
                
                {/* User Wave (Blue) */}
                {generateWave(freq * 0.05 + 1, Date.now() / 1000, 30, isFreqMatched ? C.green : C.blue, 2)}
              </svg>

              {isFreqMatched && (
                <div style={{ position:'absolute', top:10, right:10, ...S.orbitron, fontSize:'0.7rem', color:C.green, fontWeight:900, letterSpacing:'0.1em' }}>
                  [ SYNC LOCK ]
                </div>
              )}
            </div>

            {/* Frequency Slider */}
            <div style={{ width:'100%', maxWidth:500, marginBottom:30 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ ...S.orbitron, fontSize:'0.6rem', color:C.muted }}>LOCAL OSCILLATOR (MHz)</span>
                <span style={{ ...S.orbitron, fontSize:'0.7rem', color: isFreqMatched ? C.green : C.blue }}>{(freq * 2.4).toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="100" value={freq} onChange={e => setFreq(Number(e.target.value))} style={{ width:'100%' }} />
            </div>

            <Btn variant={isFreqMatched ? 'primary' : 'ghost'} style={{ padding:'20px 60px', fontSize:'1rem', opacity: isFreqMatched ? 1 : 0.5, pointerEvents: isFreqMatched ? 'auto' : 'none' }} onClick={handleBeam}>
              BEAM CITATION
            </Btn>
          </div>
        )}

      </Panel>

      {/* ── Challan ticket overlay ── */}
      {showTkt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', zIndex:9500, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <motion.div
            initial={{ scale:0.75, opacity:0 }}
            animate={{ scale:1,    opacity:1 }}
            transition={{ type:'spring', stiffness:220, damping:22 }}
            className="challan-paper"
            style={{ width:340, padding:28, boxShadow:'0 30px 80px rgba(0,0,0,0.9)', position:'relative' }}
          >
            <div style={{ textAlign:'center', borderBottom:'2px dashed #bbb', paddingBottom:14, marginBottom:14 }}>
              <div style={{ fontWeight:900, fontSize:'1.1rem', letterSpacing:'0.04em' }}>eCHALLAN CITATION</div>
              <div style={{ fontSize:'0.7rem', color:'#666', marginTop:3 }}>REDLINE SURVEILLANCE GRID</div>
            </div>
            {[
              ['PLATE',     cap.p],
              ['VIOLATION', 'OVERSPEEDING'],
              ['FINE',      'Rs 2,000 (DIGITAL BEAM)'],
              ['ISSUER',    `LVL-${cap.o}`],
              ['SYNC FREQ', `${(freq * 2.4).toFixed(1)} MHz`],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:7, fontSize:'0.9rem', borderBottom:'1px dashed #ddd', paddingBottom:6 }}>
                <span style={{ color:'#555' }}>{k}</span><strong>{v}</strong>
              </div>
            ))}
            {/* Rubber stamp */}
            <motion.div
              className="challan-stamp"
              initial={{ scale:2.5, opacity:0 }}
              animate={{ scale:1,   opacity:1 }}
              transition={{ delay:0.35, type:'spring' }}
              style={{ borderColor: C.red, color: C.red }}
            >
              CHALLAN ISSUED
            </motion.div>
          </motion.div>

          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
            <Btn style={{ marginTop:28 }} onClick={onComplete}>Clear Dashboard</Btn>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   OUTRO SCREEN — Finish line / results
   ================================================================ */
function OutroScreen({ score:S, team, totScore }:any) {
  let rank = 'ROOKIE'; let rankIcon = '🏎';
  if (totScore >= 120) { rank='DCP';       rankIcon='👑'; }
  else if (totScore >= 90)  { rank='INSPECTOR'; rankIcon='🏆'; }
  else if (totScore >= 60)  { rank='OFFICER';   rankIcon='🎖'; }

  const rows = [
    { label:'Sec A Base',    val:S.a,    color:C.muted },
    { label:'Sec A Penalty', val:`-${S.ap}`, color:C.red   },
    { label:'Sec B Base',    val:S.b,    color:C.muted },
    { label:'Sec B Penalty', val:`-${S.bp}`, color:C.red   },
    { label:'Sec C Base',    val:S.c,    color:C.muted },
    { label:'Sec C Penalty', val:`-${S.cp}`, color:C.red   },
    { label:'Speed Bonus',   val:`+${S.bon}`, color:C.blue  },
  ];

  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}
    >
      {/* Checkered flag */}
      <div className="finish-line-bar" style={{ width:'100%' }} />

      {/* Result heading */}
      <motion.div
        initial={{ scale:0.85, opacity:0 }}
        animate={{ scale:1,    opacity:1 }}
        transition={{ type:'spring', stiffness:200, delay:0.15 }}
        style={{ textAlign:'center' }}
      >
        <GlitchText
          text="MISSION COMPLETE"
          style={{ fontSize:'clamp(2.2rem,5vw,3.8rem)', fontWeight:900, color:C.green }}
        />
      </motion.div>

      {/* Score card */}
      <motion.div
        initial={{ y:28, opacity:0 }}
        animate={{ y:0,  opacity:1 }}
        transition={{ delay:0.3 }}
        className="rank-card panel-clip"
        style={{ display:'flex', gap:0, width:'min(700px, 95vw)' }}
      >
        {/* Rank badge column */}
        <div style={{ width:140, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', gap:10 }}>
          <div style={{ fontSize:'3rem', lineHeight:1 }}>{rankIcon}</div>
          <div style={{ ...S.orbitron, fontSize:'0.85rem', fontWeight:700, letterSpacing:'0.08em', color:C.orange, textAlign:'center' }}>{rank}</div>
          <div style={{ ...S.orbitron, fontSize:'0.45rem', letterSpacing:'0.2em', color:C.dim }}>RANK ACHIEVED</div>
        </div>

        {/* Stats table */}
        <div style={{ flex:1, padding:'24px 28px' }}>
          <div style={{ ...S.orbitron, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', color:C.muted, borderBottom:`1px solid ${C.border}`, paddingBottom:12, marginBottom:14 }}>
            OFFICER RECORD — {team.name}
          </div>
          {rows.map(({ label, val, color }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, paddingBottom:7, borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
              <span style={{ ...S.inter, fontSize:'0.85rem', color:C.dim }}>{label}</span>
              <span style={{ ...S.orbitron, fontSize:'0.85rem', fontWeight:700, color }}>{val}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
            <span style={{ ...S.orbitron, fontSize:'0.85rem', fontWeight:700, color:C.muted }}>TOTAL SCORE</span>
            <span style={{ ...S.orbitron, fontSize:'2rem', fontWeight:900, color:C.green }}>{totScore}</span>
          </div>
        </div>
      </motion.div>

      {/* Sync code */}
      <div style={{ background:C.bg2, border:`1px solid ${C.border}`, padding:'12px 24px', ...S.orbitron, fontSize:'0.65rem', letterSpacing:'0.08em', color:C.dim }}>
        SYNC CODE:{' '}
        <span style={{ color:C.orange, userSelect:'all' }}>
          {`${team.name} | ${team.size} | ${Math.max(0,S.a+S.b+S.c-S.ap-S.bp-S.cp)} | ${S.bon} | ${totScore}`}
        </span>
      </div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}>
        <Btn variant="ghost" onClick={() => window.location.reload()}>Next Team — Reset</Btn>
      </motion.div>

      <div className="finish-line-bar" style={{ width:'100%' }} />
    </motion.div>
  );
}

export default Station3;
