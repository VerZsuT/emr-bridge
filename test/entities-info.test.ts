import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import EntitiesInfo from '../src/scripts/helpers/entities-info.js'
import IpcChannel from '../src/scripts/helpers/ipc-channel.js'

describe('EntitiesInfo', () => {
    it('читает множества и массивы имён', () => {
        assert.deepEqual(
            [...EntitiesInfo.read({ functions: new Set(['a']), variables: ['b'] })!.functions],
            ['a']
        )
        assert.deepEqual(
            [...EntitiesInfo.read({ functions: ['a'], variables: new Set(['b']) })!.variables],
            ['b']
        )
    })

    it('отбрасывает нестроковые имена', () => {
        const info = EntitiesInfo.read({
            functions: ['ok', 1, null],
            variables: [Symbol('x'), 'value']
        })

        assert.deepEqual([...info!.functions], ['ok'])
        assert.deepEqual([...info!.variables], ['value'])
    })

    it('возвращает null для неверного формата', () => {
        for (const value of [null, undefined, 1, 'x', {}, { functions: [], variables: 1 }]) {
            assert.equal(EntitiesInfo.read(value), null)
        }
    })
})

describe('IpcChannel', () => {
    it('распознаёт канал обещания моста', () => {
        const channel = IpcChannel.promise.get(IpcChannel.func.call('getUser'))

        assert.equal(IpcChannel.promise.is(channel), true)
        assert.equal(IpcChannel.promise.is('SOME_OTHER_PROMISE'), false)
        assert.equal(IpcChannel.promise.is('FUNCTION_CALL_x'), false)
        assert.equal(IpcChannel.promise.is(null), false)
    })

    it('строит каналы событий и переменных', () => {
        assert.equal(IpcChannel.event.emit('event'), 'EVENT_EMIT_event')
        assert.equal(IpcChannel.event.off(), 'EVENT_OFF')
        assert.equal(IpcChannel.prop.get('value'), 'PROPERTY_GET_value')
        assert.equal(IpcChannel.prop.set('value'), 'PROPERTY_SET_value')
    })
})
