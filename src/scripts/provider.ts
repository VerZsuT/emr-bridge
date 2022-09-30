import type { ICreateProviderArgs } from '../types'
import { Access, Scope } from '../enums'

function errorHandler(error: string, channel: string): void {
  console.error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
}

export interface ITarget {
  as<T>(): T
}

export function createProvider(args: ICreateProviderArgs): ITarget {
  const { info, scope, getVariable, setVariable, callFunction, waitPromise } = args

  const target: any = {
    as: <T>(): T => proxy
  }

  info.functions.forEach(funcName => {
    if (info.scopes[funcName].has(scope)) {
      Object.defineProperty(target, funcName, {
        get: () => (...args: any[]) => {
          const result = callFunction(funcName, ...args)
          if (result.error) {
            errorHandler(result.error, funcName)
            return
          }
          if (result.promiseChannel) {
            return waitPromise(result.promiseChannel)
          }
          return result.value
        },
        set: () => {
          throw new Error(`Function '${funcName}' is readonly`)
        },
        enumerable: true
      })
    }
  })

  info.properties.forEach(propName => {
    if (info.scopes[propName].has(scope)) {
      let getter = (): any => {
        const result = getVariable(propName)
        if (result.error) {
          errorHandler(result.error, propName)
          return
        }
        return result.value
      }
      let setter = (value: any): void => {
        const result = setVariable(propName, value)
        if (result?.error) {
          errorHandler(result.error, propName)
          return
        }
      }

      if (!info.accesses[propName].has(Access.get)) {
        getter = () => {
          throw new Error(`No access to getting the '${propName}' property`)
        }
      }
      if (!info.accesses[propName].has(Access.set)) {
        setter = () => {
          throw new Error(`No access to setting the '${propName}' property`)
        }
      }

      Object.defineProperty(target, propName, {
        get: getter,
        set: setter,
        enumerable: true
      })
    }
  })

  const proxy = new Proxy(target, {
    get(target: any, key: string): any {
      if (key in target) return target[key]

      const isFunction = info.functions.has(key)
      const isProperty = info.properties.has(key)

      if (!isFunction && !isProperty) {
        throw new Error(`'${key}' is not provided from main`)
      }

      if (!info.scopes[key].has(Scope.renderer)) {
        throw new Error(`'${key}' is not provided into renderer scope`)
      }

      if (isProperty && !info.accesses[key].has(Access.get)) {
        throw new Error(`No access to getting the '${key}' property`)
      }

      throw new Error(`Unknown error on get '${key}'`)
    },
    set(target: any, key: string, newValue: any): boolean {
      if (key in target) {
        target[key] = newValue
        return true
      }

      const isFunction = info.functions.has(key)
      const isProperty = info.properties.has(key)

      if (isFunction) {
        throw new Error(`Function '${key}' is readonly`)
      }

      if (!isProperty) {
        throw new Error(`Property '${key}' is not provided from main`)
      }

      if (!info.scopes[key].has(Scope.renderer)) {
        throw new Error(`'${key}' is not provided into renderer scope`)
      }

      if (!info.accesses[key].has(Access.set)) {
        throw new Error(`No access to setting the '${key}' property`)
      }

      throw new Error(`Unknown error on set '${key}'`)
    },
    ownKeys(target: any): string[] {
      return Object.keys(target)
    },
    has(target: any, key: string): boolean {
      return key in target
    }
  })
  return proxy
}
