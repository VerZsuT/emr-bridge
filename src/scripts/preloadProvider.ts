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
    provider.provided.functions[funcName] = (...args: any[]): IIPCResult => {
      return ipcRenderer.sendSync(IPCChannel.functionCall + funcName, ...args)
    }
  })
  info.rendererEvents.forEach(eventName => {
    provider.provided.rendererEvents[eventName] = (arg: any) => {
      const emitChannel = IPCChannel.rendererEventEmit + eventName

      if (arg instanceof Promise) {
        arg
          .then(value => ipcRenderer.send(emitChannel, { value } satisfies IIPCResult))
          .catch(reason => ipcRenderer.send(emitChannel, { error: String(reason) } satisfies IIPCResult))
      }
      else {
        ipcRenderer.send(emitChannel, { value: arg } satisfies IIPCResult)
      }
    }
  })
  info.mainEvents.forEach(eventName => {
    provider.provided.mainEvents[eventName] = (type: 'on' | 'once', handler: (result: IIPCResult) => any) => {
      const listener = (_: any, result: IIPCResult) => handler(result)
      const emitChannel = IPCChannel.mainEventEmit + eventName

      if (type === 'on') {
        ipcRenderer.on(emitChannel, listener)
        ipcRenderer.send(IPCChannel.mainEventOn + eventName)
      }
      else {
        ipcRenderer.once(emitChannel, listener)
        ipcRenderer.send(IPCChannel.mainEventOnce + eventName)
      }

      return () => ipcRenderer.removeListener(emitChannel, listener)
    }
  })
  info.properties.forEach(propName => {
    provider.provided.properties[propName] = {
      get(): IIPCResult {
        return ipcRenderer.sendSync(IPCChannel.propertyGet + propName)
      },
      set(value: any) {
        ipcRenderer.sendSync(IPCChannel.propertySet + propName, value)
      }
    }
  })

  if (contextIsolation)
    contextBridge.exposeInMainWorld('__provider__', provider)
  else
    window.__provider__ = provider
}

export default provideFromMain
