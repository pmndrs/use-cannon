import type {
  BodyProps,
  BodyShapeType,
  CompoundBodyProps,
  ConvexPolyhedronArgs,
  CylinderArgs,
  SphereArgs,
  TrimeshArgs,
  Triplet,
} from '@pmndrs/cannon-worker-api'
import type { Quaternion as CQuaternion } from 'cannon-es'
import type { Object3D } from 'three'
import { Euler, Quaternion } from 'three'
import type { ConvexPolyhedronParameters, ShapeOptions, ShapeParameters, ShapeType } from 'three-to-cannon'
import { getShapeParameters } from 'three-to-cannon'

type ShapeTypeString = `${ShapeType}`

export type ThreeToCannonOptions = Omit<ShapeOptions, 'type'> & {
  type?: ShapeTypeString
}

export function threeToCannon(
  object: Object3D,
  options: ThreeToCannonOptions = {},
): { props: BodyProps<unknown[]> | CompoundBodyProps; shape: BodyShapeType } | null {
  const result = getShapeParameters(object as never, {
    ...options,
    type: options?.type as ShapeType,
  })

  if (!result) {
    return null
  }

  const args = shapeParametersToBodyArgs(result)

  const boundingShapeTypes: ShapeTypeString[] = ['Box', 'Cylinder', 'Sphere']
  if (options.type && boundingShapeTypes.includes(options.type)) {
    return {
      props: {
        shapes: [
          {
            args,
            position: result.offset ? [result.offset.x, result.offset.y, result.offset.z] : undefined,
            rotation: cannonQuaternionToEuler(result.orientation),
            type: result.type,
          },
        ],
      },
      shape: 'Compound',
    }
  }

  return {
    props: {
      args,
    },
    shape: result.type,
  }
}

function shapeParametersToBodyArgs(
  parameters: ShapeParameters,
): Triplet | SphereArgs | CylinderArgs | ConvexPolyhedronArgs | TrimeshArgs {
  if (parameters.type === 'Box') {
    return createBoxArgs(parameters as ShapeParameters<ShapeType.BOX>)
  } else if (parameters.type === 'Sphere') {
    return createSphereArgs(parameters as ShapeParameters<ShapeType.SPHERE>)
  } else if (parameters.type === 'Cylinder') {
    return createCylinderArgs(parameters as ShapeParameters<ShapeType.CYLINDER>)
  } else if (parameters.type === 'ConvexPolyhedron') {
    return createConvexPolyhedronArgs(parameters as ShapeParameters<ShapeType.HULL>)
  } else {
    return createTrimeshArgs(parameters as ShapeParameters<ShapeType.MESH>)
  }
}

function cannonQuaternionToEuler(q?: CQuaternion): number[] | undefined {
  return q ? new Euler().setFromQuaternion(new Quaternion().fromArray(q.toArray())).toArray() : undefined
}

function createBoxArgs(parameters: ShapeParameters<ShapeType.BOX>): Triplet {
  const {
    params: { x, y, z },
  } = parameters
  return [x, y, z].map((v) => v * 2) as Triplet // box props take extents, not half extents
}

function createSphereArgs(parameters: ShapeParameters<ShapeType.SPHERE>): SphereArgs {
  const {
    params: { radius },
  } = parameters
  return [radius]
}

function createCylinderArgs(parameters: ShapeParameters<ShapeType.CYLINDER>): CylinderArgs {
  const {
    params: { radiusTop, radiusBottom, height, segments },
  } = parameters
  return [radiusTop, radiusBottom, height, segments]
}

function createConvexPolyhedronArgs(parameters: ShapeParameters<ShapeType.HULL>): ConvexPolyhedronArgs {
  const { faces, vertices: verticesArray }: ConvexPolyhedronParameters = parameters.params

  const vertices: Triplet[] = []
  for (let i = 0; i < verticesArray.length; i += 3) {
    vertices.push([verticesArray[i], verticesArray[i + 1], verticesArray[i + 2]])
  }

  return [vertices, faces]
}

function createTrimeshArgs(parameters: ShapeParameters<ShapeType.MESH>): TrimeshArgs {
  const {
    params: { vertices, indices },
  } = parameters

  return [vertices, indices]
}
