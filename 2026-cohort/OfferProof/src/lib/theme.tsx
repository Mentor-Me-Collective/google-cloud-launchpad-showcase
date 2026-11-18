import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "offerproof-theme";

// Runs before paint (inlined in <head>) so the page never flashes the wrong theme.
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const Ctx = createContext<{ pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void }>({
  pref: "system",
  dark: false,
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setPrefState((localStorage.getItem(KEY) as ThemePref) || "system");
  }, []);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const d = pref === "dark" || (pref === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", d);
      setDark(d);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    localStorage.setItem(KEY, p);
    setPrefState(p);
  };
  return <Ctx.Provider value={{ pref, dark, setPref }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
