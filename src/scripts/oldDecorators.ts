import type {
  IPublishMethodArgs,
  IPublishPropertyArgs,
  IRendererPublic
} from '../types'
import { addAccess, addScope, publicFunction, publicVariable } from './publish'

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
