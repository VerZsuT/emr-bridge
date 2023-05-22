import type {
  EventReceiver,
  IPublishMainEventArgs,
  IPublishMethodArgs,
  IPublishPropertyArgs,
  IPublishRendererEventArgs,
  IRendererPublic
} from '../types'
import { addAccess, addScope, publicFunction, publicMainEvent, publicRendererEvent, publicVariable } from './publish'

/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 */
export function publicStaticMethod(): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param name - name by which the method will be accessed
 */
export function publicStaticMethod(name: string): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
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
        if (arg.scope) addScope(name, arg.scope)
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
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 */
export function publicMethod(): MethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
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
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 * @param args - publish args
 */
export function publicMethod(args: IPublishMethodArgs): MethodDecorator
export function publicMethod(arg?: string | IPublishMethodArgs): MethodDecorator {
  return (tgt: any, key: string | symbol, _) => {
    const target: IRendererPublic = tgt
    const prevRegister = target.__register__ ?? (() => { })
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticMethod(<string>arg)(instance, key, _)
    }
  }
}

/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 */
export function publicStaticMainEvent(): MethodDecorator
/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param name - name by which the event will be accessed
 */
export function publicStaticMainEvent(name: string): MethodDecorator
/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param args - publish args
 */
export function publicStaticMainEvent(args: IPublishMainEventArgs): MethodDecorator
export function publicStaticMainEvent(arg?: string | IPublishMainEventArgs): MethodDecorator {
  return (target: any, key: string | symbol) => {
    let name = String(key)

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? String(key)
        if (arg.scope) addScope(name, arg.scope)
      }
    }

    target[key] = publicMainEvent(name, target[key].bind(target))
  }
}

/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 */
export function publicClassMainEvent(): MethodDecorator
/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 * @param name - name by which the event will be accessed
 */
export function publicClassMainEvent(name: string): MethodDecorator
/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 * @param args - publish args
 */
export function publicClassMainEvent(args: IPublishMainEventArgs): MethodDecorator
export function publicClassMainEvent(arg?: string | IPublishMainEventArgs): MethodDecorator {
  return (tgt: any, key: string | symbol, _) => {
    const target: IRendererPublic = tgt
    const prevRegister = target.__register__ ?? (() => { })
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticMainEvent(<string>arg)(instance, key, _)
    }
  }
}

/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for static_
 * 
 * _experimental decorators_
 */
export function publicStaticRendererEvent(): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param name - name by which the event will be accessed
 */
export function publicStaticRendererEvent(name: string): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param receiver - linked receiver
 */
export function publicStaticRendererEvent(receiver: EventReceiver): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param name - name by which the event will be accessed
 * @param receiver - linked receiver
 */
export function publicStaticRendererEvent(name: string, receiver: EventReceiver): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param args - publish args
 */
export function publicStaticRendererEvent(args: IPublishRendererEventArgs): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param args - publish args
 */
export function publicStaticRendererEvent(args: IPublishRendererEventArgs): PropertyDecorator
export function publicStaticRendererEvent(arg?: string | EventReceiver | IPublishRendererEventArgs): PropertyDecorator {
  return (target: any, key: string | symbol) => {
    let name = String(key)
    let receiver = (v: any) => v

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else if (typeof arg === 'object') {
        name = arg.name ?? String(key)
        receiver = arg.receiver ?? receiver
        if (arg.scope) addScope(name, arg.scope)
      }
      else {
        receiver = arg
      }
    }

    target[key] = publicRendererEvent(name, receiver)
  }
}

/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 */
export function publicClassRendererEvent(): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 * @param name - name by which the event will be accessed
 */
export function publicClassRendererEvent(name: string): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 * @param receiver - linked receiver
 */
export function publicClassRendererEvent(receiver: EventReceiver): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 * @param name - name by which the event will be accessed
 * @param receiver - linked receiver
 */
export function publicClassRendererEvent(name: string, receiver: EventReceiver): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 * @param args - publish args
 */
export function publicClassRendererEvent(args: IPublishRendererEventArgs): PropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 * @param args - publish args
 */
export function publicClassRendererEvent(args: IPublishRendererEventArgs): PropertyDecorator
export function publicClassRendererEvent(arg?: string | EventReceiver | IPublishRendererEventArgs): PropertyDecorator {
  return (tgt: any, key: string | symbol) => {
    const target: IRendererPublic = tgt
    const prevRegister = target.__register__ ?? (() => { })
    target.__register__ = instance => {
      prevRegister(instance)
      publicStaticRendererEvent(<string>arg)(instance, key)
    }
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 */
export function publicStaticProperty(): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
 * @param name - name by which the property will be accessed
 */
export function publicStaticProperty(name: string): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for static_
 * 
 * _experimental decorators_
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
        if (arg.scope) addScope(name, arg.scope)
        if (arg.access) addAccess(name, arg.access)
      }
    }

    publicVariable(name, {
      get() {
        return target[key]
      },
      set(value: any) {
        target[key] = value
      }
    })
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 */
export function publicProperty(): PropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 *
 * _only for non-static_
 * 
 * _experimental decorators_
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
 * _experimental decorators_
 *
 * _required `providePublic(classInstance)`_
 * @param args - publish args
 */
export function publicProperty(args: IPublishPropertyArgs): PropertyDecorator
export function publicProperty(arg?: string | IPublishPropertyArgs): PropertyDecorator {
  return (tgt: any, key: string | symbol) => {
    const target: IRendererPublic = tgt
    const prevRegister = target.__register__ ?? (() => { })
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
  if (!target.__register__)
    throw new Error('Public methods not defined')

  target.__register__(instance)
  target.__register__ = undefined
  return instance
}
