import { RaycastVehicle } from 'cannon-es'

import type { CannonMessageMap } from '../../types'
import type { State } from '../state'
import { tripletToVec3 } from '../triplet-to-vec3'

export const addRaycastVehicle = (state: State, data: CannonMessageMap['addRaycastVehicle']) => {
  const [chassisBody, wheels, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis] = data.props

  const vehicle = new RaycastVehicle({
    chassisBody: state.bodies[chassisBody],
    indexForwardAxis,
    indexRightAxis,
    indexUpAxis,
  })

  vehicle.world = state.world

  for (let i = 0; i < wheelInfos.length; i++) {
    const { axleLocal, chassisConnectionPointLocal, directionLocal, ...rest } = wheelInfos[i]

    vehicle.addWheel({
      axleLocal: tripletToVec3(axleLocal),
      chassisConnectionPointLocal: tripletToVec3(chassisConnectionPointLocal),
      directionLocal: tripletToVec3(directionLocal),
      ...rest,
    })
  }

  const preStep = () => {
    vehicle.updateVehicle(state.world.dt)
  }

  const postStep = () => {
    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
      vehicle.updateWheelTransform(i)

      const t = vehicle.wheelInfos[i].worldTransform
      const wheelBody = state.bodies[wheels[i]]

      wheelBody.position.copy(t.position)
      wheelBody.quaternion.copy(t.quaternion)
    }
  }

  state.vehicles[data.uuid] = { postStep, preStep, vehicle }

  state.world.addEventListener('preStep', preStep)
  state.world.addEventListener('postStep', postStep)
}
