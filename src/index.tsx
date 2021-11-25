import { Suspense } from 'react'
import { Provider } from './Provider'
import { context } from './setup'

import type { ProviderProps } from './Provider'

export * from './Debug'
export * from './hooks'

function Physics(props: ProviderProps) {
  return (
    <Suspense fallback={null}>
      <Provider {...props} />
    </Suspense>
  )
}

export { Physics, context }
