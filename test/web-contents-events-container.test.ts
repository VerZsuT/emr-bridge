import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { WebContents } from 'electron'

import WebContentsEventsContainer from '../src/scripts/helpers/web-contents-events-container.js'

interface IFakeSender {
    alive: boolean
    isDestroyed(): boolean
}

function createSender(): IFakeSender {
    return {
        alive: true,
        isDestroyed() {
            return !this.alive
        }
    }
}

function asWebContents(sender: IFakeSender): WebContents {
    return sender as unknown as WebContents
}

function containers(container: WebContentsEventsContainer): Map<string, unknown> {
    return (container as unknown as { containers: Map<string, unknown> }).containers
}

describe('WebContentsEventsContainer', () => {
    it('дедуплицирует отправителя с несколькими on-подписками', () => {
        const container = new WebContentsEventsContainer()
        const sender = createSender()

        container.addOn('event', asWebContents(sender))
        container.addOn('event', asWebContents(sender))

        assert.equal(container.getAll('event').length, 1)

        container.removeOn('event', asWebContents(sender))

        assert.equal(container.getAll('event').length, 1)

        container.removeOn('event', asWebContents(sender))

        assert.equal(container.getAll('event').length, 0)
        assert.equal(containers(container).size, 0)
    })

    it('возвращает одного отправителя, если он есть в on и once', () => {
        const container = new WebContentsEventsContainer()
        const sender = createSender()

        container.addOn('event', asWebContents(sender))
        container.addOnce('event', asWebContents(sender))

        assert.deepEqual(container.getOn('event'), [asWebContents(sender)])
        assert.deepEqual(container.getOnce('event'), [asWebContents(sender)])
        assert.equal(container.getAll('event').length, 1)

        container.clearOnce('event')

        assert.equal(container.getOnce('event').length, 0)
        assert.equal(container.getAll('event').length, 1)
    })

    it('удаляет событие после отписки и очистки once', () => {
        const container = new WebContentsEventsContainer()
        const sender = createSender()

        container.addOnce('event', asWebContents(sender))
        container.removeOnce('event', asWebContents(sender))

        assert.equal(containers(container).size, 0)
    })

    it('не создаёт контейнер при чтении неизвестного события', () => {
        const container = new WebContentsEventsContainer()

        assert.deepEqual(container.getAll('missing'), [])
        assert.deepEqual(container.getOn('missing'), [])
        assert.deepEqual(container.getOnce('missing'), [])
        assert.equal(containers(container).size, 0)
    })

    it('вычищает уничтоженные отправители', () => {
        const container = new WebContentsEventsContainer()
        const alive = createSender()
        const destroyed = createSender()

        container.addOn('event', asWebContents(alive))
        container.addOn('event', asWebContents(destroyed))

        destroyed.alive = false

        assert.deepEqual(container.getAll('event'), [asWebContents(alive)])

        alive.alive = false

        assert.deepEqual(container.getAll('event'), [])
        assert.equal(containers(container).size, 0)
    })

    it('игнорирует отписку неизвестного отправителя', () => {
        const container = new WebContentsEventsContainer()
        const sender = createSender()

        assert.doesNotThrow(() => container.removeOn('event', asWebContents(sender)))
        assert.doesNotThrow(() => container.removeOnce('event', asWebContents(sender)))
    })
})
