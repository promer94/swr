import SWRConfig from './_internal/utils/config-context'
import * as revalidateEvents from './_internal/constants'

export { SWRConfig, revalidateEvents }

export { initCache } from './_internal/utils/cache'
export { defaultConfig, cache, mutate, compare } from './_internal/utils/config'
import { setupDevTools } from './_internal/utils/devtools'
export * from './_internal/utils/env'
export { SWRGlobalState } from './_internal/utils/global-state'
export { stableHash } from './_internal/utils/hash'
export * from './_internal/utils/helper'
export { mergeConfigs } from './_internal/utils/merge-config'
export { internalMutate } from './_internal/utils/mutate'
export { normalize } from './_internal/utils/normalize-args'
export { withArgs } from './_internal/utils/resolve-args'
export { serialize } from './_internal/utils/serialize'
export { useStateWithDeps } from './_internal/utils/state'
export { subscribeCallback } from './_internal/utils/subscribe-key'
export { getTimestamp } from './_internal/utils/timestamp'
export { useSWRConfig } from './_internal/utils/use-swr-config'
export { preset, defaultConfigOptions } from './_internal/utils/web-preset'
export { withMiddleware } from './_internal/utils/with-middleware'
export { preload } from './_internal/utils/preload'

export * from './_internal/types'

setupDevTools()
