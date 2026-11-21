import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import Id from '../src/scripts/helpers/id.js'

describe('Id', () => {
    it('создаёт непустые уникальные идентификаторы', () => {
        const ids = new Set<string>()

        for (let index = 0; index < 10_000; index += 1) {
            const id = Id.new()

            assert.equal(typeof id, 'string')
            assert.ok(id.length > 0)
            ids.add(id)
        }

        assert.equal(ids.size, 10_000)
    })
})
