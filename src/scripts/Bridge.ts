import { Scope } from '../enums'
import type { EventUnsubscriber, IIPCResult, ITarget } from '../types'
import createProvider from './provider'

/**
 * Bridge between `renderer` and `main` processes.  
 * 
 * _only for renderer process_
 */
let Bridge: ITarget = new Proxy({ as() { throwError() } }, {
  get() { throwError() },
  set() { throwError() },
  apply() { throwError() }
})

/** Выбрасывает ошибку если используется не в том процессе */
let throwError: () => never

if (typeof window === 'undefined') {
  throwError = () => { throw new Error('"Bridge" is unavailable in main process. In preload use "Main" instead.') }
}
else if (!window.__provider__) {
  throwError = () => { throw new Error('Required methods not provided. Call "provideFromMain" in preload process.') }
}
else {
  initInWeb()
}

/** Выполняется только в web */
function initInWeb() {
  const provider = window.__provider__!
  const info = provider.getInfo()
  Bridge = createProvider({
    info, scope: Scope.renderer,
    callFunction(name: string, ...args): IIPCResult {
      return provider.provided.functions[name](...args)
    },
    emitRendererEvent(name, arg): void {
      provider.provided.rendererEvents[name](arg)
    },
    handleMainEvent(name, type, handler): EventUnsubscriber {
      return provider.provided.mainEvents[name](type, handler)
    },
    getVariable(name: string): IIPCResult {
      return provider.provided.properties[name].get()
    },
    setVariable(name: string, value: any): IIPCResult | undefined {
      provider.provided.properties[name].set(value)
      return undefined
    },
    waitPromise(channel: string): Promise<any> {
      return new Promise<any>((resolve, reject) => {
        provider.waitPromise(channel, resolve, reject)
      })
    }
  })
}

export default Bridge
