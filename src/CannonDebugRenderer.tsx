import React, { useContext, useEffect, useMemo, useState } from 'react'
import { context } from './setup'
import cannonDebugger from 'cannon-es-debugger'
import { Scene } from 'three'
import { Quaternion, Vec3 } from 'cannon-es'

export default function CannonDebugRenderer(): JSX.Element {
  const { debugInfo, refs } = useContext(context)
  const debugScene = useMemo<Scene>(() => new Scene(), [])
  const [, setUpdateCounter] = useState(0)

  const cannonDebuggerInstance = useMemo(() => {
    return debugInfo ? cannonDebugger(debugScene, debugInfo.bodies, { autoUpdate: false }) : null
  }, [debugScene, debugInfo])

  useEffect(() => {
    if (debugInfo === null || cannonDebuggerInstance === null) {
      console.warn("Please don't use <CannonDebugRenderer /> directly. Add 'debug' prop to <Physics />")
      return
    }
    let id: number = -1
    const tick = () => {
      for (const uuid in debugInfo.refs) {
        debugInfo.refs[uuid].position.copy(refs[uuid].position as unknown as Vec3)
        debugInfo.refs[uuid].quaternion.copy(refs[uuid].quaternion as unknown as Quaternion)
      }
      cannonDebuggerInstance.update()
      setUpdateCounter((i) => i + 1)
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(id)
    }
  }, [])

  return (
    <>
      {debugScene.children.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  )
}
