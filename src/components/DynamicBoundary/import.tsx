import React, { Suspense, useContext } from "react";

import { DynamicContext } from "./context";

// biome-ignore lint/suspicious/noExplicitAny: Picked from React.Lazy type-declarations
export function dynamicImport<T extends React.ComponentType<any>>(
  load: () => Promise<{ default: T }>,
  options?: { fallback?: () => React.ReactNode }
) {
  const LazyComponent = React.lazy(load);

  return function DynamicComponent(props: React.ComponentProps<T>) {
    const clientReady = useContext(DynamicContext);
    return (
      <Suspense fallback={options?.fallback?.() || null}>
        {clientReady ? (
          <LazyComponent {...props} />
        ) : (
          options?.fallback?.() || null
        )}
      </Suspense>
    );
  };
}
