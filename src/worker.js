import { World, NaiveBroadphase, Body, Plane, Box, Vec3 } from 'cannon-es'

let bodies = {}
let world = new World()
world.broadphase = new NaiveBroadphase(world)
world.gravity.set(0, -9.8, 0)

function task(e, sync = true) {
  const {
    op,
    uuid,
    type,
    mass,
    positions,
    quaternions,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    uuids = [],
    args = [],
  } = e.data

  switch (op) {
    case 'step': {
      world.step(1 / 60)
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
      const body = new Body({ mass })
      body.uuid = uuid
      switch (type) {
        case 'Plane':
          body.addShape(new Plane())
          break
        case 'Box':
          body.addShape(new Box(new Vec3(...args)))
          break
        default:
          break
      }
      body.position.set(...position)
      body.quaternion.setFromEuler(...rotation)
      world.addBody(body)
      if (sync) syncBodies()
      break
    }
    case 'addBodies': {
      for (let i = 0; i < uuids.length; i++) {
        task(
          {
            data: {
              op: 'addBody',
              uuid: uuids[i],
              mass,
              args,
              type,
              position: e.data.positions && e.data.positions[i],
              rotation: e.data.rotations && e.data.rotations[i],
            },
          },
          false
        )
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
      for (let i = 0; i < uuids.length; i++) task({ data: { op: 'removeBody', uuid: uuids[i] } })
      syncBodies()
      break
    }
    case 'setPosition': {
      bodies[uuid].position.set(...position)
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
