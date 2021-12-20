import {
  World,
  NaiveBroadphase,
  SAPBroadphase,
  Vec3,
  PointToPointConstraint,
  ConeTwistConstraint,
  HingeConstraint,
  DistanceConstraint,
  LockConstraint,
  Constraint,
  Spring,
  Quaternion,
  Ray,
  RaycastResult,
  RaycastVehicle,
  GSSolver,
  SplitSolver,
} from 'cannon-es'
import propsToBody from './propsToBody'

const state = {
  bodies: {},
  vehicles: {},
  springs: {},
  springInstances: {},
  constraints: {},
  rays: {},
  world: new World(),
  config: { step: 1 / 60 },
  subscriptions: {},
  bodiesNeedSyncing: false,
  lastCallTime: undefined,
}

function syncBodies() {
  state.bodiesNeedSyncing = true
  state.bodies = state.world.bodies.reduce((acc, body) => ({ ...acc, [body.uuid]: body }), {})
}

function emitBeginContact({ bodyA, bodyB }) {
  if (!bodyA || !bodyB) return
  self.postMessage({ op: 'event', type: 'collideBegin', bodyA: bodyA.uuid, bodyB: bodyB.uuid })
}

function emitEndContact({ bodyA, bodyB }) {
  if (!bodyA || !bodyB) return
  self.postMessage({ op: 'event', type: 'collideEnd', bodyA: bodyA.uuid, bodyB: bodyB.uuid })
}

