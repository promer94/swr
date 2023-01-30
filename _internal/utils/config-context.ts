import type { FC, PropsWithChildren } from 'react'
import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useRef
} from 'react'
import { cache as defaultCache } from './config'
import { initCache } from './cache'
import { mergeConfigs } from './merge-config'
import { UNDEFINED, mergeObjects, isFunction } from './helper'
import { useIsomorphicLayoutEffect } from './env'
import type {
  SWRConfiguration,
  FullConfiguration,
  ProviderConfiguration,
  Cache
} from '../types'

type Config = SWRConfiguration &
  Partial<ProviderConfiguration> & {
    provider?: (cache: Readonly<Cache>) => Cache
  }

export const SWRConfigContext = createContext<Partial<FullConfiguration>>({})

const SWRConfig: FC<
  PropsWithChildren<{
    value?: Config | ((parentConfig?: Config) => Config)
  }>
> = props => {
  const { value } = props
  const parentConfig = useContext(SWRConfigContext)
  const isFunctionalConfig = isFunction(value)
  const config = useMemo(
    () => (isFunctionalConfig ? value(parentConfig) : value),
    [isFunctionalConfig, parentConfig, value]
  )
  // Extend parent context values and middleware.
  const extendedConfig = useMemo(
    () => (isFunctionalConfig ? config : mergeConfigs(parentConfig, config)),
    [isFunctionalConfig, parentConfig, config]
  )

  // Should not use the inherited provider.
  const provider = config && config.provider

  // Use a lazy initialized to create the cache on first access
  const cacheContextRef = useRef<ReturnType<typeof initCache> | null>(null)
  if (cacheContextRef.current === null) {
    cacheContextRef.current = provider
      ? initCache(
          provider((extendedConfig as any).cache || defaultCache),
          config
        )
      : UNDEFINED
  }

  // Override the cache if a new provider is given.
  if (cacheContextRef.current) {
    ;(extendedConfig as any).cache = cacheContextRef.current[0]
    ;(extendedConfig as any).mutate = cacheContextRef.current[1]
  }

  // Unsubscribe events.
  useIsomorphicLayoutEffect(() => {
    if (cacheContextRef.current) {
      cacheContextRef.current[2] && cacheContextRef.current[2]()
      return cacheContextRef.current[3]
    }
  }, [])

  return createElement(
    SWRConfigContext.Provider,
    mergeObjects(props, {
      value: extendedConfig
    })
  )
}

export default SWRConfig
