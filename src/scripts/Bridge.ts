import { Scope } from '../enums'
import type { EventUnsubscriber, IIPCResult } from '../types'
import createProvider from './provider'

if (!window.__provider__)
  throw new Error('Required methods not provided. Did you forget to call "provide" in preload?')

const provider = window.__provider__
const info = provider.getInfo()

/**
 * Bridge between `renderer` and `main` processes.
 *
 * _only for renderer process_
 */
const Bridge = createProvider({
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

export default Bridge
