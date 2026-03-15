'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io as ClientIO } from 'socket.io-client';

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrlFromEnv =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      undefined;
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalRuntime =
      hostname === 'localhost' || hostname === '127.0.0.1';
    const socketUrl =
      socketUrlFromEnv &&
      !isLocalRuntime &&
      socketUrlFromEnv.includes('localhost')
        ? undefined
        : socketUrlFromEnv;
    const isVercelDeployment =
      process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'vercel' ||
      socketUrl?.includes('.vercel.app') ||
      hostname.endsWith('.vercel.app');

    const socketInstance = new (ClientIO as any)(socketUrl, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      // Only apply the polling fallback on Vercel serverless deployments.
      transports: isVercelDeployment ? ['polling'] : undefined,
      upgrade: !isVercelDeployment,
    });
    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
