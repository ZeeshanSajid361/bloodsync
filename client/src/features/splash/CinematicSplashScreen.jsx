import { useState, useEffect } from 'react';
import { Droplets, Activity, Zap, User, Building2, Siren, Stethoscope, Sparkles } from 'lucide-react';

export default function CinematicSplashScreen({ onComplete }) {
  const [stage, setStage] = useState(1); // 1: Drop Fall & Ground Impact Splatter, 2: Sub-Drops Rise & Form Orbital Galaxy, 3: Fade Out

  useEffect(() => {
    // Stage 1 (Drop Fall & Ground Impact Splatter) -> Stage 2 (Orbital Galaxy & Brand Reveal)
    const timer1 = setTimeout(() => {
      setStage(2);
    }, 2200);

    // Stage 2 -> Stage 3 (Fade Out)
    const timer2 = setTimeout(() => {
      setStage(3);
    }, 5600);

    // Complete callback
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 6200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (stage === 4) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999999,
        background: 'linear-gradient(180deg, #070308 0%, #120514 45%, #060207 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: stage === 3 ? 0 : 1,
        pointerEvents: stage === 3 ? 'none' : 'auto',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Ambient Background Glow */}
      <div
        style={{
          position: 'absolute',
          width: '140vw',
          height: '140vh',
          background: 'radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.24) 0%, rgba(18, 7, 22, 0.95) 55%, #050207 100%)',
          animation: 'bgPulse 4s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* ── STAGE 1: Natural Drop Descent, Ground Impact & 20 Sub-Droplets Splattering Across Floor ── */}
      {stage === 1 && (
        <div className="impact-stage-container">
          
          {/* Falling Teardrop */}
          <div className="falling-teardrop">
            <svg viewBox="0 0 100 130" width="70" height="91" fill="none">
              <defs>
                <linearGradient id="dropGrad" x1="30%" y1="10%" x2="70%" y2="90%">
                  <stop offset="0%" stopColor="#ff5252" />
                  <stop offset="50%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
                <filter id="dropGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path
                d="M50,4 C50,4 90,65 90,90 C90,112 72,126 50,126 C28,126 10,112 10,90 C10,65 50,4 50,4 Z"
                fill="url(#dropGrad)"
                filter="url(#dropGlow)"
              />
              <ellipse cx="38" cy="72" rx="10" ry="18" fill="rgba(255, 255, 255, 0.75)" transform="rotate(-15 38 72)" />
              <ellipse cx="32" cy="62" rx="4" ry="7" fill="rgba(255, 255, 255, 0.9)" transform="rotate(-15 32 62)" />
            </svg>
          </div>

          {/* Ground Contact Line */}
          <div className="ground-contact-line">
            <div className="ground-shadow" />
          </div>

          {/* Ground Impact Splatter & 20 Sub-Small Droplets Bursting All Over */}
          <div className="splatter-impact-group">
            <div className="impact-flatten-disc" />
            <div className="splatter-drop drop-1" />
            <div className="splatter-drop drop-2" />
            <div className="splatter-drop drop-3" />
            <div className="splatter-drop drop-4" />
            <div className="splatter-drop drop-5" />
            <div className="splatter-drop drop-6" />
            <div className="splatter-drop drop-7" />
            <div className="splatter-drop drop-8" />
            <div className="splatter-drop drop-9" />
            <div className="splatter-drop drop-10" />
            <div className="splatter-drop drop-11" />
            <div className="splatter-drop drop-12" />
            <div className="splatter-drop drop-13" />
            <div className="splatter-drop drop-14" />
            <div className="splatter-drop drop-15" />
            <div className="splatter-drop drop-16" />
            <div className="splatter-drop drop-17" />
            <div className="splatter-drop drop-18" />
            <div className="splatter-drop drop-19" />
            <div className="splatter-drop drop-20" />
            <div className="ground-splash-ring" />
          </div>

        </div>
      )}

      {/* ── STAGE 2: Sub-Droplets Morph & Form the Orbital Micro-Galaxy & Brand Reveal ── */}
      {stage >= 2 && (
        <div className="splash-main-content">

          {/* Central System + Orbital Path Galaxy */}
          <div className="orbital-galaxy-wrapper">
            
            <svg className="orbital-svg-paths" viewBox="0 0 400 240" fill="none">
              <ellipse
                cx="200" cy="120" rx="160" ry="75"
                stroke="url(#orbitGradient1)"
                strokeWidth="1.8"
                transform="rotate(-15 200 120)"
                opacity="0.75"
              />
              <ellipse
                cx="200" cy="120" rx="160" ry="75"
                stroke="url(#orbitGradient2)"
                strokeWidth="1.8"
                transform="rotate(15 200 120)"
                opacity="0.75"
              />
              <defs>
                <linearGradient id="orbitGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#be123c" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="orbitGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#881337" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="0.9" />
                </linearGradient>
              </defs>
            </svg>

            {/* Central Glowing EKG Heartbeat Orb */}
            <div className="central-ekg-orb">
              <div className="ekg-inner-ring" />
              <Activity size={52} color="#ffffff" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
            </div>

            {/* 4 Sleek Glowing Function Pills */}
            <div className="orbital-capsule-node node-top-left">
              <div className="node-icon-capsule">
                <User size={16} color="#ffffff" />
              </div>
              <div className="node-pill-label">
                <Zap size={13} color="#fb7185" />
                <span>Voluntary Donor</span>
              </div>
            </div>

            <div className="orbital-capsule-node node-top-right">
              <div className="node-pill-label">
                <Building2 size={14} color="#fb7185" />
                <span>Hospital Network</span>
              </div>
              <div className="node-icon-capsule">
                <Building2 size={16} color="#ffffff" />
              </div>
            </div>

            <div className="orbital-capsule-node node-bottom-left">
              <div className="node-icon-capsule">
                <Siren size={16} color="#ffffff" />
              </div>
              <div className="node-pill-label">
                <Droplets size={13} color="#f43f5e" />
                <span>Emergency Units</span>
              </div>
            </div>

            <div className="orbital-capsule-node node-bottom-right">
              <div className="node-pill-label">
                <Stethoscope size={14} color="#fb7185" />
                <span>Life Savers</span>
              </div>
              <div className="node-icon-capsule">
                <Stethoscope size={16} color="#ffffff" />
              </div>
            </div>

          </div>

          {/* Main Branding Section */}
          <div className="branding-section">
            <h1 className="brand-title">
              <div className="brand-icon-wrap">
                <Droplets size={38} color="#f43f5e" style={{ filter: 'drop-shadow(0 0 12px #f43f5e)' }} />
              </div>
              <span>Blood<span>Sync</span></span>
            </h1>

            <p className="brand-tagline">
              Save Lives, One Drop at a Time
            </p>

            <div className="brand-bottom-pill">
              <Sparkles size={14} color="#f43f5e" />
              <span>Real-Time Community Blood Network</span>
            </div>
          </div>

          {/* Polished Obsidian Base */}
          <div className="obsidian-splash-base">
            <div className="water-crown-splash" />
            <div className="bouncing-liquid-bead bead-left" />
            <div className="bouncing-liquid-bead bead-right" />
          </div>

        </div>
      )}

      {/* Continuous Animation Styles */}
      <style>{`
        @keyframes bgPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }

        .impact-stage-container {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 120px;
        }

        .falling-teardrop {
          position: absolute;
          bottom: 120px;
          animation: dropFallAnimation 1.3s cubic-bezier(0.5, 0, 0.75, 0.9) forwards;
          z-index: 10;
        }

        @keyframes dropFallAnimation {
          0% { transform: translateY(-90vh) scale(0.65); opacity: 0; }
          30% { opacity: 1; }
          88% { transform: translateY(0) scale(1, 1); opacity: 1; }
          100% { transform: translateY(14px) scale(1.35, 0.45); opacity: 1; }
        }

        .ground-contact-line {
          position: absolute;
          bottom: 110px;
          width: 460px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ground-shadow {
          width: 380px;
          height: 24px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(244, 63, 94, 0.85) 0%, rgba(18, 7, 22, 0.95) 60%, transparent 100%);
          box-shadow: 0 0 45px rgba(244, 63, 94, 1);
        }

        .splatter-impact-group {
          position: absolute;
          bottom: 115px;
          width: 400px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 12;
        }

        .impact-flatten-disc {
          position: absolute;
          width: 190px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff5252, #e11d48);
          box-shadow: 0 0 70px rgba(244, 63, 94, 1);
          animation: flattenDiscSplatter 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) 1.2s forwards;
          opacity: 0;
        }

        @keyframes flattenDiscSplatter {
          0% { transform: scale(0.2, 2.5); opacity: 1; }
          100% { transform: scale(3.2, 0.1); opacity: 0; }
        }

        .splatter-drop {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ff5252, #be123c);
          box-shadow: 0 0 16px rgba(244, 63, 94, 1);
          opacity: 0;
          animation: burstSubDrop 0.9s cubic-bezier(0.12, 0.8, 0.32, 1) 1.2s forwards;
        }

        .drop-1, .drop-2, .drop-3, .drop-4, .drop-5     { width: 14px; height: 14px; }
        .drop-6, .drop-7, .drop-8, .drop-9, .drop-10    { width: 10px; height: 10px; }
        .drop-11, .drop-12, .drop-13, .drop-14, .drop-15 { width: 7px;  height: 7px; }
        .drop-16, .drop-17, .drop-18, .drop-19, .drop-20 { width: 5px;  height: 5px; }

        .drop-1  { animation-name: burst1; }
        .drop-2  { animation-name: burst2; }
        .drop-3  { animation-name: burst3; }
        .drop-4  { animation-name: burst4; }
        .drop-5  { animation-name: burst5; }
        .drop-6  { animation-name: burst6; }
        .drop-7  { animation-name: burst7; }
        .drop-8  { animation-name: burst8; }
        .drop-9  { animation-name: burst9; }
        .drop-10 { animation-name: burst10; }
        .drop-11 { animation-name: burst11; }
        .drop-12 { animation-name: burst12; }
        .drop-13 { animation-name: burst13; }
        .drop-14 { animation-name: burst14; }
        .drop-15 { animation-name: burst15; }
        .drop-16 { animation-name: burst16; }
        .drop-17 { animation-name: burst17; }
        .drop-18 { animation-name: burst18; }
        .drop-19 { animation-name: burst19; }
        .drop-20 { animation-name: burst20; }

        @keyframes burst1  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-220px, -120px) scale(0.3); opacity: 0; } }
        @keyframes burst2  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(220px, -120px) scale(0.3); opacity: 0; } }
        @keyframes burst3  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-280px, -40px) scale(0.4); opacity: 0; } }
        @keyframes burst4  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(280px, -40px) scale(0.4); opacity: 0; } }
        @keyframes burst5  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-140px, -180px) scale(0.3); opacity: 0; } }
        @keyframes burst6  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(140px, -180px) scale(0.3); opacity: 0; } }
        @keyframes burst7  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-80px, -220px) scale(0.2); opacity: 0; } }
        @keyframes burst8  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(80px, -220px) scale(0.2); opacity: 0; } }
        @keyframes burst9  { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-300px, -80px) scale(0.2); opacity: 0; } }
        @keyframes burst10 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(300px, -80px) scale(0.2); opacity: 0; } }
        @keyframes burst11 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-180px, -30px) scale(0.2); opacity: 0; } }
        @keyframes burst12 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(180px, -30px) scale(0.2); opacity: 0; } }
        @keyframes burst13 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-110px, -130px) scale(0.2); opacity: 0; } }
        @keyframes burst14 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(110px, -130px) scale(0.2); opacity: 0; } }
        @keyframes burst15 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-240px, -150px) scale(0.2); opacity: 0; } }
        @keyframes burst16 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(240px, -150px) scale(0.2); opacity: 0; } }
        @keyframes burst17 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-50px, -240px) scale(0.2); opacity: 0; } }
        @keyframes burst18 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(50px, -240px) scale(0.2); opacity: 0; } }
        @keyframes burst19 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(-320px, -20px) scale(0.2); opacity: 0; } }
        @keyframes burst20 { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(320px, -20px) scale(0.2); opacity: 0; } }

        .ground-splash-ring {
          position: absolute;
          width: 100px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid rgba(244, 63, 94, 0.95);
          animation: crownRingSplash 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.2s forwards;
          opacity: 0;
        }

        @keyframes crownRingSplash {
          0% { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(3.5); opacity: 0; }
        }

        .splash-main-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 100%;
          max-width: 680px;
          padding: 0 20px;
          animation: mainFadeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes mainFadeIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .orbital-galaxy-wrapper {
          position: relative;
          width: 440px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .orbital-svg-paths {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
        }

        .central-ekg-orb {
          position: relative;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 60px rgba(244, 63, 94, 0.9), 0 0 100px rgba(225, 29, 72, 0.4);
          border: 3px solid rgba(255, 255, 255, 0.95);
          z-index: 5;
          animation: orbPulse 1.6s ease-in-out infinite alternate;
        }

        .ekg-inner-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px stroke rgba(244, 63, 94, 0.4);
          animation: ringRotate 8s linear infinite;
        }

        @keyframes orbPulse {
          0% { transform: scale(0.97); boxShadow: 0 0 40px rgba(244, 63, 94, 0.8); }
          100% { transform: scale(1.06); boxShadow: 0 0 80px rgba(244, 63, 94, 1); }
        }

        .orbital-capsule-node {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 6;
          animation: capsuleFloat 2.5s ease-in-out infinite alternate;
        }

        .node-top-left { top: 15px; left: 10px; animation-delay: 0s; }
        .node-top-right { top: 15px; right: 10px; animation-delay: 0.5s; }
        .node-bottom-left { bottom: 25px; left: 10px; animation-delay: 0.25s; }
        .node-bottom-right { bottom: 25px; right: 10px; animation-delay: 0.75s; }

        @keyframes capsuleFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }

        .node-icon-capsule {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.8), inset 0 2px 4px rgba(255,255,255,0.6);
          border: 2px solid rgba(255, 255, 255, 0.9);
          flex-shrink: 0;
        }

        .node-pill-label {
          background: rgba(18, 6, 24, 0.88);
          border: 1px solid rgba(244, 63, 94, 0.5);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }

        .branding-section {
          text-align: center;
          z-index: 5;
          margin-bottom: 24px;
        }

        .brand-title {
          margin: 0;
          font-size: 3.4rem;
          font-weight: 900;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #ffffff;
        }
        .brand-title span span { color: #f43f5e; }

        .brand-tagline {
          margin: 6px 0 0;
          font-size: 1.15rem;
          color: #cbd5e1;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .brand-bottom-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          padding: 8px 22px;
          border-radius: 24px;
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.35);
          color: #fb7185;
          font-size: 0.82rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        .obsidian-splash-base {
          position: relative;
          width: 100%;
          max-width: 420px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .water-crown-splash {
          width: 140px;
          height: 24px;
          border-radius: 50%;
          border-top: 2px solid rgba(244, 63, 94, 0.6);
          box-shadow: 0 -4px 15px rgba(244, 63, 94, 0.4);
          animation: crownRipple 2s ease-in-out infinite alternate;
        }
        @keyframes crownRipple {
          0% { transform: scaleX(0.9); opacity: 0.5; }
          100% { transform: scaleX(1.15); opacity: 0.9; }
        }

        .bouncing-liquid-bead {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ff4d4d, #be123c);
          box-shadow: 0 0 12px rgba(244, 63, 94, 0.8);
          animation: beadBounce 1.8s ease-in-out infinite alternate;
        }
        .bead-left { left: 80px; bottom: 10px; animation-delay: 0.2s; }
        .bead-right { right: 80px; bottom: 10px; animation-delay: 0.6s; }

        @keyframes beadBounce {
          0% { transform: translateY(0) scale(0.9); }
          100% { transform: translateY(-14px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
