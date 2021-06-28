import React, { Suspense } from 'react'
import type { ProviderProps } from './Provider'
import { default as Provider } from './Provider'

export * from './Debug'
export * from './hooks'
export * from './shared'

function Physics(props: ProviderProps) {
  return (
    <Suspense fallback={null}>
      <Provider {...props} />
    </Suspense>
  )
}

export { Physics }
