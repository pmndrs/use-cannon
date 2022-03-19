# @pmndrs/cannon-worker-api Changelog

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
