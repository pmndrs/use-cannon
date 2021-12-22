import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { BoxProps, PlaneProps, Triplet } from '@react-three/cannon'
import { Physics, useContactMaterial, usePlane, useBox } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'

const materialColors = {
  ground: '#9b7653',
  slippery: 'royalblue',
  rubber: 'darkgrey',
  bouncy: 'yellow',
  box: '#BB8E51',
} as const

function Box({ color = 'white', ...props }: { color?: string } & BoxProps) {
  const boxSize: Triplet = props.args || [1, 1, 1]
  const [ref] = useBox(() => ({
    args: boxSize,
    mass: 10,
    ...props,
  }))
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry args={boxSize} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}

function Plane(props: PlaneProps) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[100, 100]} />
      <meshStandardMaterial color={materialColors.ground} />
    </mesh>
  )
}

function PhysicsContent() {
  const [rubberSlips, setRubberSlips] = useState(false)

  const boxMaterial = 'box'
  const groundMaterial = {
    name: 'ground',
  }
  const slipperyMaterial = {
    name: 'slippery',
    /*
    Friction for this material.
    If non-negative, it will be used instead of the friction given by ContactMaterials.
    If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
    */
    friction: 0,
  }
  const rubberMaterial = {
    name: 'rubber',
    /*
    Setting the friction on both materials prevents overriding the friction given by ContactMaterials.
    Since we want rubber to not be slippery we do not set this here and instead use a ContactMaterial.
    See https://github.com/pmndrs/cannon-es/blob/e9f1bccd8caa250cc6e6cdaf85389058e1c9238e/src/world/World.ts#L661-L673
    */
    // friction: 0.9,
  }
  const bouncyMaterial = {
    name: 'bouncy',
    /*
    Restitution for this material.
    If non-negative, it will be used instead of the restitution given by ContactMaterials.
    If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
    */
    restitution: 1.1,
  }

  useContactMaterial(groundMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
  })
  useContactMaterial(boxMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
  })

  useContactMaterial(boxMaterial, slipperyMaterial, {
    friction: 0,
    restitution: 0.3,
  })
  useContactMaterial(groundMaterial, slipperyMaterial, {
    friction: 0,
    restitution: 0.3,
  })
  useContactMaterial(slipperyMaterial, slipperyMaterial, {
    friction: 0.1,
    restitution: 0.3,
  })

  useContactMaterial(bouncyMaterial, slipperyMaterial, {
    friction: 0,
    restitution: 0.5,
  })
  useContactMaterial(bouncyMaterial, groundMaterial, {
    restitution: 0.9,
  })
  useContactMaterial(bouncyMaterial, bouncyMaterial, {
    restitution: 10.0, // This does nothing because bouncyMaterial already has a restitution
  })

  useContactMaterial(
    rubberMaterial,
    slipperyMaterial,
    {
      friction: rubberSlips ? 0 : 1,
      restitution: 0.3,
    },
    [rubberSlips],
  )
  useContactMaterial(rubberMaterial, bouncyMaterial, {
    restitution: 0.5,
  })

  return (
    <group
      onPointerUp={() => {
        setRubberSlips((prev) => !prev)
      }}
    >
      {/* Objects */}
      <Box material={bouncyMaterial} position={[-7, 2, -2]} color={materialColors.bouncy} />
      <Box material={boxMaterial} position={[-7, 2, 0]} color={materialColors.box} />
      <Box material={rubberMaterial} position={[-7, 2, 2]} color={materialColors.rubber} />
      <Box material={slipperyMaterial} position={[-7, 2, 4]} color={materialColors.slippery} />
      {/* Floors */}
      <Box
        material={slipperyMaterial}
        position={[-6, 1, 0]}
        color={materialColors.slippery}
        args={[4, 0.1, 10]}
        type="Static"
      />
      <Box
        material={bouncyMaterial}
        position={[-2, 0.1, 0]}
        color={materialColors.bouncy}
        args={[4, 0.1, 10]}
        type="Static"
      />
      <Box
        material={rubberMaterial}
        position={[15, 0.01, 0]}
        color={materialColors.rubber}
        args={[20, 0.1, 10]}
        type="Static"
      />
      <Plane material={groundMaterial} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

export default () => (
  <>
    <Canvas shadows camera={{ position: [-5, 3, 8] }}>
      <OrbitControls />
      <pointLight position={[1, 2, 3]} castShadow />
      <ambientLight intensity={0.2} />
      <Physics gravity={[3, -9.81, 0]}>
        <PhysicsContent />
      </Physics>
    </Canvas>
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 50,
        color: 'white',
        fontSize: '1.2em',
      }}
    >
      <pre>
        * Gravity is aiming to the right
        <br />
        Click to toggle rubber slipping on slipper material
        <br />
        Materials:
        {Object.keys(materialColors).map((name) => (
          <div key={name}>
            <span style={{ color: materialColors[name as keyof typeof materialColors] }}>- {name}</span>
          </div>
        ))}
      </pre>
    </div>
  </>
)
