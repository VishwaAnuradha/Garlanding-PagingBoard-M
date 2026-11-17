import { cloneElement, useEffect, useState } from 'react';
import CounterFooter from '../components/CounterFooter';
import CounterHeader from '../components/CounterHeader';
import { getConnectionStatus } from '../services/salesService';

export default function CounterLayout({ children, user, onLogout }) {
    const [ticketType, setTicketType] = useState('GARLANDING');
    const [connectionStatus, setConnectionStatus] = useState({ serverConnected: false, databaseConnected: false });

    useEffect(() => {
        let disposed = false;
        const refreshConnectionStatus = async () => {
            const nextStatus = await getConnectionStatus();
            if (!disposed) setConnectionStatus(nextStatus);
        };
        const handleOffline = () => !disposed && setConnectionStatus({ serverConnected: false, databaseConnected: false });

        refreshConnectionStatus();
        const intervalId = window.setInterval(refreshConnectionStatus, 10000);
        window.addEventListener('online', refreshConnectionStatus);
        window.addEventListener('offline', handleOffline);
        return () => {
            disposed = true;
            window.clearInterval(intervalId);
            window.removeEventListener('online', refreshConnectionStatus);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <main className="mx-auto my-0 min-h-screen w-full max-w-5xl border border-zinc-500 bg-white font-arial text-[13px] md:my-12 md:min-h-0">
            <CounterHeader user={user} onLogout={onLogout} ticketType={ticketType} connectionStatus={connectionStatus} />
            {cloneElement(children, { onTicketTypeChange: setTicketType, onLogout })}
            <CounterFooter />
        </main>
    );
}
