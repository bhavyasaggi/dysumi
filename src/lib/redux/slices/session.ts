import {
  createSelector,
  createSlice,
  isAnyOf,
  type PayloadAction,
} from '@reduxjs/toolkit'

import { storageListener } from '../listeners'

type InitialStateType = {
  historyCurrent?: string
  historyLength?: number
  historyPrev?: string
  redirectTo?: string
  referrer?: string
  utmCampaign?: string
  utmContent?: string
  utmId?: string
  utmMedium?: string
  utmSource?: string
  utmTerm?: string
}

const initialStateResolver: () => InitialStateType = () => {
  const hasWindow = Boolean(globalThis.window)
  const url = hasWindow ? new URL(globalThis.location.href) : undefined

  const urlSearchParameters = url ? new URLSearchParams(url.search) : undefined
  const [
    utmId,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    redirectTo,
  ] = [
    'utm_id',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'redirect_to',
  ].map((q) => urlSearchParameters?.get(q) ?? undefined)

  const urlHashParameters = url
    ? new URLSearchParams(url.hash.replace(/^#?/, ''))
    : undefined
  const [hashRedirectTo] = ['redirect_to'].map(
    (q) => urlHashParameters?.get(q) ?? undefined
  )

  return {
    historyCurrent: url?.href,
    historyLength: hasWindow ? globalThis.history.length : 0,
    historyPrev: '',
    redirectTo: redirectTo || hashRedirectTo,
    referrer: typeof document === 'undefined' ? undefined : document.referrer,
    utmCampaign,
    utmContent,
    utmId,
    utmMedium,
    utmSource,
    utmTerm,
  }
}

export const sessionSlice = createSlice({
  initialState: initialStateResolver,
  name: 'session',
  reducers: {
    setSessionReturnTo: (state, action: PayloadAction<string | undefined>) => {
      state.redirectTo = action.payload
    },
    updateSession: (state) => {
      const nextState = initialStateResolver()
      const stateHistoryCurrent = state.historyCurrent ?? ''
      const nextStateHistoryCurrent = nextState.historyCurrent ?? ''
      if (nextStateHistoryCurrent !== stateHistoryCurrent) {
        state.historyPrev = stateHistoryCurrent
        state.historyCurrent = nextStateHistoryCurrent
        state.historyLength = (state.historyLength || 0) + 1
      }
      state.redirectTo = nextState.redirectTo ?? state.redirectTo
      state.referrer = nextState.referrer ?? state.referrer
      state.utmCampaign = nextState.utmCampaign ?? state.utmCampaign
      state.utmContent = nextState.utmContent ?? state.utmContent
      state.utmId = nextState.utmId ?? state.utmId
      state.utmMedium = nextState.utmMedium ?? state.utmMedium
      state.utmSource = nextState.utmSource ?? state.utmSource
      state.utmTerm = nextState.utmTerm ?? state.utmTerm
    },
  },
  selectors: {
    getSessionData: (state) => {
      return state
    },
    getSessionIsFresh: (state) => {
      return !state.historyPrev
    },
    getSessionReferrer: (state) => {
      return state.referrer
    },
    getSessionReturnTo: (state) => {
      return state.redirectTo
    },
  },
})

export const selectorGetSessionHistory = createSelector(
  sessionSlice.selectors.getSessionData,
  (state) => ({
    historyCurrent: state.historyCurrent,
    historyLength: state.historyLength,
    historyPrev: state.historyPrev,
  })
)

export const selectorGetSessionUTM = createSelector(
  sessionSlice.selectors.getSessionData,
  (state) => ({
    utmCampaign: state.utmCampaign,
    utmContent: state.utmContent,
    utmId: state.utmId,
    utmMedium: state.utmMedium,
    utmSource: state.utmSource,
    utmTerm: state.utmTerm,
  })
)

export const {
  setSessionReturnTo: actionSetSessionReturnTo,
  updateSession: actionUpdateSession,
} = sessionSlice.actions

export const {
  getSessionData: selectorGetSessionData,
  getSessionIsFresh: selectorGetSessionIsFresh,
  getSessionReferrer: selectorGetSessionReferrer,
  getSessionReturnTo: selectorGetSessionReturnTo,
} = sessionSlice.selectors

export default sessionSlice.reducer

storageListener.startListening({
  effect: (_action, listenerApi) => {
    listenerApi.cancelActiveListeners()
    const state = listenerApi.getState() as { session: InitialStateType }
    const hasWindow = Boolean(globalThis.window)
    const sessionStorage = hasWindow ? globalThis.sessionStorage : undefined
    if (sessionStorage) {
      for (const [k, v] of Object.entries(state.session)) {
        sessionStorage.setItem(k, String(v || ''))
      }
    }
  },
  matcher: isAnyOf(actionUpdateSession),
})
