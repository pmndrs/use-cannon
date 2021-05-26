import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function BoxTrigger({ onCollide, size, position }) {
  const [ref] = useBox(() => ({ isTrigger: true, args: size, position, onCollide }))
  return (
    <mesh castShadow ref={ref} position={position}>
      <boxBufferGeometry args={size} />
      <meshStandardMaterial wireframe color="green" />
    </mesh>
  )
}

function Ball() {
  const [ref] = useSphere(() => ({
    mass: 1,
    position: [0, 10, 0],
    args: 1,
  }))
  return (
    <mesh castShadow receiveShadow ref={ref}>
      <sphereBufferGeometry args={[1, 16, 16]} />
      <meshLambertMaterial color="white" />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[100, 100]} />
      <shadowMaterial color="#171717" />
    </mesh>
  )
}

export default () => {
  return (
    <Canvas shadows camera={{ position: [-10, 15, 5], material: { restitution: 10 }, fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.3} />
      <pointLight
        castShadow
        intensity={0.8}
        position={[100, 100, 100]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <OrbitControls />
      <Physics>
        <BoxTrigger
          onCollide={(e) => {
            console.log('Collision event on BoxTrigger', e)
          }}
          position={[0, 5, 0]}
          size={[4, 1, 4]}
        />
        <Ball />
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
      </Physics>
    </Canvas>
  )
}
