# @react-three/cannon Changelog

## 6.6.0

### Minor Changes

- 22d49ef: chore: update @types/three dev dependency

### Patch Changes

- Updated dependencies [800a687]
- Updated dependencies [22d49ef]
  - @pmndrs/cannon-worker-api@2.4.0

## v6.5.2 - 2023-01-05

- [`README.md`] Update shields badge to point to match their new route (@bjornstar)

## v6.5.1 - 2022-11-11

- Make sure to include dist in npm package (@bjornstar)

## v6.5.0 - 2022-11-03

- Update `@pmndrs/cannon-worker-api` to v2.3.0 (@bjornstar)

## v6.4.0 - 2022-08-18

- Add support for `frictionGravity` on WorldProps (@chnicoloso)

## v6.3.0 - 2022-04-18

- DebugProvider explicitly lists children as a prop (@bjornstar)
- Prefer PropsWithChildren over FC (@bjornstar)
- Prefer function declarations over const (@bjornstar)
- [`hooks`] All hooks are now generic, they accept any Object3D and return refs of whatever type was passed in (@bjornstar)
- Update @types/react to v18 (@bjornstar)

## v6.2.0 - 2022-04-08

- Add scaleOverride (@bjornstar)

## v6.1.0 - 2022-04-02

- Now calls `connect` before `init` in a useEffect (instead of useLayoutEffect)
- Update `@pmndrs/cannon-worker-api` to v2.1.0

## v6.0.0 - 2022-04-01

- Removed the Suspense wrapper around Physics, you will need to provide your own suspense boundary from now on
- `react` is now a `peerDependency` and requires v18 or higher
- `three.js` is now a `peerDependency` and requires r139 or higher
- `@react-three/fiber` is now a `peerDependency` and requires v8 or higher
- `@pmndrs/cannon-worker-api` is now a `dependency`
- `cannon-es` is now a `dependency`
- `cannon-es-debugger` is now a `dependency`
- Updated many `devDependencies`

## v5.1.0 - 2022-03-19

- Access the physics context with the `usePhysicsContext` hook, which immediately gives you a clear error message when trying to access physics components or hooks outside of a Physics provider (@bjornstar)
- Renamed `context` to `physicsContext` (@bjornstar)
- Added a `useDebugContext` hook for consistency (@bjornstar)
- [`Provider.tsx`] Renamed to `physics-provider.tsx` (@bjornstar)
- [`Debug.tsx`] Renamed to `debug-provider.tsx` (Still exported as Debug & DebugProps) (@bjornstar)
- [`physics-provider.tsx`] One useState call that contains the whole context (@bjornstar)
- [`physics-provider.tsx`] bodies is not a ref, no need to access current (@bjornstar)
- [`setup.ts`] Removed, split into more appropriately named modules (@bjornstar)
- [`worker.d.ts`] Removed, belongs in cannon-worker-api (@bjornstar)
- [`package.json`] Use dependencies rather than peerDependencies (@bjornstar)
- [`.eslintrc.json`] Clean up (@bjornstar)
- [`.eslintrc.json`] Disallow non-null assertions (@bjornstar)

## v5.0.1 - 2022-03-14

- Bump @pmndrs/cannon-worker-api to v1.0.1 (@bjornstar)

## v5.0.0 - 2022-03-13

- Use newly isolated @pmndrs/cannon-worker-api (@isaac-mason)
- Removed useUpdateWorldPropsEffect (@bjornstar)
- [`package.json`] Added homepage property to go directly to the package (@bjornstar)
- [`rollup.config.js`] Specify targetPlatform: 'browser' (@bjornstar)
- [`tsconfig.json`] Alphabetize contents (@bjornstar)

## v4.9.0 - 2022-03-03

