import * as THREE from 'three'
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react'
// @ts-ignore
import CannonWorker from '../src/worker'

type PhysicsProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
}

type PhysicsContext = {
  worker: Worker | undefined
  setRef: React.Dispatch<React.SetStateAction<Refs>>
}

type WorkerEvent = {
  data: {
    op: string
    positions: Float32Array
    quaternions: Float32Array
    bodies: string[]
  }
}

type Refs = {
  [uuid: string]: THREE.Object3D
}

type ShapeProps = {
  position?: number[]
  rotation?: number[]
  scale?: number[]
  mass?: number
}

type BodyProps = ShapeProps & {
  type: string
  create?: (object: THREE.Object3D) => ShapeProps | void
}

type PlaneProps = ShapeProps & {}

type BoxProps = ShapeProps & {
  halfExtents?: number[]
}

type CylinderProps = ShapeProps & {
  radiusTop?: number
  radiusBottom?: number
  height?: number
  numSegments?: number
}
type HeightfieldProps = ShapeProps & {
  data?: number[]
  options: {
    minValue?: number
    maxValue?: number
    elementSize?: number
  }
}
type ParticleProps = ShapeProps & {}

type SphereProps = ShapeProps & {
  radius?: number
}

type TrimeshProps = ShapeProps & {
  vertices?: number[]
  indices?: number[]
}

type Api = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  (
    | {
        setPosition: (x: number, y: number, z: number) => void
        setRotation: (x: number, y: number, z: number) => void
      }
    | undefined
  )
]

const context = React.createContext<PhysicsContext>({} as PhysicsContext)
const temp = new THREE.Object3D()

export function Physics({
  children,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
}: PhysicsProps): React.ReactNode {
  const [worker] = useState<Worker>(() => new CannonWorker() as Worker)
  const [refs, setRef] = useState<Refs>({})
  const [bodies, setBodies] = useState<string[]>([])
  const count = useMemo(() => Object.keys(refs).length, [refs])

  useEffect(() => {
    if (count) {
      let positions = new Float32Array(count * 3)
      let quaternions = new Float32Array(count * 4)

      // Initialize worker
      worker.postMessage({ op: 'init', gravity, tolerance, step })

      function loop() {
        if (positions.byteLength !== 0 && quaternions.byteLength !== 0) {
          worker.postMessage({ op: 'step', positions, quaternions }, [positions.buffer, quaternions.buffer])
        }
      }

      worker.onmessage = (e: WorkerEvent) => {
        switch (e.data.op) {
          case 'frame': {
            positions = e.data.positions
            quaternions = e.data.quaternions

            for (let i = 0; i < bodies.length; i++) {
              const name = bodies[i]
              const ref = refs[name]

              if (ref instanceof THREE.InstancedMesh) {
                const index = parseInt(name.split('/')[1])
                temp.position.fromArray(positions, i * 3)
                temp.quaternion.fromArray(quaternions, i * 4)
                temp.updateMatrix()
                ref.setMatrixAt(index, temp.matrix)
                ref.instanceMatrix.needsUpdate = true
              } else {
                ref.position.fromArray(positions, i * 3)
                ref.quaternion.fromArray(quaternions, i * 4)
              }
            }

            requestAnimationFrame(loop)
            break
          }
          case 'sync': {
            setBodies(e.data.bodies)
            break
          }
          default:
            break
        }
      }
      loop()
    }
  }, [count, refs, bodies])

  useEffect(() => () => worker.terminate(), [])

  const api = useMemo(() => ({ worker, setRef }), [worker])
  return <context.Provider value={api}>{children}</context.Provider>
}

