import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import IpcPayload from '../src/scripts/helpers/ipc-payload.js'

describe('IpcPayload', () => {
    it('разбирает корректный запрос', () => {
        assert.deepEqual(IpcPayload.request({ args: [1, 2], id: 'x' }), {
            args: [1, 2],
            id: 'x'
        })
    })

    it('отклоняет запросы неверного формата', () => {
        for (const payload of [undefined, null, 1, 'x', {}, { args: 'x' }, { args: [], id: 1 }]) {
            assert.equal(IpcPayload.request(payload), null)
        }
    })

    it('разбирает корректный результат', () => {
        assert.deepEqual(IpcPayload.result({ value: 1, id: 'x' }), {
            value: 1,
            error: undefined,
            promiseChannel: undefined,
            id: 'x'
        })
    })

    it('отклоняет результат неверного формата', () => {
        for (const payload of [undefined, null, 1, { error: 1 }, { promiseChannel: 1 }, { id: 1 }]) {
            assert.equal(IpcPayload.result(payload), null)
        }
    })

    it('извлекает имя и тип регистрации события', () => {
        assert.equal(IpcPayload.eventName({ value: 'event' }), 'event')
        assert.equal(IpcPayload.eventName({ value: '' }), null)
        assert.equal(IpcPayload.eventName({ value: 1 }), null)
        assert.equal(IpcPayload.eventType({ type: 'once' }), 'once')
        assert.equal(IpcPayload.eventType({}), 'on')
        assert.equal(IpcPayload.eventType({ type: 'other' }), 'on')
    })
})
