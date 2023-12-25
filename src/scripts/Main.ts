import electron from 'electron'
import { IPCChannel, Scope } from '../enums'
import type { EventUnsubscriber, IIPCResult, IInfo, ITarget } from '../types'
import createProvider from './provider'

/**
 * Bridge between `preload` and `main` processes.
 *   
 * _only for preload process_
 */
let Main: ITarget = new Proxy({ as() { throwError() } }, {
  get() { throwError() },
  set() { throwError() },
  apply() { throwError() }
})

/** Выбрасывает ошибку если используется не в том процессе */
let throwError: () => never

if (typeof window !== 'undefined') {
  throwError = () => { throw new Error('"Main" is unavailable in renderer process. Use "Bridge" instead') }
}
else if (!('ipcRenderer' in electron)) {
  throwError = () => { throw new Error('"Main" is unavailable in main process.') }
}
else {
  initInNode()
}

/** Выполняется только в NodeJS */
function initInNode() {
  const { ipcRenderer } = electron

  const info: IInfo | undefined = ipcRenderer.sendSync(IPCChannel.getPublicInfo)
  if (!info) throw new Error('Public methods from main is not provided. Call any publish methods to provide it from main process.')

  Main = createProvider({
    info, scope: Scope.preload,
    callFunction(name: string, ...args): IIPCResult {
      return ipcRenderer.sendSync(IPCChannel.functionCall + name, ...args)
    },
    handleMainEvent(name, type, handler): EventUnsubscriber {
      const listener = (_: any, result: IIPCResult) => handler(result)
      const emitChannel = IPCChannel.mainEventEmit + name

      if (type === 'on') {
        ipcRenderer.send(IPCChannel.mainEventOn + name)
        ipcRenderer.on(emitChannel, listener)
      }
      else {
        ipcRenderer.send(IPCChannel.mainEventOnce + name)
        ipcRenderer.once(emitChannel, listener)
      }

      return () => ipcRenderer.removeListener(emitChannel, listener)
    },
    emitRendererEvent(name, arg): void {
      const emitChannel = IPCChannel.rendererEventEmit + name

      if (arg instanceof Promise) {
        const promiseChannel = emitChannel + IPCChannel.promisePostfix
        ipcRenderer.sendSync(emitChannel, { promiseChannel } satisfies IIPCResult)
        arg
          .then(value => ipcRenderer.send(promiseChannel, { value } satisfies IIPCResult))
          .catch(reason => ipcRenderer.send(promiseChannel, { error: String(reason) } satisfies IIPCResult))
      }
      else {
        ipcRenderer.send(emitChannel, { value: arg } satisfies IIPCResult)
      }
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
}

export default Main
