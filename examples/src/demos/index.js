import { lazy } from 'react'

const KinematicCube = { descr: '', tags: [], Component: lazy(() => import('./KinematicCube')), bright: false }
const CubeHeap = { descr: '', tags: [], Component: lazy(() => import('./CubeHeap')), bright: false }
const ConvexPolyhydron = { descr: '', tags: [], Component: lazy(() => import('./ConvexPolyhydron')), bright: false }

export { KinematicCube, CubeHeap, ConvexPolyhydron }
