import {
  World,
  NaiveBroadphase,
  Body,
  Plane,
  Box,
  Vec3,
  ConvexPolyhedron,
  Cylinder,
  Heightfield,
  Particle,
  Sphere,
  Trimesh,
} from 'cannon-es'

let bodies = {}
let world = new World()
let config = { step: 1 / 60 }
world.broadphase = new NaiveBroadphase(world)
world.gravity.set(0, 10, 0)

function task(e, sync = true) {
  const { op, uuid, type, positions, quaternions, props } = e.data

  switch (op) {
    case 'init': {
      const { gravity, tolerance, step } = props
      world.gravity.set(gravity[0], gravity[1], gravity[2])
      world.solver.tolerance = props.tolerance
      config.step = props.step
      break
    }
    case 'step': {
      world.step(config.step)
      for (let i = 0; i < world.bodies.length; i++) {
        let b = world.bodies[i],
          p = b.position,
          q = b.quaternion
        positions[3 * i + 0] = p.x
        positions[3 * i + 1] = p.y
        positions[3 * i + 2] = p.z
        quaternions[4 * i + 0] = q.x
        quaternions[4 * i + 1] = q.y
        quaternions[4 * i + 2] = q.z
        quaternions[4 * i + 3] = q.w
      }
      self.postMessage({ op: 'frame', positions, quaternions }, [positions.buffer, quaternions.buffer])
      break
    }
    case 'addBody': {
      const { args = [], mesh = null, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], ...extra } = props

      const body = new Body(extra)
      body.uuid = uuid
      switch (type) {
        case 'Box':
          body.addShape(new Box(new Vec3(...args))) // halfExtents
          break
        case 'Convex':
          break
        case 'ConvexPolyhedron':
          // 'mesh' must contain data structured as THREE.Geometry vertex and faces arrays
          // Convert from THREE.Vector3 to CANNON.Vec3
          const vertices = new Array(mesh.vertices.length)
          for (let i = 0; i < vertices.length; i++) {
            vertices[i] = new Vec3(mesh.vertices[i].x, mesh.vertices[i].y, mesh.vertices[i].z)
          }

          // Convert from THREE.Face3 to Cannon-compatible Array
          const faces = new Array(mesh.faces.length)
          for (let i = 0; i < mesh.faces.length; i++) {
            faces[i] = [mesh.faces[i].a, mesh.faces[i].b, mesh.faces[i].c]
          }

          // NOTE: You can sometimes get away with *concave* meshes depending on what you are doing.
          // non-convex meshes will however produce errors in inopportune collisions
          body.addmesh(new ConvexPolyhedron(vertices, faces))
          break
        case 'Cylinder':
          body.addShape(new Cylinder(...args)) // { radiusTop, radiusBottom, height, numSegments } = args
          break
        case 'Heightfield':
          body.addShape(new Heightfield(...args)) // { Array data, options: {minValue, maxValue, elementSize}  } = args
          break
        case 'Particle':
          body.addShape(new Particle()) // no args
          break
        case 'Plane':
          body.addShape(new Plane()) // no args, infinite x and y
          break
        case 'Sphere':
          body.addShape(new Sphere(...args)) // { radius } = args
          break
        case 'Trimesh':
          body.addShape(new Trimesh(...args)) // { vertices, indices } = args
          break
        default:
          break
      }

      body.position.set(position[0], position[1], position[2])
      body.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2])
      world.addBody(body)
      if (sync) syncBodies()
      break
    }
    case 'addBodies': {
      for (let i = 0; i < uuid.length; i++) {
        task({ data: { op: 'addBody', type, uuid: uuid[i], props: props[i] } }, false)
      }
      syncBodies()
      break
    }
    case 'removeBody': {
      world.removeBody(bodies[uuid])
      if (sync) syncBodies()
      break
    }
    case 'removeBodies': {
      for (let i = 0; i < uuid.length; i++) task({ data: { op: 'removeBody', uuid: uuid[i] } })
      syncBodies()
      break
    }
    case 'setPosition': {
      const { position } = props
      bodies[uuid].position.set(position[0], position[1], position[2])
      break
    }
    case 'setRotation': {
      const { rotation } = props
      bodies[uuid].rotation.set(rotation[0], rotation[1], rotation[2])
      break
    }
    default:
      break
  }
}

function syncBodies() {
  self.postMessage({ op: 'sync', bodies: world.bodies.map(body => body.uuid) })
  bodies = world.bodies.reduce((acc, body) => ({ ...acc, [body.uuid]: body }), {})
}

self.onmessage = e => task(e)
