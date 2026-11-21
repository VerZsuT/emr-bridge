import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import Transfer from '../src/scripts/helpers/transfer.js'

class Human {
    public name = ''

    public takeSnapshot() {
        return { name: this.name }
    }

    public updateFromSnapshot(snapshot: { name: string }) {
        this.name = snapshot.name
    }
}

describe('Transfer', () => {
    it('распознаёт снимок с falsy-значением', () => {
        for (const snapshot of [0, false, '', null]) {
            assert.equal(
                Transfer.isSnapshotValue({ __type__: 'snapshot', __snapshot__: snapshot }),
                true
            )
        }
    })

    it('не принимает унаследованные поля за снимок', () => {
        const inherited = Object.create({
            __type__: 'snapshot',
            __snapshot__: { name: 'x' }
        })

        assert.equal(Transfer.isSnapshotValue(inherited), false)
    })

    it('отклоняет обычные значения', () => {
        for (const value of [null, undefined, 0, '', {}, [], { __type__: 'snapshot' }]) {
            assert.equal(Transfer.isSnapshotValue(value), false)
        }
    })

    it('создаёт снимок через takeSnapshot', () => {
        const human = new Human()
        human.name = 'Dima'

        assert.deepEqual(Transfer.toTransferable(human), {
            __type__: 'snapshot',
            __snapshot__: { name: 'Dima' }
        })
    })

    it('возвращает обычные значения без изменений', () => {
        const value = { a: 1 }

        assert.equal(Transfer.toTransferable(value), value)
    })

    it('не считает объект со свойствами-не-функциями снимком', () => {
        assert.equal(
            Transfer.isHasSnapshot({ takeSnapshot: true, updateFromSnapshot: true }),
            false
        )
    })

    it('восстанавливает экземпляр из снимка', () => {
        const human = Transfer.getFromSnapshot(
            { __type__: 'snapshot', __snapshot__: { name: 'Artem' } },
            Human
        )

        assert.ok(human instanceof Human)
        assert.equal(human.name, 'Artem')
    })

    it('распознаёт обещания и thenable', () => {
        assert.equal(Transfer.isPromiseLike(Promise.resolve()), true)
        assert.equal(Transfer.isPromiseLike({ then() {} }), true)
        assert.equal(Transfer.isPromiseLike(null), false)
        assert.equal(Transfer.isPromiseLike({ then: true }), false)
    })
})
