
import React, { createContext, useEffect, useState } from 'react';

export const SocketContext = createContext({ socket: null });

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let mounted = true;
    let sock = null;

    const init = async () => {
      try {
        // Dynamically import socket.io-client to avoid loading engine.io-client at module-eval time,
        // which can cause issues in the Metro/Hermes environment. This keeps the main bundle safe
        // and only attempts to load sockets at runtime.
        const mod = await import('socket.io-client');
        const { io } = mod;
        sock = io('http://localhost:3000/page');

        sock.on('connect', () => console.log('Connected to server'));
        sock.on('disconnect', () => console.log('Disconnected from server'));

        if (mounted) setSocket(sock);
      } catch (err) {
        // If dynamic import or socket connection fails, log and continue without socket.
        console.warn('Socket initialization failed (socket.io-client not available or failed to run):', err);
        if (mounted) setSocket(null);
      }
    };

    init();

    return () => {
      mounted = false;
      if (sock && sock.close) sock.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;