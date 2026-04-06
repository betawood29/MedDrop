// Print order status tracker — step-by-step progress for print orders

import { useEffect, useRef, useState } from 'react';
import { Check, X, ClipboardCheck, Printer, Package, Truck, ShoppingBag } from 'lucide-react';
import { PRINT_ORDER_STATUSES } from '../../utils/constants';

const steps = ['placed', 'printing', 'ready', 'out', 'delivered'];

const stepIcons = {
  placed: ClipboardCheck,
  printing: Printer,
  ready: Package,
  out: Truck,
  delivered: ShoppingBag,
};

const PrintOrderTracker = ({ status }) => {
  const currentStep = PRINT_ORDER_STATUSES[status]?.step ?? 0;
  const isCancelled = status === 'cancelled';
  const [animatedStep, setAnimatedStep] = useState(-1);
  const prevStepRef = useRef(currentStep);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isCancelled) return;

    const prevStep = prevStepRef.current;
    const startFrom = prevStep < currentStep ? prevStep : 0;

    if (prevStep !== currentStep && prevStep >= 0) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    prevStepRef.current = currentStep;

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
      <div className="tracker-status-badge" style={{ background: PRINT_ORDER_STATUSES[status]?.color }}>
        <span className="tracker-pulse" />
        {PRINT_ORDER_STATUSES[status]?.label}
      </div>

      <div className="order-tracker-v2">
        {steps.map((step, i) => {
          const info = PRINT_ORDER_STATUSES[step];
          const isCompleted = i <= animatedStep;
          const isCurrent = i === currentStep;
          const isAnimating = i === animatedStep && i <= currentStep;
          const Icon = stepIcons[step];

          return (
            <div key={step} className="tracker-v2-step">
              {i > 0 && (
                <div className="tracker-v2-line-wrap">
                  <div className={`tracker-v2-line ${i <= animatedStep ? 'filled' : ''}`} />
                </div>
              )}
              <div
                className={`tracker-v2-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isAnimating ? 'pop' : ''}`}
                style={isCompleted ? { background: info.color, borderColor: info.color } : {}}
              >
                {isCompleted ? <Check size={12} strokeWidth={3} /> : <Icon size={12} />}
              </div>
              <span className={`tracker-v2-label ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                {info.label}
              </span>
            </div>
          );
        })}
      </div>

      {status !== 'delivered' && status !== 'cancelled' && (
        <div className="tracker-eta">
          {status === 'ready' ? 'Ready for pickup / delivery' :
           status === 'out' ? 'On the way to your gate' :
           status === 'printing' ? 'Your documents are being printed' :
           'Scheduled delivery: 6 – 7 PM'}
        </div>
      )}
    </div>
  );
};

export default PrintOrderTracker;
