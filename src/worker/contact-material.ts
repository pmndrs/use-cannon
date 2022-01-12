import { ContactMaterial } from 'cannon-es'

import type { World } from 'cannon-es'

import type { CreateMaterial } from './material'
import type { AddContactMaterialMessage } from '../setup'

type WithUUID<C> = C & { uuid: string }
type DecoratedWorld = Omit<World, 'contactmaterials'> & { contactmaterials: WithUUID<ContactMaterial>[] }

export const addContactMaterial = (
  world: World,
  createMaterial: CreateMaterial,
  [materialA, materialB, options]: AddContactMaterialMessage['props'],
  uuid: string,
) => {
  const matA = createMaterial(materialA)
  const matB = createMaterial(materialB)
  const contactMaterial = new ContactMaterial(matA, matB, options) as WithUUID<ContactMaterial>
  contactMaterial.uuid = uuid
  world.addContactMaterial(contactMaterial)
}

export const removeContactMaterial = (world: DecoratedWorld, cmUUID: string) => {
  const index = world.contactmaterials.findIndex(({ uuid }) => uuid === cmUUID)
  const [{ id: i }, { id: j }] = world.contactmaterials[index].materials

  world.contactmaterials.splice(index, 1)
  delete world.contactMaterialTable.data[i < j ? `${i}-${j}` : `${j}-${i}`]
}
