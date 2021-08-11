import type { Triplet } from '@react-three/cannon'

const jointNames = [
  'neckJoint',
  'leftKneeJoint',
  'rightKneeJoint',
  'leftHipJoint',
  'rightHipJoint',
  'spineJoint',
  'leftShoulder',
  'rightShoulder',
  'leftElbowJoint',
  'rightElbowJoint',
]

const shapeNames = [
  'lowerLeftLeg',
  'lowerRightLeg',
  'upperLeftLeg',
  'upperRightLeg',
  'pelvis',
  'upperBody',
  'head',
  'upperLeftArm',
  'upperRightArm',
  'lowerLeftArm',
  'lowerRightArm',
] as const

export type ShapeName = typeof shapeNames[number]
export type JointName = typeof jointNames[number]

type JointConfig = {
  bodyA: string
  bodyB: string
  pivotA: Triplet
  pivotB: Triplet
  axisA: Triplet
  axisB: Triplet
  angle: number
  twistAngle?: number
}
type ShapeConfig = {
  args: Triplet
  color: string
  mass: number
  position: Triplet
}

type RagdollConfig = {
  joints: Record<JointName, JointConfig>
  shapes: Record<ShapeName, ShapeConfig>
}

// Converted from the createRagdoll method in CANNON js ragdoll demo
export function createRagdoll(scale: number, angleA = 0, angleB = 0, twistAngle = 0): RagdollConfig {
  const shouldersDistance = 0.45 * scale,
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
  const lowerLeftLeg: ShapeConfig = {
    color: 'lightblue',
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [-shouldersDistance / 3, lowerLegLength / 2, 0],
  }
  const lowerRightLeg: ShapeConfig = {
    color: 'lightblue',
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [shouldersDistance / 3, lowerLegLength / 2, 0],
  }

  // Upper legs
  const upperLeftLeg: ShapeConfig = {
    color: 'lightblue',
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [-shouldersDistance / 3, lowerLeftLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2, 0],
  }
  const upperRightLeg: ShapeConfig = {
    color: 'lightblue',
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [shouldersDistance / 3, lowerRightLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2, 0],
  }

  // Pelvis
  const pelvis: ShapeConfig = {
    color: 'lightblue',
    args: [shouldersDistance * 0.5, pelvisLength * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [0, upperLeftLeg.position[1] + upperLegLength / 2 + pelvisLength / 2, 0],
  }

  // Upper body
  const upperBody: ShapeConfig = {
    color: 'indianred',
    args: [shouldersDistance * 0.5, upperBodyLength * 0.5, lowerArmSize * 0.75],
    mass: scale,
    position: [0, pelvis.position[1] + pelvisLength / 2 + upperBodyLength / 2, 0],
  }

  // Head
  const head: ShapeConfig = {
    color: 'lightpink',
    args: [headRadius * 0.6, headRadius * 0.7, headRadius * 0.6],
    mass: scale,
    position: [0, upperBody.position[1] + upperBodyLength / 2 + headRadius / 2 + neckLength, 0],
  }

  // Upper arms
  const upperLeftArm: ShapeConfig = {
    color: 'indianred',
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: scale,
    position: [-shouldersDistance / 2 - upperArmLength / 2, upperBody.position[1] + upperBodyLength / 2, 0],
  }
  const upperRightArm: ShapeConfig = {
    color: 'indianred',
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: scale,
    position: [shouldersDistance / 2 + upperArmLength / 2, upperBody.position[1] + upperBodyLength / 2, 0],
  }

  // lower arms
  const lowerLeftArm: ShapeConfig = {
    color: 'lightpink',
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: scale,
    position: [
      upperLeftArm.position[0] - lowerArmLength / 2 - upperArmLength / 2,
      upperLeftArm.position[1],
      0,
    ],
  }
  const lowerRightArm: ShapeConfig = {
    color: 'lightpink',
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
  const neckJoint: JointConfig = {
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
  const leftKneeJoint: JointConfig = {
    bodyA: 'lowerLeftLeg',
    bodyB: 'upperLeftLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  const rightKneeJoint: JointConfig = {
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
  const leftHipJoint: JointConfig = {
    bodyA: 'upperLeftLeg',
    bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [-shouldersDistance / 3, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  const rightHipJoint: JointConfig = {
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
  const spineJoint: JointConfig = {
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
  const leftShoulder: JointConfig = {
    bodyA: 'upperBody',
    bodyB: 'upperLeftArm',
    pivotA: [upperArmLength / 2, 0, 0],
    pivotB: [-shouldersDistance / 2, upperBodyLength / 2, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
  }
  const rightShoulder: JointConfig = {
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
  const leftElbowJoint: JointConfig = {
    bodyA: 'lowerLeftArm',
    bodyB: 'upperLeftArm',
    pivotA: [lowerArmLength / 2, 0, 0],
    pivotB: [-upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  const rightElbowJoint: JointConfig = {
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
