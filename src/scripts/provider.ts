import { Access, Scope } from '../enums'
import type { ICreateProviderArgs, IIPCResult, ITarget } from '../types'

function errorHandler(error: string, channel: string): void {
  console.error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
}

function createProvider(args: ICreateProviderArgs): ITarget {
  const { info, scope, getVariable, setVariable, callFunction, handleMainEvent, waitPromise, emitRendererEvent } = args

  const target: ITarget = {
    as: <T>(): T => proxy
  }

  info.functions.forEach(funcName => {
    if (!info.scopes[funcName].has(scope)) return

    Object.defineProperty(target, funcName, {
      get() {
        return (...args: any[]) => {
          const result = callFunction(funcName, ...args)
          if (result.error) {
            errorHandler(result.error, funcName)
            return
          }

          if (result.promiseChannel)
            return waitPromise(result.promiseChannel)

          return result.value
        }
      },
      set() {
        throw new Error(`Function '${funcName}' is readonly`)
      },
      enumerable: true
    })
  })

  info.rendererEvents.forEach(rendererEventName => {
    if (!info.scopes[rendererEventName].has(scope)) return

    Object.defineProperty(target, rendererEventName, {
      get() {
        return (arg: any) => emitRendererEvent(rendererEventName, arg)
      },
      set() {
        throw new Error(`Function '${rendererEventName}' is readonly`)
      },
      enumerable: true
    })
  })

  info.mainEvents.forEach(mainEventName => {
    if (!info.scopes[mainEventName].has(scope)) return

    const eventNameOn = `on${mainEventName[0].toUpperCase()}${mainEventName.slice(1)}`
    const eventNameOnce = `once${mainEventName[0].toUpperCase()}${mainEventName.slice(1)}`

    Object.defineProperty(target, eventNameOn, {
      get() {
        return (handler: (...args: any[]) => any) => {
          return handleMainEvent(mainEventName, 'on', (result: IIPCResult) => {
            if (result.error) {
              errorHandler(result.error, mainEventName)
              return
            }

            if (result.promiseChannel)
              waitPromise(result.promiseChannel).then(handler)

            handler(result.value)
          })
        }
      },
      set() {
        throw new Error(`Function '${eventNameOn}' is readonly`)
      },
      enumerable: true
    })
    Object.defineProperty(target, eventNameOnce, {
      get() {
        return (handler: (...args: any[]) => any) => {
          return handleMainEvent(mainEventName, 'once', (result: IIPCResult) => {
            if (result.error) {
              errorHandler(result.error, mainEventName)
              return
            }

            if (result.promiseChannel)
              waitPromise(result.promiseChannel).then(handler)

            handler(result.value)
          })
        }
      },
      set() {
        throw new Error(`Function '${eventNameOnce}' is readonly`)
      },
      enumerable: true
    })
  })

  info.properties.forEach(propName => {
    if (!info.scopes[propName].has(scope)) return

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

    if (!info.accesses[propName].has(Access.get))
      getter = () => { throw new Error(`No access to getting the '${propName}' property`) }
    if (!info.accesses[propName].has(Access.set))
      setter = () => { throw new Error(`No access to setting the '${propName}' property`) }

    Object.defineProperty(target, propName, {
      get: getter,
      set: setter,
      enumerable: true
    })
  })

  const proxy = new Proxy(target, {
    get(target: any, key: string): any {
      if (key in target) return target[key]

      const isFunction = info.functions.has(key)
      const isProperty = info.properties.has(key)

      if (!isFunction && !isProperty)
        throw new Error(`'${key}' is not provided from main`)

      if (!info.scopes[key].has(Scope.renderer))
        throw new Error(`'${key}' is not provided into renderer scope`)

      if (isProperty && !info.accesses[key].has(Access.get))
        throw new Error(`No access to getting the '${key}' property`)

      throw new Error(`Unknown error on get '${key}'`)
    },
    set(target: any, key: string, newValue: any): boolean {
      if (key in target) {
        target[key] = newValue
        return true
      }

      const isFunction = info.functions.has(key)
      const isProperty = info.properties.has(key)

      if (isFunction)
        throw new Error(`Function '${key}' is readonly`)

      if (!isProperty)
        throw new Error(`Property '${key}' is not provided from main`)

      if (!info.scopes[key].has(Scope.renderer))
        throw new Error(`'${key}' is not provided into renderer scope`)

      if (!info.accesses[key].has(Access.set))
        throw new Error(`No access to setting the '${key}' property`)

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

export default createProvider
