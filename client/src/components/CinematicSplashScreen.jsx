import { useState, useEffect } from 'react';
import { Droplets, Activity, Sparkles, Heart, Zap, ShieldCheck } from 'lucide-react';

export default function CinematicSplashScreen({ onComplete }) {
  const [stage, setStage] = useState(1); // 1: Top Drop Descent, 2: Shockwave & Digital Network Matrix, 3: Fade Out

  useEffect(() => {
    // Stage 1 (Top Drop Descent) -> Stage 2 (Network Explosion)
    const timer1 = setTimeout(() => {
      setStage(2);
    }, 1200);

    // Stage 2 -> Stage 3 (Fade Out)
    const timer2 = setTimeout(() => {
      setStage(3);
    }, 3800);

    // Complete callback
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4400);

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
      {/* Background Animated Gradient Mesh */}
      <div
        style={{
          position: 'absolute',
          width: '140vw',
          height: '140vh',
          background: 'radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.25) 0%, rgba(15, 23, 42, 0.95) 55%, #040711 100%)',
          animation: 'pulseGlow 3s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Particles in Background */}
      <div className="bg-particle particle-1" />
      <div className="bg-particle particle-2" />
      <div className="bg-particle particle-3" />
      <div className="bg-particle particle-4" />

      {/* ── PHASE 1: Top Blood Drop Accelerating Downwards ── */}
      {stage === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          {/* Glowing Speed Trail behind the drop */}
          <div className="drop-trail" />

          {/* Realistic 3D Blood Drop */}
          <div className="top-falling-drop">
            <div className="drop-specular-light" />
          </div>
        </div>
      )}

      {/* ── PHASE 2 & 3: Out-Of-The-Box Digital Network Matrix ── */}
      {stage >= 2 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          padding: '0 20px',
        }}>

          {/* Central Explosion Ring & Animated Heartbeat ECG Line */}
          <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            
            {/* Liquid Shockwaves */}
            <div className="splash-shockwave wave-1" />
            <div className="splash-shockwave wave-2" />
            <div className="splash-shockwave wave-3" />

            {/* Pulsing Central Glass Core */}
            <div className="central-glass-core">
              <Activity size={56} color="#ffffff" style={{ filter: 'drop-shadow(0 0 16px #ffffff)' }} />
            </div>

            {/* Orbital Connected Network Nodes */}
            <div className="network-node node-top-left">📍 Islamabad</div>
            <div className="network-node node-top-right">📍 Rawalpindi</div>
            <div className="network-node node-bottom-left">📍 Lahore</div>
            <div className="network-node node-bottom-right">📍 Karachi</div>
          </div>

          {/* Brand Name & Tagline */}
          <div style={{ textAlign: 'center', zIndex: 5, animation: 'heroPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <h1 style={{
              margin: 0,
              fontSize: '3.2rem',
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
              <Droplets size={40} color="#e11d48" style={{ filter: 'drop-shadow(0 0 12px #e11d48)' }} /> BloodSync
            </h1>

            <p style={{
              margin: '10px 0 0',
              fontSize: '1.15rem',
              color: '#cbd5e1',
              fontWeight: 600,
              letterSpacing: '1px',
            }}>
              Save Lives, One Drop at a Time
            </p>

            <div className="live-network-badge">
              <Zap size={14} color="#f43f5e" /> 1,420+ Active Donors Connected Live
            </div>
          </div>

        </div>
      )}

      {/* Out-Of-The-Box CSS Animations */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        /* Top Drop Falling from Above */
        .top-falling-drop {
          width: 70px;
          height: 90px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: linear-gradient(135deg, #ff4d4d 0%, #e11d48 50%, #881337 100%);
          box-shadow: 0 0 60px rgba(225, 29, 72, 0.9), inset -8px -8px 25px rgba(0,0,0,0.6), inset 6px 6px 20px rgba(255,255,255,0.7);
          animation: dropDescentFromTop 1.2s cubic-bezier(0.5, 0, 0.75, 0) forwards;
          position: relative;
        }

        .drop-specular-light {
          position: absolute;
          top: 14px;
          left: 14px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          filter: blur(1.5px);
        }

        .drop-trail {
          position: absolute;
          top: -300px;
          width: 6px;
          height: 250px;
          background: linear-gradient(to bottom, transparent, rgba(225, 29, 72, 0.8));
          animation: trailFade 1.2s ease-out forwards;
        }

        @keyframes dropDescentFromTop {
          0% { transform: translateY(-100vh) rotate(-45deg) scale(0.7); opacity: 0.3; }
          75% { transform: translateY(20px) rotate(-45deg) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) rotate(-45deg) scale(1); opacity: 1; }
        }

        @keyframes trailFade {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }

        /* Central Glass Core */
        .central-glass-core {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 70px rgba(225, 29, 72, 1), 0 0 120px rgba(225, 29, 72, 0.5);
          border: 3px solid rgba(255, 255, 255, 0.9);
          z-index: 4;
          animation: corePulse 1.2s ease-in-out infinite alternate;
        }

        @keyframes corePulse {
          0% { transform: scale(1); boxShadow: 0 0 50px rgba(225, 29, 72, 0.8); }
          100% { transform: scale(1.08); boxShadow: 0 0 90px rgba(225, 29, 72, 1); }
        }

        /* Shockwaves */
        .splash-shockwave {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(225, 29, 72, 0.7);
          animation: shockwaveExpand 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }

        .wave-1 { width: 120px; height: 120px; animation-delay: 0s; }
        .wave-2 { width: 120px; height: 120px; animation-delay: 0.5s; }
        .wave-3 { width: 120px; height: 120px; animation-delay: 1s; }

        @keyframes shockwaveExpand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }

        /* Connected Nodes */
        .network-node {
          position: absolute;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(225, 29, 72, 0.6);
          color: #fecdd3;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 0 20px rgba(225, 29, 72, 0.4);
          animation: nodeFloat 2s ease-in-out infinite alternate;
        }

        .node-top-left { top: 10px; left: -10px; animation-delay: 0.2s; }
        .node-top-right { top: 10px; right: -10px; animation-delay: 0.6s; }
        .node-bottom-left { bottom: 10px; left: -10px; animation-delay: 0.4s; }
        .node-bottom-right { bottom: 10px; right: -10px; animation-delay: 0.8s; }

        @keyframes nodeFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }

        /* Live Badge */
        .live-network-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 22px;
          padding: 8px 20px;
          border-radius: 24px;
          background: rgba(225, 29, 72, 0.15);
          border: 1px solid rgba(225, 29, 72, 0.4);
          color: #fb7185;
          font-size: 0.85rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        /* Background Floating Particles */
        .bg-particle {
          position: absolute;
          border-radius: 50%;
          background: #e11d48;
          filter: blur(4px);
          opacity: 0.4;
          animation: particleRise 4s infinite linear;
        }

        .particle-1 { width: 12px; height: 12px; left: 20%; animation-duration: 3.5s; }
        .particle-2 { width: 8px; height: 8px; left: 80%; animation-duration: 4.5s; }
        .particle-3 { width: 14px; height: 14px; left: 40%; animation-duration: 5s; }
        .particle-4 { width: 10px; height: 10px; left: 65%; animation-duration: 3.8s; }

        @keyframes particleRise {
          0% { transform: translateY(100vh); opacity: 0.2; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }

        @keyframes heroPop {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
