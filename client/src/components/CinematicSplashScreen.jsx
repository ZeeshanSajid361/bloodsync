import { useState, useEffect } from 'react';
import { Droplets, Activity, Sparkles, Heart, Zap, ShieldCheck } from 'lucide-react';

export default function CinematicSplashScreen({ onComplete }) {
  const [stage, setStage] = useState(1); // 1: Slow Falling Drop, 2: Droplets Merging & Brand Reveal, 3: Fade Out

  useEffect(() => {
    // Stage 1 (Slow Drop) -> Stage 2 (Droplets Merging into Heart & Brand Reveal)
    const timer1 = setTimeout(() => {
      setStage(2);
    }, 1500);

    // Stage 2 -> Stage 3 (Fade Out)
    const timer2 = setTimeout(() => {
      setStage(3);
    }, 4200);

    // Complete callback
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4800);

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
        background: '#040711',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: stage === 3 ? 0 : 1,
        pointerEvents: stage === 3 ? 'none' : 'auto',
      }}
    >
      {/* Deep Crimson Radial Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          width: '130vw',
          height: '130vh',
          background: 'radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.28) 0%, rgba(15, 23, 42, 0.95) 60%, #040711 100%)',
          animation: 'pulseGlow 3.5s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Micro Liquid Particles */}
      <div className="liquid-particle p-1" />
      <div className="liquid-particle p-2" />
      <div className="liquid-particle p-3" />
      <div className="liquid-particle p-4" />

      {/* ── PHASE 1: Single Photorealistic Blood Drop Floating Down ── */}
      {stage === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div className="slow-floating-drop">
            <div className="drop-reflection" />
          </div>
        </div>
      )}

      {/* ── PHASE 2: Droplets Merging Together into Heart & Brand Reveal ── */}
      {stage >= 2 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          width: '100%',
          maxWidth: 620,
          padding: '0 20px',
        }}>

          {/* Liquid Merging Animation Stage */}
          <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            
            {/* Liquid Merging Shockwaves */}
            <div className="fusion-wave wave-a" />
            <div className="fusion-wave wave-b" />

            {/* 4 Converging Liquid Droplets fusing into center */}
            <div className="converging-drop drop-top" />
            <div className="converging-drop drop-bottom" />
            <div className="converging-drop drop-left" />
            <div className="converging-drop drop-right" />

            {/* Fused Fused Central Heart Core Emblem */}
            <div className="fused-heart-core">
              <Activity size={56} color="#ffffff" style={{ filter: 'drop-shadow(0 0 16px #ffffff)' }} />
            </div>

            {/* Universal Non-Biased Network Node Badges */}
            <div className="universal-badge badge-tl">⚡ Voluntary Donors</div>
            <div className="universal-badge badge-tr">🏥 Hospital Network</div>
            <div className="universal-badge badge-bl">🩸 Emergency Units</div>
            <div className="universal-badge badge-br">🛡️ Life Savers</div>
          </div>

          {/* Illuminated Brand Name & Tagline */}
          <div style={{ textAlign: 'center', zIndex: 5, animation: 'brandReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <h1 style={{
              margin: 0,
              fontSize: '3.4rem',
              fontWeight: 900,
              letterSpacing: '2px',
              background: 'linear-gradient(135deg, #ffffff 0%, #ffe4e6 40%, #e11d48 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 10px 40px rgba(225, 29, 72, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px'
            }}>
              <Droplets size={42} color="#e11d48" style={{ filter: 'drop-shadow(0 0 14px #e11d48)' }} /> BloodSync
            </h1>

            <p style={{
              margin: '12px 0 0',
              fontSize: '1.2rem',
              color: '#cbd5e1',
              fontWeight: 600,
              letterSpacing: '1.2px',
            }}>
              Save Lives, One Drop at a Time
            </p>

            <div className="network-live-pill">
              <Zap size={14} color="#fb7185" /> Real-Time Community Blood Network
            </div>
          </div>

        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        /* Phase 1: Slow Floating Blood Drop */
        .slow-floating-drop {
          width: 76px;
          height: 96px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: linear-gradient(135deg, #ff4d4d 0%, #e11d48 50%, #881337 100%);
          box-shadow: 0 0 65px rgba(225, 29, 72, 0.9), inset -8px -8px 25px rgba(0,0,0,0.6), inset 6px 6px 20px rgba(255,255,255,0.7);
          animation: floatDropSlow 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          position: relative;
        }

        .drop-reflection {
          position: absolute;
          top: 14px;
          left: 14px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.85);
          filter: blur(1.5px);
        }

        @keyframes floatDropSlow {
          0% { transform: translateY(-80px) rotate(-45deg) scale(0.7); opacity: 0; }
          60% { transform: translateY(10px) rotate(-45deg) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) rotate(-45deg) scale(1); opacity: 1; }
        }

        /* Phase 2: Converging Liquid Droplets Fusing into Center */
        .converging-drop {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4d4d, #e11d48);
          box-shadow: 0 0 25px #e11d48;
          animation: fuseToCenter 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .drop-top    { top: -20px; animation: fuseTop 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .drop-bottom { bottom: -20px; animation: fuseBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .drop-left   { left: -20px; animation: fuseLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .drop-right  { right: -20px; animation: fuseRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes fuseTop    { 0% { transform: translateY(-70px) scale(0.6); opacity: 0; } 100% { transform: translateY(40px) scale(1); opacity: 0; } }
        @keyframes fuseBottom { 0% { transform: translateY(70px) scale(0.6); opacity: 0; } 100% { transform: translateY(-40px) scale(1); opacity: 0; } }
        @keyframes fuseLeft   { 0% { transform: translateX(-70px) scale(0.6); opacity: 0; } 100% { transform: translateX(40px) scale(1); opacity: 0; } }
        @keyframes fuseRight  { 0% { transform: translateX(70px) scale(0.6); opacity: 0; } 100% { transform: translateX(-40px) scale(1); opacity: 0; } }

        /* Fused Central Emblem Core */
        .fused-heart-core {
          width: 116px;
          height: 116px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 80px rgba(225, 29, 72, 1), 0 0 130px rgba(225, 29, 72, 0.5);
          border: 3px solid rgba(255, 255, 255, 0.95);
          z-index: 4;
          animation: coreFusionPulse 1.3s ease-in-out infinite alternate;
        }

        @keyframes coreFusionPulse {
          0% { transform: scale(0.95); boxShadow: 0 0 50px rgba(225, 29, 72, 0.8); }
          100% { transform: scale(1.08); boxShadow: 0 0 95px rgba(225, 29, 72, 1); }
        }

        .fusion-wave {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(225, 29, 72, 0.65);
          animation: waveExpand 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }
        .wave-a { width: 130px; height: 130px; animation-delay: 0s; }
        .wave-b { width: 130px; height: 130px; animation-delay: 0.7s; }

        @keyframes waveExpand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        /* Non-biased Universal Node Badges */
        .universal-badge {
          position: absolute;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(225, 29, 72, 0.5);
          color: #fecdd3;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(225, 29, 72, 0.35);
          animation: badgeFloat 2.2s ease-in-out infinite alternate;
        }

        .badge-tl { top: 12px; left: -15px; animation-delay: 0.2s; }
        .badge-tr { top: 12px; right: -15px; animation-delay: 0.6s; }
        .badge-bl { bottom: 12px; left: -15px; animation-delay: 0.4s; }
        .badge-br { bottom: 12px; right: -15px; animation-delay: 0.8s; }

        @keyframes badgeFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-7px); }
        }

        .network-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
          padding: 8px 22px;
          border-radius: 24px;
          background: rgba(225, 29, 72, 0.15);
          border: 1px solid rgba(225, 29, 72, 0.4);
          color: #fb7185;
          font-size: 0.85rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        /* Floating particles */
        .liquid-particle {
          position: absolute;
          border-radius: 50%;
          background: #e11d48;
          filter: blur(3px);
          opacity: 0.45;
          animation: particleUp 4s infinite linear;
        }
        .p-1 { width: 12px; height: 12px; left: 22%; animation-duration: 3.8s; }
        .p-2 { width: 8px; height: 8px; left: 78%; animation-duration: 4.6s; }
        .p-3 { width: 14px; height: 14px; left: 42%; animation-duration: 5.2s; }
        .p-4 { width: 10px; height: 10px; left: 62%; animation-duration: 4.2s; }

        @keyframes particleUp {
          0% { transform: translateY(100vh); opacity: 0.1; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }

        @keyframes brandReveal {
          0% { opacity: 0; transform: translateY(28px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
