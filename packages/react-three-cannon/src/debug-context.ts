import type { BodyProps, BodyShapeType } from '@pmndrs/cannon-worker-api'
import { createContext } from 'react'

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export const debugContext = createContext<DebugApi | null>(null)
