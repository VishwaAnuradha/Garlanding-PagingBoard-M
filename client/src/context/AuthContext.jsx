import { createContext, useContext, useState } from 'react'; import { loginRequest } from '../services/authService';
const AuthContext = createContext(null); const key = 'arrival-taxi-session';
export function AuthProvider({ children })
 { const [session, setSession] = useState(() => JSON.parse(sessionStorage.getItem(key) || 'null'));
     const login = async data =>
         { const next = await loginRequest(data); sessionStorage.setItem(key, JSON.stringify(next)); 
            setSession(next); return next; };
              const logout = () => { sessionStorage.removeItem(key); setSession(null); };
               return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>; } 
               export const useAuth = () => useContext(AuthContext);
