import { ipcMain } from 'electron'

import { Access, IPCChannel, Scope } from './enums'
import type { IAccesses, IInfo, IIPCResult, IRendererPublic, IScopes, PublicFunction, PublicProperty } from './types'

const publicScopes = {} as IScopes
const publicAccesses = {} as IAccesses

const publicInfo = {
  properties: new Set<string>(),
  functions: new Set<String>()
} as IInfo

ipcMain.on(IPCChannel.getPublicInfo, e => e.returnValue = publicInfo)
ipcMain.on(IPCChannel.getPublicScopes, e => e.returnValue = publicScopes)
ipcMain.on(IPCChannel.getPublicAccesses, e => e.returnValue = publicAccesses)

/**
 * Restricts the access scope
 */
export function scope(scope: Scope) {
  return (target: any, key: string) => {
    publicScopes[key] = new Set([scope])
  }
}

/**
 * Restricts access
 */
export function access(access: Access) {
  return (target: any, key: string) => {
    publicAccesses[key] = new Set([access])
  }
}

/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 * @param name - name by which the method will be accessed
 */
export function publicStaticMethod(name?: string): MethodDecorator {
  return (target: any, key: string | symbol) => {
    publicFunction((...args: any[]) => target[key](...args), String(name ?? key))
  }
}

/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 * @param name - name by which the method will be accessed
 */
export function publicMethod(name?: string): MethodDecorator {
  return (tgt: any, key: string | symbol, _) => {
    const target = tgt as IRendererPublic
    const prevRegister = target.__register__ ?? (() => {})
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticMethod(name)(instance, key, _)
    }
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 * @param name - name by which the property will be accessed
 */
export function publicStaticProperty(name?: string): PropertyDecorator {
  return (target: any, k: string | symbol) => {
    const key = String(name ?? k)
    publicVariable(key, {
      get: () => target[k],
      set: value => target[k] = value
    })
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 * @param name - name by which the property will be accessed
 */
export function publicProperty(name?: string): PropertyDecorator {
  return (tgt: any, key: string | symbol) => {
    const target = tgt as IRendererPublic
    const prevRegister = target.__register__ ?? (() => {})
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticProperty(name)(instance, key)
    }
  }
}

/**
 * Binds all public entities of a class to a specific instance.
 *
 * _only for class instance_
 */
export function providePublic<InstanceType>(instance: InstanceType): InstanceType {
  const target = instance as IRendererPublic
  if (!target.__register__) {
    throw new Error('Public methods not defined')
  }
  target.__register__(instance)
  target.__register__ = undefined
  return instance
}

/**
 * Makes the function available for **renderer** and **preload** processes.
 *
 * _only for function_
 * @param func - linked function
 * @param name - name by which the function will be accessed
 * @param scopes - function scopes
 */
export function publicFunction(func: PublicFunction, name: string, scopes = [Scope.preload, Scope.renderer]): void {
  const { functions } = publicInfo
  const channel = IPCChannel.functionCall + name

  functions.add(name)
  if (!publicScopes[name]) {
    publicScopes[name] = new Set(scopes)
  }

  ipcMain.removeAllListeners(channel)
  ipcMain.on(channel, (e, ...args) => {
    try {
      const result = func(...args)
      if (result instanceof Promise) {
        const promiseChannel = `${channel}${IPCChannel.promisePostfix}`
        result
          .then(value => e.sender.send(promiseChannel, { value } as IIPCResult))
          .catch(reason => e.sender.send(promiseChannel, { error: String(reason) } as IIPCResult))
        e.returnValue = { promiseChannel } as IIPCResult
      }
      else {
        e.returnValue = { value: result } as IIPCResult
      }
    }
    catch (error) {
      e.returnValue = { error: String(error) } as IIPCResult
    }
  })
}

/**
 * Makes the function available for **renderer** and **preload** processes.
 *
 * _only for variables_
 * @param name - name by which the variable will be accessed
 * @param value - variable getter/setter
 * @param scopes - variable scopes
 */
export function publicVariable(name: string, value: PublicProperty, scopes = [Scope.renderer, Scope.preload]): void {
  const { properties } = publicInfo
  const getChannel = IPCChannel.propertyGet + name
  const setChannel = IPCChannel.propertySet + name

  const { get: getter, set: setter } = value

  properties.add(name)
  if (!publicScopes[name]) {
    publicScopes[name] = new Set(scopes)
  }
  if (!publicAccesses[name]) {
    const accesses: Access[] = []
    getter && accesses.push(Access.get)
    setter && accesses.push(Access.set)
    publicAccesses[name] = new Set(accesses)
  }

  if (getter) {
    ipcMain.removeAllListeners(getChannel)
    ipcMain.on(getChannel, event => {
      try {
        const result = getter()
        event.returnValue = { value: result }
      }
      catch (error) {
        event.returnValue = { error }
      }
    })
  }

  if (setter) {
    ipcMain.removeAllListeners(setChannel)
    ipcMain.on(setChannel, (event, ...args) => {
      try {
        setter(args[0])
        event.returnValue = { value: null }
      }
      catch (error) {
        event.returnValue = { error }
      }
    })
  }
}
