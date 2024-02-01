import electron from 'electron'
import { IPCChannel } from '../enums'
import type { GlobalProvider, IPCResult, Info } from '../types'
import IPCTunnel from './renderer-tunnels'

/** Выбрасывает ошибку если используется не в том процессе */
let mayThrowError: () => void | never = () => {}

if (typeof window === 'undefined') {
  mayThrowError = () => { throw new Error('"provideFromMain" is unavailable in main process.') }
}
else if (!('contextBridge' in electron)) {
  mayThrowError = () => { throw new Error('"provideFromMain" is unavailable in renderer process.') }
}

/**
 * Sets access to main from renderer
 * 
 * @param contextIsolation - _default_: `true`
 */
function provideFromMain(contextIsolation = true) {
  mayThrowError()

  const { contextBridge, ipcRenderer } = electron
  const info: Info = ipcRenderer.sendSync(IPCChannel.getPublicInfo)

  const provider: GlobalProvider = {
    getInfo: () => info,
    waitPromise(channel, resolve, reject, secret) {
      new IPCTunnel.Promise(channel).wait(secret)
        .then(resolve)
        .catch(reject)
    },
    provided: {
      functions: getFunctions(),
      properties: getProperties(),
      mainEvents: getMainEvents(),
      rendererEvents: getRendererEvents(),
    }
  }

  if (contextIsolation) {
    contextBridge.exposeInMainWorld('__provider__', provider)
  }
  else {
    window.__provider__ = provider
  }

  function getFunctions() {
    const result: GlobalProvider['provided']['functions'] = {}
    for (const name of info.functions) {
      result[name] = (secret: number, args: any[]) => {
        return new IPCTunnel.Function(name).call({ args, secret })
      }
    }
    return result
  }

  function getProperties() {
    const result: GlobalProvider['provided']['properties'] = {}
    for (const name of info.properties) {
      const tunnel = new IPCTunnel.Property(name)
      result[name] = {
        get: () => tunnel.get(),
        set: (value: any) => tunnel.set(value)
      }
    }
    return result
  }

  function getMainEvents() {
    const result: GlobalProvider['provided']['mainEvents'] = {}
    for (const name of info.mainEvents) {
      result[name] = (type: 'on' | 'once', handler: (result: IPCResult) => any) => {
        const tunnel = new IPCTunnel.MainEvent(name)
        if (type === 'on') return tunnel.on(handler)
        else return tunnel.once(handler)
      }
    }
    return result
  }

  function getRendererEvents() {
    const result: GlobalProvider['provided']['rendererEvents'] = {}
    for (const name of info.rendererEvents) {
      result[name] = (arg: any) => {
        const tunnel = new IPCTunnel.RendererEvent(name)
        if (arg instanceof Promise) {
          arg.then(value => tunnel.emit(value))
            .catch(reason => tunnel.error(String(reason)))
        }
        else {
          tunnel.emit(arg)
        }
      }
    }
    return result
  }
}

export default provideFromMain
