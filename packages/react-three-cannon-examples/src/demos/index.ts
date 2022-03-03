import { lazy } from 'react'

const fileDemos = [
  'Chain',
  'CompoundBody',
  'Constraints',
  'ConvexPolyhedron',
  'CubeHeap',
  'Friction',
  'Heightfield',
  'HingeMotor',
  'KinematicCube',
  'Paused',
  'SphereDebug',
  'Triggers',
  'Trimesh',
] as const

const folderDemos = ['MondayMorning', 'Pingpong', 'Raycast', 'RaycastVehicle'] as const

export const demoList = [...folderDemos, ...fileDemos] as const

export type Demo = typeof demoList[number]
export const isDemo = (v: unknown): v is Demo => demoList.includes(v as Demo)

type FolderDemo = typeof folderDemos[number]
const isFolderDemo = (v: unknown): v is FolderDemo => folderDemos.includes(v as FolderDemo)

export const demos = demoList.reduce((o, demo) => {
  o[demo] = {
    Component: lazy(() => import(isFolderDemo(demo) ? `./${demo}/index.tsx` : `./demo-${demo}.tsx`)),
  }
  return o
}, {} as Record<Demo, { Component: React.LazyExoticComponent<React.ComponentType> }>)
