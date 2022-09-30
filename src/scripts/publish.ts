import { ipcMain } from 'electron'

import { Access, IPCChannel, Scope } from '../enums'
import type {
  IInfo,
  IIPCResult,
  IPublishMethodArgs, IPublishPropertyArgs,
  IRendererPublic,
  PublicFunction,
  PublicProperty
} from '../types'

const publicInfo = {
  properties: new Set<string>(),
  functions: new Set<String>(),
  accesses: {},
  scopes: {}
} as IInfo

ipcMain.on(IPCChannel.getPublicInfo, e => e.returnValue = publicInfo)

/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 */
export function publicStaticMethod(): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 * @param name - name by which the method will be accessed
 */
export function publicStaticMethod(name: string): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 * @param args - publish args
 */
export function publicStaticMethod(args: IPublishMethodArgs): MethodDecorator
export function publicStaticMethod(arg?: string | IPublishMethodArgs): MethodDecorator {
  return (target: any, key: string | symbol) => {
    let name = String(key)
    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? String(key)
        if (arg.scope) scope(name, arg.scope)
      }
    }

    publicFunction(name, (...args: any[]) => target[key](...args))
  }
}

/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 */
export function publicMethod(): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 * @param name - name by which the method will be accessed
 */
export function publicMethod(name: string): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 * @param args - publish args
 */
export function publicMethod(args: IPublishMethodArgs): MethodDecorator
export function publicMethod(arg?: string | IPublishMethodArgs): MethodDecorator {
  return (tgt: any, key: string | symbol, _) => {
    const target = tgt as IRendererPublic
    const prevRegister = target.__register__ ?? (() => {})
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticMethod(arg as string)(instance, key, _)
    }
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 */
export function publicStaticProperty(): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 * @param name - name by which the property will be accessed
 */
export function publicStaticProperty(name: string): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 * @param args - publish args
 */
export function publicStaticProperty(args: IPublishPropertyArgs): PropertyDecorator
export function publicStaticProperty(arg?: string | IPublishPropertyArgs): PropertyDecorator {
  return (target: any, key: string | symbol) => {
    let name = String(key)
    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? String(key)
        if (arg.scope) scope(name, arg.scope)
        if (arg.access) access(name, arg.access)
      }
    }

    publicVariable(name, {
      get: () => target[key],
      set: value => target[key] = value
    })
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 */
export function publicProperty(): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 * @param name - name by which the property will be accessed
 */
export function publicProperty(name: string): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 *
 * _required `providePublic(classInstance)`_
 * @param args - publish args
 */
export function publicProperty(args: IPublishPropertyArgs): PropertyDecorator
export function publicProperty(arg?: string | IPublishPropertyArgs): PropertyDecorator {
  return (tgt: any, key: string | symbol) => {
    const target = tgt as IRendererPublic
    const prevRegister = target.__register__ ?? (() => {})
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticProperty(arg as string)(instance, key)
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
 * @param name - name by which the function will be accessed
 * @param func - linked function
 * @param scopes - function scopes
 */
export function publicFunction(name: string, func: PublicFunction, scopes = [Scope.preload, Scope.renderer]): void {
  const { functions } = publicInfo
  const channel = IPCChannel.functionCall + name

  functions.add(name)
  if (!publicInfo.scopes[name]) {
    publicInfo.scopes[name] = new Set(scopes)
  }

  ipcMain.removeAllListeners(channel)
  ipcMain.on(channel, (e, ...args) => {
    try {
      const result = func(...args)
      if (result instanceof Promise) {
        const promiseChannel = channel + IPCChannel.promisePostfix
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
  if (!publicInfo.scopes[name]) {
    publicInfo.scopes[name] = new Set(scopes)
  }
  if (!publicInfo.accesses[name]) {
    const accesses: Access[] = []
    getter && accesses.push(Access.get)
    setter && accesses.push(Access.set)
    publicInfo.accesses[name] = new Set(accesses)
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

function scope(key: string, scope: Scope) {
  publicInfo.scopes[key] = new Set([scope])
}

function access(key: string, access: Access) {
  publicInfo.accesses[key] = new Set([access])
}
