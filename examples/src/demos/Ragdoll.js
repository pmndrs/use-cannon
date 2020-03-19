import * as THREE from 'three'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, extend } from 'react-three-fiber'
import {
  Physics,
  useBox,
  useSphere,
  usePlane,
  useConeTwistConstraint,
  usePointToPointConstraint,
} from 'use-cannon'
import lerp from 'lerp'
import create from 'zustand'

// Cong our Ragdoll
const ragdollConfig = createRagdoll(5, Math.PI / 16, Math.PI / 16, 0)

// Setup a store to access our bodies
const [useStore] = create(set => ({
  bodies: [],
  addBody: (uuid, ref, methods) =>
    set(({ bodies }) =>
      //!console.log('adding ' + ref.current.name) &&
      ({
        bodies: [...bodies.filter(body => body.uuid != uuid), { uuid, ref, ...methods }],
      })
    ),
  removeBody: uuid => set(({ bodies }) => ({ bodies: bodies.filter(body => body.uuid != uuid) })),
}))

// Body part component
const BodyPart = React.forwardRef(({ children = () => null, type, name, ...props }, ref) => {
  const shape = ragdollConfig.shapes[name]
  const { args, mass, position } = shape

  const [thisbody, api] = useBox(() => ({
    ref,
    type,
    args,
    mass,
    position,
    linearDamping: 0.9,
  }))

  const sizes = args.map(s => s * 2)

  const { addBody, removeBody, bodies } = useStore()

  useEffect(() => {
    if (thisbody && thisbody.current) {
      const uuid = thisbody.current.uuid
      addBody(uuid, thisbody)
      return () => removeBody(uuid)
    }
  }, [thisbody])

  return (
    <>
      <mesh ref={thisbody} {...props} name={name}>
        <boxBufferGeometry attach="geometry" args={sizes}></boxBufferGeometry>
        <meshNormalMaterial attach="material" />
      </mesh>
      {children(thisbody)}
    </>
  )
})

// A container that sets up a joint between the parent and child
const BodyPartConstraint = React.forwardRef(({ jointConfig, ...props }, parent) => {
  let config = ragdollConfig.joints[jointConfig]

  const [child] = useConeTwistConstraint(null, parent, config)

  return <BodyPart ref={child} {...props} />
})

// Base Ragdoll Component
const Ragdoll = React.forwardRef(({ ...props }, ref) => {
  return (
    <BodyPart ref={ref} name={'upperBody'} {...props}>
      {ref => (
        <>
          <BodyPartConstraint {...props} name={'head'} ref={ref} jointConfig={'neckJoint'} />
          <BodyPartConstraint {...props} name={'upperLeftArm'} ref={ref} jointConfig={'leftShoulder'}>
            {upperLeftArm => (
              <BodyPartConstraint
                {...props}
                name={'lowerLeftArm'}
                ref={upperLeftArm}
                jointConfig={'leftElbowJoint'}
              />
            )}
          </BodyPartConstraint>
          <BodyPartConstraint {...props} name={'upperRightArm'} ref={ref} jointConfig={'rightShoulder'}>
            {upperRightArm => (
              <BodyPartConstraint
                {...props}
                name={'lowerRightArm'}
                ref={upperRightArm}
                jointConfig={'rightElbowJoint'}>
                {ref => <Cursor ref={ref} />}
              </BodyPartConstraint>
            )}
          </BodyPartConstraint>
          <BodyPartConstraint {...props} name={'pelvis'} ref={ref} jointConfig={'spineJoint'}>
            {pelvis => (
              <>
                <BodyPartConstraint
                  {...props}
                  name={'upperLeftLeg'}
                  ref={pelvis}
                  jointConfig={'leftHipJoint'}>
                  {upperLeftLeg => (
                    <BodyPartConstraint
                      {...props}
                      name={'lowerLeftLeg'}
                      ref={upperLeftLeg}
                      jointConfig={'leftKneeJoint'}
                    />
                  )}
                </BodyPartConstraint>
                <BodyPartConstraint
                  {...props}
                  name={'upperRightLeg'}
                  ref={pelvis}
                  jointConfig={'rightHipJoint'}>
                  {upperRightLeg => (
                    <BodyPartConstraint
                      {...props}
                      name={'lowerRightLeg'}
                      ref={upperRightLeg}
                      jointConfig={'rightKneeJoint'}
                    />
                  )}
                </BodyPartConstraint>
              </>
            )}
          </BodyPartConstraint>
        </>
      )}
    </BodyPart>
  )
})

const useWindowEvent = (event, callback) => {
  useEffect(() => {
    window.addEventListener(event, callback)
    return () => window.removeEventListener(event, callback)
  }, [event, callback])
}

// Mouse grabber...
const Cursor = React.forwardRef(({ position = [0, 0, 10000], ...props }, parent) => {
  const [ref, api] = useSphere(() => ({ type: 'Static', args: [0.25], position }))

  const [_, __, { enable, disable }] = usePointToPointConstraint(ref, parent, {
    pivotA: [0, 0, 0],
    pivotB: [0, 0, 0],
  })
  const [toggle, setToggle] = useState(false)

  useEffect(() => {
    toggle ? enable() : disable()
  }, [toggle])

  useFrame(e => {
    api.position.set((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0)
  })

  // const handleClick = useCallback(e => !console.log(e) && setToggle(!toggle), [toggle])

  useWindowEvent('click', () => setToggle(!toggle))

  return (
    <mesh ref={ref} {...props}>
      <sphereBufferGeometry attach="geometry" args={[0.25, 64, 64]}></sphereBufferGeometry>
      <meshStandardMaterial attach="material" />
    </mesh>
  )
})

function Plane(props) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[100, 100]} />
      <meshBasicMaterial attach="material" color="#171720" />
    </mesh>
  )
}

