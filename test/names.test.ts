import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { InvalidEntityNameError, InvalidEventNameError } from '../src/errors.js'
import Names from '../src/scripts/helpers/names.js'

describe('Names', () => {
    it('пропускает обычные имена', () => {
        assert.doesNotThrow(() => Names.validateEntity('getUser'))
        assert.doesNotThrow(() => Names.validateEntity('count'))
        assert.doesNotThrow(() => Names.validateEvent('message-from-main'))
    })

    it('запрещает имена, ломающие API моста', () => {
        for (const name of ['as', 'emit', 'on', 'once', 'call', 'returns', 'then', 'constructor', '__proto__']) {
            assert.throws(() => Names.validateEntity(name), InvalidEntityNameError)
            assert.equal(Names.isReserved(name), true)
        }
    })

    it('запрещает пустые и слишком длинные имена сущностей', () => {
        for (const name of ['', 'x'.repeat(257), undefined, null, 1]) {
            assert.throws(() => Names.validateEntity(name), InvalidEntityNameError)
        }
    })

    it('запрещает пустые и слишком длинные имена событий', () => {
        for (const name of ['', 'x'.repeat(1025), undefined, null, 1]) {
            assert.throws(() => Names.validateEvent(name), InvalidEventNameError)
        }
    })
})
