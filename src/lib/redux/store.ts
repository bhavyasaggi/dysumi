import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { idbListener, storageListener } from "./listeners";
import { webFsApi } from "./queries/web-fs";
import { interfaceSlice } from "./slices/interface";
import { sessionSlice } from "./slices/session";

export const makeStore = () => {
  const store = configureStore({
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .concat(webFsApi.middleware)
        .prepend(storageListener.middleware)
        .prepend(idbListener.middleware),
    reducer: combineSlices(
      sessionSlice,
      interfaceSlice,
      webFsApi,
    ),
  });

  // setupListeners(store.dispatch)

  return store;
};

// Infer the type of makeStore
export type ReduxStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `ReduxDispatch` types from the store itself
export type ReduxRootState = ReturnType<ReduxStore["getState"]>;
export type ReduxDispatch = ReduxStore["dispatch"];