const RagdollScene = () => {
  return (
    <Canvas shadowMap sRGB camera={{ position: [0, 10, 30], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -50, 0]} allowSleep={false}>
        <Ragdoll position={[0, 0, 0]} />
        <Plane position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </Physics>
    </Canvas>
  )
}

export default RagdollScene

// Converted from the createRagdoll method in CANNON js ragdoll demo
function createRagdoll(scale, angleA = 0, angleB = 0, twistAngle = 0) {
  var shouldersDistance = 0.45 * scale,
    upperArmLength = 0.4 * scale,
    lowerArmLength = 0.4 * scale,
    upperArmSize = 0.15 * scale,
    lowerArmSize = 0.15 * scale,
    neckLength = 0.1 * scale,
    headRadius = 0.2 * scale,
    upperBodyLength = 0.6 * scale,
    pelvisLength = 0.2 * scale,
    upperLegLength = 0.5 * scale,
    upperLegSize = 0.15 * scale,
    lowerLegSize = 0.15 * scale,
    lowerLegLength = 0.5 * scale

  // Lower legs
  var lowerLeftLeg = {
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [-shouldersDistance / 3, lowerLegLength / 2, 0],
  }
  var lowerRightLeg = {
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [shouldersDistance / 3, lowerLegLength / 2, 0],
  }

  // Upper legs
  var upperLeftLeg = {
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [-shouldersDistance / 3, lowerLeftLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2, 0],
  }
  var upperRightLeg = {
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [shouldersDistance / 3, lowerRightLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2, 0],
  }

  // Pelvis
  var pelvis = {
    args: [shouldersDistance * 0.5, pelvisLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [0, upperLeftLeg.position[1] + upperLegLength / 2 + pelvisLength / 2, 0],
  }

  // Upper body
  var upperBody = {
    args: [shouldersDistance * 0.5, upperBodyLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [0, pelvis.position[1] + pelvisLength / 2 + upperBodyLength / 2, 0],
  }

  // Head
  var head = {
    args: [headRadius * 0.5, headRadius * 0.5, headRadius * 0.5],
    mass: scale,
    position: [0, upperBody.position[1] + upperBodyLength / 2 + headRadius / 2 + neckLength, 0],
  }

  // Upper arms
  var upperLeftArm = {
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: scale,
    position: [-shouldersDistance / 2 - upperArmLength / 2, upperBody.position[1] + upperBodyLength / 2, 0],
  }
  var upperRightArm = {
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: scale,
    position: [shouldersDistance / 2 + upperArmLength / 2, upperBody.position[1] + upperBodyLength / 2, 0],
  }

  // lower arms
  var lowerLeftArm = {
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [
      upperLeftArm.position[0] - lowerArmLength / 2 - upperArmLength / 2,
      upperLeftArm.position[1],
      0,
    ],
  }
  var lowerRightArm = {
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [
      upperRightArm.position[0] + lowerArmLength / 2 + upperArmLength / 2,
      upperRightArm.position[1],
      0,
    ],
  }

  // joints

  // Neck joint
  var neckJoint = {
    bodyA: 'head',
    bodyB: 'upperBody',
    pivotA: [0, -headRadius - neckLength / 2, 0],
    pivotB: [0, upperBodyLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Knee joints
  var leftKneeJoint = {
    bodyA: 'lowerLeftLeg',
    bodyB: 'upperLeftLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightKneeJoint = {
    bodyA: 'lowerRightLeg',
    bodyB: 'upperRightLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Hip joints
  var leftHipJoint = {
    bodyA: 'upperLeftLeg',
    bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [-shouldersDistance / 3, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightHipJoint = {
    bodyA: 'upperRightLeg',
    bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [shouldersDistance / 3, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Spine
  var spineJoint = {
    bodyA: 'pelvis',
    bodyB: 'upperBody',
    pivotA: [0, pelvisLength / 2, 0],
    pivotB: [0, -upperBodyLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Shoulders
  var leftShoulder = {
    bodyA: 'upperBody',
    bodyB: 'upperLeftArm',
    pivotA: [upperArmLength / 2, 0, 0],
    pivotB: [-shouldersDistance / 2, upperBodyLength / 2, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
  }
  var rightShoulder = {
    bodyA: 'upperBody',
    bodyB: 'upperRightArm',
    pivotA: [-upperArmLength / 2, 0, 0],
    pivotB: [shouldersDistance / 2, upperBodyLength / 2, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
    twistAngle: twistAngle,
  }

  // Elbow joint
  var leftElbowJoint = {
    bodyA: 'lowerLeftArm',
    bodyB: 'upperLeftArm',
    pivotA: [lowerArmLength / 2, 0, 0],
    pivotB: [-upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightElbowJoint = {
    bodyA: 'lowerRightArm',
    bodyB: 'upperRightArm',
    pivotA: [-lowerArmLength / 2, 0, 0],
    pivotB: [upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  return {
    shapes: {
      lowerLeftLeg,
      lowerRightLeg,
      upperLeftLeg,
      upperRightLeg,
      pelvis,
      upperBody,
      head,
      upperLeftArm,
      upperRightArm,
      lowerLeftArm,
      lowerRightArm,
    },
    joints: {
      neckJoint,
      leftKneeJoint,
      rightKneeJoint,
      leftHipJoint,
      rightHipJoint,
      spineJoint,
      leftShoulder,
      rightShoulder,
      leftElbowJoint,
      rightElbowJoint,
    },
  }
}
