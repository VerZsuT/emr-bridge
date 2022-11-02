import { contextBridge, ipcRenderer } from 'electron'
import { IPCChannel } from '../enums'
import type { IInfo, IIPCResult, IProvider } from '../types'

const info: IInfo = ipcRenderer.sendSync(IPCChannel.getPublicInfo)

/**
 * Sets access to main from renderer
 * 
 * @param contextIsolation - _default_: `true`
 */
export function provideFromMain(contextIsolation = true): void {
  const provider: IProvider = {
    getInfo(): IInfo {
      return info
    },
    waitPromise(channel: string, resolve: (value: any) => void, reject?: (reason?: any) => void): void {
      ipcRenderer.once(channel, (_, result: IIPCResult) => {
        if (result.error)
          reject?.(result.error)
        else
          resolve(result.value)
      })
    },
    provided: {
      properties: {},
      functions: {}
    }
  }

  info.functions.forEach(funcName => {
    Object.defineProperty(provider.provided.functions, funcName, {
      value(...args: any[]): IIPCResult {
        return ipcRenderer.sendSync(IPCChannel.functionCall + funcName, ...args)
      },
      enumerable: true
    })
  })
  info.properties.forEach(propName => {
    Object.defineProperty(provider.provided.properties, propName, {
      get(): IIPCResult {
        return ipcRenderer.sendSync(IPCChannel.propertyGet + propName)
      },
      set(value: any) {
        ipcRenderer.sendSync(IPCChannel.propertySet + propName, value)
      },
      enumerable: true
    })
  })

  if (contextIsolation)
    contextBridge.exposeInMainWorld('__provider__', provider)
  else
    window.__provider__ = provider
}
