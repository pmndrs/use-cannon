import EventEmitter from 'events'
import Worker from 'web-worker:./worker/index.ts'

import type {
  Broadphase,
  CannonMessage,
  CannonMessageBody,
  CannonWebWorker,
  IncomingWorkerMessage,
  StepProps,
  Triplet,
  WorldProps,
} from './types'

export type CannonWorkerProps = Partial<WorldProps> & { size?: number }

export class CannonWorkerAPI extends EventEmitter {
  get axisIndex(): 0 | 1 | 2 {
    return this.config.axisIndex
  }

  set axisIndex(value: 0 | 1 | 2) {
    this.config.axisIndex = value
    this.postMessage({ op: 'setAxisIndex', props: value })
  }

  get broadphase(): Broadphase {
    return this.config.broadphase
  }

  set broadphase(value: Broadphase) {
    this.config.broadphase = value
    this.postMessage({ op: 'setBroadphase', props: value })
  }

  get frictionGravity(): Triplet | null {
    return this.config.frictionGravity
  }
  set frictionGravity(value: Triplet | null) {
    this.config.frictionGravity = value
    this.postMessage({ op: 'setFrictionGravity', props: value })
  }

  get gravity(): Triplet {
    return this.config.gravity
  }

  set gravity(value: Triplet) {
    this.config.gravity = value
    this.postMessage({ op: 'setGravity', props: value })
  }

  get iterations(): number {
    return this.config.iterations
  }

  set iterations(value: number) {
    this.config.iterations = value
    this.postMessage({ op: 'setIterations', props: value })
  }

  get tolerance(): number {
    return this.config.tolerance
  }

  set tolerance(value: number) {
    this.config.tolerance = value
    this.postMessage({ op: 'setTolerance', props: value })
  }

  private buffers: {
    positions: Float32Array
    quaternions: Float32Array
  }

  private config: Required<CannonWorkerProps>
  private messageQueue: CannonMessage[] = []
  private worker: CannonWebWorker | null = null

  constructor({
    allowSleep = false,
    axisIndex = 0,
    broadphase = 'Naive',
    defaultContactMaterial = { contactEquationStiffness: 1e6 },
    frictionGravity = null,
    gravity = [0, -9.81, 0],
    iterations = 5,
    quatNormalizeFast = false,
    quatNormalizeSkip = 0,
    size = 1000,
    solver = 'GS',
    tolerance = 0.001,
  }: CannonWorkerProps) {
    super()

    this.config = {
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      frictionGravity,
      gravity,
      iterations,
      quatNormalizeFast,
      quatNormalizeSkip,
      size,
      solver,
      tolerance,
    }

    this.buffers = {
      positions: new Float32Array(size * 3),
      quaternions: new Float32Array(size * 4),
    }
  }

  addBodies({ props, type, uuid }: CannonMessageBody<'addBodies'>): void {
    this.postMessage({
      op: 'addBodies',
      props,
      type,
      uuid,
    })
  }

  addConstraint({ props: [refA, refB, optns], type, uuid }: CannonMessageBody<'addConstraint'>): void {
    this.postMessage({
      op: 'addConstraint',
      props: [refA, refB, optns],
      type,
      uuid,
    })
  }

  addContactMaterial({ props, uuid }: CannonMessageBody<'addContactMaterial'>): void {
    this.postMessage({
      op: 'addContactMaterial',
      props,
      uuid,
    })
  }

  addRay({ props, uuid }: CannonMessageBody<'addRay'>): void {
    this.postMessage({ op: 'addRay', props, uuid })
  }

  addRaycastVehicle({
    props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
    uuid,
  }: CannonMessageBody<'addRaycastVehicle'>): void {
    this.postMessage({
      op: 'addRaycastVehicle',
      props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
      uuid,
    })
  }

  addSpring({ props: [refA, refB, optns], uuid }: CannonMessageBody<'addSpring'>): void {
    this.postMessage({
      op: 'addSpring',
      props: [refA, refB, optns],
      uuid,
    })
  }

  applyForce({ props, uuid }: CannonMessageBody<'applyForce'>): void {
    this.postMessage({ op: 'applyForce', props, uuid })
  }

  applyImpulse({ props, uuid }: CannonMessageBody<'applyImpulse'>): void {
    this.postMessage({ op: 'applyImpulse', props, uuid })
  }

  applyLocalForce({ props, uuid }: CannonMessageBody<'applyLocalForce'>): void {
    this.postMessage({ op: 'applyLocalForce', props, uuid })
  }

  applyLocalImpulse({ props, uuid }: CannonMessageBody<'applyLocalImpulse'>): void {
    this.postMessage({ op: 'applyLocalImpulse', props, uuid })
  }

