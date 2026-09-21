// API client + auth context
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export const API = process.env.EXPO_PUBLIC_BACKEND_URL!;

const secureAvailable = Platform.OS !== "web";

async function setToken(t: string | null) {
  if (secureAvailable) {
    if (t) await SecureStore.setItemAsync("cs.token", t);
    else await SecureStore.deleteItemAsync("cs.token");
  } else {
    if (t) await AsyncStorage.setItem("cs.token", t);
    else await AsyncStorage.removeItem("cs.token");
  }
}
async function getToken(): Promise<string | null> {
  if (secureAvailable) return SecureStore.getItemAsync("cs.token");
  return AsyncStorage.getItem("cs.token");
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}/api${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get("Content-Type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function apiUpload(uri: string, name: string, type: string) {
  const token = await getToken();
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await fetch(`${API}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function fileUrl(path: string): Promise<string> {
  const t = await getToken();
  return `${API}/api/files/${path}?token=${encodeURIComponent(t || "")}`;
}

// ------ Auth Context ------
type User = { id: string; name: string; surname: string; username: string; role: "ADMIN" | "STUDENTE"; class_id: string | null; avatar_path?: string | null; bio?: string; muted?: boolean; disabled?: boolean };
type ClassInfo = any;
type Ctx = {
  user: User | null;
  cls: ClassInfo | null;
  hasClass: boolean;
  loading: boolean;
  needsClassSetup: boolean;
  login: (u: string, p: string) => Promise<void>;
  register: (data: { name: string; surname: string; username: string; password: string; invite_code?: string }) => Promise<void>;
  setupClass: (data: any) => Promise<{ invite_code: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cls, setCls] = useState<any>(null);
  const [hasClass, setHasClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsClassSetup, setNeedsClassSetup] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const boot = await apiFetch("/bootstrap");
      setHasClass(boot.has_class);
      setCls(boot.class || null);
    } catch {}
    try {
      const me = await apiFetch("/auth/me");
      setUser(me.user);
      if (me.user?.role === "ADMIN" && !me.user.class_id) setNeedsClassSetup(true);
      else setNeedsClassSetup(false);
    } catch { setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (username: string, password: string) => {
    const r = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    await setToken(r.access_token);
    setUser(r.user);
    await refresh();
  };

  const register = async (data: any) => {
    const r = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) });
    await setToken(r.access_token);
    setUser(r.user);
    setNeedsClassSetup(!!r.needs_class_setup);
    await refresh();
  };

  const setupClass = async (data: any) => {
    const r = await apiFetch("/class/setup", { method: "POST", body: JSON.stringify(data) });
    await setToken(r.access_token);
    setUser(r.user);
    setCls(r.class);
    setHasClass(true);
    setNeedsClassSetup(false);
    return { invite_code: r.invite_code };
  };

  const logout = async () => { await setToken(null); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, cls, hasClass, loading, needsClassSetup, login, register, setupClass, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
