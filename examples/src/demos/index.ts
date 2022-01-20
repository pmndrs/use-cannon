import { lazy } from 'react'

const KinematicCube = { Component: lazy(() => import('./KinematicCube')) }
const CubeHeap = { Component: lazy(() => import('./CubeHeap')) }
const ConvexPolyhedron = { Component: lazy(() => import('./ConvexPolyhedron')) }
const Pingpong = { Component: lazy(() => import('./Pingpong')) }
const MondayMorning = { Component: lazy(() => import('./MondayMorning')) }
const Constraints = { Component: lazy(() => import('./Constraints')) }
const Chain = { Component: lazy(() => import('./Chain')) }
const HingeMotor = { Component: lazy(() => import('./HingeMotor')) }
const CompoundBody = { Component: lazy(() => import('./CompoundBody')) }
const Raycast = { Component: lazy(() => import('./Raycast')) }
const Vehicle = { Component: lazy(() => import('./RaycastVehicle')) }
const Triggers = { Component: lazy(() => import('./Triggers')) }
const Trimesh = { Component: lazy(() => import('./Trimesh')) }
const Heightfield = { Component: lazy(() => import('./Heightfield')) }
const SphereDebug = { Component: lazy(() => import('./SphereDebug')) }
const Friction = { Component: lazy(() => import('./Friction')) }

export {
  Chain,
  CompoundBody,
  Constraints,
  ConvexPolyhedron,
  CubeHeap,
  Friction,
  Heightfield,
  HingeMotor,
  KinematicCube,
  MondayMorning,
  Pingpong,
  Raycast,
  SphereDebug,
  Triggers,
  Trimesh,
  Vehicle,
}
