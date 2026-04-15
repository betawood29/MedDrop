// App-wide constants — URLs, delivery fees, gate options, order statuses

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
export const API_BASE_URL = API_URL.replace('/api', '');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_MIN = 199;

export const GATE_OPTIONS = ['Main Gate', 'Back Gate', 'Side Gate (Library)'];

export const ORDER_STATUSES = {
  placed: { label: 'Placed', color: '#f59e0b', step: 0 },
  confirmed: { label: 'Confirmed', color: '#3b82f6', step: 1 },
  packed: { label: 'Packed', color: '#8b5cf6', step: 2 },
  out: { label: 'Out for Delivery', color: '#f97316', step: 3 },
  gate: { label: 'At Gate', color: '#10b981', step: 4 },
  delivered: { label: 'Delivered', color: '#22c55e', step: 5 },
  cancelled: { label: 'Cancelled', color: '#ef4444', step: -1 },
};

export const PRINT_ORDER_STATUSES = {
  placed: { label: 'Placed', color: '#f59e0b', step: 0 },
  printing: { label: 'Printing', color: '#3b82f6', step: 1 },
  ready: { label: 'Ready', color: '#8b5cf6', step: 2 },
  out: { label: 'Out for Delivery', color: '#f97316', step: 3 },
  delivered: { label: 'Delivered', color: '#22c55e', step: 4 },
  cancelled: { label: 'Cancelled', color: '#ef4444', step: -1 },
};

// Scheduled delivery — orders before 4 PM delivered same day 6-7 PM, else next day
export const DELIVERY_CUTOFF_HOUR = 16; // 4 PM
export const DELIVERY_WINDOW = '6 – 7 PM';

export const getDeliveryInfo = () => {
  const now = new Date();
  const hour = now.getHours();
  if (hour < DELIVERY_CUTOFF_HOUR) {
    return { label: `Today, ${DELIVERY_WINDOW}`, isToday: true };
  }
  return { label: `Tomorrow, ${DELIVERY_WINDOW}`, isToday: false };
};

export const PRESCRIPTION_STATUSES = {
  pending:                { label: 'Under Review',          color: '#f59e0b', bg: '#fef3c7', step: 1 },
  approved:               { label: 'Approved',              color: '#22c55e', bg: '#dcfce7', step: 2 },
  partially_approved:     { label: 'Partially Approved',    color: '#3b82f6', bg: '#eff6ff', step: 2 },
  rejected:               { label: 'Rejected',              color: '#ef4444', bg: '#fee2e2', step: -1 },
  clarification_required: { label: 'Clarification Needed',  color: '#8b5cf6', bg: '#f5f3ff', step: 1 },
};

// Statuses that block cart checkout
export const RX_BLOCKING_STATUSES = new Set(['none', 'pending', 'rejected', 'clarification_required']);

export const DELIVERY_REQUEST_STATUSES = {
  requested: { label: 'Requested', color: '#f59e0b', bg: '#fef3c7' },
  preparing: { label: 'Preparing', color: '#3b82f6', bg: '#eff6ff' },
  out: { label: 'Out for Delivery', color: '#f97316', bg: '#fff7ed' },
  delivered: { label: 'Delivered', color: '#22c55e', bg: '#dcfce7' },
};

export const HOSTEL_OPTIONS = [
  'Hostel 1', 'Hostel 2', 'Hostel 3', 'Hostel 4', 'Hostel 5',
  'Hostel 6', 'Hostel 7', 'Hostel 8', 'Hostel 9', 'Hostel 10',
  'Girls Hostel 1', 'Girls Hostel 2', 'Girls Hostel 3',
  'Day Scholar',
];
