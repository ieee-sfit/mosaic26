import React from 'react';
import './station3.css';

export default function CheatSheet() {
    return (
        <div style={styles.body}>
            <style>{`
                @page { size: A4 portrait; margin: 10mm; }
                .cheat-sheet-container * { box-sizing: border-box; margin: 0; padding: 0; }
                .cheat-sheet-container { font-family: 'Arial', sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; height: 297mm; padding: 10mm; margin: 0 auto; position: relative; }
                .cheat-sheet-container h1 { font-family: 'Impact', 'Arial Narrow Bold', sans-serif; font-size: 24pt; text-transform: uppercase; margin: 0; }
                .cheat-sheet-container h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #000; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
                .cheat-sheet-container p, .cheat-sheet-container li, .cheat-sheet-container td, .cheat-sheet-container th { font-size: 9.5pt; line-height: 1.3; }
                .cheat-sheet-container .key-num { font-size: 13pt; font-weight: bold; color: #ffaa00; background: #000; padding: 2px 6px; border-radius: 3px; display: inline-block; }
                .cheat-sheet-container .key-txt { font-weight: bold; color: #0077ff; }
                .cheat-sheet-container .header { background: #0a1520; color: #fff; padding: 10mm; margin: -10mm -10mm 5mm -10mm; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #0077ff; }
                .cheat-sheet-container .header-sub { font-size: 12pt; color: #ffaa00; font-weight: bold; }
                .cheat-sheet-container .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; align-items: start; }
                .cheat-sheet-container .strip { grid-column: span 2; background: #f4f6f8; border: 2px solid #0077ff; border-radius: 5px; padding: 8px; margin-bottom: 5mm; text-align: center; font-weight: bold; }
                .cheat-sheet-container .box { border: 2px solid #333; border-radius: 6px; padding: 8px; margin-bottom: 5mm; background: #fff; page-break-inside: avoid; }
                .cheat-sheet-container .badge { background: #ff3333; color: #fff; width: 22px; height: 22px; display: inline-flex; justify-content: center; align-items: center; border-radius: 50%; font-weight: bold; font-size: 12pt; }
                .cheat-sheet-container .arrow-chain { display: flex; justify-content: space-between; align-items: center; font-size: 10pt; text-transform: uppercase; }
                .cheat-sheet-container .arrow-chain span { background: #fff; padding: 4px 8px; border: 1px solid #0077ff; border-radius: 4px; }
                .cheat-sheet-container .arrow { color: #0077ff; font-weight: bold; }
                .cheat-sheet-container table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                .cheat-sheet-container th, .cheat-sheet-container td { border: 1px solid #ccc; padding: 4px; text-align: left; }
                .cheat-sheet-container th { background: #eee; font-weight: bold; }
                .cheat-sheet-container .traffic-light { display: flex; flex-direction: column; gap: 4px; margin-top: 5px; }
                .cheat-sheet-container .tl-row { display: flex; gap: 10px; align-items: center; padding: 4px; border: 1px solid #ddd; border-radius: 4px; }
                .cheat-sheet-container .tl-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
                .cheat-sheet-container .tl-g { background: #00ff66; border: 1px solid #009933; }
                .cheat-sheet-container .tl-a { background: #ffaa00; border: 1px solid #cc8800; }
                .cheat-sheet-container .tl-r { background: #ff3333; border: 1px solid #cc0000; }
                .cheat-sheet-container .footer { position: absolute; bottom: 10mm; left: 10mm; right: 10mm; text-align: center; font-size: 9pt; font-weight: bold; color: #666; border-top: 1px solid #ccc; padding-top: 5px; }
                @media print {
                    .cheat-sheet-container .header { color: #000; background: #eee !important; border-bottom: 4px solid #000 !important; }
                    .cheat-sheet-container .header-sub { color: #000; }
                    .cheat-sheet-container .key-num { color: #000 !important; background: #ddd !important; border: 1px solid #000; }
                    .cheat-sheet-container .key-txt { color: #000 !important; }
                    .cheat-sheet-container .badge { background: #000 !important; color: #fff !important; }
                    .cheat-sheet-container .strip { border-color: #000 !important; background: #eee !important; }
                    .cheat-sheet-container .tl-g { background: #ddd !important; border: 2px solid #000 !important; }
                    .cheat-sheet-container .tl-a { background: #aaa !important; border: 2px dashed #000 !important; }
                    .cheat-sheet-container .tl-r { background: #000 !important; border: 2px solid #000 !important; }
                    .cheat-sheet-container .arrow-chain span { border-color: #000 !important; }
                    .cheat-sheet-container .arrow { color: #000 !important; }
                }
            `}</style>
            
            <div className="cheat-sheet-container">
                <div className="header">
                    <div>
                        <h1>eCHALLAN POLICE SYSTEMS</h1>
                        <div className="header-sub">STATION 3: NIGHT PATROL HUD</div>
                    </div>
                    <div style={{fontSize: '24pt', fontWeight: 'bold'}}>OP MANUAL</div>
                </div>

                {/* 1. Pipeline Strip */}
                <div className="strip">
                    <h2 style={{justifyContent: 'center', marginBottom: '10px'}}><span className="badge">1</span> ANPR PIPELINE</h2>
                    <div className="arrow-chain">
                        <span>Capture</span><span className="arrow">➔</span>
                        <span>Grayscale</span><span className="arrow">➔</span>
                        <span>Contrast</span><span className="arrow">➔</span>
                        <span>Threshold</span><span className="arrow">➔</span>
                        <span>Segmentation</span><span className="arrow">➔</span>
                        <span>OCR</span><span className="arrow">➔</span>
                        <span>Validation</span><span className="arrow">➔</span>
                        <span>Challan</span>
                    </div>
                </div>

                <div className="grid">
                    {/* Left Column */}
                    <div>
                        {/* 2. Slider Effects */}
                        <div className="box">
                            <h2><span className="badge">2</span> SLIDER EFFECTS</h2>
                            <ul>
                                <li><b>Contrast too low:</b> Faded, plate blends in.</li>
                                <li><b>Contrast too high:</b> Glare halos, strokes merge.</li>
                                <li><b>Threshold too low:</b> Everything white, blank plate.</li>
                                <li><b>Threshold too high:</b> Everything black, fat blobs.</li>
                                <li><b>Denoise:</b> Removes rain speckle and blur.</li>
                            </ul>
                            <div style={{marginTop: '5px', background: '#eee', padding: '4px', textAlign: 'center', borderRadius: '4px', fontWeight: 'bold'}}>
                                Best Threshold = (char gray + background gray) / 2
                            </div>
                        </div>

                        {/* 3. Capture Types */}
                        <div className="box">
                            <h2><span className="badge">3</span> CAPTURE TYPES (NIGHT)</h2>
                            <table>
                                <thead>
                                    <tr><th>Type</th><th>Contrast</th><th>Threshold</th><th>Denoise</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><b>N1 Dim street</b></td><td>60-75</td><td>80-110</td><td>OFF</td></tr>
                                    <tr><td><b>N2 Glare</b></td><td>35-50</td><td>150-180</td><td>OFF</td></tr>
                                    <tr><td><b>N3 Rain blur</b></td><td>55-65</td><td>100-130</td><td><b>ON</b></td></tr>
                                    <tr><td><b>N4 Dirty plate</b></td><td>70-85</td><td>70-95</td><td>OFF</td></tr>
                                    <tr><td><b>N5 Heavy motion</b></td><td>55-65</td><td>100-130</td><td><b>ON</b></td></tr>
                                </tbody>
                            </table>
                            <p style={{fontSize: '8pt', marginTop: '3px', color: '#666'}}>* N5 best possible confidence is ~84%</p>
                        </div>

                        {/* 4. Confidence Ladder */}
                        <div className="box">
                            <h2><span className="badge">4</span> CONFIDENCE LADDER</h2>
                            <div className="traffic-light">
                                <div className="tl-row"><div className="tl-dot tl-g"></div><div><b><span className="key-num">90%</span> or above:</b> Auto-validate (Green)</div></div>
                                <div className="tl-row"><div className="tl-dot tl-a"></div><div><b><span className="key-num">75% - 89%</span>:</b> Manual review, bypass ONLY if conditions are met (Amber)</div></div>
                                <div className="tl-row"><div className="tl-dot tl-r"></div><div><b>Below <span className="key-num">75%</span>:</b> Reject, re-tune (Red)</div></div>
                            </div>
                        </div>

                        {/* 5. Plate Format */}
                        <div className="box">
                            <h2><span className="badge">5</span> PLATE FORMAT</h2>
                            <div style={{fontFamily: 'monospace', fontSize: '14pt', fontWeight: 'bold', textAlign: 'center', margin: '5px 0', background: '#ffe', border: '1px solid #ccc'}}>
                                SS DD AA NNNN
                            </div>
                            <p>Example: MH 02 XX 0000</p>
                            <p><b>Rules:</b> Letters only in S/A spots, digits only in D/N spots.</p>
                            <p><b>Confusable pairs:</b> <span className="key-txt">0/O, 1/I, 8/B, 5/S, 2/Z</span></p>
                            <p><b>State Codes:</b> MH, DL, KA, TN, UP, GJ, RJ, WB, TS, KL.</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        {/* 6. Speed & Fine Maths */}
                        <div className="box">
                            <h2><span className="badge">6</span> SPEED & FINE MATHS</h2>
                            <div style={{background: '#eef5ff', padding: '5px', borderRadius: '4px', marginBottom: '5px', fontWeight: 'bold', textAlign: 'center'}}>
                                Speed (km/h) = distance (m) / time (s) x 3.6
                            </div>
                            <p><b>Tolerance:</b> Subtract <span className="key-num">5</span> km/h first.</p>
                            <p><b>Excess:</b> Effective speed - Zone limit. (≤0 = no fine)</p>
                            
                            <table style={{marginTop: '5px'}}>
                                <thead>
                                    <tr><th>Zone Limits</th><th>Fine Slabs</th></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            School (S): <span className="key-num">30</span><br/>
                                            Residential (R): <span className="key-num">40</span><br/>
                                            Urban (U): <span className="key-num">60</span><br/>
                                            Highway (H): <span className="key-num">80</span>
                                        </td>
                                        <td>
                                            <b>A</b> (1-10): Rs 500<br/>
                                            <b>B</b> (11-20): Rs 1,000<br/>
                                            <b>C</b> (21-30): Rs 2,000<br/>
                                            <b>D</b> (31+): Rs 4,000 + Flag<br/>
                                            <span style={{color: '#ff3333', fontWeight: 'bold'}}>* School zone DOUBLES fine</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 7. Officers, Bypass & Exemptions */}
                        <div className="box">
                            <h2><span className="badge">7</span> OFFICERS, BYPASS & EXEMPTIONS</h2>
                            <table style={{marginBottom: '5px'}}>
                                <thead>
                                    <tr><th>Lvl</th><th>Issues</th><th>Bypass?</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><b>L1</b></td><td>Slabs A, B</td><td>No</td></tr>
                                    <tr><td><b>L2</b></td><td>Slabs A, B, C</td><td>Yes</td></tr>
                                    <tr><td><b>L3</b></td><td>All (A to D)</td><td>Yes</td></tr>
                                </tbody>
                            </table>
                            <p><b>Bypass Conditions (Need ALL 3):</b><br/>
                               1. Confidence 75-89%<br/>
                               2. Valid plate format<br/>
                               3. Second camera angle matches
                            </p>
                            <p style={{marginTop: '5px'}}><b>Exemptions:</b> Ambulance, fire, police with beacon <b>ON</b> = void fine, code <span className="key-txt">EX-1</span>. (Beacon OFF = normal fine).</p>
                            
                            <div style={{background: '#333', color: 'white', padding: '5px', borderRadius: '4px', marginTop: '8px'}}>
                                <b>PASSCODE =</b><br/>
                                Zone Letter + Slab Letter + Last 2 Plate Digits + Officer Level
                            </div>
                        </div>

                        {/* 8. Violation Codes */}
                        <div className="box">
                            <h2><span className="badge">8</span> VIOLATION CODES</h2>
                            <ul>
                                <li>Speeding = <span className="key-txt">SPD-01</span></li>
                                <li>Red-light jump = <span className="key-txt">RLV-02</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 9. Final Checklist Strip */}
                <div className="strip" style={{background: '#eef', marginTop: 0}}>
                    <h2 style={{justifyContent: 'center', marginBottom: '5px'}}><span className="badge">9</span> FINAL CHECKLIST</h2>
                    <div className="arrow-chain" style={{fontSize: '9pt'}}>
                        <span>Conf. OK / Bypass valid</span><span className="arrow">➔</span>
                        <span>Format valid</span><span className="arrow">➔</span>
                        <span>Speed check</span><span className="arrow">➔</span>
                        <span>Slab & Fine</span><span className="arrow">➔</span>
                        <span>Officer Lvl</span><span className="arrow">➔</span>
                        <span>Passcode</span>
                    </div>
                </div>

                <div className="footer">
                    Simulation values only. Not real traffic law. | Station 3: eChallan Police
                </div>
            </div>
        </div>
    );
}

const styles = {
    body: {
        backgroundColor: '#f0f0f0',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    }
}
