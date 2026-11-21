import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// @ts-expect-error -- тестовый стаб Electron не имеет деклараций
import { ipcRenderer } from './stubs/electron.mjs'

import { emitEvent, on, publishFunction, publishVariable } from '../src/scripts/main/publish.js'
import provideFromMain from '../src/scripts/preload/provider.js'

class Human {
    public name: string

    public constructor(name = '') {
        this.name = name
    }

    public takeSnapshot() {
        return { name: this.name }
    }

    public updateFromSnapshot(snapshot: { name: string }) {
        this.name = snapshot.name
    }
}

const globals = globalThis as unknown as { window: Record<string, any> }

globals.window = {}

publishFunction('sum', (a: number, b: number) => a + b)
publishFunction('humanName', (human: Human) => human.name, [Human])
publishFunction('makeHuman', () => new Human('Artem'))
publishFunction('makeHumanAsync', async () => new Human('Olga'))
publishFunction('delay', (value: number) => (
    new Promise<number>(resolve => setTimeout(() => resolve(value), 5))
))

let counter = 0

publishVariable('counter', {
    get: () => counter,
    set: value => {
        counter = value
    }
})

provideFromMain(false)

const { default: Bridge } = await import('../src/scripts/renderer/bridge.js')
const bridge = Bridge.as<any>()

describe('renderer bridge', () => {
    it('вызывает синхронную функцию', () => {
        assert.equal(bridge.sum(2, 3), 5)
    })

    it('вызывает асинхронную функцию', async () => {
        assert.equal(await bridge.delay(10), 10)
    })

    it('не путает результаты параллельных обещаний', async () => {
        const values = await Promise.all([
            bridge.delay(1),
            bridge.delay(2),
            bridge.delay(3)
        ])

        assert.deepEqual(values, [1, 2, 3])
    })

    it('читает и устанавливает переменную', () => {
        assert.equal(bridge.counter, 0)

        bridge.counter = 7

        assert.equal(bridge.counter, 7)
        assert.equal(counter, 7)
    })

    it('передаёт снимок аргументом', () => {
        assert.equal(bridge.humanName(new Human('Dima')), 'Dima')
    })

    it('преобразует снимок результата через call', () => {
        const human = bridge.call(bridge.makeHuman, Human)

        assert.ok(human instanceof Human)
        assert.equal(human.name, 'Artem')
    })

    it('преобразует снимок результата асинхронной функции через call', async () => {
        const human = await bridge.call(bridge.makeHumanAsync, Human)

        assert.ok(human instanceof Human)
        assert.equal(human.name, 'Olga')
    })

    it('отправляет событие в main и отписывается', () => {
        const received: unknown[] = []
        const unsubscribe = on('bridge-r2m', value => received.push(value))

        bridge.emit('bridge-r2m', 'hello')
        bridge.emit('bridge-r2m', { id: 1 })

        assert.deepEqual(received, ['hello', { id: 1 }])

        unsubscribe()
        bridge.emit('bridge-r2m', 'ignored')

        assert.deepEqual(received, ['hello', { id: 1 }])
    })

    it('получает событие из main и отписывается', () => {
        const received: unknown[] = []
        const unsubscribe = bridge.on('bridge-m2r', (value: unknown) => received.push(value))

        emitEvent('bridge-m2r', 1)
        emitEvent('bridge-m2r', 2)

        assert.deepEqual(received, [1, 2])

        unsubscribe()
        emitEvent('bridge-m2r', 3)

        assert.deepEqual(received, [1, 2])
    })

    it('получает одноразовое событие из main', () => {
        const received: unknown[] = []

        bridge.once('bridge-m2r-once', (value: unknown) => received.push(value))

        emitEvent('bridge-m2r-once', 1)
        emitEvent('bridge-m2r-once', 2)

        assert.deepEqual(received, [1])
    })

    it('запрещает подписку на произвольный канал обещания', async () => {
        const provider = globals.window.__provider__

        await assert.rejects(
            new Promise((resolve, reject) => {
                provider.waitPromise('EVENT_ON', resolve, reject)
            }),
            /Неизвестный канал обещания/
        )
    })

    it('не позволяет вызвать функцию с некорректными аргументами', () => {
        const provider = globals.window.__provider__

        assert.throws(
            () => provider.entities.functions.sum(1, []),
            /Некорректные аргументы/
        )
    })

    it('сообщает main об отписке и прекращает IPC-рассылку', () => {
        const unsubscribe = bridge.on('bridge-off-check', () => {})

        unsubscribe()

        const received: unknown[] = []

        ;(ipcRenderer as any).on('EVENT_EMIT_bridge-off-check', (_: unknown, result: any) => {
            received.push(result.value)
        })

        emitEvent('bridge-off-check', 1)

        assert.deepEqual(received, [])
    })

    it('корректно отписывает локальный обработчик IPC', () => {
        const unsubscribe = bridge.on('bridge-m2r-local', () => {})
        const channel = 'EVENT_EMIT_bridge-m2r-local'

        assert.ok((ipcRenderer as any).listenerCount(channel) > 0)

        unsubscribe()

        assert.equal((ipcRenderer as any).listenerCount(channel), 0)
    })
})
