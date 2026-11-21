import { EventEmitter } from 'node:events'

/**
 * Минимальная модель IPC Electron для тестов.
 *
 * `ipcRenderer.sendSync` синхронно вызывает обработчики `ipcMain`,
 * `sender.send` доставляет сообщение обработчикам `ipcRenderer`.
 */
class Sender {
    constructor() {
        this.destroyed = false
    }

    isDestroyed() {
        return this.destroyed
    }

    send(channel, ...args) {
        if (this.destroyed) {
            throw new Error('Object has been destroyed')
        }

        ipcRenderer.emit(channel, {}, ...args)
    }

    destroy() {
        this.destroyed = true
    }

    revive() {
        this.destroyed = false
    }
}

export const sender = new Sender()

export const ipcMain = new EventEmitter()

/**
 * Вызвать обработчики main-процесса.
 * @param {string} channel
 * @param {Sender} source
 * @param {unknown[]} args
 */
function dispatchToMain(channel, source, args) {
    const event = {
        sender: source,
        returnValue: undefined
    }

    // `emit` (в отличие от ручного вызова listeners) корректно снимает
    // одноразовые обработчики.
    ipcMain.emit(channel, event, ...args)

    return event.returnValue
}

export const ipcRenderer = new EventEmitter()

ipcRenderer.send = (channel, ...args) => {
    dispatchToMain(channel, sender, args)
}

ipcRenderer.sendSync = (channel, ...args) => dispatchToMain(channel, sender, args)

ipcRenderer.sender = sender

export const exposed = new Map()

export const contextBridge = {
    exposeInMainWorld(key, value) {
        exposed.set(key, value)

        if (globalThis.window) {
            globalThis.window[key] = value
        }
    }
}
