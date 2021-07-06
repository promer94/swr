import { normalize } from './normalize-args'

import { Middleware, SWRHook } from '../types'

// Create a custom hook with a middleware
export function withMiddleware(
  useSWR: SWRHook,
  middleware: Middleware
): SWRHook {
  return (...args) => {
    const [key, fn, config] = normalize(args)
    config.middlewares = (config.middlewares || []).concat(middleware)
    return useSWR(key, fn, config)
  }
}