  applyRaycastVehicleEngineForce({ props, uuid }: CannonMessageBody<'applyRaycastVehicleEngineForce'>): void {
    this.postMessage({
      op: 'applyRaycastVehicleEngineForce',
      props,
      uuid,
    })
  }

  applyTorque({ props, uuid }: CannonMessageBody<'applyTorque'>): void {
    this.postMessage({ op: 'applyTorque', props, uuid })
  }

  connect(): void {
    this.worker = new Worker() as CannonWebWorker

    this.worker.onmessage = (message: IncomingWorkerMessage) => {
      if (message.data.op === 'frame') {
        this.buffers.positions = message.data.positions
        this.buffers.quaternions = message.data.quaternions
        this.emit(message.data.op, message.data)
        return
      }

      this.emit(message.data.type, message.data)
    }

    for (const message of this.messageQueue) {
      this.worker.postMessage(message)
    }

    this.messageQueue.length = 0
  }

  disableConstraint({ uuid }: CannonMessageBody<'disableConstraint'>): void {
    this.postMessage({ op: 'disableConstraint', uuid })
  }

  disableConstraintMotor({ uuid }: CannonMessageBody<'disableConstraintMotor'>): void {
    this.postMessage({ op: 'disableConstraintMotor', uuid })
  }

  disconnect(): void {
    if (this.worker) this.worker.onmessage = null
  }

  enableConstraint({ uuid }: CannonMessageBody<'enableConstraint'>): void {
    this.postMessage({ op: 'enableConstraint', uuid })
  }

  enableConstraintMotor({ uuid }: CannonMessageBody<'enableConstraintMotor'>): void {
    this.postMessage({ op: 'enableConstraintMotor', uuid })
  }

  init(): void {
    const {
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      frictionGravity,
      gravity,
      iterations,
      quatNormalizeFast,
      quatNormalizeSkip,
      solver,
      tolerance,
    } = this.config

    this.postMessage({
      op: 'init',
      props: {
        allowSleep,
        axisIndex,
        broadphase,
        defaultContactMaterial,
        frictionGravity,
        gravity,
        iterations,
        quatNormalizeFast,
        quatNormalizeSkip,
        solver,
        tolerance,
      },
    })
  }

  removeBodies({ uuid }: CannonMessageBody<'removeBodies'>): void {
    this.postMessage({ op: 'removeBodies', uuid })
  }

  removeConstraint({ uuid }: CannonMessageBody<'removeConstraint'>): void {
    this.postMessage({ op: 'removeConstraint', uuid })
  }

  removeContactMaterial({ uuid }: CannonMessageBody<'removeContactMaterial'>): void {
    this.postMessage({
      op: 'removeContactMaterial',
      uuid,
    })
  }

  removeRay({ uuid }: CannonMessageBody<'removeRay'>): void {
    this.postMessage({ op: 'removeRay', uuid })
  }

  removeRaycastVehicle({ uuid }: CannonMessageBody<'removeRaycastVehicle'>): void {
    this.postMessage({ op: 'removeRaycastVehicle', uuid })
  }

  removeSpring({ uuid }: CannonMessageBody<'removeSpring'>): void {
    this.postMessage({ op: 'removeSpring', uuid })
  }

  setAllowSleep({ props, uuid }: CannonMessageBody<'setAllowSleep'>): void {
    this.postMessage({ op: 'setAllowSleep', props, uuid })
  }

  setAngularDamping({ props, uuid }: CannonMessageBody<'setAngularDamping'>): void {
    this.postMessage({ op: 'setAngularDamping', props, uuid })
  }

  setAngularFactor({ props, uuid }: CannonMessageBody<'setAngularFactor'>): void {
    this.postMessage({ op: 'setAngularFactor', props, uuid })
  }

  setAngularVelocity({ props, uuid }: CannonMessageBody<'setAngularVelocity'>): void {
    this.postMessage({ op: 'setAngularVelocity', props, uuid })
  }

  setCollisionFilterGroup({ props, uuid }: CannonMessageBody<'setCollisionFilterGroup'>): void {
    this.postMessage({ op: 'setCollisionFilterGroup', props, uuid })
  }

  setCollisionFilterMask({ props, uuid }: CannonMessageBody<'setCollisionFilterMask'>): void {
    this.postMessage({ op: 'setCollisionFilterMask', props, uuid })
  }

  setCollisionResponse({ props, uuid }: CannonMessageBody<'setCollisionResponse'>): void {
    this.postMessage({ op: 'setCollisionResponse', props, uuid })
  }

  setConstraintMotorMaxForce({ props, uuid }: CannonMessageBody<'setConstraintMotorMaxForce'>): void {
    this.postMessage({ op: 'setConstraintMotorMaxForce', props, uuid })
  }

