import { useEffect, useState } from 'react';
import { displayTime } from '../utils/formatters';
export default function useClock() { const [clock, setClock] = useState(displayTime()); useEffect(() => { const timer = setInterval(() => setClock(displayTime()), 1000); return () => clearInterval(timer); }, []); return clock; }
