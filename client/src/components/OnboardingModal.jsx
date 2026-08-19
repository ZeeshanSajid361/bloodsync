import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft,
  X, HeartHandshake, MapPin, Bell, Zap
} from 'lucide-react';

export default function OnboardingModal({ isOpen, onClose, role = 'donor', userName = '', userCity = '', bloodGroup = '' }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      const prevBody = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBody;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const donorSteps = [
    {
      title: "Welcome to BloodSync!",
      badge: "🩸 You Are Active & Ready",
      icon: HeartHandshake,
      color: "#ef4444",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
            Hi <strong style={{ color: '#ffffff' }}>{userName || 'Hero'}</strong>! Your account is <strong style={{ color: '#34d399' }}>Active & Available for Donation</strong> by default.
          </p>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#a7f3d0' }}>
            💡 <strong>Quick Tip:</strong> Seekers in <strong>{userCity || 'your region'}</strong> searching for <strong>{bloodGroup || 'compatible blood'}</strong> can see your availability. You can toggle your active availability status anytime from your profile!
          </div>
        </div>
      ),
    },
    {
      title: "Explore Live Requests",
      badge: "⚡ Real-Time Emergency Needs",
      icon: Zap,
      color: "#f59e0b",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
            Check out the <strong style={{ color: '#fbbf24' }}>Live Requests</strong> tab on your dashboard navigation.
          </p>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#fde68a' }}>
            📢 Whenever a patient posts an urgent blood request matching your blood type in {userCity || 'your city'}, it will appear here so you can pledge to donate!
          </div>
        </div>
      ),
    },
    {
      title: "Exact Maps & QR Check-In",
      badge: "🗺️ Hospital Directions",
      icon: MapPin,
      color: "#3b82f6",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
            When you respond to a request, click <strong style={{ color: '#60a5fa' }}>"Open Hospital Location"</strong> for exact Google Maps navigation.
          </p>
          <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#bfdbfe' }}>
            📲 Present your personal <strong>QR Check-In code</strong> at the hospital desk to complete your life-saving donation!
          </div>
        </div>
      ),
    },
  ];

  const seekerSteps = [
    {
      title: "Welcome to BloodSync!",
      badge: "🔍 Find Compatible Donors",
      icon: Sparkles,
      color: "#ef4444",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
            Welcome <strong style={{ color: '#ffffff' }}>{userName || 'Seeker'}</strong>! Your dashboard opens directly to <strong style={{ color: '#ef4444' }}>Find Donors</strong>.
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#fca5a5' }}>
            🩸 Select the required blood group and city to search active, verified voluntary donors ready to help in real-time.
          </div>
        </div>
      ),
    },
    {
      title: "Post Emergency Requests",
      badge: "📢 Broadcast Urgent Needs",
      icon: Bell,
      color: "#f59e0b",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
            If you need urgent blood for a patient, click <strong style={{ color: '#fbbf24' }}>New Request</strong> to fill in hospital details.
          </p>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#fde68a' }}>
            📋 Once approved by our team, your request is instantly broadcasted to compatible donors in your city.
          </div>
        </div>
      ),
    },
    {
      title: "Exact Location Pinning",
      badge: "📍 Pin Hospital Pinpoint",
      icon: MapPin,
      color: "#10b981",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
            When posting a request, click <strong style={{ color: '#34d399' }}>Pin Location</strong> to ensure donors get exact Google Maps directions right to your hospital ward.
          </p>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#a7f3d0' }}>
            🔔 Live notifications will alert you as soon as a donor pledges to arrive!
          </div>
        </div>
      ),
    },
  ];

  const steps = role === 'seeker' ? seekerSteps : donorSteps;
  const step = steps[currentStep] || steps[0];
  const IconComponent = step.icon;

  function handleComplete() {
    localStorage.setItem(`bloodsync_onboarding_${role}`, 'true');
    onClose();
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999999,
        background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: '500px',
          background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px', padding: '28px 24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)', position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}
      >
        {/* Skip button */}
        <button
          onClick={handleComplete}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'transparent', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '6px'
          }}
        >
          Skip <X size={15} />
        </button>

        {/* Step Icon Badge */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: `rgba(${step.color === '#ef4444' ? '239, 68, 68' : step.color === '#f59e0b' ? '245, 158, 11' : step.color === '#3b82f6' ? '59, 130, 246' : '16, 185, 129'}, 0.15)`,
          border: `2px solid ${step.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px', boxShadow: `0 0 24px ${step.color}40`
        }}>
          <IconComponent size={30} color={step.color} />
        </div>

        {/* Badge tag */}
        <div style={{
          fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: step.color, background: 'rgba(255,255,255,0.05)', padding: '4px 12px',
          borderRadius: '12px', marginBottom: '8px', border: `1px solid ${step.color}30`
        }}>
          {step.badge}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0', textAlign: 'center' }}>
          {step.title}
        </h2>

        {/* Step Content */}
        <div style={{ width: '100%', marginBottom: '24px' }}>
          {step.content}
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStep ? '24px' : '8px',
                height: '8px', borderRadius: '4px',
                background: idx === currentStep ? step.color : 'rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Actions Footer */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: step.color, fontWeight: 700, padding: '8px 20px' }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#ffffff', fontWeight: 700, padding: '8px 20px' }}
            >
              <CheckCircle2 size={16} /> Got It, Start Using BloodSync!
            </button>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