  setConstraintMotorSpeed({ props, uuid }: CannonMessageBody<'setConstraintMotorSpeed'>): void {
    this.postMessage({ op: 'setConstraintMotorSpeed', props, uuid })
  }

  setFixedRotation({ props, uuid }: CannonMessageBody<'setFixedRotation'>): void {
    this.postMessage({ op: 'setFixedRotation', props, uuid })
  }

  setIsTrigger({ props, uuid }: CannonMessageBody<'setIsTrigger'>): void {
    this.postMessage({ op: 'setIsTrigger', props, uuid })
  }

  setLinearDamping({ props, uuid }: CannonMessageBody<'setLinearDamping'>): void {
    this.postMessage({ op: 'setLinearDamping', props, uuid })
  }

  setLinearFactor({ props, uuid }: CannonMessageBody<'setLinearFactor'>): void {
    this.postMessage({ op: 'setLinearFactor', props, uuid })
  }

  setMass({ props, uuid }: CannonMessageBody<'setMass'>): void {
    this.postMessage({ op: 'setMass', props, uuid })
  }

  setMaterial({ props, uuid }: CannonMessageBody<'setMaterial'>): void {
    this.postMessage({ op: 'setMaterial', props, uuid })
  }

  setPosition({ props, uuid }: CannonMessageBody<'setPosition'>): void {
    this.postMessage({ op: 'setPosition', props, uuid })
  }

  setQuaternion({ props: [x, y, z, w], uuid }: CannonMessageBody<'setQuaternion'>): void {
    this.postMessage({ op: 'setQuaternion', props: [x, y, z, w], uuid })
  }

  setRaycastVehicleBrake({ props, uuid }: CannonMessageBody<'setRaycastVehicleBrake'>): void {
    this.postMessage({ op: 'setRaycastVehicleBrake', props, uuid })
  }

  setRaycastVehicleSteeringValue({ props, uuid }: CannonMessageBody<'setRaycastVehicleSteeringValue'>): void {
    this.postMessage({
      op: 'setRaycastVehicleSteeringValue',
      props,
      uuid,
    })
  }

  setRotation({ props, uuid }: CannonMessageBody<'setRotation'>): void {
    this.postMessage({ op: 'setRotation', props, uuid })
  }

  setSleepSpeedLimit({ props, uuid }: CannonMessageBody<'setSleepSpeedLimit'>): void {
    this.postMessage({ op: 'setSleepSpeedLimit', props, uuid })
  }

  setSleepTimeLimit({ props, uuid }: CannonMessageBody<'setSleepTimeLimit'>): void {
    this.postMessage({ op: 'setSleepTimeLimit', props, uuid })
  }

  setSpringDamping({ props, uuid }: CannonMessageBody<'setSpringDamping'>): void {
    this.postMessage({ op: 'setSpringDamping', props, uuid })
  }

  setSpringRestLength({ props, uuid }: CannonMessageBody<'setSpringRestLength'>): void {
    this.postMessage({ op: 'setSpringRestLength', props, uuid })
  }

  setSpringStiffness({ props, uuid }: CannonMessageBody<'setSpringStiffness'>): void {
    this.postMessage({ op: 'setSpringStiffness', props, uuid })
  }

  setUserData({ props, uuid }: CannonMessageBody<'setUserData'>): void {
    this.postMessage({ op: 'setUserData', props, uuid })
  }

  setVelocity({ props, uuid }: CannonMessageBody<'setVelocity'>): void {
    this.postMessage({ op: 'setVelocity', props, uuid })
  }

  sleep({ uuid }: CannonMessageBody<'sleep'>): void {
    this.postMessage({ op: 'sleep', uuid })
  }

  step(props: StepProps): void {
    const {
      buffers: { positions, quaternions },
    } = this

    if (!positions.byteLength && !quaternions.byteLength) return

    this.worker?.postMessage({ op: 'step', positions, props, quaternions }, [
      positions.buffer,
      quaternions.buffer,
    ])
  }

  subscribe({ props: { id, target, type }, uuid }: CannonMessageBody<'subscribe'>): void {
    this.postMessage({ op: 'subscribe', props: { id, target, type }, uuid })
  }

  terminate(): void {
    this.worker?.terminate()
    this.worker = null
  }

  unsubscribe({ props }: CannonMessageBody<'unsubscribe'>): void {
    this.postMessage({ op: 'unsubscribe', props })
  }

  wakeUp({ uuid }: CannonMessageBody<'wakeUp'>): void {
    this.postMessage({ op: 'wakeUp', uuid })
  }

  private postMessage(message: CannonMessage): void {
    if (this.worker) return this.worker.postMessage(message)
    this.messageQueue.push(message)
  }
}
