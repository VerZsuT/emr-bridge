import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { emitEvent, on, publishFunction, publishVariable } from '../src/scripts/main/publish.js'

publishFunction('preloadSum', (a: number, b: number) => a + b)
publishFunction('preloadDelay', (value: string) => (
    new Promise<string>(resolve => setTimeout(() => resolve(value), 1))
))

let value = 0

publishVariable('preloadValue', {
    get: () => value,
    set: next => {
        value = next
    }
})

const { default: Bridge } = await import('../src/scripts/preload/bridge.js')
const bridge = Bridge.as<any>()

describe('preload bridge', () => {
    it('вызывает синхронную и асинхронную функции', async () => {
        assert.equal(bridge.preloadSum(2, 3), 5)
        assert.equal(await bridge.preloadDelay('ok'), 'ok')
    })

    it('работает с переменной', () => {
        bridge.preloadValue = 9

        assert.equal(bridge.preloadValue, 9)
    })

    it('обменивается событиями с main', () => {
        const receivedFromRenderer: unknown[] = []
        const unsubscribeMain = on('preload-r2m', payload => receivedFromRenderer.push(payload))

        bridge.emit('preload-r2m', { id: 1 })

        assert.deepEqual(receivedFromRenderer, [{ id: 1 }])

        unsubscribeMain()

        const receivedFromMain: unknown[] = []
        const unsubscribeRenderer = bridge.on('preload-m2r', (payload: unknown) => receivedFromMain.push(payload))

        emitEvent('preload-m2r', 'hello')
        emitEvent('preload-m2r', 'world')

        assert.deepEqual(receivedFromMain, ['hello', 'world'])

        unsubscribeRenderer()
        emitEvent('preload-m2r', 'ignored')

        assert.deepEqual(receivedFromMain, ['hello', 'world'])
    })
})
