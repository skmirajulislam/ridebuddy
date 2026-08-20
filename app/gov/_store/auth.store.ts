"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "../_services/auth";

export interface AuthContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

export const useAuthContext = () => useContext(AuthContext);
