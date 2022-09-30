import { ipcRenderer } from 'electron'
import type { IInfo, IIPCResult } from '../types'
import { IPCChannel, Scope } from '../enums'
import { createProvider } from './provider'

const info = ipcRenderer.sendSync(IPCChannel.getPublicInfo) as IInfo | undefined

if (!info) {
  throw new Error('Public methods from main is not provided')
}

/**
 * Bridge between `preload` and `main` processes.
 *
 * _only for preload process_
 */
export const Main = createProvider({
  info,
  scope: Scope.preload,
  callFunction(name: string, ...args): IIPCResult {
    const channel = IPCChannel.functionCall + name
    return ipcRenderer.sendSync(channel, ...args)
  },
  getVariable(name: string): IIPCResult {
    const channel = IPCChannel.propertyGet + name
    return ipcRenderer.sendSync(channel)
  },
  setVariable(name: string, value: any): IIPCResult | undefined {
    const channel = IPCChannel.propertySet + name
    return ipcRenderer.sendSync(channel, value)
  },
  waitPromise(channel: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      ipcRenderer.once(channel, (_, result: IIPCResult) => {
        if (result.error) reject(result.error)
        else resolve(result.value)
      })
    })
  }
})
