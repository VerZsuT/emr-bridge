import { Access, Scope } from './enums'

if (!window.__provider__) {
  throw new Error('Required methods not provided. Did you forget to call "provide" in preload?')
}

const provider = window.__provider__
const info = provider.getInfo()
const scopes = provider.getScopes()
const accesses = provider.getAccesses()

function errorHandler(error: string, channel: string): void {
  console.error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
}

const target = {
  as: <T>() => <T>Bridge
}

/**
 * Bridge between `renderer` and `main` processes.
 *
 * _only for renderer process_
 */
export const Bridge: typeof target = new Proxy(target, {
  get(target: any, key: string): any {
    if (key in target) return target[key]

    const isFunction = info.functions.has(key)
    const isProperty = info.properties.has(key)

    if (!isFunction && !isProperty) {
      throw new Error(`'${key}' is not provided from main`)
    }

    if (!scopes[key].has(Scope.renderer)) {
      throw new Error(`'${key}' is not provided into renderer scope`)
    }

    if (isFunction) {
      return (...args: any[]): any => {
        const result = provider.provided.functions[key](...args)

        if (result.error) {
          errorHandler(result.error, key)
          return
        }

        if (result.promiseChannel) {
          return new Promise<any>((resolve, reject) => {
            provider.waitPromise(key, resolve, reject)
          })
        }

        return result.value
      }
    }

    if (isProperty) {
      if (!accesses[key].has(Access.get)) {
        throw new Error(`No access to getting the '${key}' property`)
      }

      const result = provider.provided.properties[key]

      if (result.error) {
        errorHandler(result.error, key)
        return
      }

      return result.value
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

    if (!scopes[key].has(Scope.renderer)) {
      throw new Error(`'${key}' is not provided into renderer scope`)
    }

    if (!accesses[key].has(Access.set)) {
      throw new Error(`No access to setting the '${key}' property`)
    }

    provider.provided.properties[key] = newValue
    return true
  },
  ownKeys(target: any): string[] {
    const keys: string[] = []
    for (const key of [...info.functions, ...info.properties]) {
      if (scopes[key].has(Scope.renderer)) {
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
      if (scopes[key].has(Scope.renderer)) {
        keys.push(key)
      }
    }

    return (key in target) || keys.includes(key)
  }
})