- [`dependencies`] Updated `three` & `@types/three` from `r135` to `r137` (@bjornstar)
- [`examples/dependencies`] Updated `@react-three/drei` from `v8.3.1` to `v8.11.1` (@bjornstar)
- [`examples/dependencies`] Updated `@react-three/drei` from `v8.3.1` to `v8.11.1` (@bjornstar)
- [`examples/dependencies`] Updated `three` & `@types/three` from `r135` to `r137` (@bjornstar)
- [`examples/dependencies`] Updated `three-stdlib` from `2.6.1` to `v2.8.8` (@bjornstar)
- [`esmaples/dependencies`] Removed `postprocessing`, it was unused (@bjornstar)
- [`examples`] Updated GLTF types (@bjornstar)

## v4.8.0 - 2022-02-28

- Created CannonWorkerAPI (@isaac-mason)
- Converted worker to typescript (@bjornstar)
- [`examples/RaycastVehicle`] Use a single keyup/keydown event handler (@bjornstar)
-

## v4.7.0 - 2022-02-12

- [ESLint] Disallow enums (@bjornstar)
- Add missing worker 'setMaterial' op handler (@isaac-mason)
- Add isPaused property (@grndctrl & @bjornstar)
  - BREAKING: step renamed to stepSize (default: 1 / 60)
  - NEW: maxSubSteps (default: 10)
  - NEW: isPaused (fixes Pause Simulation #212)
  - NEW: Paused demo
  - timeSinceLastCall not tracked in worker
  - prefer FC to PropsWithChildren
  - REMOVED: type DefaultContactMaterial

## v4.6.1 - 2022-01-19

- [`createMaterialFactory`] Do not use logical assignment operator (@bjornstar)
- [`eslint`] Disallow logical assignment and nullish coalescing operators (@bjornstar)

## v4.6.0 - 2022-01-15

- [`hooks`] Add `useContactMaterial` (@Glavin001)
- [`examples`] Add `Friction` example (@Glavin001)
- [`examples`] Add title to links (@Glavin001)

## v4.5.0 - 2022-01-08

- [`constraintOptns`] Add `maxMultiplier` (@Glavin001)

## v4.4.1 - 2022-01-04

- [Hooks] Destructure and set defaults intead of using `??` (@bjornstar)
- [`useRaycastVehicle`] Use correct ordering for arguments (@bjornstar)
- [`examples/RaycastVehicle`] Reset restores the vehicle to it's initial angularVelocity, position, & rotation (@bjornstar)

## v4.4.0 - 2022-01-01

- Upgrade cannon-es-debugger to 1.0.0 (@marcofugaro)
- [`Debug`] Improve implementation (@bjornstar)
- [`examples/RaycastVehicle`] Press `?` to debug (@bjornstar)

## v4.3.1 - 2021-12-30

- Fix RaycastVehicle example (@marcofugaro)

## v4.3.0 - 2021-12-18

- Add AtomicName & VectorName to the README (@bjornstar)
- Update vite to v2.7.3, change vite.config.js to vite.config.ts (@bjornstar)
- [examples] add missing peer dependency: react-is (@bjornstar)
- Update all dependencies, fix example routes for react-router-dom v6 (@bjornstar)

## v4.2.0 - 2021-12-01

- [Types] Use `PropsWithChildren` from React instead of `children: ReactNode` (@bjornstar)
- [README.md] Update default Physics prop values (@bjornstar)
- export \* from `'./setup'` there are a lot of useful types in here (@bjornstar)
- Build using jsx runtime instead of React runtime for a slightly smaller bundle (@bjornstar)
- [CHANGELOG.md] Add details for v3.1.1 & v3.1.2 (@bjornstar)

## v4.1.0 - 2021-11-21

- Update default gravity value from `-10` to `-9.81` (@alexandernanberg)
- [devDependencies] Update to latest versions (@bjornstar)
- [CHANGELOG.md] Start writing a changelog (@bjornstar)
- [README.md] Replace `boxBufferGeometry` with `boxGeometry` and `planeBufferGeometry` with `planeGeometry` (@drcmda)
- [examples/devDependencies] Update to latest version (@bjornstar)

## v4.0.1 - 2021-10-06

- Fix an bug where multiple rotations shared an array (@bjornstar)

## v4.0.0 - 2021-10-05

- Add quaternion API, convert from quaternion to rotation correctly (@bjornstar)
- useSphere args must be an array (@bjornstar)
- [Typescript] Add types for world messages (like setGravity) (@bjornstar)
- Prefer CannonEvent over global Event type name (@bjornstar)
- [TypeScript] Improve set and subscribe API (@bjornstar)

## v3.1.2 - 2021-09-02

- Rebuild package (@stockHuman)

## v3.1.1 - 2021-09-02

- Fix useRaycastVehicle, getUUID was receiving unintended index values (@bjornstar)
- [README.md] Update demos to point to cannon.pmnd.rs (@bjornstar)

## v3.1.0 - 2021-09-01

- [Examples] Convert Kinematic Cube to TypeScript (#262) (@bjornstar)
- [Examples] Convert Heightmap to TypeScript (#264) (@bjornstar)
- [Examples] Convert SphereDebug to TypeScript (#261) (@bjornstar)
- [Examples] Convert Hinge Motor to TypeScript (#263) (@bjornstar)
- [Examples] Convert Cube Heap to TypeScript (#265) (@bjornstar)
- [Examples] Convert Convex Polyhedron to TypeScript (#266) (@bjornstar)
- [Examples] Convert Compound Body to TypeScript (#268) (@bjornstar)
- [Examples] Convert Constraints to TypeScript (#267) (@bjornstar)
- [Examples] Convert Raycast Vehicle to TypeScript (#270) (@bjornstar)
- [Examples] Convert Chain to TypeScript (#269) (@bjornstar)
- [Examples] Convert Raycast to TypeScript (#271) (@bjornstar)
- [Examples] Convert Ping Pong to TypeScript (@bjornstar)
- [readme.md] Switch build badge from travis to github (@bjornstar)
- Use Ref to allow for forwarded refs (@bjornstar)
- Use React.DependencyList instead of any[] for deps (@bjornstar)
- [CI] Test on node v14 as vercel doesn't support 16 yet (@bjornstar)

## v3.0.1 - 2021-08-23

- Resolve three ourselves to avoid multiple three instances and failed instanceof checks (@bjornstar)

## v3.0.0 - 2021-08-21

- Fix return type of subscribe function (@skuteli)
- [types] mutableRefObject should default to null (@bjornstar)
- Start converting examples to typescript (@bjornstar)
- [CI] Try to build the examples (@bjornstar)
- Fix getUUID (@bjornstar)
- Specify all op strings (@bjornstar)
- Remove .travis.yml, update ignores (@bjornstar)
- [Examples] Readme & Usability Improvements (@bjornstar)
- Convert Triggers example to typescript (@bjornstar)
- Convert Trimesh Example to typescript (@bjornstar)

## v2.6.1 - 2021-08-15

- Rebuild package (@stockHuman)

## v2.6.0 - 2021-08-11

- Switch from CRA to vite (@bjornstar)
- feat: add applyTorque API to body (@a-type)

## v2.5.1 - 2021-07-29

- Update readme.md (@kevinmcalear)
- Improve readme (@bjornstar)
- Wrap in canvas (@bjornstar)
- support missing world attributes (@drcmda)

## v2.5.0 - 2021-07-01

- Add shouldInvalidate to readme code (@aunyks)
- [Examples] CubeHeap, click to change to spheres (@bjornstar)
- Expose WakeUp & Sleep API (stockHuman)

## v2.4.0 - 2021-06-28

- Remove dead code (@Gusted)
- Setup automated hygiene (@bjornstar)
- Add prepare script (@bjornstar)
- Run CI on the master branch (@bjornstar)
- Don't build examples (@bjornstar)
- Add 'shouldInvalidate' prop to Physics provider component to allow for pausing the simulation (@aunyks)
- Update bug_report.md (@stockHuman)
- Integrate pausing functionality (@stockHuman)
- Set printWidth to 110 (@bjornstar)
