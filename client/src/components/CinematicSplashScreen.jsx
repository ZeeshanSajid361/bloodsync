import { useState, useEffect } from 'react';
import { Droplets, Activity, Zap, User, Building2, Siren, Stethoscope, Sparkles } from 'lucide-react';

export default function CinematicSplashScreen({ onComplete }) {
  const [stage, setStage] = useState(1); // 1: Top Drop Descent & Splash, 2: Orbital System & Brand Reveal, 3: Fade Out

  useEffect(() => {
    // Stage 1 (Top Drop Descent & Liquid Splash) -> Stage 2 (Orbital Galaxy & Brand Reveal)
    const timer1 = setTimeout(() => {
      setStage(2);
    }, 1400);

    // Stage 2 -> Stage 3 (Fade Out)
    const timer2 = setTimeout(() => {
      setStage(3);
    }, 4500);

    // Complete callback
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 5100);

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
        background: 'linear-gradient(180deg, #09030a 0%, #150616 40%, #08030b 100%)',
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
      {/* Background Ambient Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: '140vw',
          height: '140vh',
          background: 'radial-gradient(circle at 50% 45%, rgba(225, 29, 72, 0.22) 0%, rgba(20, 8, 25, 0.95) 55%, #050208 100%)',
          animation: 'bgPulse 4s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* Scattered Ambient Life-Data Micro Particles */}
      <div className="orbital-particle p1" />
      <div className="orbital-particle p2" />
      <div className="orbital-particle p3" />
      <div className="orbital-particle p4" />
      <div className="orbital-particle p5" />

      {/* ── PHASE 1: Top Descent Drop Trace ── */}
      {stage === 1 && (
        <div className="phase1-container">
          <div className="top-funnel-trace" />
          <div className="descent-blood-drop">
            <div className="drop-glow-core" />
          </div>
        </div>
      )}

      {/* ── PHASE 2: Refined Orbital Galaxy System & Liquid Splash Base ── */}
      {stage >= 2 && (
        <div className="splash-main-content">

          {/* Central System + Orbital Path Galaxy */}
          <div className="orbital-galaxy-wrapper">
            
            {/* SVG Elliptical Orbital Path Lines (Separated Micro-Galaxy Paths) */}
            <svg className="orbital-svg-paths" viewBox="0 0 400 240" fill="none">
              {/* Top-Left to Bottom-Right Ellipse Path */}
              <ellipse
                cx="200" cy="120" rx="160" ry="75"
                stroke="url(#orbitGradient1)"
                strokeWidth="1.8"
                transform="rotate(-15 200 120)"
                opacity="0.75"
              />
              {/* Top-Right to Bottom-Left Ellipse Path */}
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

            {/* ── 4 Sleek Glowing Function Pills (Distinct Orbital Nodes - No Overlap) ── */}

            {/* 1. Top-Left Pill: Voluntary Donor */}
            <div className="orbital-capsule-node node-top-left">
              <div className="node-icon-capsule">
                <User size={16} color="#ffffff" />
              </div>
              <div className="node-pill-label">
                <Zap size={13} color="#fb7185" />
                <span>Voluntary Donor</span>
              </div>
            </div>

            {/* 2. Top-Right Pill: Hospital Network */}
            <div className="orbital-capsule-node node-top-right">
              <div className="node-pill-label">
                <Building2 size={14} color="#fb7185" />
                <span>Hospital Network</span>
              </div>
              <div className="node-icon-capsule">
                <Building2 size={16} color="#ffffff" />
              </div>
            </div>

            {/* 3. Bottom-Left Pill: Emergency Units */}
            <div className="orbital-capsule-node node-bottom-left">
              <div className="node-icon-capsule">
                <Siren size={16} color="#ffffff" />
              </div>
              <div className="node-pill-label">
                <Droplets size={13} color="#f43f5e" />
                <span>Emergency Units</span>
              </div>
            </div>

            {/* 4. Bottom-Right Pill: Life Savers */}
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

          {/* Polished Obsidian Surface Base with Water Crown Splash & Bouncing Beads */}
          <div className="obsidian-splash-base">
            <div className="water-crown-splash" />
            <div className="bouncing-liquid-bead bead-left" />
            <div className="bouncing-liquid-bead bead-right" />
          </div>

        </div>
      )}

      {/* Embedded High-End Styles */}
      <style>{`
        @keyframes bgPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }

        /* Phase 1 Top Descent */
        .phase1-container {
          position: relative;
          display: flex;
          flexDirection: column;
          align-items: center;
        }
        .top-funnel-trace {
          position: absolute;
          top: -200px;
          width: 2px;
          height: 180px;
          background: linear-gradient(to bottom, transparent, rgba(244, 63, 94, 0.6));
        }
        .descent-blood-drop {
          width: 60px;
          height: 80px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: linear-gradient(135deg, #ff4d4d 0%, #e11d48 50%, #881337 100%);
          box-shadow: 0 0 50px rgba(244, 63, 94, 0.9), inset -6px -6px 18px rgba(0,0,0,0.6);
          animation: dropSlowDescent 1.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          position: relative;
        }
        .drop-glow-core {
          position: absolute;
          top: 12px;
          left: 12px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.85);
          filter: blur(1px);
        }
        @keyframes dropSlowDescent {
          0% { transform: translateY(-100px) rotate(-45deg) scale(0.6); opacity: 0; }
          70% { transform: translateY(10px) rotate(-45deg) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) rotate(-45deg) scale(1); opacity: 1; }
        }

        /* Main Content Layout */
        .splash-main-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 100%;
          max-width: 680px;
          padding: 0 20px;
          animation: mainFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes mainFadeIn {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Orbital Galaxy Container */
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

        /* Central EKG Orb */
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

        /* Sleek Capsule Nodes (No Overlap) */
        .orbital-capsule-node {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 6;
          animation: capsuleFloat 2.5s ease-in-out infinite alternate;
        }

        .node-top-left {
          top: 15px;
          left: 10px;
          animation-delay: 0s;
        }
        .node-top-right {
          top: 15px;
          right: 10px;
          animation-delay: 0.5s;
        }
        .node-bottom-left {
          bottom: 25px;
          left: 10px;
          animation-delay: 0.25s;
        }
        .node-bottom-right {
          bottom: 25px;
          right: 10px;
          animation-delay: 0.75s;
        }

        @keyframes capsuleFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }

        /* Circular Capsule Icon (3D Pill Bulb) */
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

        /* Pill Label Capsule */
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

        /* Branding Section */
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

        .brand-title span span {
          color: #f43f5e;
        }

        .brand-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

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

        /* Polished Obsidian Base & Liquid Water Crown */
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

        /* Ambient Micro Particles */
        .orbital-particle {
          position: absolute;
          border-radius: 50%;
          background: #f43f5e;
          filter: blur(2px);
          opacity: 0.35;
          animation: floatUp 5s infinite linear;
        }
        .p1 { width: 8px; height: 8px; left: 15%; animation-duration: 4s; }
        .p2 { width: 6px; height: 6px; left: 85%; animation-duration: 6s; }
        .p3 { width: 10px; height: 10px; left: 35%; animation-duration: 4.5s; }
        .p4 { width: 7px; height: 7px; left: 65%; animation-duration: 5.5s; }
        .p5 { width: 9px; height: 9px; left: 50%; animation-duration: 4.8s; }

        @keyframes floatUp {
          0% { transform: translateY(100vh); opacity: 0.1; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
