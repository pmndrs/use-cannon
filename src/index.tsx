import React, { Suspense } from 'react'
import { ProviderProps, default as Provider } from './Provider'
import { context } from './setup'
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
