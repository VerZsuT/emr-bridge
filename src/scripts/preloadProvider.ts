import { contextBridge, ipcRenderer } from 'electron'
import type { IInfo, IIPCResult, IProvider } from '../types'
import { IPCChannel } from '../enums'

const info = ipcRenderer.sendSync(IPCChannel.getPublicInfo) as IInfo

/**
 * Sets access to main from renderer
 */
export function provideFromMain(contextIsolation = true): void {
  const provider = {
    getInfo: (): IInfo => info,
    waitPromise(channel: string, resolve: (value: any) => void, reject?: (reason?: any) => void): void {
      ipcRenderer.once(channel, (_, result: IIPCResult) => {
        if (result.error) reject?.(result.error)
        else resolve(result.value)
      })
    },
    provided: {
      properties: {},
      functions: {}
    }
  } as IProvider

  info.functions.forEach(funcName => {
    Object.defineProperty(provider.provided.functions, funcName, {
      value: (...args: any[]): IIPCResult => {
        const channel = IPCChannel.functionCall + funcName
        return ipcRenderer.sendSync(channel, ...args) as IIPCResult
      },
      enumerable: true
    })
  })
  info.properties.forEach(propName => {
    Object.defineProperty(provider.provided.properties, propName, {
      get: () => {
        const channel = IPCChannel.propertyGet + propName
        return ipcRenderer.sendSync(channel) as IIPCResult
      },
      set: value => {
        const channel = IPCChannel.propertySet + propName
        ipcRenderer.sendSync(channel, value)
      },
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
