import {
  World,
  NaiveBroadphase,
  SAPBroadphase,
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
  PointToPointConstraint,
  ConeTwistConstraint,
  HingeConstraint,
  DistanceConstraint,
  LockConstraint,
  Constraint,
  Spring,
} from 'cannon-es'

let bodies = {}
let springs = {}
let world = new World()
let config = { step: 1 / 60 }

const TYPES = {
  Dynamic: Body.DYNAMIC,
  Static: Body.STATIC,
  Kinematic: Body.KINEMATIC,
}

function syncBodies() {
  self.postMessage({ op: 'sync', bodies: world.bodies.map(body => body.uuid) })
  bodies = world.bodies.reduce((acc, body) => ({ ...acc, [body.uuid]: body }), {})
}

self.onmessage = e => {
  const { op, uuid, type, positions, quaternions, props } = e.data

  switch (op) {
    case 'init': {
      const {
        gravity,
        tolerance,
        step,
        iterations,
        allowSleep,
        broadphase,
        axisIndex,
        defaultContactMaterial,
      } = props
      const broadphases = { NaiveBroadphase, SAPBroadphase }
      world.allowSleep = allowSleep
      world.gravity.set(gravity[0], gravity[1], gravity[2])
      world.solver.tolerance = tolerance
      world.solver.iterations = iterations
      world.broadphase = new (broadphases[broadphase + 'Broadphase'] || NaiveBroadphase)(world)
      world.broadphase.axisIndex = axisIndex ?? 0
      Object.assign(world.defaultContactMaterial, defaultContactMaterial)
      config.step = step
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
    case 'addBodies': {
      for (let i = 0; i < uuid.length; i++) {
        const {
          args = [],
          position = [0, 0, 0],
          rotation = [0, 0, 0],
          scale = [1, 1, 1],
          type: bodyType,
          mass,
          onCollide,
          ...extra
        } = props[i]

        const body = new Body({ ...extra, mass: bodyType === 'Static' ? 0 : mass, type: TYPES[bodyType] })
        body.uuid = uuid[i]

        switch (type) {
          case 'Box':
            body.addShape(new Box(new Vec3(...args))) // halfExtents
            break
          case 'ConvexPolyhedron':
            const [v, f, n] = args
            const shape = new ConvexPolyhedron(
              v.map(([x, y, z]) => new Vec3(x, y, z)),
              f
            )
            if (n) shape.faceNormals = n.map(([x, y, z]) => new Vec3(x, y, z))
            else shape.computeNormals()
            body.addShape(shape)
            break
          case 'Cylinder':
            body.addShape(new Cylinder(...args)) // [ radiusTop, radiusBottom, height, numSegments ] = args
            break
          case 'Heightfield':
            body.addShape(new Heightfield(...args)) // [ Array data, options: {minValue, maxValue, elementSize}  ] = args
            break
          case 'Particle':
            body.addShape(new Particle()) // no args
            break
          case 'Plane':
            body.addShape(new Plane()) // no args, infinite x and y
            break
          case 'Sphere':
            body.addShape(new Sphere(...args)) // [radius] = args
            break
          case 'Trimesh':
            body.addShape(new Trimesh(...args)) // [vertices, indices] = args
            break
        }

        body.position.set(position[0], position[1], position[2])
        body.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2])
        world.addBody(body)

        if (onCollide)
          body.addEventListener('collide', ({ type, contact, target }) => {
            const { ni, ri, rj } = contact
            self.postMessage({
              op: 'event',
              type,
              body: body.uuid,
              target: target.uuid,
              contact: {
                ni: ni.toArray(),
                ri: ri.toArray(),
                rj: rj.toArray(),
                impactVelocity: contact.getImpactVelocityAlongNormal(),
              },
              collisionFilters: {
                bodyFilterGroup: body.collisionFilterGroup,
                bodyFilterMask: body.collisionFilterMask,
                targetFilterGroup: target.collisionFilterGroup,
                targetFilterMask: target.collisionFilterMask,
              },
            })
          })
      }
      syncBodies()
      break
    }
    case 'removeBodies': {
      for (let i = 0; i < uuid.length; i++) world.removeBody(bodies[uuid[i]])
      syncBodies()
      break
    }
    case 'setPosition': {
      bodies[uuid].position.set(props[0], props[1], props[2])
      break
    }
    case 'setRotation': {
      bodies[uuid].quaternion.setFromEuler(props[0], props[1], props[2], 'XYZ')
      break
    }
    case 'applyForce': {
      bodies[uuid].applyForce(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    }
    case 'applyImpulse': {
      bodies[uuid].applyImpulse(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    }
    case 'applyLocalForce': {
      bodies[uuid].applyLocalForce(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    }
    case 'applyLocalImpulse': {
      bodies[uuid].applyLocalImpulse(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    }
    case 'addConstraint': {
      const [bodyA, bodyB, optns] = props

      let { pivotA, pivotB, axisA, axisB, ...options } = optns

      // is there a better way to enforce defaults?
      pivotA = Array.isArray(pivotA) ? new Vec3(...pivotA) : undefined
      pivotB = Array.isArray(pivotB) ? new Vec3(...pivotB) : undefined
      axisA = Array.isArray(axisA) ? new Vec3(...axisA) : undefined
      axisB = Array.isArray(axisB) ? new Vec3(...axisB) : undefined

      let constraint

      switch (type) {
        case 'PointToPoint':
          constraint = new PointToPointConstraint(
            bodies[bodyA],
            pivotA,
            bodies[bodyB],
            pivotB,
            optns.maxForce
          )
          break
        case 'ConeTwist':
          constraint = new ConeTwistConstraint(bodies[bodyA], bodies[bodyB], {
            pivotA,
            pivotB,
            axisA,
            axisB,
            ...options,
          })
          break
        case 'Hinge':
          constraint = new HingeConstraint(bodies[bodyA], bodies[bodyB], {
            pivotA,
            pivotB,
            axisA,
            axisB,
            ...options,
          })
          break
        case 'Distance':
          constraint = new DistanceConstraint(bodies[bodyA], bodies[bodyB], optns.distance, optns.maxForce)
          console.log(constraint)
          break
        case 'Lock':
          constraint = new LockConstraint(bodies[bodyA], bodies[bodyB], optns)
          break
        default:
          constraint = new Constraint(bodies[bodyA], bodies[bodyB], optns)
          break
      }

      constraint.uuid = uuid

      world.addConstraint(constraint)
      break
    }
    case 'removeConstraint': {
      world.removeConstraint(uuid)
      break
    }
    case 'addSpring': {
      const [bodyA, bodyB, optns] = props
      let { worldAnchorA, worldAnchorB, localAnchorA, localAnchorB, restLength, stiffness, damping } = optns

      worldAnchorA = Array.isArray(worldAnchorA) ? new Vec3(...worldAnchorA) : undefined
      worldAnchorB = Array.isArray(worldAnchorB) ? new Vec3(...worldAnchorB) : undefined
      localAnchorA = Array.isArray(localAnchorA) ? new Vec3(...localAnchorA) : undefined
      localAnchorB = Array.isArray(localAnchorB) ? new Vec3(...localAnchorB) : undefined

      let spring = new Spring(bodies[bodyA], bodies[bodyB], {
        worldAnchorA,
        worldAnchorB,
        localAnchorA,
        localAnchorB,
        restLength,
        stiffness,
        damping,
      })

      spring.uuid = uuid

      let postStepSpring = e => spring.applyForce()

      springs[uuid] = postStepSpring

      // Compute the force after each step
      world.addEventListener('postStep', springs[uuid])
      break
    }
    case 'removeSpring': {
      world.removeEventListener('postStep', springs[uuid])
      break
    }
  }
}
