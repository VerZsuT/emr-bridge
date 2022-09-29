import { ipcRenderer } from 'electron'
import type { IAccesses, IInfo, IIPCResult, IScopes } from './types'
import { Access, IPCChannel, Scope } from './enums'

const info = ipcRenderer.sendSync(IPCChannel.getPublicInfo) as IInfo | undefined
const scopes = ipcRenderer.sendSync(IPCChannel.getPublicScopes) as IScopes
const accesses = ipcRenderer.sendSync(IPCChannel.getPublicAccesses) as IAccesses

if (!info) {
  throw new Error('Public methods from main is not provided')
}

function errorHandler(error: string, channel: string): void {
  console.error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
}

const target = {
  as: <T>() => <T>Main
}

/**
 * Bridge between `preload` and `main` processes.
 *
 * _only for preload process_
 */
export const Main: typeof target = new Proxy(target, {
  get(target: any, key: string): any {
    if (key in target) return target[key]

    const isFunction = info.functions.has(key)
    const isProperty = info.properties.has(key)

    if (!isFunction && !isProperty) {
      throw new Error(`'${key}' is not provided from main`)
    }

    if (!scopes[key].has(Scope.preload)) {
      throw new Error(`'${key}' is not provided into preload scope`)
    }

    if (isFunction) {
      return (...args: any[]) => {
        const channel = IPCChannel.functionCall + key
        const result = ipcRenderer.sendSync(channel, ...args) as IIPCResult

        if (result.error) {
          errorHandler(result.error, key)
          return
        }

        if (result.promiseChannel) {
          return new Promise<any>((resolve, reject) => {
            ipcRenderer.once(result.promiseChannel!, (_, result: IIPCResult) => {
              if (result.error) reject(result.error)
              else resolve(result.value)
            })
          })
        }

        return result.value
      }
    }
    if (isProperty) {
      if (!accesses[key].has(Access.get)) {
        throw new Error(`No access to getting the '${key}' property`)
      }

      const channel = IPCChannel.propertyGet + key
      const getterResult = ipcRenderer.sendSync(channel) as IIPCResult

      if (getterResult.error) {
        errorHandler(getterResult.error, key)
        return
      }

      return getterResult.value
    }
  },
  set(target: any, key: string, newValue: any): boolean {
    const isFunction = info.functions.has(key)
    const isProperty = info.properties.has(key)

    if (isFunction) {
      throw new Error(`Function '${key}' is readonly`)
    }

    if (!isProperty) {
      throw new Error(`Property '${key}' is not provided from main`)
    }

    if (!scopes[key].has(Scope.preload)) {
      throw new Error(`'${key}' is not provided into preload scope`)
    }

    if (!accesses[key].has(Access.set)) {
      throw new Error(`No access to setting the '${key}' property`)
    }

    const channel = IPCChannel.propertySet + key
    const setterResult = ipcRenderer.sendSync(channel, newValue)

    if (setterResult.error) {
      errorHandler(setterResult.error, key)
      return false
    }
    return true
  },
  ownKeys(target: any): string[] {
    const keys: string[] = []
    for (const key of [...info.functions, ...info.properties]) {
      if (scopes[key].has(Scope.preload)) {
        keys.push(key)
      }
    }
    for (const key in target) {
      keys.push(key)
    }

    return keys
  },
  has(target: any, key: string): boolean {
    const keys: string[] = []
    for (const key of [...info.functions, ...info.properties]) {
      if (scopes[key].has(Scope.preload)) {
        keys.push(key)
      }
    }

    return (key in target) || keys.includes(key)
  }
})
