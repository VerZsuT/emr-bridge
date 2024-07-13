import { GlobalProviderNotFoundError, NotProvidedFromMainError, WrongBridgeInPreloadError } from '../../errors.js'
import { Env, Errors } from '../helpers/index.js'

import type { EventListener, EventUnsubscribe, IBridge, IEntitiesInfo, IGlobalProvider, IResult } from '../../types.js'
import BaseBridge from '../base-bridge.js'

/**
 * Мост renderer-main.
 */
class RendererBridge extends BaseBridge {
    /**
     * Провайдер необходимых функций.
     */
    private readonly globalProvider: IGlobalProvider

    protected override readonly entitiesInfo: IEntitiesInfo

    public constructor() {
        super()

        if (!Env.hasProvider) {
            throw new NotProvidedFromMainError()
        }

        this.globalProvider = window.__provider__!
        this.entitiesInfo = this.globalProvider.getEntitiesInfo()

        this.init()
    }

    protected override callFunction(name: string, id: string, args: any[]): IResult {
        return this.globalProvider.entities.functions[name](id, args)
    }

    protected override getVariable(name: string): IResult {
        return this.globalProvider.entities.variables[name].get()
    }

    protected override setVariable(name: string, value: any): IResult {
        return this.globalProvider.entities.variables[name].set(value)
    }

    protected override waitPromise(channel: string, id?: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.globalProvider.waitPromise(channel, resolve, reject, id)
        })
    }

    protected override handleEvent(name: string, type: 'on' | 'once', listener: EventListener<IResult>): EventUnsubscribe {
        return type === 'on'
            ? this.globalProvider.entities.events.on(name, listener)
            : this.globalProvider.entities.events.once(name, listener)
    }

    protected override emitEvent(name: string, value: any): void {
        this.globalProvider.entities.events.emit(name, value)
    }
}

/**
 * Получить функцию, бросающую исключение, если есть повод.
 */
function getErrorThrower(): (() => never) | null {
    if (!Env.hasWindow) {
        return Errors.getThrower(WrongBridgeInPreloadError)
    }

    if (!Env.hasProvider) {
        return Errors.getThrower(GlobalProviderNotFoundError)
    }

    return null
}

/**
 * Получить мост renderer-main.
 */
function getBridge(): IBridge {
    const throwError = getErrorThrower()

    if (throwError) {
        return new Proxy({} as any, {
            get: throwError,
            set: throwError,
            apply: throwError
        }) satisfies IBridge
    }

    return new RendererBridge()
}

/**
 * Мост renderer-main.
 */
export default getBridge()
