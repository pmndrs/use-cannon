import * as THREE from 'three'
import React from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Physics, useSphere, useBox, usePointToPointConstraint } from '../../../dist/index'

const Link = ({ parentRef, ...props }) => {
  const chainSize = [0.5, 1, 0.5]

  const [ref, api] = useBox(() => ({
    mass: 1,
    linearDamping: 0.8,
    args: chainSize.map(s => s / 2),
    position: props.position,
  }))

  const [bodyA, bodyB] = usePointToPointConstraint(parentRef, ref, {
    pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
  })

  return (
    <>
      <mesh ref={bodyB} {...props}>
        <boxBufferGeometry attach="geometry" args={chainSize}></boxBufferGeometry>
        <meshStandardMaterial attach="material" />
      </mesh>
      {props.children && props.children(bodyB)}
    </>
  )
}

const ChainLink = React.forwardRef((props, ref) => {
  return <Link parentRef={ref} {...props} name={'link'} />
})

const Handle = props => {
  const [handle, api] = useSphere(() => ({ type: 'Static', mass: 0, args: 0.5, position: [0, 0, 0] }))

  useFrame(e => {
    api.setPosition((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0)
  })

  const [bodyA, bodyB] = usePointToPointConstraint(handle, null, {
    pivotA: [0, 0, 0],
    pivotB: [0, 0, 0],
  })

  return (
    <group>
      <mesh ref={bodyA} position={props.position}>
        <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]}></sphereBufferGeometry>
        <meshStandardMaterial attach="material" />
      </mesh>
      {props.children && props.children(handle)}
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

const Test = () => {
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

export default Test
