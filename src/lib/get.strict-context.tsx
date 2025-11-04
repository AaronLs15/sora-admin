import { createContext, useContext } from "react";

export function getStrictContext<T>(name: string) {
  const Context = createContext<T | undefined>(undefined);
  Context.displayName = name;

  const useStrictContext = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(`${name} must be used within ${name}Provider`);
    }
    return context;
  };

  return [Context.Provider, useStrictContext] as const;
}