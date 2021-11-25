import { useFrame } from '@react-three/fiber'
import cannonDebugger from 'cannon-es-debugger'
import { useContext, useState, useRef, useMemo } from 'react'
import { Vector3, Quaternion, Scene } from 'three'
import { context, debugContext } from './setup'
import propsToBody from './propsToBody'

import type { Body, Quaternion as CQuaternion, Vec3 } from 'cannon-es'
import type { DebugOptions } from 'cannon-es-debugger'
import type { ReactNode } from 'react'
import type { Color } from 'three'
import type { BodyProps, BodyShapeType } from './hooks'

type DebugApi = {
  update: () => void
}

export type DebuggerInterface = (scene: Scene, bodies: Body[], props?: DebugOptions) => DebugApi

export type DebugInfo = { bodies: Body[]; refs: { [uuid: string]: Body } }

export type DebugProps = {
  children: ReactNode
  color?: string | number | Color
  scale?: number
  impl?: DebuggerInterface
}

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()

export function Debug({
  color = 'black',
  scale = 1,
  children,
  impl = cannonDebugger,
}: DebugProps): JSX.Element {
  const [debugInfo] = useState<DebugInfo>({ bodies: [], refs: {} })
  const { refs } = useContext(context)
  const [scene] = useState(() => new Scene())
  const instance = useRef<DebugApi>()

  let lastBodies = 0
  useFrame(() => {
    if (!instance.current || lastBodies !== debugInfo.bodies.length) {
      lastBodies = debugInfo.bodies.length
      scene.children = []
      instance.current = impl(scene, debugInfo.bodies, {
        color,
        scale,
        autoUpdate: false,
      })
    }

    for (const uuid in debugInfo.refs) {
      refs[uuid].matrix.decompose(v, q, s)
      debugInfo.refs[uuid].position.copy(v as unknown as Vec3)
      debugInfo.refs[uuid].quaternion.copy(q as unknown as CQuaternion)
    }

    instance.current.update()
  })

  const api = useMemo(
    () => ({
      add(id: string, props: BodyProps, type: BodyShapeType) {
        const body = propsToBody(id, props, type)
        debugInfo.bodies.push(body)
        debugInfo.refs[id] = body
      },
      remove(id: string) {
        const debugBodyIndex = debugInfo.bodies.indexOf(debugInfo.refs[id])
        if (debugBodyIndex > -1) debugInfo.bodies.splice(debugBodyIndex, 1)
        delete debugInfo.refs[id]
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
