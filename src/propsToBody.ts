import {
  BODY_TYPES,
  Body,
  Box,
  ConvexPolyhedron,
  Cylinder,
  Heightfield,
  Material,
  Particle,
  Plane,
  Quaternion,
  Sphere,
  Trimesh,
  Vec3,
} from 'cannon-es'
import type {
  BodyProps,
  BodyShapeType,
  BodyType,
  CompoundShapeProps,
  ConvexPolyhedronArgs,
  ShapeType,
  Triplet,
} from './shared'

const BodyTypeMap: Record<BodyType, typeof BODY_TYPES[keyof typeof BODY_TYPES]> = {
  Dynamic: BODY_TYPES.DYNAMIC,
  Static: BODY_TYPES.STATIC,
  Kinematic: BODY_TYPES.KINEMATIC,
}

declare module 'objects/Body' {
  interface Body {
    uuid: string
  }
}

const makeVec3 = ([x, y, z]: Triplet) => new Vec3(x, y, z)

const prepareBox = (args: Triplet): ConstructorParameters<typeof Box> => [new Vec3(...args.map((v) => v / 2))]
const prepareConvexPolyhedron = ([
  v,
  faces,
  n,
  a,
  boundingSphereRadius,
]: ConvexPolyhedronArgs<Triplet>): ConstructorParameters<typeof ConvexPolyhedron> => [
  {
    vertices: v && v.map(makeVec3),
    faces,
    normals: n && n.map(makeVec3),
    axes: a && a.map(makeVec3),
    boundingSphereRadius,
  },
]
const prepareSphere = (args: number | [number]): ConstructorParameters<typeof Sphere> =>
  Array.isArray(args) ? args : [args]

const createShape = {
  Box: (args: Triplet) => new Box(...prepareBox(args)),
  ConvexPolyhedron: (args: ConvexPolyhedronArgs<Triplet>) =>
    new ConvexPolyhedron(...prepareConvexPolyhedron(args)),
  Cylinder: (args: ConstructorParameters<typeof Cylinder>) => new Cylinder(...args),
  Heightfield: (args: ConstructorParameters<typeof Heightfield>) => new Heightfield(...args),
  Particle: () => new Particle(),
  Plane: () => new Plane(),
  Sphere: (args: number | [number]) => new Sphere(...prepareSphere(args)),
  Trimesh: (args: ConstructorParameters<typeof Trimesh>) => new Trimesh(...args),
}

const createBody = (props: BodyProps) => {
  const {
    angularFactor = [1, 1, 1],
    angularVelocity = [0, 0, 0],
    collisionResponse,
    linearFactor = [1, 1, 1],
    mass,
    material,
    onCollide, // filtered out
    position = [0, 0, 0],
    rotation: quaternion = [0, 0, 0],
    type,
    velocity = [0, 0, 0],
    ...extra
  } = props

  const body = new Body({
    ...extra,
    mass: type === 'Static' ? 0 : mass,
    material: material && new Material(material),
    type: type && BodyTypeMap[type],
  })

  if (collisionResponse !== undefined) {
    body.collisionResponse = collisionResponse
  }

  body.angularFactor.set(...angularFactor)
  body.angularVelocity.set(...angularVelocity)
  body.linearFactor.set(...linearFactor)
  body.position.set(...position)
  body.quaternion.setFromEuler(...quaternion)
  body.velocity.set(...velocity)

  return body
}

function propsToBody<T extends BodyShapeType>(
  id: string,
  { args, shapes = [], ...props }: BodyProps<T>,
  shapeType: T,
) {
  const body = createBody(props)
  body.uuid = id
  shapeType === 'Compound'
    ? shapes.forEach(addToBody(body))
    : body.addShape(createShape[shapeType as ShapeType](args as any))
  return body
}

function addToBody(body: Body) {
  return ({ shapeType, args, position, rotation, material, ...extra }: CompoundShapeProps) => {
    const shape = body.addShape(
      createShape[shapeType](args as any),
      position && new Vec3(...position),
      rotation && new Quaternion().setFromEuler(...rotation),
    )
    if (material) shape.material = new Material(material)
    Object.assign(shape, extra)
  }
}

export default propsToBody
