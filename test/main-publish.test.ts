import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// @ts-expect-error -- тестовый стаб Electron не имеет деклараций
import { ipcRenderer, sender } from './stubs/electron.mjs'

import { InvalidEntityNameError, InvalidEventNameError } from '../src/errors.js'
import { emitEvent, on, once, publishFunction, publishVariable } from '../src/scripts/main/publish.js'

class Human {
    public name = ''

    public takeSnapshot() {
        return { name: this.name }
    }

    public updateFromSnapshot(snapshot: { name: string }) {
        if (!snapshot || typeof snapshot.name !== 'string') {
            throw new TypeError('Bad snapshot')
        }

        this.name = snapshot.name
    }
}

function call(channel: string, payload?: unknown): any {
    return (ipcRenderer as any).sendSync(channel, payload)
}

async function callAsync(name: string, args: unknown[], id = 'test-id'): Promise<any> {
    const response = call(`FUNCTION_CALL_${name}`, { args, id })

    assert.equal(typeof response.promiseChannel, 'string')

    return await new Promise((resolve) => {
        const listener = (_: unknown, payload: any) => {
            if (payload.id !== id) {
                return
            }

            ;(ipcRenderer as any).removeListener(response.promiseChannel, listener)
            resolve(payload)
        }

        ;(ipcRenderer as any).on(response.promiseChannel, listener)
    })
}

function tick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

