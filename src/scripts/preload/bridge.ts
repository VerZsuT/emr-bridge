import { ipcRenderer } from 'electron'

import { NotProvidedFromMainError, TryUseBridgeInMainError } from '../../errors.js'
import type { EventListener, EventUnsubscribe, IBridge, IEntitiesInfo, IResult } from '../../types.js'
import BaseBridge from '../base-bridge.js'
import { EntitiesInfo, Errors, IpcChannel, Names, Transfer } from '../helpers/index.js'
import IPCTunnel from '../renderer/tunnels.js'

/**
 * Мост preload-main.
 */
export class PreloadBridge extends BaseBridge {
    protected override readonly entitiesInfo: IEntitiesInfo

    /**
     * Создать мост preload-main.
     */
    public constructor() {
        super()

        const info = EntitiesInfo.read(ipcRenderer.sendSync(IpcChannel.publicInfo.get()))

        if (!info) {
            throw new NotProvidedFromMainError()
        }

        this.entitiesInfo = info

        this.init()
    }

    protected override callFunction(name: string, secret: string, args: any[]): IResult {
        return new IPCTunnel.Function(name).call({ args, id: secret })
    }

    protected override getVariable(name: string): IResult {
        return new IPCTunnel.Variable(name).get()
    }

    protected override setVariable(name: string, value: any): IResult {
        return new IPCTunnel.Variable(name).set(value)
    }

    protected override async waitPromise(channel: string, id?: string): Promise<any> {
        return await new IPCTunnel.Promise(channel).wait(id)
    }

    protected handleEvent(name: string, type: 'on' | 'once', listener: EventListener<IResult>): EventUnsubscribe {
        const tunnel = new IPCTunnel.Event(name)

        return type === 'on'
            ? tunnel.on(listener)
            : tunnel.once(listener)
    }

    protected emitEvent(name: string, value: any): void {
        Names.validateEvent(name)

        const tunnel = new IPCTunnel.Event(name)

        if (Transfer.isPromiseLike(value)) {
            value.then(
                result => tunnel.emit(Transfer.toTransferable(result)),
                reason => tunnel.error(reason)
            )
        } else {
            tunnel.emit(value)
        }
    }
}

/**
 * Получить функцию бросающую исключение если есть повод.
 */
function getErrorThrower(): (() => never) | null {
    if (!ipcRenderer) {
        return Errors.getThrower(TryUseBridgeInMainError)
    }

    return null
}

/**
 * Получить мост preload-main.
 */
export function getBridge(): IBridge {
    const throwError = getErrorThrower()

    if (throwError) {
        return new Proxy({} as any, {
            get: throwError,
            set: throwError,
            apply: throwError
        }) satisfies IBridge
    }

    return new PreloadBridge()
}

/**
 * Мост preload-main.
 */
export default getBridge()
