import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import api from "../api";
import { useAuth } from "./AuthContext";

interface AccountCtxValue {
  balance: number | null;
  myTickets: number[];
  refresh: () => void;
}

const AccountContext = createContext<AccountCtxValue>({ balance: null, myTickets: [], refresh: () => {} });

export function AccountProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [myTickets, setMyTickets] = useState<number[]>([]);

  const refresh = useCallback(() => {
    if (!token) return;
    Promise.all([
      api.get("/account/summary"),
      api.get("/trading/positions/open"),
    ]).then(([s, p]) => {
      setBalance(s.data.balance);
      setMyTickets(p.data.map((pos: any) => pos.mt5_ticket));
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) { setBalance(null); setMyTickets([]); return; }
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [token, refresh]);

  return (
    <AccountContext.Provider value={{ balance, myTickets, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
