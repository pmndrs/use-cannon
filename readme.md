![Imgur](https://imgur.com/FpBsJPL.jpg)

<br/>

    yarn add use-cannon

Live demo: https://codesandbox.io/s/r3f-cannon-instanced-physics-g1s88

Experimental web-worker based React hooks for cannon (using [cannon-es](https://github.com/drcmda/cannon-es)) in combination with [react-three-fiber](https://github.com/react-spring/react-three-fiber). Right now it only supports planes and boxes, for individual objects or instanced objects. The public api can only set positions for now. If you need more, please submit your PRs.

How does it work? It subscribes the view part of a component to cannons physics world and unsubscribes on unmount. You don't put position/rotation/scale into the mesh any longer, you put it into the hook, which takes care of forwarding all movements.

Internally it communicates with the web worker via fixed-size array buffers, but it keeps track of how many physics based components you have mounted automatically and adjusts these buffers when needed.

```jsx
import * as THREE from 'three'
import ReactDOM from 'react-dom'
import React, { useMemo } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import niceColors from 'nice-color-palettes'
import { useCannon, useCannonInstanced, Physics } from 'use-cannon'

function Plane({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const [ref, api] = useCannon({ mass: 0, type: 'Plane', position, rotation })
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[5, 5]} />
      <shadowMaterial attach="material" color="#171717" />
    </mesh>
  )
}

function Cubes({ number }) {
  const positions = useMemo(
    () => new Array(number).fill().map(() => [Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5]),
    [number]
  )
  const [ref, api] = useCannonInstanced({ mass: 1, type: 'Box', args: [0.05, 0.05, 0.05], positions })

  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new THREE.Color()
    for (let i = 0; i < number; i++) {
      color.set(niceColors[17][Math.floor(Math.random() * 5)])
      color.toArray(array, i * 3)
    }
    return array
  }, [])

  useFrame(() => api.setPosition(Math.floor(Math.random() * number), [0, Math.random() * 2, 0]))

  return (
    <instancedMesh receiveShadow castShadow ref={ref} args={[null, null, number]}>
      <boxBufferGeometry attach="geometry" args={[0.1, 0.1, 0.1]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </boxBufferGeometry>
      <meshLambertMaterial attach="material" vertexColors={THREE.VertexColors} />
    </instancedMesh>
  )
}

ReactDOM.render(
  <Canvas shadowMap>
    <hemisphereLight intensity={0.35} />
    <directionalLight position={[5, 5, 5]} intensity={2} castShadow shadow-camera-zoom={2} />
    <Physics>
      <Plane rotation={[-Math.PI / 2, 0, 0]} />
      <Cubes number={200} />
    </Physics>
  </Canvas>,
  document.getElementById('root')
)
```

# Api

## Physics

Keeps track of physics objects and serves as a provider.

```jsx
<Physics
  children,                     // ...
  gravity = [0, -10, 0],        // default gravity
  tolerance = 0.001 />          // default tolerance
```

## [ref, api] = useCannon(props, deps = [])

Ties a referenced object to cannons physics world.

```jsx
const [ref, api] = useCannon({ type: "Plane", mass: 0, position: [0, 0, 0] })
return <mesh ref={ref} geometry={planeGeom} />
```

### props

```jsx
{
  type: "Plane" | "Box",
  args: [...],
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
  //... all serializable Body props
}
```

### api

```jsx
{
  setPosition(pos: [number, number, number])
}
```

## [ref, api] = useCannonInstanced(props, index => props, deps = [])

Ties a referenced instanced-mesh to cannons physics world.

```jsx
const [ref, api] = useCannonInstanced({ type: "Box", mass: 1 }, i => ({ position: position[i] }))
return <instancedMesh ref={ref} args={[geometry, material, count]} />
```

### props

```jsx
{
  type: "Plane" | "Box",
  args: [...],
  position: [[0, 0, 0], ...],
  rotation: [[0, 0, 0], ...],
  //... all serializable Body props
},

index => {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1]
}
```

### api

```jsx
{
  setPositionAt(index, pos: [number, number, number])
}
```
