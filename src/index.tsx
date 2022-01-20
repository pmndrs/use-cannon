import { Suspense } from 'react'

import type { ProviderProps } from './Provider'
import { Provider } from './Provider'

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