export function useBody({ create = () => undefined, ...props }: BodyProps, deps: any[] = []): Api {
  const ref = useRef<THREE.Object3D>()
  const { worker, setRef } = useContext(context)

  useEffect(() => {
    if (ref.current && worker) {
      const object = ref.current
      const currentWorker = worker

      if (object instanceof THREE.InstancedMesh) {
        const uuid = new Array(object.count).fill(0).map((_, i) => `${object.uuid}/${i}`)
        // Why? Because @mrdoob did it in his example ...
        object.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        // Set start-up position values
        if (props.position) object.position.set(...(props.position as [number, number, number]))
        if (props.rotation) object.rotation.set(...(props.rotation as [number, number, number]))
        if (props.scale) object.scale.set(...(props.scale as [number, number, number]))
        // Add bodies
        currentWorker.postMessage({ op: 'addBodies', uuid, ...props, ...create(object) })
        // Add refs to the collection
        setRef(refs => ({
          ...refs,
          ...Object.keys(uuid).reduce((acc, i) => ({ ...acc, [`${object.uuid}/${i}`]: object }), {}),
        }))
        // Unmount ...
        return () => {
          // Remove body from worker
          currentWorker.postMessage({ op: 'removeBodies', uuid })
          // Remove ref from collection
          setRef(refs => {
            const temp = { ...refs }
            uuid.forEach(id => delete temp[id])
            return temp
          })
        }
      } else {
        const uuid = ref.current.uuid
        // Set start-up position values
        if (props.position) object.position.set(...(props.position as [number, number, number]))
        if (props.rotation) object.rotation.set(...(props.rotation as [number, number, number]))
        if (props.scale) object.scale.set(...(props.scale as [number, number, number]))
        // Add body
        currentWorker.postMessage({ op: 'addBody', uuid, ...props, ...create(object) })
        // Add ref to the collection
        setRef(refs => ({ ...refs, [uuid]: object }))
        // Unmount ...
        return () => {
          // Remove body from worker
          currentWorker.postMessage({ op: 'removeBody', uuid })
          // Remove ref from collection
          setRef(refs => {
            const temp = { ...refs }
            delete temp[uuid]
            return temp
          })
        }
      }
    }
  }, [ref.current, worker, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  const api = useMemo(() => {
    if (worker)
      return {
        setPosition(x: number, y: number, z: number) {
          if (ref.current) worker.postMessage({ op: 'setPosition', uuid: ref.current.uuid, position: [x, y, z] })
        },
        setRotation(x: number, y: number, z: number) {
          if (ref.current) worker.postMessage({ op: 'setRotation', uuid: ref.current.uuid, rotation: [x, y, z] })
        },
        setPositionAt(index: number, x: number, y: number, z: number) {
          if (ref.current)
            worker.postMessage({ op: 'setPosition', uuid: `${ref.current.uuid}_${index}`, position: [x, y, z] })
        },
        setRotationAt(index: number, x: number, y: number, z: number) {
          if (ref.current)
            worker.postMessage({ op: 'setRotation', uuid: `${ref.current.uuid}_${index}`, rotation: [x, y, z] })
        },
      }
  }, [worker])

  return [ref, api]
}
export function usePlane(props: PlaneProps, deps: any[] = []) {
  return useBody({ type: 'Plane', ...props }, deps)
}
export function useBox(props: BoxProps, deps: any[] = []) {
  return useBody({ type: 'Box', ...props }, deps)
}
export function useCylinder(props: CylinderProps, deps: any[] = []) {
  return useBody({ type: 'Cylinder', ...props }, deps)
}
export function useHeightfield(props: HeightfieldProps, deps: any[] = []) {
  return useBody({ type: 'Heightfield', ...props }, deps)
}
export function useParticle(props: ParticleProps, deps: any[] = []) {
  return useBody({ type: 'Particle', ...props }, deps)
}
export function useSphere(props: SphereProps, deps: any[] = []) {
  return useBody({ type: 'Sphere', ...props }, deps)
}
export function useTrimesh(props: TrimeshProps, deps: any[] = []) {
  return useBody({ type: 'Trimesh', ...props }, deps)
}
