import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import IpcResult from '../src/scripts/helpers/ipc-result.js'

describe('IpcResult', () => {
    it('сериализует строку и Error', () => {
        assert.deepEqual(IpcResult.createWithError('failure', '1'), {
            error: 'failure',
            id: '1'
        })

        const error = new Error('boom')
        const result = IpcResult.createWithError(error)

        assert.equal(result.error, error.stack)
    })

    it('не падает на null, undefined и не-Error значениях', () => {
        assert.equal(IpcResult.createWithError(undefined).error, 'Unknown error')
        assert.equal(IpcResult.createWithError(null).error, 'Unknown error')
        assert.equal(IpcResult.createWithError(42).error, '42')
        assert.equal(IpcResult.createWithError({ code: 1 }).error, '{"code":1}')
    })

    it('не падает на объекте с циклической ссылкой', () => {
        const value: Record<string, unknown> = {}
        value.self = value

        assert.equal(IpcResult.createWithError(value).error, '[object Object]')
    })

    it('преобразует значение в передаваемое', () => {
        class Box {
            public takeSnapshot() {
                return 5
            }

            public updateFromSnapshot() {}
        }

        assert.deepEqual(IpcResult.createWithValue(new Box(), 'id'), {
            value: { __type__: 'snapshot', __snapshot__: 5 },
            id: 'id'
        })
    })

    it('создаёт результат с каналом обещания', () => {
        assert.deepEqual(IpcResult.createWithPromise('CHANNEL_PROMISE'), {
            promiseChannel: 'CHANNEL_PROMISE'
        })
    })
})
