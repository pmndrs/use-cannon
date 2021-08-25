import { Color, Float32BufferAttribute } from 'three'
import { useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import { Physics, useHeightfield, useSphere } from '@react-three/cannon'
import niceColors from 'nice-color-palettes'
import { OrbitControls } from 'three-stdlib/controls/OrbitControls'

import type { Node } from '@react-three/fiber'
import type { HeightfieldProps } from '@react-three/cannon'
import type { BufferGeometry, PerspectiveCamera } from 'three'

extend({ OrbitControls })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControls: Node<OrbitControls, typeof OrbitControls>
    }
  }
}

type GenerateHeightmapArgs = {
  height: number
  number: number
  scale: number
  width: number
}

/* Generates a 2D array using Worley noise. */
function generateHeightmap({ width, height, number, scale }: GenerateHeightmapArgs) {
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

type HeightmapGeometryProps = { heights: number[][]; elementSize: number }

function HeightmapGeometry({ heights, elementSize }: HeightmapGeometryProps) {
  const ref = useRef<BufferGeometry>(null)

  useEffect(() => {
    if (!ref.current) return
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
    ref.current.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    ref.current.computeVertexNormals()
    ref.current.computeBoundingBox()
    ref.current.computeBoundingSphere()
  }, [heights])

  return <bufferGeometry ref={ref} />
}

type OurHeightfieldProps = {
  heights: HeightfieldProps['args'][0]
} & Pick<HeightfieldProps, 'position' | 'rotation'> &
  Required<Pick<HeightfieldProps['args'][1], 'elementSize'>>

function Heightfield({ elementSize, heights, position, rotation }: OurHeightfieldProps) {
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
    <mesh ref={ref} castShadow receiveShadow>
      <meshPhongMaterial color={niceColors[17][4]} />
      <HeightmapGeometry heights={heights} elementSize={elementSize} />
    </mesh>
  )
}

type SpheresProps = {
  columns: number
  rows: number
  spread: number
}

function Spheres({ rows, columns, spread }: SpheresProps) {
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
    const color = new Color()
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[17][Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    return array
  }, [number])

  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[undefined, undefined, number]}>
      <sphereBufferGeometry args={[0.2, 16, 16]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </sphereBufferGeometry>
      <meshPhongMaterial vertexColors />
    </instancedMesh>
  )
}

const Camera = () => {
  const cameraRef = useRef<PerspectiveCamera>(null)
  const controlsRef = useRef<OrbitControls>(null)
  const { gl, camera } = useThree()
  const set = useThree((state) => state.set)
  const size = useThree((state) => state.size)

  useLayoutEffect(() => {
    if (!cameraRef.current) return
    cameraRef.current.aspect = size.width / size.height
    cameraRef.current.updateProjectionMatrix()
  }, [size])

  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera) return
    set(() => ({ camera }))
  }, [])

  useFrame(() => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.updateMatrixWorld()
    controlsRef.current.update()
  })

  return (
    <>
      <perspectiveCamera ref={cameraRef} position={[0, -10, 10]} />
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
  <Canvas shadows>
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
