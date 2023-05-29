import { Access } from '../enums'
import type { EventUnsubscriber, ICreateProviderArgs, IIPCResult, ITarget } from '../types'

function errorHandler(error: string, channel: string): void {
  console.error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
}

function createProvider(args: ICreateProviderArgs): ITarget {
  const { info, scope, getVariable, setVariable, callFunction, handleMainEvent, waitPromise, emitRendererEvent } = args

  const target: ITarget = {
    as: <T>() => target as T
  }

  function define(name: string, attrs?: { get?: () => any, set?: (v: any) => void, value?: any }): void {
    let descriptor: PropertyDescriptor

    if (!info.scopes.get(name)!.has(scope)) {
      descriptor = {
        get(): never { throw new Error(`'${name}' is not provided into ${scope} scope`) },
        set(): never { throw new Error(`'${name}' is not provided into ${scope} scope`) }
      }
    }
    else if (attrs?.value) {
      descriptor = {
        get: () => attrs.value,
        set: (): never => { throw new Error(`'${name}' is readonly`) },
        enumerable: true
      }
    }
    else {
      descriptor = {
        get: attrs?.get || ((): never => { throw new Error(`No access to getting '${name}'`) }),
        set: attrs?.set || ((): never => { throw new Error(`'${name}' is readonly`) }),
        enumerable: true
      }
    }

    Object.defineProperty(target, name, descriptor)
  }

  info.functions.forEach(funcName => {
    define(funcName, {
      value(...args: any[]): any {
        const result = callFunction(funcName, ...args)
        if (result.error) {
          errorHandler(result.error, funcName)
          return
        }

        if (result.promiseChannel)
          return waitPromise(result.promiseChannel)

        return result.value
      }
    })
  })

  info.rendererEvents.forEach(eventName => {
    define(eventName, {
      value(arg: any): void {
        emitRendererEvent(eventName, arg)
      }
    })
  })

  info.mainEvents.forEach(mainEventName => {
    const eventNameOn = `on${mainEventName[0].toUpperCase()}${mainEventName.slice(1)}`
    const eventNameOnce = `once${mainEventName[0].toUpperCase()}${mainEventName.slice(1)}`

    define(eventNameOn, {
      value(handler: (...args: any[]) => any): EventUnsubscriber {
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
    })
    define(eventNameOnce, {
      value(handler: (...args: any[]) => any): EventUnsubscriber {
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
    })
  })

  info.properties.forEach(propName => {
    define(propName, {
      get: info.accesses.get(propName)!.has(Access.get)
        ? (): any => {
          const result = getVariable(propName)
          if (result.error) {
            errorHandler(result.error, propName)
            return
          }
          return result.value
        }
        : (): never => { throw new Error(`No access to getting the '${propName}' property`) },
      set: info.accesses.get(propName)!.has(Access.set)
        ? (value: any): void => {
          const result = setVariable(propName, value)
          if (result?.error) {
            errorHandler(result.error, propName)
            return
          }
        }
        : (): never => { throw new Error(`No access to setting the '${propName}' property`) }
    })
  })

  return target
}

export default createProvider
