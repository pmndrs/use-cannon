import * as THREE from 'three'
import React from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import {
  Physics,
  useSphere,
  useBox,
  usePointToPointConstraint,
  useConeTwistConstraint,
  useDistanceConstraint,
} from 'use-cannon'
import { niceColors } from 'nice-color-palettes'

const Link = ({ parentRef, ...props }) => {
  const chainSize = [0.15, 1, 0.15]

  const [ref, api] = useBox(() => ({
    mass: 1,
    linearDamping: 0.8,
    args: chainSize.map(s => s / 2),
    position: props.position,
  }))

  useConeTwistConstraint(parentRef, ref, {
    pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8,
  })

  return (
    <>
      <mesh ref={ref} {...props}>
        <cylinderBufferGeometry
          attach="geometry"
          args={[chainSize[0], chainSize[0], chainSize[1], 8]}></cylinderBufferGeometry>
        <meshStandardMaterial attach="material" />
      </mesh>
      {props.children && props.children(ref)}
    </>
  )
}

const ChainLink = React.forwardRef((props, ref) => {
  return <Link parentRef={ref} {...props} name={'link'} />
})

const Handle = props => {
  const [ref, api] = useSphere(() => ({ type: 'Static', args: 0.5, position: [0, 0, 0] }))

  useFrame(e => {
    api.position.set((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0)
  })

  useDistanceConstraint(ref, null, { distance: 1 })

  return (
    <group>
      <mesh ref={ref} position={props.position}>
        <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]}></sphereBufferGeometry>
        <meshStandardMaterial attach="material" />
      </mesh>
      {props.children && props.children(ref)}
    </group>
  )
}

const Chain = props => {
  return (
    <Handle>
      {ref => (
        <ChainLink ref={ref}>
          {ref => (
            <ChainLink ref={ref}>
              {ref => (
                <ChainLink ref={ref}>
                  {ref => (
                    <ChainLink ref={ref}>
                      {ref => (
                        <ChainLink ref={ref}>
                          {ref => (
                            <ChainLink ref={ref}>{ref => <ChainLink parentRef={ref}></ChainLink>}</ChainLink>
                          )}
                        </ChainLink>
                      )}
                    </ChainLink>
                  )}
                </ChainLink>
              )}
            </ChainLink>
          )}
        </ChainLink>
      )}
    </Handle>
  )
}

const ChainScene = () => {
  return (
    <Canvas shadowMap sRGB camera={{ position: [0, 5, 20], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        <Chain />
      </Physics>
    </Canvas>
  )
}

export default ChainScene
