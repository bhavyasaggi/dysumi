import { useDispatch, useSelector, useStore } from "react-redux";

import type { ReduxDispatch, ReduxRootState, ReduxStore } from "./store";

// Use throughout your Redux instead of plain `useDispatch` and `useSelector`
export const useReduxDispatch = useDispatch.withTypes<ReduxDispatch>();
export const useReduxSelector = useSelector.withTypes<ReduxRootState>();
export const useReduxStore = useStore.withTypes<ReduxStore>();
