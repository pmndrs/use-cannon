import { useEffect } from 'react'

import type { ProviderProps } from './Provider'
import type { WorldPropName } from './setup'
import type { CannonWorker } from './worker/cannon-worker'

type Props = Pick<Required<ProviderProps>, WorldPropName> & { worker: CannonWorker }

export function useUpdateWorldPropsEffect({
  axisIndex,
  broadphase,
  gravity,
  iterations,
  tolerance,
  worker,
}: Props) {
  useEffect(() => {
    worker.axisIndex = axisIndex
  }, [axisIndex])
  useEffect(() => {
    worker.broadphase = broadphase
  }, [broadphase])
  useEffect(() => {
    worker.gravity = gravity
  }, [gravity])
  useEffect(() => {
    worker.iterations = iterations
  }, [iterations])
  useEffect(() => {
    worker.tolerance = tolerance
  }, [tolerance])
}
