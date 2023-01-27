import type { Middleware } from './_internal'
import useSWR from 'swr'
import { withMiddleware } from './_internal'

export const immutable: Middleware = useSWRNext => (key, fetcher, config) => {
  // Always override all revalidate options.
  config.revalidateOnFocus = false
  config.revalidateIfStale = false
  config.revalidateOnReconnect = false
  return useSWRNext(key, fetcher, config)
}

export default withMiddleware(useSWR, immutable)
