import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, extend, useThree } from 'react-three-fiber'
import { Physics, useHeightfield, useSphere } from '@react-three/cannon'
import niceColors from 'nice-color-palettes'
import { OrbitControls } from 'three-stdlib/controls/OrbitControls'

extend({ OrbitControls })

/* Generates a 2D array using Worley noise. */
function generateHeightmap({ width, height, number, scale }) {
  const data = []

  const seedPoints = []
  for (let i = 0; i < number; i++) {
    seedPoints.push([Math.random(), Math.random()])
  }

  let max = 0
  for (let i = 0; i < width; i++) {
    const row = []
    for (let j = 0; j < height; j++) {
      let min = Infinity
      seedPoints.forEach((p) => {
        const distance2 = (p[0] - i / width) ** 2 + (p[1] - j / height) ** 2
        if (distance2 < min) {
          min = distance2
        }
      })
      const d = Math.sqrt(min)
      if (d > max) {
        max = d
      }
      row.push(d)
    }
    data.push(row)
  }

  /* Normalize and scale. */
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      data[i][j] *= scale / max
    }
  }
  return data
}

function HeightmapGeometry({ heights, elementSize, ...rest }) {
  const ref = useRef()

  useEffect(() => {
    const dx = elementSize
    const dy = elementSize

    /* Create the vertex data from the heights. */
    const vertices = heights.flatMap((row, i) => row.flatMap((z, j) => [i * dx, j * dy, z]))

    /* Create the faces. */
    const indices = []
    for (let i = 0; i < heights.length - 1; i++) {
      for (let j = 0; j < heights[i].length - 1; j++) {
        const stride = heights[i].length
        const index = i * stride + j
        indices.push(index + 1, index + stride, index + stride + 1)
        indices.push(index + stride, index + 1, index)
      }
    }

    ref.current.setIndex(indices)
    ref.current.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    ref.current.computeVertexNormals()
    ref.current.computeBoundingBox()
    ref.current.computeBoundingSphere()
  }, [heights])

  return <bufferGeometry {...rest} ref={ref} />
}

function Heightfield(props) {
  const { elementSize, heights, position, rotation, ...rest } = props

  const [ref] = useHeightfield(() => ({
    args: [
      heights,
      {
        elementSize,
      },
    ],
    position,
    rotation,
  }))

  return (
    <mesh ref={ref} castShadow receiveShadow {...rest}>
      <meshPhongMaterial color={niceColors[17][4]} />
      <HeightmapGeometry heights={heights} elementSize={elementSize} />
    </mesh>
  )
}

function Spheres({ rows, columns, spread }) {
  const number = rows * columns
  const [ref] = useSphere((index) => ({
    mass: 1,
    position: [
      ((index % columns) - (columns - 1) / 2) * spread,
      2.0,
      (Math.floor(index / columns) - (rows - 1) / 2) * spread,
    ],
    args: 0.2,
  }))
  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new THREE.Color()
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[17][Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    return array
  }, [number])

  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[null, null, number]}>
      <sphereBufferGeometry args={[0.2, 16, 16]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </sphereBufferGeometry>
      <meshPhongMaterial vertexColors={THREE.VertexColors} />
    </instancedMesh>
  )
}

const Camera = (props) => {
  const cameraRef = useRef()
  const controlsRef = useRef()
  const { gl, camera, setDefaultCamera } = useThree()
  useEffect(() => void cameraRef.current ?? setDefaultCamera(cameraRef.current))
  useFrame(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.updateMatrixWorld()
      controlsRef.current.update()
    }
  })

  return (
    <>
      <perspectiveCamera {...props} ref={cameraRef} position={[0, -10, 10]} />
      <orbitControls
        enableDamping
        ref={controlsRef}
        args={[camera, gl.domElement]}
        dampingFactor={0.2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
      />
    </>
  )
}

const scale = 10
export default () => (
  <Canvas shadowMap>
    <color attach="background" args={['#171720']} />
    <Camera />
    <Physics>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 3, 0]} castShadow />
      <Heightfield
        elementSize={(scale * 1) / 128}
        heights={generateHeightmap({
          width: 128,
          height: 128,
          number: 10,
          scale: 1,
        })}
        position={[-scale / 2, 0, scale / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <Spheres rows={2} columns={2} spread={4} />
    </Physics>
  </Canvas>
)
