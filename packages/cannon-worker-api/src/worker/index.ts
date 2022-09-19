/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { GSSolver, HingeConstraint, NaiveBroadphase, SAPBroadphase, Vec3 } from 'cannon-es'

import type { CannonMessage } from '../types'
import { addContactMaterial, removeContactMaterial } from './contact-material'
import { createMaterialFactory } from './material'
import { addBodies, addConstraint, addRay, addRaycastVehicle, addSpring, init, step } from './operations'
import { state } from './state'
import type { CannonWorkerGlobalScope } from './types'

// TODO: Declare this for all files in worker
declare const self: CannonWorkerGlobalScope

const isHingeConstraint = (c: unknown): c is HingeConstraint => c instanceof HingeConstraint

function syncBodies() {
  state.bodiesNeedSyncing = true
  state.bodies = state.world.bodies.reduce(
    (bodies, body) => (body.uuid ? { ...bodies, [body.uuid]: body } : bodies),
    {},
  )
}

const broadphases = { NaiveBroadphase, SAPBroadphase }
const createMaterial = createMaterialFactory(state.materials)

self.onmessage = ({ data }: { data: CannonMessage }) => {
  switch (data.op) {
    case 'init': {
      init(state.world, data.props)
      break
    }
    case 'step': {
      step(state, data)
      break
    }
    case 'addBodies': {
      addBodies(state, createMaterial, data)
      syncBodies()
      break
    }
    case 'removeBodies': {
      for (let i = 0; i < data.uuid.length; i++) {
        state.world.removeBody(state.bodies[data.uuid[i]])
        const key = Object.keys(state.subscriptions).find((k) => state.subscriptions[k][0] === data.uuid[i])
        if (key) {
          delete state.subscriptions[key]
        }
      }
      syncBodies()
      break
    }
    case 'subscribe': {
      const { id, target, type } = data.props
      state.subscriptions[id] = [data.uuid, type, target]
      break
    }
    case 'unsubscribe': {
      delete state.subscriptions[data.props]
      break
    }
    case 'setPosition':
      state.bodies[data.uuid].position.set(data.props[0], data.props[1], data.props[2])
      break
    case 'setQuaternion':
      state.bodies[data.uuid].quaternion.set(data.props[0], data.props[1], data.props[2], data.props[3])
      break
    case 'setRotation':
      state.bodies[data.uuid].quaternion.setFromEuler(data.props[0], data.props[1], data.props[2])
      break
    case 'setVelocity':
      state.bodies[data.uuid].velocity.set(data.props[0], data.props[1], data.props[2])
      break
    case 'setAngularVelocity':
      state.bodies[data.uuid].angularVelocity.set(data.props[0], data.props[1], data.props[2])
      break
    case 'setLinearFactor':
      state.bodies[data.uuid].linearFactor.set(data.props[0], data.props[1], data.props[2])
      break
    case 'setAngularFactor':
      state.bodies[data.uuid].angularFactor.set(data.props[0], data.props[1], data.props[2])
      break
    case 'setMass':
      state.bodies[data.uuid].mass = data.props
      state.bodies[data.uuid].updateMassProperties()
      break
    case 'setMaterial':
      state.bodies[data.uuid].material = data.props ? createMaterial(data.props) : null
      break
    case 'setLinearDamping':
      state.bodies[data.uuid].linearDamping = data.props
      break
    case 'setAngularDamping':
      state.bodies[data.uuid].angularDamping = data.props
      break
    case 'setAllowSleep':
      state.bodies[data.uuid].allowSleep = data.props
      break
    case 'setSleepSpeedLimit':
      state.bodies[data.uuid].sleepSpeedLimit = data.props
      break
    case 'setSleepTimeLimit':
      state.bodies[data.uuid].sleepTimeLimit = data.props
      break
    case 'setCollisionFilterGroup':
      state.bodies[data.uuid].collisionFilterGroup = data.props
      break
    case 'setCollisionFilterMask':
      state.bodies[data.uuid].collisionFilterMask = data.props
      break
    case 'setCollisionResponse':
      state.bodies[data.uuid].collisionResponse = data.props
      break
    case 'setFixedRotation':
      state.bodies[data.uuid].fixedRotation = data.props
      break
    case 'setFrictionGravity':
      state.world.frictionGravity = data.props ? new Vec3(...data.props) : undefined
      break
    case 'setIsTrigger':
      state.bodies[data.uuid].isTrigger = data.props
      break
    case 'setGravity':
      state.world.gravity.set(data.props[0], data.props[1], data.props[2])
      break
    case 'setTolerance':
      if (state.world.solver instanceof GSSolver) {
        state.world.solver.tolerance = data.props
      }
      break
    case 'setIterations':
      if (state.world.solver instanceof GSSolver) {
        state.world.solver.iterations = data.props
      }
      break
    case 'setBroadphase':
      state.world.broadphase = new (broadphases[`${data.props}Broadphase`] || NaiveBroadphase)(state.world)
      break
    case 'setAxisIndex':
      if (state.world.broadphase instanceof SAPBroadphase) {
        state.world.broadphase.axisIndex = data.props === undefined || data.props === null ? 0 : data.props
      }
      break
    case 'applyForce':
      state.bodies[data.uuid].applyForce(new Vec3(...data.props[0]), new Vec3(...data.props[1]))
      break
    case 'applyImpulse':
      state.bodies[data.uuid].applyImpulse(new Vec3(...data.props[0]), new Vec3(...data.props[1]))
      break
    case 'applyLocalForce':
      state.bodies[data.uuid].applyLocalForce(new Vec3(...data.props[0]), new Vec3(...data.props[1]))
      break
    case 'applyLocalImpulse':
      state.bodies[data.uuid].applyLocalImpulse(new Vec3(...data.props[0]), new Vec3(...data.props[1]))
      break
    case 'applyTorque':
      state.bodies[data.uuid].applyTorque(new Vec3(...data.props[0]))
      break
    case 'addConstraint': {
      addConstraint(state, data)
      break
    }
    case 'removeConstraint':
      state.world.constraints
        .filter(({ uuid }) => uuid === data.uuid)
        .map((c) => state.world.removeConstraint(c))
      if (state.constraints[data.uuid]) {
        state.world.removeEventListener('postStep', state.constraints[data.uuid])
        delete state.constraints[data.uuid]
      }
      break
    case 'enableConstraint':
      state.world.constraints.filter((c) => c.uuid === data.uuid).map((c) => c.enable())
      break
    case 'disableConstraint':
      state.world.constraints.filter((c) => c.uuid === data.uuid).map((c) => c.disable())
      break
    case 'enableConstraintMotor':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isHingeConstraint)
        .map((c) => c.enableMotor())
      break
    case 'disableConstraintMotor':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isHingeConstraint)
        .map((c) => c.disableMotor())
      break
    case 'setConstraintMotorSpeed':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isHingeConstraint)
        .map((c) => c.setMotorSpeed(data.props))
      break
    case 'setConstraintMotorMaxForce':
      state.world.constraints
        .filter((c) => c.uuid === data.uuid)
        .filter(isHingeConstraint)
        .map((c) => c.setMotorMaxForce(data.props))
      break
    case 'addSpring': {
      addSpring(state, data)
      break
    }
    case 'setSpringStiffness': {
      state.springInstances[data.uuid].stiffness = data.props
      break
    }
    case 'setSpringRestLength': {
      state.springInstances[data.uuid].restLength = data.props
      break
    }
    case 'setSpringDamping': {
      state.springInstances[data.uuid].damping = data.props
      break
    }
    case 'removeSpring': {
      state.world.removeEventListener('postStep', state.springs[data.uuid])
      break
    }
    case 'addRay': {
      addRay(state, data)
      break
    }
    case 'removeRay': {
      state.world.removeEventListener('preStep', state.rays[data.uuid])
      delete state.rays[data.uuid]
      break
    }
    case 'addRaycastVehicle': {
      addRaycastVehicle(state, data)
      break
    }
    case 'removeRaycastVehicle': {
      state.world.removeEventListener('preStep', state.vehicles[data.uuid].preStep)
      state.world.removeEventListener('postStep', state.vehicles[data.uuid].postStep)
      state.vehicles[data.uuid].vehicle.world = null
      delete state.vehicles[data.uuid]
      const key = Object.keys(state.subscriptions).find((k) => state.subscriptions[k][0] === data.uuid)
      if (key) {
        delete state.subscriptions[key]
      }
      break
    }
    case 'setRaycastVehicleSteeringValue': {
      const [value, wheelIndex] = data.props
      state.vehicles[data.uuid].vehicle.setSteeringValue(value, wheelIndex)
      break
    }
    case 'applyRaycastVehicleEngineForce': {
      const [value, wheelIndex] = data.props
      state.vehicles[data.uuid].vehicle.applyEngineForce(value, wheelIndex)
      break
    }
    case 'setRaycastVehicleBrake': {
      const [brake, wheelIndex] = data.props
      state.vehicles[data.uuid].vehicle.setBrake(brake, wheelIndex)
      break
    }
    case 'addContactMaterial': {
      addContactMaterial(state.world, createMaterial, data.props, data.uuid)
      break
    }
    case 'removeContactMaterial': {
      removeContactMaterial(state.world, data.uuid)
      break
    }
    case 'wakeUp': {
      state.bodies[data.uuid].wakeUp()
      break
    }
    case 'sleep': {
      state.bodies[data.uuid].sleep()
      break
    }
  }
}
