import { ContactMaterial } from 'cannon-es'

import type { CannonMessageBody } from '../types'
import type { CreateMaterial } from './material'
import type { State } from './state'
import type { WithUUID } from './types'

export const addContactMaterial = (
  world: State['world'],
  createMaterial: CreateMaterial,
  [materialA, materialB, options]: CannonMessageBody<'addContactMaterial'>['props'],
  uuid: string,
) => {
  const matA = createMaterial(materialA)
  const matB = createMaterial(materialB)
  const contactMaterial: WithUUID<ContactMaterial> = new ContactMaterial(matA, matB, options)
  contactMaterial.uuid = uuid
  world.addContactMaterial(contactMaterial)
}

export const removeContactMaterial = (world: State['world'], cmUUID: string) => {
  const index = world.contactmaterials.findIndex(({ uuid }) => uuid === cmUUID)
  const [{ id: i }, { id: j }] = world.contactmaterials[index].materials

  world.contactmaterials.splice(index, 1)
  delete world.contactMaterialTable.data[i < j ? `${i}-${j}` : `${j}-${i}`]
}
