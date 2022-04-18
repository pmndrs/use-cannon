import { propsToBody } from '@pmndrs/cannon-worker-api'
import { useFrame } from '@react-three/fiber'
import type { Body, Quaternion as CQuaternion, Vec3, World } from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import type { PropsWithChildren } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { Color, Object3D } from 'three'
import { InstancedMesh, Matrix4, Quaternion, Scene, Vector3 } from 'three'

import type { DebugApi } from './debug-context'
import { debugContext } from './debug-context'
import { usePhysicsContext } from './physics-context'

type DebugInfo = { bodies: Body[]; bodyMap: { [uuid: string]: Body } }

export type DebugProviderProps = {
  color?: string | number | Color
  impl?: typeof CannonDebugger
  scale?: number
}

const q = new Quaternion()
const s = new Vector3(1, 1, 1)
const v = new Vector3()
const m = new Matrix4()

const getMatrix = (o: Object3D): Matrix4 => {
  if (o instanceof InstancedMesh) {
    o.getMatrixAt(parseInt(o.uuid.split('/')[1]), m)
    return m
  }
  return o.matrix
}

export function DebugProvider({
  children,
  color = 'black',
  impl = CannonDebugger,
  scale = 1,
}: PropsWithChildren<DebugProviderProps>): JSX.Element {
  const [{ bodies, bodyMap }] = useState<DebugInfo>({ bodies: [], bodyMap: {} })
  const { refs } = usePhysicsContext()
  const [scene] = useState(() => new Scene())
  const cannonDebuggerRef = useRef(impl(scene, { bodies } as World, { color, scale }))

  useFrame(() => {
    for (const uuid in bodyMap) {
      getMatrix(refs[uuid]).decompose(v, q, s)
      bodyMap[uuid].position.copy(v as unknown as Vec3)
      bodyMap[uuid].quaternion.copy(q as unknown as CQuaternion)
    }

    cannonDebuggerRef.current.update()
  })

  const api = useMemo<DebugApi>(
    () => ({
      add(uuid, props, type) {
        const body = propsToBody({ props, type, uuid })
        bodies.push(body)
        bodyMap[uuid] = body
      },
      remove(uuid) {
        const index = bodies.indexOf(bodyMap[uuid])
        if (index !== -1) bodies.splice(index, 1)
        delete bodyMap[uuid]
      },
    }),
    [bodies, bodyMap],
  )

  return (
    <debugContext.Provider value={api}>
      <primitive object={scene} />
      {children}
    </debugContext.Provider>
  )
}
