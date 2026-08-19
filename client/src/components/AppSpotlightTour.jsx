import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react';
import './AppSpotlightTour.css';

export default function AppSpotlightTour({ isOpen, onClose, steps = [], tourKey = 'default', onStepChange }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect]   = useState(null);

  // Reset to step 0 ONLY when the tour is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const updateTargetPosition = useCallback(() => {
    if (!isOpen || steps.length === 0) return;

    const step = steps[currentStep];
    if (!step || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, steps, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    if (onStepChange) {
      onStepChange(currentStep);
    }

    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 100);

    const handleResizeOrScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, currentStep, updateTargetPosition, onStepChange]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep] || steps[0];
  const IconComponent = step.icon || Sparkles;

  const handleFinish = () => {
    localStorage.setItem(`bloodsync_spotlight_tour_${tourKey}`, 'true');
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Calculate position of tooltip relative to target rect
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        style: {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
        arrowClass: '',
      };
    }

    const preferredPos = step.preferredPos || 'bottom';
    const padding = 16;
    const tooltipWidth = Math.min(340, window.innerWidth - 32);

    let top = 0;
    let left = 0;
    let arrow = 'top';

    if (preferredPos === 'bottom') {
      top = targetRect.top + targetRect.height + padding;
      left = Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 16));
      arrow = 'top';
    } else if (preferredPos === 'top') {
      top = Math.max(16, targetRect.top - 220 - padding);
      left = Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 16));
      arrow = 'bottom';
    } else if (preferredPos === 'right') {
      top = Math.max(16, Math.min(targetRect.top, window.innerHeight - 240));
      left = targetRect.left + targetRect.width + padding;
      arrow = 'left';
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = Math.max(16, targetRect.left);
        top = targetRect.top + targetRect.height + padding;
        arrow = 'top';
      }
    } else if (preferredPos === 'left') {
      top = Math.max(16, Math.min(targetRect.top, window.innerHeight - 240));
      left = targetRect.left - tooltipWidth - padding;
      arrow = 'right';
      if (left < 16) {
        left = Math.max(16, targetRect.left);
        top = targetRect.top + targetRect.height + padding;
        arrow = 'top';
      }
    }

    return {
      style: { top: `${top}px`, left: `${left}px` },
      arrowClass: `spotlight-arrow-${arrow}`,
    };
  };

  const { style: tooltipStyle, arrowClass } = getTooltipStyle();

  const tourPortal = (
    <>
      <div className="spotlight-tour-overlay" onClick={handleFinish} />

      {targetRect && (
        <div
          className="spotlight-target-box"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          <div className="spotlight-ripple-ring" />
          <div className="spotlight-ripple-ring-delayed" />
        </div>
      )}

      <div className="spotlight-tooltip-card" style={tooltipStyle}>
        <button
          className="spotlight-close-btn"
          onClick={handleFinish}
          title="Dismiss Tour"
          aria-label="Close Tour"
        >
          <X size={15} />
        </button>

        {arrowClass && <div className={`spotlight-arrow ${arrowClass}`} />}

        <div className="spotlight-tooltip-header">
          <div className="spotlight-tooltip-icon">
            <IconComponent size={20} />
          </div>
          <div>
            <div className="spotlight-tooltip-step-tag">
              STEP {currentStep + 1} OF {steps.length}
            </div>
            <div className="spotlight-tooltip-title">{step.title}</div>
          </div>
        </div>

        <div className="spotlight-tooltip-body">
          {step.description}
        </div>

        <div className="spotlight-tooltip-footer">
          <div className="spotlight-dots">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`spotlight-dot${idx === currentStep ? ' active' : ''}`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                className="spotlight-nav-btn spotlight-btn-prev"
                onClick={handlePrev}
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button
              className="spotlight-nav-btn spotlight-btn-next"
              onClick={handleNext}
            >
              {currentStep < steps.length - 1 ? (
                <>Next <ChevronRight size={15} /></>
              ) : (
                <>Got it! <CheckCircle2 size={15} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(tourPortal, document.body);
}
