import { useState, useEffect } from 'react';
import { Droplets, Activity, Zap, User, Building2, Siren, Stethoscope, Sparkles } from 'lucide-react';

export default function CinematicSplashScreen({ onComplete }) {
  const [stage, setStage] = useState(1); // 1: Slow Motion Teardrop Falling to Surface, 2: Surface Impact & Orbital Galaxy Reveal, 3: Fade Out

  useEffect(() => {
    // Stage 1 (Teardrop falls in slow-mo & impacts obsidian surface plane) -> Stage 2 (Orbital Galaxy)
    const timer1 = setTimeout(() => {
      setStage(2);
    }, 1800);

    // Stage 2 -> Stage 3 (Fade Out)
    const timer2 = setTimeout(() => {
      setStage(3);
    }, 4800);

    // Complete callback
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 5400);

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
      {/* Deep Radial Background Glow */}
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

      {/* Floating Micro Particles */}
      <div className="micro-particle p1" />
      <div className="micro-particle p2" />
      <div className="micro-particle p3" />
      <div className="micro-particle p4" />

      {/* ── PHASE 1: Perfect 3D Teardrop Falling in Slow-Motion onto Surface Plane (NO LINE) ── */}
      {stage === 1 && (
        <div className="phase1-surface-stage">
          
          {/* Perfect Upright 3D Teardrop (Slow Motion Descent) */}
          <div className="slow-mo-teardrop">
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
              {/* Perfectly mathematically contoured teardrop shape */}
              <path
                d="M50,4 C50,4 90,65 90,90 C90,112 72,126 50,126 C28,126 10,112 10,90 C10,65 50,4 50,4 Z"
                fill="url(#dropGrad)"
                filter="url(#dropGlow)"
              />
              {/* 3D Specular Curved Light Reflection */}
              <ellipse cx="38" cy="72" rx="10" ry="18" fill="rgba(255, 255, 255, 0.75)" transform="rotate(-15 38 72)" />
              <ellipse cx="32" cy="62" rx="4" ry="7" fill="rgba(255, 255, 255, 0.9)" transform="rotate(-15 32 62)" />
            </svg>
          </div>

          {/* Polished Obsidian Surface Plane at Ground */}
          <div className="surface-impact-plane">
            <div className="surface-plane-ellipse" />
            <div className="surface-plane-glow" />
          </div>

        </div>
      )}

      {/* ── PHASE 2: Refined Orbital Galaxy System & Impact Ripple ── */}
      {stage >= 2 && (
        <div className="splash-main-content">

          {/* Central System + Orbital Path Galaxy */}
          <div className="orbital-galaxy-wrapper">
            
            {/* SVG Elliptical Orbital Path Lines (Separated Micro-Galaxy Paths) */}
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

            {/* 4 Sleek Glowing Function Pills (Distinct Orbital Nodes - No Overlap) */}

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

          {/* Polished Obsidian Surface Base with Water Crown Splash */}
          <div className="obsidian-splash-base">
            <div className="water-crown-splash" />
            <div className="bouncing-liquid-bead bead-left" />
            <div className="bouncing-liquid-bead bead-right" />
          </div>

        </div>
      )}

      {/* Embedded High-End CSS */}
      <style>{`
        @keyframes bgPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }

        /* ── Phase 1 Surface & Teardrop Slow Motion Descent ── */
        .phase1-surface-stage {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 120px;
        }

        .slow-mo-teardrop {
          position: absolute;
          animation: teardropSlowFall 1.7s cubic-bezier(0.33, 1, 0.68, 1) forwards;
          filter: drop-shadow(0 15px 25px rgba(225, 29, 72, 0.8));
          z-index: 10;
        }

        @keyframes teardropSlowFall {
          0% {
            transform: translateY(-90vh) scale(0.7);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          85% {
            transform: translateY(-130px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-110px) scale(1.1, 0.8);
            opacity: 1;
          }
        }

        /* Ground Surface Impact Plane */
        .surface-impact-plane {
          position: relative;
          width: 320px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .surface-plane-ellipse {
          width: 260px;
          height: 30px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(225, 29, 72, 0.35) 0%, rgba(18, 7, 22, 0.8) 60%, transparent 100%);
          border: 1px solid rgba(244, 63, 94, 0.4);
          box-shadow: 0 0 30px rgba(225, 29, 72, 0.6);
        }

        .surface-plane-glow {
          position: absolute;
          width: 180px;
          height: 14px;
          border-radius: 50%;
          background: #f43f5e;
          filter: blur(12px);
          opacity: 0.7;
          animation: surfaceGlowPulse 1.7s ease-out forwards;
        }

        @keyframes surfaceGlowPulse {
          0% { transform: scale(0.3); opacity: 0.2; }
          85% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 1; }
        }

        /* ── Main Orbital Galaxy Layout ── */
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

        .micro-particle {
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

        @keyframes floatUp {
          0% { transform: translateY(100vh); opacity: 0.1; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
