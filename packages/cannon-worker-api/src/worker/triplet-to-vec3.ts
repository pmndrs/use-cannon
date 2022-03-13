import { Vec3 } from 'cannon-es'

import type { Triplet } from '../types'

export const tripletToVec3 = (t?: Triplet) => (t ? new Vec3(...t) : undefined)
