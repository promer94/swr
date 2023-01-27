// useSWR
import useSWR from './core/use-swr'
export default useSWR
// Core APIs
export { SWRConfig, unstable_serialize } from './core/use-swr'
export { useSWRConfig, mutate, preload } from './_internal'

// Types
export type {
  SWRConfiguration,
  Revalidator,
  RevalidatorOptions,
  Key,
  KeyLoader,
  KeyedMutator,
  SWRHook,
  SWRResponse,
  Cache,
  BareFetcher,
  Fetcher,
  MutatorCallback,
  MutatorOptions,
  Middleware,
  Arguments,
  State
} from './_internal/types'
