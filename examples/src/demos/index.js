import { lazy } from 'react'

const KinematicCube = { descr: '', tags: [], Component: lazy(() => import('./KinematicCube')), bright: false }
const CubeHeap = { descr: '', tags: [], Component: lazy(() => import('./CubeHeap')), bright: false }
const ConvexPolyhedron = {
  descr: '',
  tags: [],
  Component: lazy(() => import('./ConvexPolyhedron')),
  bright: false,
}
const Pingpong = { descr: '', tags: [], Component: lazy(() => import('./Pingpong')), bright: false }
const MondayMorning = { descr: '', tags: [], Component: lazy(() => import('./MondayMorning')), bright: false }
const Constraints = { descr: '', tags: [], Component: lazy(() => import('./Constraints')), bright: false }
const Chain = { descr: '', tags: [], Component: lazy(() => import('./Chain')), bright: false }
const HingeMotor = { descr: '', tags: [], Component: lazy(() => import('./HingeMotor')), bright: false }
const CompoundBody = { descr: '', tags: [], Component: lazy(() => import('./CompoundBody')), bright: false }
const Raycast = { descr: '', tags: [], Component: lazy(() => import('./Raycast')), bright: false }
const Vehicle = { descr: '', tags: [], Component: lazy(() => import('./RaycastVehicle')), bright: false }
const Triggers = { descr: '', tags: [], Component: lazy(() => import('./Triggers')), bright: false }
const Trimesh = { descr: '', tags: [], Component: lazy(() => import('./Trimesh')), bright: false }
const Heightfield = { descr: '', tags: [], Component: lazy(() => import('./Heightfield')), bright: false }

export {
  MondayMorning,
  Pingpong,
  KinematicCube,
  CubeHeap,
  ConvexPolyhedron,
  Chain,
  HingeMotor,
  Constraints,
  CompoundBody,
  Raycast,
  Vehicle,
  Triggers,
  Trimesh,
  Heightfield,
}
