import { Suspense } from 'react'
import { Provider } from './Provider'

import type { ProviderProps } from './Provider'

export * from './Debug'
export * from './hooks'
export * from './setup'

function Physics(props: ProviderProps) {
  return (
    <Suspense fallback={null}>
      <Provider {...props} />
    </Suspense>
  )
}

export { Physics }
