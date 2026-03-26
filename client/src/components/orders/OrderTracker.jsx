// Order status tracker — animated step-by-step progress with smooth transitions

import { useEffect, useRef, useState } from 'react';
import { Check, X, Package, Truck, MapPin, ClipboardCheck, Box, ShoppingBag } from 'lucide-react';
import { ORDER_STATUSES } from '../../utils/constants';

const steps = ['placed', 'confirmed', 'packed', 'out', 'gate', 'delivered'];

const stepIcons = {
  placed: ClipboardCheck,
  confirmed: Check,
  packed: Box,
  out: Truck,
  gate: MapPin,
  delivered: ShoppingBag,
};

const OrderTracker = ({ status }) => {
  const currentStep = ORDER_STATUSES[status]?.step ?? 0;
  const isCancelled = status === 'cancelled';
  const [animatedStep, setAnimatedStep] = useState(-1);
  const prevStepRef = useRef(currentStep);
  const [flash, setFlash] = useState(false);

  // Animate steps sequentially on mount and on status change
  useEffect(() => {
    if (isCancelled) return;

    const prevStep = prevStepRef.current;
    const startFrom = prevStep < currentStep ? prevStep : 0;

    // Trigger flash effect when status changes (not on mount)
    if (prevStep !== currentStep && prevStep >= 0) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    prevStepRef.current = currentStep;

    // Animate each step with a staggered delay
    setAnimatedStep(startFrom - 1);
    for (let i = startFrom; i <= currentStep; i++) {
      setTimeout(() => {
        setAnimatedStep(i);
      }, (i - startFrom) * 300 + 100);
    }
  }, [currentStep, isCancelled]);

  if (isCancelled) {
    return (
      <div className="tracker-container cancelled-container">
        <div className="tracker-cancelled">
          <div className="cancelled-icon"><X size={24} /></div>
          <span>Order Cancelled</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`tracker-container ${flash ? 'tracker-flash' : ''}`}>
      {/* Live status badge */}
      <div className="tracker-status-badge" style={{ background: ORDER_STATUSES[status]?.color }}>
        <span className="tracker-pulse" />
        {ORDER_STATUSES[status]?.label}
      </div>

      <div className="order-tracker-v2">
        {steps.map((step, i) => {
          const info = ORDER_STATUSES[step];
          const isCompleted = i <= animatedStep;
          const isCurrent = i === currentStep;
          const isAnimating = i === animatedStep && i <= currentStep;
          const Icon = stepIcons[step];

          return (
            <div key={step} className="tracker-v2-step">
              {/* Connecting line (before the dot) */}
              {i > 0 && (
                <div className="tracker-v2-line-wrap">
                  <div className={`tracker-v2-line ${i <= animatedStep ? 'filled' : ''}`} />
                </div>
              )}

              {/* Dot / Icon */}
              <div
                className={`tracker-v2-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isAnimating ? 'pop' : ''}`}
                style={isCompleted ? { background: info.color, borderColor: info.color } : {}}
              >
                {isCompleted ? <Check size={12} strokeWidth={3} /> : <Icon size={12} />}
              </div>

              {/* Label */}
              <span className={`tracker-v2-label ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                {info.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ETA hint */}
      {status !== 'delivered' && status !== 'cancelled' && (
        <div className="tracker-eta">
          {status === 'gate' ? 'Waiting at gate for pickup' :
           status === 'out' ? 'On the way to your gate' :
           'Estimated delivery: 15-30 mins'}
        </div>
      )}
    </div>
  );
};

export default OrderTracker;
