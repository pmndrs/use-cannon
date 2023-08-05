import {
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
/**
 * @typedef { import('cannon-es').MaterialOptions } MaterialOptions
 */

const makeVec3 = ([x, y, z]) => new Vec3(x, y, z)
const prepareSphere = (args) => (Array.isArray(args) ? args : [args])
const prepareConvexPolyhedron = ([v, faces, n, a, boundingSphereRadius]) => [
  {
    axes: a ? a.map(makeVec3) : undefined,
    boundingSphereRadius,
    faces,
    normals: n ? n.map(makeVec3) : undefined,
    vertices: v ? v.map(makeVec3) : undefined,
  },
]

function createShape(type, args) {
  switch (type) {
    case 'Box':
      return new Box(new Vec3(...args.map((v) => v / 2))) // extents => halfExtents
    case 'ConvexPolyhedron':
      return new ConvexPolyhedron(...prepareConvexPolyhedron(args))
    case 'Cylinder':
      return new Cylinder(...args) // [ radiusTop, radiusBottom, height, numSegments ] = args
    case 'Heightfield':
      return new Heightfield(...args) // [ Array data, options: {minValue, maxValue, elementSize}  ] = args
    case 'Particle':
      return new Particle() // no args
    case 'Plane':
      return new Plane() // no args, infinite x and y
    case 'Sphere':
      return new Sphere(...prepareSphere(args)) // radius = args
    case 'Trimesh':
      return new Trimesh(...args) // [vertices, indices] = args
  }
}

/**
 * @param {THREE.Quaternion} target
 * @param {{ rotation?: THREE.Vector3Tuple quaternion?: THREE.Vector4Tuple }} props
 * @returns {THREE.Quaternion}
 */
const setQuaternion = (target, { quaternion, rotation }) => {
  if (quaternion) {
    target.set(...quaternion)
  } else if (rotation) {
    target.setFromEuler(...rotation)
  }

  return target
}

/**
 * @function
 * @param {Object} options
 * @param {string} options.uuid
 * @param {BodyProps} options.props
 * @param {BodyShapeType} options.type
 * @param {(materialOptions: MaterialOptions) => Material =} options.createMaterial
 * @returns {Body}
 */
export const propsToBody = (options) => {
  const { uuid, props, type, createMaterial = (materialOptions) => new Material(materialOptions) } = options
  const {
    angularFactor = [1, 1, 1],
    angularVelocity = [0, 0, 0],
    args = [],
    collisionResponse,
    linearFactor = [1, 1, 1],
    mass,
    material,
    onCollide,
    position = [0, 0, 0],
    rotation,
    quaternion,
    shapes,
    type: bodyType,
    velocity = [0, 0, 0],
    ...extra
  } = props

  const body = new Body({
    ...extra,
    mass: bodyType === 'Static' ? 0 : mass,
    material: material ? createMaterial(material) : undefined,
    type: bodyType ? Body[bodyType.toUpperCase()] : undefined,
  })
  body.uuid = uuid

  if (collisionResponse !== undefined) {
    body.collisionResponse = collisionResponse
  }

  if (type === 'Compound') {
    shapes.forEach(({ type, args, position, rotation, quaternion, material, ...extra }) => {
      const shapeBody = body.addShape(
        createShape(type, args),
        position ? new Vec3(...position) : undefined,
        setQuaternion(new Quaternion(0, 0, 0, 1), { quaternion, rotation }),
      )
      if (material) shapeBody.material = createMaterial(material)
      Object.assign(shapeBody, extra)
    })
  } else {
    body.addShape(createShape(type, args))
  }

  body.position.set(position[0], position[1], position[2])
  body.velocity.set(velocity[0], velocity[1], velocity[2])
  body.angularVelocity.set(angularVelocity[0], angularVelocity[1], angularVelocity[2])
  body.linearFactor.set(linearFactor[0], linearFactor[1], linearFactor[2])
  body.angularFactor.set(angularFactor[0], angularFactor[1], angularFactor[2])
  setQuaternion(body.quaternion, { quaternion, rotation })

  return body
}
