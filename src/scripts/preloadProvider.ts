import { contextBridge, ipcRenderer } from 'electron'
import { IPCChannel } from '../enums'
import type { IIPCResult, IInfo, IProvider } from '../types'

const info: IInfo = ipcRenderer.sendSync(IPCChannel.getPublicInfo)

/**
 * Sets access to main from renderer
 * 
 * @param contextIsolation - _default_: `true`
 */
function provideFromMain(contextIsolation = true): void {
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
      functions: {},
      mainEvents: {},
      rendererEvents: {}
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
  info.rendererEvents.forEach(rendererEventName => {
    Object.defineProperty(provider.provided.rendererEvents, rendererEventName, {
      value(arg: any) {
        const emitChannel = IPCChannel.rendererEventEmit + rendererEventName

        if (arg instanceof Promise) {
          arg
            .then(value => ipcRenderer.send(emitChannel, { value } satisfies IIPCResult))
            .catch(reason => ipcRenderer.send(emitChannel, { error: String(reason) } satisfies IIPCResult))
        }
        else {
          ipcRenderer.send(emitChannel, { value: arg } satisfies IIPCResult)
        }
      },
      enumerable: true
    })
  })
  info.mainEvents.forEach(mainEventName => {
    Object.defineProperty(provider.provided.mainEvents, mainEventName, {
      value(type: 'on' | 'once', handler: (result: IIPCResult) => any) {
        const listener = (_: any, result: IIPCResult) => handler(result)
        const emitChannel = IPCChannel.mainEventEmit + mainEventName

        if (type === 'on') {
          ipcRenderer.on(emitChannel, listener)
          ipcRenderer.send(IPCChannel.mainEventOn + mainEventName)
        }
        else {
          ipcRenderer.once(emitChannel, listener)
          ipcRenderer.send(IPCChannel.mainEventOnce + mainEventName)
        }

        return () => ipcRenderer.removeListener(emitChannel, listener)
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

export default provideFromMain
