import React, { useContext, useEffect, useMemo, useState, useRef } from 'react'
import cannonDebugger from 'cannon-es-debugger'
import { useFrame } from '@react-three/fiber'
import { Scene, Color } from 'three'
import { Quaternion, Vec3 } from 'cannon-es'
import { context } from './setup'

export type DebugProps = {
  color?: string | number | Color
  scale?: number
}

export default function CannonDebugRenderer({ color = 'black', scale = 1 }: DebugProps): JSX.Element {
  const { debugInfo, refs } = useContext(context)
  const [scene] = useState(() => new Scene())
  const instance = useRef<any>()

  let lastBodies = 0
  useFrame(() => {
    if (debugInfo) {
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
    }
  })

  return <primitive object={scene} />
}
