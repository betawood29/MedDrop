// Context object lives in its own file (separate from the provider component) so
// react-refresh/only-export-components is satisfied — a file exporting both a
// component and a plain value breaks Fast Refresh's ability to hot-reload it.

import { createContext } from 'react';

export const CartContext = createContext(null);
