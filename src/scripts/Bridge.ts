import { Scope } from '../enums'
import { GlobalProviderNotFoundError, TryUseBridgeInPreload } from '../errors'
import type { EventHandler, EventUnsubscriber, IPCResult, Target } from '../types'
import Provider from './provider'

/**
 * Bridge between `renderer` and `main` processes.  
 * 
 * _only for renderer process_
 */
let Bridge: Target = new Proxy({ as: () => throwError() }, {
  get: () => throwError(),
  set: () => throwError(),
  apply: () => throwError()
})

class ProviderIntoRenderer extends Provider {
  #globalProvider = window.__provider__!

  constructor() { super(); this.init() }

  protected info = this.#globalProvider.getInfo()
  protected scope = Scope.renderer

  protected callFunction(name: string, secret: number, args: any[]): IPCResult {
    return this.#globalProvider.provided.functions[name](secret, args)
  }

  protected getVariable(name: string): IPCResult {
    return this.#globalProvider.provided.properties[name].get()
  }

  protected setVariable(name: string, value: any): IPCResult {
    return this.#globalProvider.provided.properties[name].set(value)
  }

  protected waitPromise(channel: string, secret?: number | undefined) {
    return new Promise<any>((resolve, reject) => {
      this.#globalProvider.waitPromise(channel, resolve, reject, secret)
    })
  }

  protected handleMainEvent(name: string, type: 'on' | 'once', handler: EventHandler<IPCResult>): EventUnsubscriber {
    return this.#globalProvider.provided.mainEvents[name](type, handler)
  }

  protected emitRendererEvent(name: string, arg: any) {
    this.#globalProvider.provided.rendererEvents[name](arg)
  }
}

/** Выбрасывает ошибку если используется не в том процессе */
let throwError: () => never

if (typeof window === 'undefined') {
  throwError = () => { throw new TryUseBridgeInPreload() }
}
else if (!window.__provider__) {
  throwError = () => { throw new GlobalProviderNotFoundError() }
}
else {
  // Выполняется только в web
  Bridge = new ProviderIntoRenderer()
}

export default Bridge
