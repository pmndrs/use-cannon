import type { BoxProps, PlaneProps } from '@react-three/cannon'
import { Physics, useBox, useContactMaterial, usePlane } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Mesh } from 'three'

const materialColors = {
  bouncy: 'yellow',
  box: '#BB8E51',
  ground: '#9b7653',
  rubber: 'darkgrey',
  slippery: 'royalblue',
} as const

const materialNames = ['bouncy', 'box', 'ground', 'rubber', 'slippery'] as const

const style = {
  color: 'white',
  fontSize: '1.2em',
  left: 50,
  position: 'absolute',
  top: 20,
} as const

const bouncyMaterial = {
  name: 'bouncy',
  /*
  Restitution for this material.
  If non-negative, it will be used instead of the restitution given by ContactMaterials.
  If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
  */
  restitution: 1.1,
}

const boxMaterial = 'box'

const groundMaterial = 'ground'

/*
Setting the friction on both materials prevents overriding the friction given by ContactMaterials.
Since we want rubber to not be slippery we do not set this here and instead use a ContactMaterial.
See https://github.com/pmndrs/cannon-es/blob/e9f1bccd8caa250cc6e6cdaf85389058e1c9238e/src/world/World.ts#L661-L673
*/
const rubberMaterial = 'rubber'

const slipperyMaterial = {
  /*
  Friction for this material.
  If non-negative, it will be used instead of the friction given by ContactMaterials.
  If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
  */
  friction: 0,
  name: 'slippery',
}

const Box = ({ args, color = 'white', ...props }: BoxProps & { color?: string }) => {
  const [ref] = useBox(
    () => ({
      args,
      mass: 10,
      ...props,
    }),
    useRef<Mesh>(null),
  )
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry args={args} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}

const Plane = (props: PlaneProps) => {
  const [ref] = usePlane(() => ({ ...props }), useRef<Mesh>(null))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[100, 100]} />
      <meshStandardMaterial color={materialColors.ground} />
    </mesh>
  )
}

const useContactMaterials = (rubberSlips: boolean) => {
  useContactMaterial(groundMaterial, groundMaterial, {
    contactEquationRelaxation: 3,
    contactEquationStiffness: 1e8,
    friction: 0.4,
    frictionEquationStiffness: 1e8,
    restitution: 0.3,
  })

  useContactMaterial(boxMaterial, groundMaterial, {
    contactEquationRelaxation: 3,
    contactEquationStiffness: 1e8,
    friction: 0.4,
    frictionEquationStiffness: 1e8,
    restitution: 0.3,
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
}

function PhysicsContent() {
  const [rubberSlips, setRubberSlips] = useState(false)
  const toggleRubberSlips = () => setRubberSlips(!rubberSlips)

  useContactMaterials(rubberSlips)

  return (
    <group onPointerMissed={toggleRubberSlips} onPointerUp={toggleRubberSlips}>
      <Box material={bouncyMaterial} position={[-7, 2, -2]} color={materialColors.bouncy} />
      <Box material={boxMaterial} position={[-7, 2, 0]} color={materialColors.box} />
      <Box material={rubberMaterial} position={[-7, 2, 2]} color={materialColors.rubber} />
      <Box material={slipperyMaterial} position={[-7, 2, 4]} color={materialColors.slippery} />
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
    <div style={style}>
      <pre>
        * Gravity is aiming to the right
        <br />
        Click to toggle rubber slipping on slipper material
        <br />
        Materials:
        {materialNames.map((name, key) => (
          <div key={key}>
            <span style={{ color: materialColors[name] }}> - {name}</span>
          </div>
        ))}
      </pre>
    </div>
  </>
)
