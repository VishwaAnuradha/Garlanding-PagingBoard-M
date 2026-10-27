import { cloneElement, useState } from 'react';
import CounterFooter from '../components/CounterFooter';
import CounterHeader from '../components/CounterHeader';

export default function CounterLayout({ children, user, onLogout }) {
    const [ticketType, setTicketType] = useState('GARLANDING');

    return (
        <main className="mx-auto my-0 min-h-screen w-full max-w-5xl border border-zinc-500 bg-white font-arial text-[13px] md:my-12 md:min-h-0">
            <CounterHeader user={user} onLogout={onLogout} ticketType={ticketType} />
            {cloneElement(children, { onTicketTypeChange: setTicketType, onLogout })}
            <CounterFooter />
        </main>
    );
}
