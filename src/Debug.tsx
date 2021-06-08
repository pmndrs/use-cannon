import React, { useContext, useState, useRef, useMemo } from 'react'
import cannonDebugger from 'cannon-es-debugger'
import { useFrame } from '@react-three/fiber'
import { Scene, Color } from 'three'
import { Quaternion, Vec3 } from 'cannon-es'
import type { Body as CannonBody } from 'cannon-es'
import { context, debugContext } from './setup'
import propsToBody from './propsToBody'
import { BodyProps, BodyShapeType } from 'hooks'

export type DebugInfo = { bodies: CannonBody[]; refs: { [uuid: string]: CannonBody } }

export type DebugProps = {
  children: React.ReactNode
  color?: string | number | Color
  scale?: number
}

export function Debug({ color = 'black', scale = 1, children }: DebugProps): JSX.Element {
  const [debugInfo] = useState<DebugInfo>({ bodies: [], refs: {} })
  const { refs } = useContext(context)
  const [scene] = useState(() => new Scene())
  const instance = useRef<any>()

  let lastBodies = 0
  useFrame(() => {
    if (!instance.current || lastBodies !== debugInfo.bodies.length) {
      lastBodies = debugInfo.bodies.length
      scene.children = []
      instance.current = cannonDebugger(scene, debugInfo.bodies, {
        color,
        scale,
        autoUpdate: false,
      })
    }

    for (const uuid in debugInfo.refs) {
      debugInfo.refs[uuid].position.copy(refs[uuid].position as unknown as Vec3)
      debugInfo.refs[uuid].quaternion.copy(refs[uuid].quaternion as unknown as Quaternion)
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
