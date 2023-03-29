import { ipcRenderer } from 'electron'
import { IPCChannel, Scope } from '../enums'
import type { IIPCResult, IInfo } from '../types'
import createProvider from './provider'

const info: IInfo | undefined = ipcRenderer.sendSync(IPCChannel.getPublicInfo)

if (!info)
  throw new Error('Public methods from main is not provided')

/**
 * Bridge between `preload` and `main` processes.
 *
 * _only for preload process_
 */
const Main = createProvider({
  info,
  scope: Scope.preload,
  callFunction(name: string, ...args): IIPCResult {
    return ipcRenderer.sendSync(IPCChannel.functionCall + name, ...args)
  },
  getVariable(name: string): IIPCResult {
    return ipcRenderer.sendSync(IPCChannel.propertyGet + name)
  },
  setVariable(name: string, value: any): IIPCResult | undefined {
    return ipcRenderer.sendSync(IPCChannel.propertySet + name, value)
  },
  waitPromise(channel: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      ipcRenderer.once(channel, (_, result: IIPCResult) => {
        if (result.error)
          reject(result.error)
        else
          resolve(result.value)
      })
    })
  }
})

export default Main
