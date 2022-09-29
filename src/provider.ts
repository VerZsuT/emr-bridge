import { contextBridge, ipcRenderer } from 'electron'
import { Main } from './main'
import { IAccesses, IInfo, IIPCResult, IProvider, IScopes } from './types'
import { IPCChannel } from './enums'

const info = ipcRenderer.sendSync(IPCChannel.getPublicInfo) as IInfo
const scopes = ipcRenderer.sendSync(IPCChannel.getPublicScopes) as IScopes
const accesses = ipcRenderer.sendSync(IPCChannel.getPublicAccesses) as IAccesses
const main = Main.as<any>()

/**
 * Sets access to main from renderer
 */
export function provideFromMain(contextIsolation = true): void {
  type Promises = {[key: string]: {resolve: (value: any) => void, reject?: (reason?: any) => any}}

  const promises: Promises = {}
  const provider = {
    getInfo: (): IInfo => info,
    getScopes: (): IScopes => scopes,
    getAccesses: (): IAccesses => accesses,
    waitPromise(name: string, resolve: (value: any) => void, reject?: (reason?: any) => void): void {
      promises[name] = { resolve, reject }
    },
    provided: {
      properties: {},
      functions: {}
    }
  } as IProvider

  info.functions.forEach(funcName => {
    Object.defineProperty(provider.provided.functions, funcName, {
      value: (...args: any[]): IIPCResult => {
        const result = main[funcName](...args)
        if (result instanceof Promise) {
          result
            .then(value => {
              if (!promises[funcName]) return
              promises[funcName].resolve(value)
            })
            .catch(reason => {
              if (!promises[funcName]) return
              promises[funcName].reject?.(reason)
            })
          return { promiseChannel: funcName }
        }
        else {
          return { value: result }
        }
      },
      enumerable: true
    })
  })
  info.properties.forEach(propName => {
    Object.defineProperty(provider.provided.properties, propName, {
      get: () => ({ value: main[propName] } as IIPCResult),
      set: value => main[propName] = value,
      enumerable: true
    })
  })

  if (contextIsolation) {
    contextBridge.exposeInMainWorld('__provider__', provider)
  }
  else {
    window.__provider__ = provider
  }
}
