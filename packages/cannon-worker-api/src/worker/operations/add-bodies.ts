import { propsToBody } from '../../props-to-body'
import type { CannonMessageMap } from '../../types'
import type { CreateMaterial } from '../material'
import type { State } from '../state'
import type { CannonCollideEvent, CannonWorkerGlobalScope } from '../types'

declare const self: CannonWorkerGlobalScope

export const addBodies = (
  state: State,
  createMaterial: CreateMaterial,
  { props, type, uuid }: CannonMessageMap['addBodies'],
) => {
  for (let i = 0; i < uuid.length; i++) {
    const body = propsToBody({
      createMaterial,
      props: props[i],
      type,
      uuid: uuid[i],
    })
    state.world.addBody(body)

    if (props[i].onCollide)
      body.addEventListener('collide', ({ type, body, target, contact }: CannonCollideEvent) => {
        if (!body.uuid || !target.uuid) return

        const { ni, ri, rj, bi, bj, id } = contact
        const contactPoint = bi.position.vadd(ri)
        const contactNormal = bi === body ? ni : ni.scale(-1)

        self.postMessage({
          body: body.uuid,
          collisionFilters: {
            bodyFilterGroup: body.collisionFilterGroup,
            bodyFilterMask: body.collisionFilterMask,
            targetFilterGroup: target.collisionFilterGroup,
            targetFilterMask: target.collisionFilterMask,
          },
          contact: {
            // @ts-expect-error TODO: use id instead of uuid
            bi: bi.uuid,
            // @ts-expect-error TODO: use id instead of uuid
            bj: bj.uuid,
            // Normal of the contact, relative to the colliding body
            contactNormal: contactNormal.toArray(),
            // World position of the contact
            contactPoint: contactPoint.toArray(),
            id,
            impactVelocity: contact.getImpactVelocityAlongNormal(),
            ni: ni.toArray(),
            ri: ri.toArray(),
            rj: rj.toArray(),
          },
          op: 'event',
          target: target.uuid,
          type,
        })
      })
  }
}
