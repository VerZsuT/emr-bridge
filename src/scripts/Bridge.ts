import { createProvider } from './provider'
import type { IIPCResult } from '../types'
import { Scope } from '../enums'

if (!window.__provider__) {
  throw new Error('Required methods not provided. Did you forget to call "provide" in preload?')
}

const provider = window.__provider__
const info = provider.getInfo()

/**
 * Bridge between `renderer` and `main` processes.
 *
 * _only for renderer process_
 */
export const Bridge = createProvider({
  info,
  scope: Scope.renderer,
  callFunction(name: string, ...args): IIPCResult {
    return provider.provided.functions[name](...args)
  },
  getVariable(name: string): IIPCResult {
    return provider.provided.properties[name]
  },
  setVariable(name: string, value: any): IIPCResult | undefined {
    provider.provided.properties[name] = value
    return
  },
  waitPromise(channel: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      provider.waitPromise(channel, resolve, reject)
    })
  }
})
