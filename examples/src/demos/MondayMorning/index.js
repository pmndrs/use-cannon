import React, {
  Suspense,
  createRef,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { Canvas, useFrame, useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import {
  Physics,
  useBox,
  useCylinder,
  useSphere,
  usePlane,
  useConeTwistConstraint,
  usePointToPointConstraint,
} from 'use-cannon'
import { createRagdoll } from './createConfig'

const config = createRagdoll(4.8, Math.PI / 16, Math.PI / 16, 0)
const context = createContext()
const cursor = createRef()

const BodyPart = React.forwardRef(({ children, render, type, name, ...props }, ref) => {
  const { color, args, mass, position } = config.shapes[name]
  const [thisbody] = useBox(() => ({ ref, type, mass, args, position, linearDamping: 0.9 }))
  const sizes = useMemo(() => args.map(s => s * 2), [args])
  return (
    <context.Provider value={thisbody}>
      <mesh castShadow receiveShadow ref={thisbody} {...props} name={name}>
        <boxBufferGeometry attach="geometry" args={sizes} />
        <meshStandardMaterial attach="material" color={color} />
        {render}
      </mesh>
      {children}
    </context.Provider>
  )
})

function useDragConstraint(child) {
  const [, , api] = usePointToPointConstraint(cursor, child, { pivotA: [0, 0, 0], pivotB: [0, 0, 0] })
  useEffect(() => void api.disable(), [])
  const onPointerUp = useCallback(e => api.disable(), [])
  const onPointerDown = useCallback(e => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    api.enable()
  }, [])
  return { onPointerUp, onPointerDown }
}

const BodyPartConstraint = ({ config, ...props }) => {
  const parent = useContext(context)
  const [child] = useConeTwistConstraint(null, parent, config)
  const bind = useDragConstraint(child)
  return <BodyPart ref={child} {...props} {...bind} />
}

// Base Ragdoll Component
function Ragdoll(props) {
  const mouth = useRef()
  const eyes = useRef()
  const [, api] = useSphere(() => ({ ref: cursor, type: 'Static', args: [0.25], position: [0, 0, 10000] }))
  useFrame(e => {
    eyes.current.position.y = Math.sin(e.clock.getElapsedTime() * 2) * 0.1
    mouth.current.scale.y = Math.sin(e.clock.getElapsedTime()) * 6
    const x = (e.mouse.x * e.viewport.width) / e.camera.zoom
    const y = (e.mouse.y * e.viewport.height) / e.camera.zoom / 1.9 + -x / 3.5
    api.position.set(x / 1.4, y, 0)
  })
  return (
    <BodyPartConstraint name={'upperBody'} {...props}>
      <BodyPartConstraint
        {...props}
        name={'head'}
        config={config.joints['neckJoint']}
        render={
          <>
            <group ref={eyes}>
              <Box
                position={[-0.35, 0.2, 0.55]}
                args={[0.3, 0.01, 0.1]}
                color="black"
                transparent
                opacity={0.8}
              />
              <Box
                position={[0.35, 0.2, 0.55]}
                args={[0.3, 0.01, 0.1]}
                color="black"
                transparent
                opacity={0.8}
              />
            </group>
            <Box
              ref={mouth}
              position={[0, -0.4, 0.55]}
              args={[0.3, 0.05, 0.1]}
              color="#270000"
              transparent
              opacity={0.8}
            />
          </>
        }
      />
      <BodyPartConstraint {...props} name={'upperLeftArm'} config={config.joints['leftShoulder']}>
        <BodyPartConstraint {...props} name={'lowerLeftArm'} config={config.joints['leftElbowJoint']} />
      </BodyPartConstraint>
      <BodyPartConstraint {...props} name={'upperRightArm'} config={config.joints['rightShoulder']}>
        <BodyPartConstraint {...props} name={'lowerRightArm'} config={config.joints['rightElbowJoint']} />
      </BodyPartConstraint>
      <BodyPartConstraint {...props} name={'pelvis'} config={config.joints['spineJoint']}>
        <BodyPartConstraint {...props} name={'upperLeftLeg'} config={config.joints['leftHipJoint']}>
          <BodyPartConstraint {...props} name={'lowerLeftLeg'} config={config.joints['leftKneeJoint']} />
        </BodyPartConstraint>
        <BodyPartConstraint {...props} name={'upperRightLeg'} config={config.joints['rightHipJoint']}>
          <BodyPartConstraint {...props} name={'lowerRightLeg'} config={config.joints['rightKneeJoint']} />
        </BodyPartConstraint>
      </BodyPartConstraint>
    </BodyPartConstraint>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshStandardMaterial attach="material" color="#171720" />
    </mesh>
  )
}

const Box = React.forwardRef(
  ({ transparent = false, opacity = 1, color = 'white', args = [1, 1, 1], ...props }, ref) => {
    return (
      <mesh receiveShadow castShadow ref={ref} {...props}>
        <boxBufferGeometry attach="geometry" args={args} />
        <meshStandardMaterial attach="material" color={color} transparent={transparent} opacity={opacity} />
      </mesh>
    )
  }
)

function Chair() {
  const [back] = useBox(() => ({
    type: 'Static',
    position: [-5 + 0, -0.5, -1.25],
    scale: [3, 3, 0.5],
    args: [1.5, 1.5, 0.25],
  }))
  const [seat] = useBox(() => ({
    type: 'Static',
    position: [-5 + 0, -2.25, 0],
    scale: [3, 0.5, 3],
    args: [1.5, 0.25, 1.5],
  }))
  const [leg1] = useBox(() => ({
    type: 'Static',
    position: [-5 + -1.25, -4, 1.25],
    scale: [0.5, 3, 0.5],
    args: [0.25, 1.5, 0.25],
  }))
  const [leg2] = useBox(() => ({
    type: 'Static',
    position: [-5 + 1.25, -4, 1.25],
    scale: [0.5, 3, 0.5],
    args: [0.25, 1.5, 0.25],
  }))
  const [leg3] = useBox(() => ({
    type: 'Static',
    position: [-5 + -1.25, -4, -1.25],
    scale: [0.5, 3, 0.5],
    args: [0.25, 1.5, 0.25],
  }))
  const [leg4] = useBox(() => ({
    type: 'Static',
    position: [-5 + 1.25, -4, -1.25],
    scale: [0.5, 3, 0.5],
    args: [0.25, 1.5, 0.25],
  }))
  return (
    <>
      <Box ref={back} />
      <Box ref={seat} />
      <Box ref={leg1} />
      <Box ref={leg2} />
      <Box ref={leg3} />
      <Box ref={leg4} />
    </>
  )
}

//radiusTop, radiusBottom, height, numSegments
function Mug() {
  const { nodes, materials } = useLoader(GLTFLoader, '/cup.glb')
  const [cup] = useCylinder(() => ({
    mass: 1,
    rotation: [Math.PI / 2, 0, 0],
    position: [9, 0, 0],
    args: [0.6, 0.6, 1, 16],
  }))
  const bind = useDragConstraint(cup)
  return (
    <group ref={cup} {...bind} dispose={null}>
      <group scale={[0.01, 0.01, 0.01]}>
        <mesh
          receiveShadow
          castShadow
          material={materials['default']}
          geometry={nodes['buffer-0-mesh-0_0'].geometry}
        />
        <mesh
          receiveShadow
          castShadow
          material={materials.Liquid}
          geometry={nodes['buffer-0-mesh-0_1'].geometry}
        />
      </group>
    </group>
  )
}

function Table() {
  const [seat] = useBox(() => ({
    type: 'Static',
    position: [9 + 0, -0.8, 0],
    scale: [5, 0.5, 5],
    args: [2.5, 0.25, 2.5],
  }))
  const [leg1] = useBox(() => ({
    type: 'Static',
    position: [9 + -1.8, -3, 1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg2] = useBox(() => ({
    type: 'Static',
    position: [9 + 1.8, -3, 1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg3] = useBox(() => ({
    type: 'Static',
    position: [9 + -1.8, -3, -1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg4] = useBox(() => ({
    type: 'Static',
    position: [9 + 1.8, -3, -1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  return (
    <>
      <Box ref={seat} />
      <Box ref={leg1} />
      <Box ref={leg2} />
      <Box ref={leg3} />
      <Box ref={leg4} />
      <Suspense fallback={null}>
        <Mug />
      </Suspense>
    </>
  )
}

const Lamp = () => {
  const light = useRef()
  const [fixed] = useSphere(() => ({ type: 'Static', args: 1, position: [0, 16, 0] }))
  const [lamp] = useBox(() => ({
    mass: 1,
    args: [1, 0, 5, 1],
    linearDamping: 0.9,
    angulardamping: 1.99,
    position: [0, 16, 0],
  }))
  usePointToPointConstraint(fixed, lamp, { pivotA: [0, 0, 0], pivotB: [0, 2, 0] })
  const bind = useDragConstraint(lamp)
  return (
    <>

      <mesh ref={lamp} {...bind}>
        <coneBufferGeometry attach="geometry" args={[2, 2.5, 32]} />
        <meshStandardMaterial attach="material" />
        <pointLight intensity={10} distance={5} />
        <spotLight ref={light} position={[0, 20, 0]} angle={0.4} penumbra={1} intensity={0.6} castShadow />
      </mesh>
    </>
  )
}

export default () => (
  <Canvas sRGB shadowMap orthographic camera={{ position: [-25, 20, 25], zoom: 25, near: 1, far: 100 }}>
    <color attach="background" args={['#171720']} />
    <fog attach="fog" args={['#171720', 20, 70]} />
    <ambientLight intensity={0.2} />
    <pointLight position={[-10, -10, -10]} color="red" intensity={1.5} />
    <Physics iterations={15} gravity={[0, -200, 0]} allowSleep={false}>
      <Ragdoll position={[0, 0, 0]} />
      <Plane position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <Chair />
      <Table />
      <Lamp />
    </Physics>
  </Canvas>
)
