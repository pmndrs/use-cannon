import { useEffect } from 'react'
import type { ProviderProps } from './Provider'

type useUpdateWorldPropsEffect = Pick<
  ProviderProps,
  'gravity' | 'tolerance' | 'step' | 'iterations' | 'broadphase' | 'axisIndex'
> & { worker: Worker }

export function useUpdateWorldPropsEffect({
  worker,
  gravity,
  tolerance,
  step,
  iterations,
  broadphase,
  axisIndex,
}: useUpdateWorldPropsEffect) {
  useEffect(() => void worker.postMessage({ op: 'setGravity', props: gravity }), [gravity])
  useEffect(() => void worker.postMessage({ op: 'setTolerance', props: tolerance }), [tolerance])
  useEffect(() => void worker.postMessage({ op: 'setStep', props: step }), [step])
  useEffect(() => void worker.postMessage({ op: 'setIterations', props: iterations }), [iterations])
  useEffect(() => void worker.postMessage({ op: 'setBroadphase', props: broadphase }), [broadphase])
  useEffect(() => void worker.postMessage({ op: 'setAxisIndex', props: axisIndex }), [axisIndex])
}
