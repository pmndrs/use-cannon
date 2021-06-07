import { useEffect } from 'react'
import type { ProviderProps } from './Provider'

type useUpdateWorldPropsEffect = Pick<
  ProviderProps,
  'gravity' | 'tolerance' | 'step' | 'iterations' | 'broadphase' | 'axisIndex'
> & {
  worker: Worker
}

function useUpdateWorldPropsEffect({
  worker,
  gravity,
  tolerance,
  step,
  iterations,
  broadphase,
  axisIndex,
}: useUpdateWorldPropsEffect) {
  useEffect(() => {
    worker.postMessage({
      op: 'setGravity',
      props: gravity,
    })
  }, [gravity])

  useEffect(() => {
    worker.postMessage({
      op: 'setTolerance',
      props: tolerance,
    })
  }, [tolerance])

  useEffect(() => {
    worker.postMessage({
      op: 'setStep',
      props: step,
    })
  }, [step])

  useEffect(() => {
    worker.postMessage({
      op: 'setIterations',
      props: iterations,
    })
  }, [iterations])

  useEffect(() => {
    worker.postMessage({
      op: 'setBroadphase',
      props: broadphase,
    })
  }, [broadphase])

  useEffect(() => {
    worker.postMessage({
      op: 'setAxisIndex',
      props: axisIndex,
    })
  }, [axisIndex])
}

export { useUpdateWorldPropsEffect }
