# @react-three/cannon Changelog

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
