import { Material } from 'cannon-es'

type MaterialOptions = {
  friction?: number
  name?: string | symbol
  restitution?: number
}

export type CreateMaterial = (materialOptions?: MaterialOptions | string) => Material

let materialId = 0

export const createMaterialFactory =
  (materials: Record<string | symbol, Material>): CreateMaterial =>
  (materialOptions = {}) => {
    const {
      friction,
      name = Symbol.for(`Material${materialId++}`),
      restitution,
    }: MaterialOptions = typeof materialOptions === 'string'
      ? { name: materialOptions }
      : { ...materialOptions }
    return (materials[name] ||= new Material({ friction, name, restitution } as MaterialOptions))
  }
