import { useFrame } from '@react-three/fiber'
import CannonDebugger from 'cannon-es-debugger'
import { useContext, useState, useRef, useMemo } from 'react'
import { Vector3, Quaternion, Scene } from 'three'
import { context, debugContext } from './setup'
import propsToBody from './propsToBody'

import type { World, Body, Quaternion as CQuaternion, Vec3 } from 'cannon-es'
import type { PropsWithChildren } from 'react'
import type { Color } from 'three'
import type { BodyProps, BodyShapeType } from './hooks'

type DebugInfo = { bodies: Body[]; bodyMap: { [uuid: string]: Body } }

export type DebugProps = PropsWithChildren<{
  color?: string | number | Color
  impl?: typeof CannonDebugger
  scale?: number
}>

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()

export function Debug({
  children,
  color = 'black',
  impl = CannonDebugger,
  scale = 1,
}: DebugProps): JSX.Element {
  const [{ bodies, bodyMap }] = useState<DebugInfo>({ bodyMap: {}, bodies: [] })
  const { refs } = useContext(context)
  const [scene] = useState(() => new Scene())
  const cannonDebuggerRef = useRef(impl(scene, { bodies } as World, { color, scale }))

  useFrame(() => {
    for (const uuid in bodyMap) {
      refs[uuid].matrix.decompose(v, q, s)
      bodyMap[uuid].position.copy(v as unknown as Vec3)
      bodyMap[uuid].quaternion.copy(q as unknown as CQuaternion)
    }

    cannonDebuggerRef.current.update()
  })

  const api = useMemo(
    () => ({
      add(uuid: string, props: BodyProps, type: BodyShapeType) {
        const body = propsToBody(uuid, props, type)
        bodies.push(body)
        bodyMap[uuid] = body
      },
      remove(uuid: string) {
        const index = bodies.indexOf(bodyMap[uuid])
        if (index !== -1) bodies.splice(index, 1)
        delete bodyMap[uuid]
      },
    }),
    [],
  )

  return (
    <debugContext.Provider value={api}>
      <primitive object={scene} />
      {children}
    </debugContext.Provider>
  )
}
