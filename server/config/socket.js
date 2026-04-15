// Socket.io setup for real-time order tracking
// Attaches to the HTTP server and handles order room subscriptions

const { Server } = require('socket.io');

let io = null;

const isDev = process.env.NODE_ENV !== 'production';

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      // In dev, accept any localhost port (Vite uses 5173, 5174, 5175… dynamically).
      // In production, only the CLIENT_URL env var is allowed.
      origin: isDev
        ? (origin, cb) => {
            if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
            cb(new Error('Not allowed by CORS'));
          }
        : [process.env.CLIENT_URL].filter(Boolean),
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Customer joins their order room to get live updates
    socket.on('join-order', (orderId) => {
      socket.join(`order_${orderId}`);
    });

    // Customer joins their user room (for global notifications across all pages)
    socket.on('join-user', (userId) => {
      socket.join(`user_${userId}`);
    });

    // Customer joins shop room for live product updates (stock, price changes)
    socket.on('join-shop', () => {
      socket.join('shop');
    });

    // Admin joins the admin room for live order feed
    socket.on('join-admin', () => {
      socket.join('admin');
    });
  });

  return io;
};

// Get the io instance from anywhere in the app
const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };
