import * as THREE from 'three'
import React, { useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import {
  Physics,
  useBox,
  useSphere,
  usePlane,
  useDistanceConstraint,
  useConeTwistConstraint,
  useHingeConstraint,
  usePointToPointConstraint,
} from '../../../dist/index'
import lerp from 'lerp'
import create from 'zustand'
import mergeRefs from 'react-merge-refs'

const ragdollConfig = createRagdoll(5)

const [useStore] = create(set => ({
  bodies: [],
  addBody: ({ name, args, ref, api }) =>
    set(({ bodies }) => ({ bodies: [...bodies, { name, args, ref, api }] })),
  removeBody: name => set(({ bodies }) => ({ bodies: bodies.filter(body => body.name != name) })),
}))

const BodyPart = ({ parentRef, children = () => null, name, ...props }) => {
  const { args, mass, position } = ragdollConfig.shapes[name]

  const [rb, api] = useBox(() => ({ args, mass, position, linearDamping: 0.9 }))

  const { addBody, removeBody } = useStore()

  useEffect(() => {
    addBody({ name, ref: rb, api, args })
    return () => removeBody(name)
  }, [rb])

  // const [bodyA, bodyB] = useConeTwistConstraint(rb, parentRef, ragdollConfig.joints[name])
  const [bodyA, bodyB] = useDistanceConstraint(rb, parentRef, ragdollConfig.joints[name])

  const sizes = args.map(s => s * 2)

  return (
    <>
      <mesh ref={bodyA} {...props}>
        <boxBufferGeometry attach="geometry" args={sizes}></boxBufferGeometry>
        <meshStandardMaterial attach="material" />
      </mesh>
      {children(bodyA)}
    </>
  )
}

const RagdollBodyPart = React.forwardRef((props, ref) => <BodyPart parentRef={ref} {...props} />)

const Cursor = ({ position, ...props }) => {
  const [ref, api] = useSphere(() => ({ type: 'Static', args: 0.5, position }))
  const { bodies } = useStore()

  const [grabRef, setGrabRef] = useState(null)

  const [bodyA, bodyB, { enable, disable }] = usePointToPointConstraint(ref, grabRef, {
    pivotA: [0, 0, 0],
    pivotB: [0, 0, 0],
  })
  const [toggle, setToggle] = useState(true)

  useEffect(() => {
    toggle ? enable() : disable()
  }, [toggle])

  useEffect(() => {
    let grabbedBody = bodies.filter(body => body.name == 'head')
    if (grabbedBody.length) setGrabRef(grabbedBody[0].ref)
  }, [bodies])

  useFrame(e => {
    api.setPosition((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0)
  })

  return (
    <mesh ref={bodyA} {...props} onClick={() => setToggle(!toggle)}>
      <sphereBufferGeometry attach="geometry" args={[0.25, 64, 64]}></sphereBufferGeometry>
      <meshStandardMaterial attach="material" />
    </mesh>
  )
}

const Ragdoll = props => {
  return (
    <>
      <RagdollBodyPart name={'upperBody'}>
        {ref => (
          <>
            <RagdollBodyPart name={'head'} ref={ref} />
            <RagdollBodyPart name={'upperLeftArm'} ref={ref}>
              {upperLeftArm => <RagdollBodyPart name={'lowerLeftArm'} ref={upperLeftArm} />}
            </RagdollBodyPart>
            <RagdollBodyPart name={'upperRightArm'} ref={ref}>
              {upperRightArm => <RagdollBodyPart name={'lowerRightArm'} ref={upperRightArm} />}
            </RagdollBodyPart>
            <RagdollBodyPart name={'pelvis'} ref={ref}>
              {pelvis => (
                <>
                  <RagdollBodyPart name={'upperLeftLeg'} ref={pelvis}>
                    {upperLeftLeg => <RagdollBodyPart name={'lowerLeftLeg'} ref={upperLeftLeg} />}
                  </RagdollBodyPart>
                  <RagdollBodyPart name={'upperRightLeg'} ref={pelvis}>
                    {upperRightLeg => <RagdollBodyPart name={'lowerRightLeg'} ref={upperRightLeg} />}
                  </RagdollBodyPart>
                </>
              )}
            </RagdollBodyPart>
          </>
        )}
      </RagdollBodyPart>
    </>
  )
}

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
    <Canvas shadowMap sRGB camera={{ position: [0, 5, 20], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        <Cursor />
        <Ragdoll position={[0, 0, 0]} />
        <Plane position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </Physics>
    </Canvas>
  )
}

export default RagdollScene

function createRagdoll(scale, angleA = 0, angleB = 0, twistAngle = 0) {
  var shouldersDistance = 0.5 * scale,
    upperArmLength = 0.4 * scale,
    lowerArmLength = 0.4 * scale,
    upperArmSize = 0.2 * scale,
    lowerArmSize = 0.2 * scale,
    neckLength = 0.1 * scale,
    headRadius = 0.25 * scale,
    upperBodyLength = 0.6 * scale,
    pelvisLength = 0.4 * scale,
    upperLegLength = 0.5 * scale,
    upperLegSize = 0.2 * scale,
    lowerLegSize = 0.2 * scale,
    lowerLegLength = 0.5 * scale

  // Lower legs
  var lowerLeftLeg = {
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [-shouldersDistance / 2, lowerLegLength / 2, 0],
  }
  var lowerRightLeg = {
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [shouldersDistance / 2, lowerLegLength / 2, 0],
  }

  // Upper legs
  var upperLeftLeg = {
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [-shouldersDistance / 2, lowerLeftLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2, 0],
  }
  var upperRightLeg = {
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [shouldersDistance / 2, lowerRightLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2, 0],
  }

  // Pelvis
  var pelvis = {
    args: [shouldersDistance * 0.5, pelvisLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [0, upperLeftLeg.position[1] + upperLegLength / 2 + pelvisLength / 2, 0],
  }

  // Upper body
  var upperBody = {
    args: [shouldersDistance * 0.5, upperBodyLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [0, pelvis.position[1] + pelvisLength / 2 + upperBodyLength / 2, 0],
  }

  // Head
  var head = {
    args: [headRadius * 0.5, headRadius * 0.5, headRadius * 0.5],
    mass: 1,
    position: [0, upperBody.position[1] + upperBodyLength / 2 + headRadius + neckLength, 0],
  }

  // Upper arms
  var upperLeftArm = {
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: 1,
    position: [-shouldersDistance / 2 - upperArmLength / 2, upperBody.position[1] + upperBodyLength / 2, 0],
  }
  var upperRightArm = {
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: 1,
    position: [shouldersDistance / 2 + upperArmLength / 2, upperBody.position[1] + upperBodyLength / 2, 0],
  }

  // lower arms
  var lowerLeftArm = {
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [
      upperLeftArm.position[0] - lowerArmLength / 2 - upperArmLength / 2,
      upperLeftArm.position[1],
      0,
    ],
  }
  var lowerRightArm = {
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [
      upperRightArm.position[0] + lowerArmLength / 2 + upperArmLength / 2,
      upperRightArm.position[1],
      0,
    ],
  }

  // joints

  // Neck joint
  var neckJoint = {
    // bodyA: 'head',
    // bodyB: 'upperBody',
    pivotA: [0, -headRadius - neckLength / 2, 0],
    pivotB: [0, upperBodyLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Knee joints
  var leftKneeJoint = {
    // bodyA: 'lowerLeftLeg',
    // bodyB: 'upperLeftLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightKneeJoint = {
    // bodyA: 'lowerRightLeg',
    // bodyB: 'upperRightLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Hip joints
  var leftHipJoint = {
    // bodyA: 'upperLeftLeg',
    // bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [-shouldersDistance / 2, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightHipJoint = {
    // bodyA: 'upperRightLeg',
    // bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [shouldersDistance / 2, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Spine
  var spineJoint = {
    // bodyA: 'pelvis',
    // bodyB: 'upperBody',
    pivotA: [0, pelvisLength / 2, 0],
    pivotB: [0, -upperBodyLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Shoulders
  var leftShoulder = {
    // bodyA: 'upperBody',
    // bodyB: 'upperLeftArm',
    pivotA: [-shouldersDistance / 2, upperBodyLength / 2, 0],
    pivotB: [upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
  }
  var rightShoulder = {
    // bodyA: 'upperBody',
    // bodyB: 'upperRightArm',
    pivotA: [shouldersDistance / 2, upperBodyLength / 2, 0],
    pivotB: [-upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
    twistAngle: twistAngle,
  }

  // Elbow joint
  var leftElbowJoint = {
    // bodyA: 'lowerLeftArm',
    // bodyB: 'upperLeftArm',
    pivotA: [lowerArmLength / 2, 0, 0],
    pivotB: [-upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightElbowJoint = {
    // bodyA: 'lowerRightArm',
    // bodyB: 'upperRightArm',
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
