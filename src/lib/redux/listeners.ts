import { createListenerMiddleware } from '@reduxjs/toolkit'

export const storageListener = createListenerMiddleware()
export const idbListener = createListenerMiddleware()