self.onmessage = (e) => {
  const { op, uuid, type, positions, quaternions, props } = e.data
  const broadphases = { NaiveBroadphase, SAPBroadphase }
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
        quatNormalizeFast,
        quatNormalizeSkip,
        solver,
      } = props
      state.world.allowSleep = allowSleep
      state.world.gravity.set(gravity[0], gravity[1], gravity[2])
      state.world.quatNormalizeFast = quatNormalizeFast
      state.world.quatNormalizeSkip = quatNormalizeSkip

      if (solver === 'Split') {
        state.world.solver = new SplitSolver(new GSSolver())
      }

      state.world.solver.tolerance = tolerance
      state.world.solver.iterations = iterations
      state.world.broadphase = new (broadphases[broadphase + 'Broadphase'] || NaiveBroadphase)(state.world)
      state.world.broadphase.axisIndex = axisIndex === undefined || axisIndex === null ? 0 : axisIndex
      state.world.addEventListener('beginContact', emitBeginContact)
      state.world.addEventListener('endContact', emitEndContact)
      Object.assign(state.world.defaultContactMaterial, defaultContactMaterial)
      state.config.step = step
      break
    }
    case 'step': {
      const now = performance.now() / 1000
      if (!state.lastCallTime) {
        state.world.step(state.config.step)
      } else {
        const timeSinceLastCall = now - state.lastCallTime
        state.world.step(state.config.step, timeSinceLastCall)
      }
      state.lastCallTime = now

      const numberOfBodies = state.world.bodies.length
      for (let i = 0; i < numberOfBodies; i++) {
        let b = state.world.bodies[i],
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
      const observations = []
      for (const id of Object.keys(state.subscriptions)) {
        let [uuid, type, target = 'bodies'] = state.subscriptions[id]
        let object = state[target]
        if (!object || !object[uuid]) continue
        let value = object[uuid][type]
        if (value instanceof Vec3 || value instanceof Quaternion) value = value.toArray()
        observations.push([id, value, type])
      }
      const message = {
        op: 'frame',
        positions,
        quaternions,
        observations,
        active: state.world.hasActiveBodies,
      }
      if (state.bodiesNeedSyncing) {
        message.bodies = state.world.bodies.map((body) => body.uuid)
        state.bodiesNeedSyncing = false
      }
      self.postMessage(message, [positions.buffer, quaternions.buffer])
      break
    }
    case 'addBodies': {
      for (let i = 0; i < uuid.length; i++) {
        const body = propsToBody(uuid[i], props[i], type)
        state.world.addBody(body)

        if (props[i].onCollide)
          body.addEventListener('collide', ({ type, body, target, contact }) => {
            const { ni, ri, rj, bi, bj, id } = contact
            const contactPoint = bi.position.vadd(ri)
            const contactNormal = bi === body ? ni : ni.scale(-1)
            self.postMessage({
              op: 'event',
              type,
              body: body.uuid,
              target: target.uuid,
              contact: {
                ni: ni.toArray(),
                ri: ri.toArray(),
                rj: rj.toArray(),
                bi: bi.uuid,
                bj: bj.uuid,
                impactVelocity: contact.getImpactVelocityAlongNormal(),
                // World position of the contact
                contactPoint: contactPoint.toArray(),
                // Normal of the contact, relative to the colliding body
                contactNormal: contactNormal.toArray(),
                id,
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
      for (let i = 0; i < uuid.length; i++) state.world.removeBody(state.bodies[uuid[i]])
      syncBodies()
      break
    }
    case 'subscribe': {
      const { id, type, target } = props
      state.subscriptions[id] = [uuid, type, target]
      break
    }
    case 'unsubscribe': {
      delete state.subscriptions[props]
      break
    }
    case 'setPosition':
      state.bodies[uuid].position.set(props[0], props[1], props[2])
      break
    case 'setQuaternion':
      state.bodies[uuid].quaternion.set(props[0], props[1], props[2], props[3])
      break
    case 'setRotation':
      state.bodies[uuid].quaternion.setFromEuler(props[0], props[1], props[2])
      break
    case 'setVelocity':
      state.bodies[uuid].velocity.set(props[0], props[1], props[2])
      break
    case 'setAngularVelocity':
      state.bodies[uuid].angularVelocity.set(props[0], props[1], props[2])
      break
    case 'setLinearFactor':
      state.bodies[uuid].linearFactor.set(props[0], props[1], props[2])
      break
    case 'setAngularFactor':
      state.bodies[uuid].angularFactor.set(props[0], props[1], props[2])
      break
    case 'setMass':
      // assume that an update from zero-mass implies a need for dynamics on static obj.
      if (props !== 0 && state.bodies[uuid].type === 0) state.bodies[uuid].type = 1
      state.bodies[uuid].mass = props
      state.bodies[uuid].updateMassProperties()
      break
    case 'setLinearDamping':
      state.bodies[uuid].linearDamping = props
      break
    case 'setAngularDamping':
      state.bodies[uuid].angularDamping = props
      break
    case 'setAllowSleep':
      state.bodies[uuid].allowSleep = props
      break
    case 'setSleepSpeedLimit':
      state.bodies[uuid].sleepSpeedLimit = props
      break
    case 'setSleepTimeLimit':
      state.bodies[uuid].sleepTimeLimit = props
      break
    case 'setCollisionFilterGroup':
      state.bodies[uuid].collisionFilterGroup = props
      break
    case 'setCollisionFilterMask':
      state.bodies[uuid].collisionFilterMask = props
      break
    case 'setCollisionResponse':
      state.bodies[uuid].collisionResponse = props
      break
    case 'setFixedRotation':
      state.bodies[uuid].fixedRotation = props
      break
    case 'setIsTrigger':
      state.bodies[uuid].isTrigger = props
      break
    case 'setGravity':
      state.world.gravity.set(props[0], props[1], props[2])
      break
    case 'setTolerance':
      state.world.solver.tolerance = props
      break
    case 'setStep':
      state.config.step = props
      break
    case 'setIterations':
      state.world.solver.iterations = props
      break
    case 'setBroadphase':
      state.world.broadphase = new (broadphases[props + 'Broadphase'] || NaiveBroadphase)(state.world)
      break
    case 'setAxisIndex':
      state.world.broadphase.axisIndex = props === undefined || props === null ? 0 : props
      break
    case 'applyForce':
      state.bodies[uuid].applyForce(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyImpulse':
      state.bodies[uuid].applyImpulse(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyLocalForce':
      state.bodies[uuid].applyLocalForce(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyLocalImpulse':
      state.bodies[uuid].applyLocalImpulse(new Vec3(...props[0]), new Vec3(...props[1]))
      break
    case 'applyTorque':
      state.bodies[uuid].applyTorque(new Vec3(...props[0]))
      break
    case 'addConstraint': {
      const [bodyA, bodyB, optns] = props
      let { pivotA, pivotB, axisA, axisB, maxMultiplier, ...options } = optns

      // is there a better way to enforce defaults?
      pivotA = Array.isArray(pivotA) ? new Vec3(...pivotA) : undefined
      pivotB = Array.isArray(pivotB) ? new Vec3(...pivotB) : undefined
      axisA = Array.isArray(axisA) ? new Vec3(...axisA) : undefined
      axisB = Array.isArray(axisB) ? new Vec3(...axisB) : undefined

      let constraint

      switch (type) {
        case 'PointToPoint':
          constraint = new PointToPointConstraint(
            state.bodies[bodyA],
            pivotA,
            state.bodies[bodyB],
            pivotB,
            optns.maxForce,
          )
          break
        case 'ConeTwist':
          constraint = new ConeTwistConstraint(state.bodies[bodyA], state.bodies[bodyB], {
            pivotA,
            pivotB,
            axisA,
            axisB,
            ...options,
          })
          break
        case 'Hinge':
          constraint = new HingeConstraint(state.bodies[bodyA], state.bodies[bodyB], {
            pivotA,
            pivotB,
            axisA,
            axisB,
            ...options,
          })
          break
        case 'Distance':
          constraint = new DistanceConstraint(
            state.bodies[bodyA],
            state.bodies[bodyB],
            optns.distance,
            optns.maxForce,
          )
          break
        case 'Lock':
          constraint = new LockConstraint(state.bodies[bodyA], state.bodies[bodyB], optns)
          break
        default:
          constraint = new Constraint(state.bodies[bodyA], state.bodies[bodyB], optns)
          break
      }
      constraint.uuid = uuid
      state.world.addConstraint(constraint)

      if (maxMultiplier !== undefined) {
        const postStepConstraint = () => {
          // The multiplier is proportional to how much force is added to the bodies by the constraint.
          // If this exceeds a limit the constraint is disabled.
          const multiplier = Math.abs(constraint.equations[0].multiplier)
          if (multiplier > maxMultiplier) {
            constraint.disable()
          }
        }
        state.constraints[uuid] = postStepConstraint
        state.world.addEventListener('postStep', state.constraints[uuid])
      }
      break
    }
    case 'removeConstraint':
      state.world.constraints
        .filter(({ uuid: thisId }) => thisId === uuid)
        .map((c) => state.world.removeConstraint(c))
      if (state.constraints[uuid]) {
        state.world.removeEventListener('postStep', state.constraints[uuid])
        delete state.constraints[uuid]
      }
      break

    case 'enableConstraint':
      state.world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.enable())
      break

    case 'disableConstraint':
      state.world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.disable())
      break

    case 'enableConstraintMotor':
      state.world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.enableMotor())
      break

    case 'disableConstraintMotor':
      state.world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.disableMotor())
      break

    case 'setConstraintMotorSpeed':
      state.world.constraints.filter(({ uuid: thisId }) => thisId === uuid).map((c) => c.setMotorSpeed(props))
      break

    case 'setConstraintMotorMaxForce':
      state.world.constraints
        .filter(({ uuid: thisId }) => thisId === uuid)
        .map((c) => c.setMotorMaxForce(props))
      break

    case 'addSpring': {
      const [bodyA, bodyB, optns] = props
      let { worldAnchorA, worldAnchorB, localAnchorA, localAnchorB, restLength, stiffness, damping } = optns

      worldAnchorA = Array.isArray(worldAnchorA) ? new Vec3(...worldAnchorA) : undefined
      worldAnchorB = Array.isArray(worldAnchorB) ? new Vec3(...worldAnchorB) : undefined
      localAnchorA = Array.isArray(localAnchorA) ? new Vec3(...localAnchorA) : undefined
      localAnchorB = Array.isArray(localAnchorB) ? new Vec3(...localAnchorB) : undefined

      let spring = new Spring(state.bodies[bodyA], state.bodies[bodyB], {
        worldAnchorA,
        worldAnchorB,
        localAnchorA,
        localAnchorB,
        restLength,
        stiffness,
        damping,
      })

      spring.uuid = uuid

      let postStepSpring = () => spring.applyForce()

      state.springs[uuid] = postStepSpring
      state.springInstances[uuid] = spring

      // Compute the force after each step
      state.world.addEventListener('postStep', state.springs[uuid])
      break
    }
    case 'setSpringStiffness': {
      state.springInstances[uuid].stiffness = props
      break
    }
    case 'setSpringRestLength': {
      state.springInstances[uuid].restLength = props
      break
    }
    case 'setSpringDamping': {
      state.springInstances[uuid].damping = props
      break
    }
    case 'removeSpring': {
      state.world.removeEventListener('postStep', state.springs[uuid])
      break
    }
    case 'addRay': {
      const { from, to, ...options } = props
      const ray = new Ray(from ? new Vec3(...from) : undefined, to ? new Vec3(...to) : undefined)
      options.mode = Ray[options.mode.toUpperCase()]
      options.result = new RaycastResult()
      state.rays[uuid] = () => {
        ray.intersectWorld(state.world, options)
        const { body, shape, rayFromWorld, rayToWorld, hitNormalWorld, hitPointWorld, ...rest } =
          options.result
        self.postMessage({
          op: 'event',
          type: 'rayhit',
          ray: {
            from,
            to,
            direction: ray.direction.toArray(),
            collisionFilterGroup: ray.collisionFilterGroup,
            collisionFilterMask: ray.collisionFilterMask,
            uuid,
          },
          body: body ? body.uuid : null,
          shape: shape ? { ...shape, body: body.uuid } : null,
          rayFromWorld: rayFromWorld.toArray(),
          rayToWorld: rayToWorld.toArray(),
          hitNormalWorld: hitNormalWorld.toArray(),
          hitPointWorld: hitPointWorld.toArray(),
          ...rest,
        })
      }
      state.world.addEventListener('preStep', state.rays[uuid])
      break
    }
    case 'removeRay': {
      state.world.removeEventListener('preStep', state.rays[uuid])
      delete state.rays[uuid]
      break
    }
    case 'addRaycastVehicle': {
      const [chassisBody, wheels, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis] = props
      const vehicle = new RaycastVehicle({
        chassisBody: state.bodies[chassisBody],
        indexForwardAxis,
        indexRightAxis,
        indexUpAxis,
      })
      vehicle.world = state.world
      for (let i = 0; i < wheelInfos.length; i++) {
        const wheelInfo = wheelInfos[i]
        wheelInfo.directionLocal = new Vec3(...wheelInfo.directionLocal)
        wheelInfo.chassisConnectionPointLocal = new Vec3(...wheelInfo.chassisConnectionPointLocal)
        wheelInfo.axleLocal = new Vec3(...wheelInfo.axleLocal)
        vehicle.addWheel(wheelInfo)
      }

      vehicle.preStep = () => {
        state.vehicles[uuid].updateVehicle(state.world.dt)
      }
      ;(vehicle.postStep = () => {
        for (let i = 0; i < state.vehicles[uuid].wheelInfos.length; i++) {
          state.vehicles[uuid].updateWheelTransform(i)
          const t = state.vehicles[uuid].wheelInfos[i].worldTransform
          const wheelBody = state.bodies[wheels[i]]
          wheelBody.position.copy(t.position)
          wheelBody.quaternion.copy(t.quaternion)
        }
      }),
        (state.vehicles[uuid] = vehicle)
      state.world.addEventListener('preStep', state.vehicles[uuid].preStep)
      state.world.addEventListener('postStep', state.vehicles[uuid].postStep)
      break
    }
    case 'removeRaycastVehicle': {
      state.world.removeEventListener('preStep', state.vehicles[uuid].preStep)
      state.world.removeEventListener('postStep', state.vehicles[uuid].postStep)
      state.vehicles[uuid].world = null
      delete state.vehicles[uuid]
      break
    }
    case 'setRaycastVehicleSteeringValue': {
      const [value, wheelIndex] = props
      state.vehicles[uuid].setSteeringValue(value, wheelIndex)
      break
    }
    case 'applyRaycastVehicleEngineForce': {
      const [value, wheelIndex] = props
      state.vehicles[uuid].applyEngineForce(value, wheelIndex)
      break
    }
    case 'setRaycastVehicleBrake': {
      const [brake, wheelIndex] = props
      state.vehicles[uuid].setBrake(brake, wheelIndex)
      break
    }

    case 'wakeUp': {
      state.bodies[uuid].wakeUp()
      break
    }
    case 'sleep': {
      state.bodies[uuid].sleep()
      break
    }
  }
}
