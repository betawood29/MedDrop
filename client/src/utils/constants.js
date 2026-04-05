// App-wide constants — URLs, delivery fees, gate options, order statuses

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
export const API_BASE_URL = API_URL.replace('/api', '');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_MIN = 299;

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

export const HOSTEL_OPTIONS = [
  'Hostel 1', 'Hostel 2', 'Hostel 3', 'Hostel 4', 'Hostel 5',
  'Hostel 6', 'Hostel 7', 'Hostel 8', 'Hostel 9', 'Hostel 10',
  'Girls Hostel 1', 'Girls Hostel 2', 'Girls Hostel 3',
  'Day Scholar',
];
