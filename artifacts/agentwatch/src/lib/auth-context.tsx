import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

const DEMO_KEY = "agentwatch_demo_user";

interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: User | DemoUser | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getDemoUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setDemoUser(email: string): DemoUser {
  const u: DemoUser = {
    uid: "demo-" + Math.random().toString(36).slice(2),
    email,
    displayName: email.split("@")[0],
  };
  localStorage.setItem(DEMO_KEY, JSON.stringify(u));
  return u;
}

function clearDemoUser() {
  localStorage.removeItem(DEMO_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      const demo = getDemoUser();
      setUser(demo);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      if (!email || !password) throw new Error("Please enter your email and password.");
      const u = setDemoUser(email);
      setUser(u);
    }
  };

  const signUp = async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      if (!email || !password) throw new Error("Please enter your email and password.");
      const u = setDemoUser(email);
      setUser(u);
    }
  };

  const signInWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      const u = setDemoUser("demo@agentwatch.ai");
      setUser(u);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    } else {
      clearDemoUser();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemoMode: !isFirebaseConfigured, signIn, signUp, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
