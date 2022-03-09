import { Material } from 'cannon-es'

type MaterialOptions = {
  friction?: number
  name?: string | symbol
  restitution?: number
}

export type CreateMaterial = (nameOrOptions?: MaterialOptions | string) => Material

let materialId = 0

export const createMaterialFactory =
  (materials: Record<string | symbol, Material>): CreateMaterial =>
  (nameOrOptions = {}) => {
    const materialOptions =
      typeof nameOrOptions === 'string'
        ? { name: nameOrOptions }
        : { name: Symbol.for(`Material${materialId++}`), ...nameOrOptions }
    const { name } = materialOptions
    materials[name] = materials[name] || new Material(materialOptions)
    return materials[name]
  }
