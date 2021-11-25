import { useEffect } from 'react'

import type { ProviderProps } from './Provider'
import type { CannonWorker, WorldPropName } from './setup'

type Props = Pick<Required<ProviderProps>, WorldPropName> & { worker: CannonWorker }

export function useUpdateWorldPropsEffect({
  axisIndex,
  broadphase,
  gravity,
  iterations,
  step,
  tolerance,
  worker,
}: Props) {
  useEffect(() => void worker.postMessage({ op: 'setAxisIndex', props: axisIndex }), [axisIndex])
  useEffect(() => void worker.postMessage({ op: 'setBroadphase', props: broadphase }), [broadphase])
  useEffect(() => void worker.postMessage({ op: 'setGravity', props: gravity }), [gravity])
  useEffect(() => void worker.postMessage({ op: 'setIterations', props: iterations }), [iterations])
  useEffect(() => void worker.postMessage({ op: 'setStep', props: step }), [step])
  useEffect(() => void worker.postMessage({ op: 'setTolerance', props: tolerance }), [tolerance])
}
