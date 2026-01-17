import { createContext } from "react";

type DynamicContextType = {
  clientReady: boolean;
};

export const DynamicContext = createContext<DynamicContextType>({
  clientReady: false,
});
