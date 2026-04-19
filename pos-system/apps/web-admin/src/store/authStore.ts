import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthSession } from "../lib/api";

type AuthStore = {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null })
    }),
    {
      name: "iorder-auth-session",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