describe('main publish', () => {
    it('публикует синхронную функцию и возвращает id', () => {
        publishFunction('sum', (a: number, b: number) => a + b)

        assert.deepEqual(call('FUNCTION_CALL_sum', { args: [1, 2], id: '1' }), {
            value: 3,
            id: '1'
        })
    })

    it('публикует асинхронную функцию', async () => {
        publishFunction('asyncValue', async (value: string) => value.toUpperCase())

        const response = await callAsync('asyncValue', ['ok'])

        assert.equal(response.value, 'OK')
        assert.equal(response.id, 'test-id')
    })

    it('возвращает ошибку синхронной и асинхронной функции', async () => {
        publishFunction('throwsSync', () => {
            throw new Error('sync boom')
        })
        publishFunction('throwsAsync', async () => {
            throw new Error('async boom')
        })

        const syncResult = call('FUNCTION_CALL_throwsSync', { args: [], id: '1' })
        const asyncResult = await callAsync('throwsAsync', [])

        assert.match(syncResult.error, /sync boom/)
        assert.match(asyncResult.error, /async boom/)
    })

    it('не падает на некорректном запросе', () => {
        publishFunction('safe', () => 'ok')

        for (const payload of [null, undefined, 'x', { args: 'x' }, { args: [], id: 1 }]) {
            const response = call('FUNCTION_CALL_safe', payload)

            assert.equal(typeof response.error, 'string')
        }
    })

    it('восстанавливает снимок аргумента', () => {
        publishFunction('humanName', (human: Human) => human.name, [Human])

        const response = call('FUNCTION_CALL_humanName', {
            args: [{ __type__: 'snapshot', __snapshot__: { name: 'Dima' } }],
            id: '1'
        })

        assert.equal(response.value, 'Dima')
    })

    it('возвращает снимок значения', () => {
        publishFunction('makeHuman', () => {
            const human = new Human()
            human.name = 'Artem'
            return human
        })

        const response = call('FUNCTION_CALL_makeHuman', { args: [], id: '1' })

        assert.deepEqual(response.value, {
            __type__: 'snapshot',
            __snapshot__: { name: 'Artem' }
        })
    })

    it('работает с falsy-значением переменной', () => {
        publishVariable('zero', { value: 0 })

        assert.deepEqual(call('PROPERTY_GET_zero'), { value: 0 })
    })

    it('читает и изменяет переменную', () => {
        let value = 1

        publishVariable('counter', {
            get: () => value,
            set: next => {
                value = next
            }
        })

        assert.equal(call('PROPERTY_GET_counter').value, 1)
        assert.deepEqual(call('PROPERTY_SET_counter', { args: [5] }), { value: null })
        assert.equal(call('PROPERTY_GET_counter').value, 5)
    })

    it('возвращает ошибки для отсутствующих get/set', () => {
        publishVariable('readonly', { value: 1 })
        publishVariable('writeonly', {
            set: () => {}
        })

        assert.match(call('PROPERTY_SET_readonly', { args: [2] }).error, /только для чтения/)
        assert.match(call('PROPERTY_GET_writeonly').error, /Нет доступа/)
    })

    it('удаляет старый setter при повторной публикации', () => {
        let value = 1

        publishVariable('republished', {
            get: () => value,
            set: next => {
                value = next
            }
        })
        publishVariable('republished', { get: () => value })

        assert.match(call('PROPERTY_SET_republished', { args: [2] }).error, /только для чтения/)
        assert.equal(value, 1)
    })

    it('вызывает обработчик события из renderer и отписывается', () => {
        const received: unknown[] = []
        const unsubscribe = on('r2m', value => received.push(value))

        ;(ipcRenderer as any).send('EVENT_EMIT_r2m', { value: 'a' })
        ;(ipcRenderer as any).send('EVENT_EMIT_r2m', { value: { b: 1 } })

        assert.deepEqual(received, ['a', { b: 1 }])

        unsubscribe()
        ;(ipcRenderer as any).send('EVENT_EMIT_r2m', { value: 'c' })

        assert.deepEqual(received, ['a', { b: 1 }])
    })

    it('вызывает одноразовый обработчик только один раз', () => {
        const received: unknown[] = []

        once('r2m-once', value => received.push(value))
        ;(ipcRenderer as any).send('EVENT_EMIT_r2m-once', { value: 1 })
        ;(ipcRenderer as any).send('EVENT_EMIT_r2m-once', { value: 2 })

        assert.deepEqual(received, [1])
    })

    it('игнорирует некорректное событие из renderer', () => {
        let called = false

        on('r2m-invalid', () => {
            called = true
        })

        assert.doesNotThrow(() => {
            ;(ipcRenderer as any).send('EVENT_EMIT_r2m-invalid', null)
            ;(ipcRenderer as any).send('EVENT_EMIT_r2m-invalid', { value: 1, error: 2 })
        })
        assert.equal(called, false)
    })

    it('восстанавливает снимок события', () => {
        const received: Human[] = []

        on('r2m-snapshot', human => received.push(human), Human)
        ;(ipcRenderer as any).send('EVENT_EMIT_r2m-snapshot', {
            value: { __type__: 'snapshot', __snapshot__: { name: 'Olga' } }
        })

        assert.equal(received.length, 1)
        assert.ok(received[0] instanceof Human)
        assert.equal(received[0].name, 'Olga')
    })

    it('отправляет событие в renderer', () => {
        const received: unknown[] = []

        ;(ipcRenderer as any).send('EVENT_ON', { value: 'm2r' })
        ;(ipcRenderer as any).on('EVENT_EMIT_m2r', (_: unknown, result: any) => received.push(result.value))

        emitEvent('m2r', 42)

        assert.deepEqual(received, [42])
    })

    it('отправляет одноразовое событие в renderer один раз', () => {
        const received: unknown[] = []

        ;(ipcRenderer as any).send('EVENT_ONCE', { value: 'm2r-once' })
        ;(ipcRenderer as any).on('EVENT_EMIT_m2r-once', (_: unknown, result: any) => received.push(result.value))

        emitEvent('m2r-once', 1)
        emitEvent('m2r-once', 2)

        assert.deepEqual(received, [1])
    })

    it('прекращает отправку после отписки', () => {
        const received: unknown[] = []

        ;(ipcRenderer as any).send('EVENT_ON', { value: 'm2r-off' })
        ;(ipcRenderer as any).on('EVENT_EMIT_m2r-off', (_: unknown, result: any) => received.push(result.value))

        emitEvent('m2r-off', 1)
        ;(ipcRenderer as any).send('EVENT_OFF', { value: 'm2r-off', type: 'on' })
        emitEvent('m2r-off', 2)

        assert.deepEqual(received, [1])
    })

    it('отправляет одно IPC-сообщение при дублирующихся подписках', () => {
        const received: unknown[] = []

        ;(ipcRenderer as any).send('EVENT_ON', { value: 'm2r-duplicate' })
        ;(ipcRenderer as any).send('EVENT_ON', { value: 'm2r-duplicate' })
        ;(ipcRenderer as any).on('EVENT_EMIT_m2r-duplicate', (_: unknown, result: any) => received.push(result.value))

        emitEvent('m2r-duplicate', 1)

        assert.deepEqual(received, [1])

        ;(ipcRenderer as any).send('EVENT_OFF', { value: 'm2r-duplicate', type: 'on' })
        ;(ipcRenderer as any).send('EVENT_OFF', { value: 'm2r-duplicate', type: 'on' })
    })

    it('доставляет результат обещания в событие', async () => {
        const received: unknown[] = []

        ;(ipcRenderer as any).send('EVENT_ONCE', { value: 'm2r-promise' })
        ;(ipcRenderer as any).on('EVENT_EMIT_m2r-promise', (_: unknown, result: any) => received.push(result.value))

        emitEvent('m2r-promise', Promise.resolve('done'))

        await tick()

        assert.deepEqual(received, ['done'])
    })

    it('не отправляет событие подписчику, появившемуся после вызова', async () => {
        const received: unknown[] = []

        emitEvent('m2r-late', Promise.resolve(1))

        ;(ipcRenderer as any).send('EVENT_ON', { value: 'm2r-late' })
        ;(ipcRenderer as any).on('EVENT_EMIT_m2r-late', (_: unknown, result: any) => received.push(result.value))

        await tick()

        assert.deepEqual(received, [])

        ;(ipcRenderer as any).send('EVENT_OFF', { value: 'm2r-late', type: 'on' })
    })

    it('не падает при уничтоженном получателе', () => {
        ;(ipcRenderer as any).send('EVENT_ON', { value: 'm2r-destroyed' })

        sender.destroy()

        try {
            assert.doesNotThrow(() => emitEvent('m2r-destroyed', 1))
        } finally {
            sender.revive()
        }
    })

    it('проверяет имена сущностей и событий', () => {
        assert.throws(() => publishFunction('then', () => 1), InvalidEntityNameError)
        assert.throws(() => publishFunction('', () => 1), InvalidEntityNameError)
        assert.throws(() => publishVariable('__proto__', { value: 1 }), InvalidEntityNameError)
        assert.throws(() => emitEvent(''), InvalidEventNameError)
        assert.throws(() => on('', () => {}), InvalidEventNameError)
    })
})
