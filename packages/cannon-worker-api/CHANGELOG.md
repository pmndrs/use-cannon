# @pmndrs/cannon-worker-api Changelog

## 2.4.0

### Minor Changes

- 800a687: feat(props-to-body): support both quaternion and rotation props, prefer quaternion if both provided (@Soham1803)
- 22d49ef: chore: update @types/three dev dependency

## v2.3.2 - 2023-01-05

- [`README.md`] Improve links to related packages (@bjornstar)

## v2.3.1 - 2022-11-11

- Make sure to include dist in npm package (@bjornstar)

## v2.3.0 - 2022-11-03

- Remove subscriptions when removing bodies and vehicles (@alex-shortt)

## v2.2.0 - 2022-08-18

- Add support for `frictionGravity` on WorldProps (@chnicoloso)

## v2.1.0 - 2022-04-02

- New private method `postMessage` that queues the messages if there is no worker
- New public method: `connect`, we instantiate the worker, add the onmessage handler and flush the messageQueue
- New public method: `disconnect`, removes the onmessage handler (probably unnecessary)
- `init` now takes `world` instead of `state`

## v2.0.0 - 2022-04-01

- `three.js` is now a `peerDependency` and requires r139 or higher
- Updated many `devDependencies`

## v1.1.0 - 2022-03-19

- [WorkerRayHitEvent] from & to are optional (@bjornstar)
- [WorkerRayHitEvent] Omit methods from shape type (@bjornstar)
- [`src/worker`] self.postMessage should be typed to ensure we match API types (@bjornstar)
- [`src/worker`] Stop using non-null assertions (@bjornstar)
- [`addBodies`] If the body or target does not have a uuid, don't process the event (@bjornstar)
- [`addRay`] If the body does not have a uuid, don't process the event (@bjornstar)
- [`package.json`] Has one dependency: `three` (@bjornstar)
- [`.eslintrc.json`] Clean up (@bjornstar)
- [`.eslintrc.json`] Disallow non-null assertions (@bjornstar)

## v1.0.1 - 2022-03-14

- Specify targetPlatform: 'browser' (@isaac-mason)

## v1.0.0 - 2022-03-13

- Initial Release
