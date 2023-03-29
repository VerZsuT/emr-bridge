import type {
  ClassGetterDecorator,
  ClassMethodDecorator,
  ClassPropertyDecorator,
  ClassSetterDecorator,
  IPublishMethodArgs,
  IPublishPropertyArgs,
  PublishGetterArgs,
  PublishSetterArgs
} from '../types'
import { addAccess, addScope, publicFunction, publicVariable } from './publish'

/**
 * Makes the method available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 */
export function publicMethod(): ClassMethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param name - name by which the method will be accessed
*/
export function publicMethod(name: string): ClassMethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param args - publish args
 */
export function publicMethod(args: IPublishMethodArgs): ClassMethodDecorator
export function publicMethod(arg?: string | IPublishMethodArgs): ClassMethodDecorator {
  return <This, Args extends any[], Return>(
    method: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
  ) => {
    let name = String(context.name)

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? name
        if (arg.scope) addScope(name, arg.scope)
      }
    }

    context.addInitializer(function (this: This) {
      publicFunction(name, method.bind(this))
    })
  }
}

/**
 * Makes the property available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 */
export function publicProperty(): ClassPropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param name - name by which the property will be accessed
 */
export function publicProperty(name: string): ClassPropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param args - publish args
 */
export function publicProperty(args: IPublishPropertyArgs): ClassPropertyDecorator
export function publicProperty(arg?: string | IPublishPropertyArgs): ClassPropertyDecorator {
  return <This, Type>(
    _: undefined,
    context: ClassFieldDecoratorContext<This, Type>
  ) => {
    const propName = String(context.name)
    let name = propName

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? name
        if (arg.scope) addScope(name, arg.scope)
        if (arg.access) addAccess(name, arg.access)
      }
    }

    context.addInitializer(function (this: This) {
      publicVariable(name, {
        get: () => {
          // @ts-ignore
          return this[propName]
        },
        set: (value: any) => {
          // @ts-ignore
          this[propName] = value
        }
      })
    })
  }
}

/**
 * Makes the property getter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 */
export function publicGetter(): ClassGetterDecorator
/**
 * Makes the property getter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param name - name by which the property will be accessed
 */
export function publicGetter(name: string): ClassGetterDecorator
/**
 * Makes the property getter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param args - publish args
 */
export function publicGetter(args: PublishGetterArgs): ClassGetterDecorator
export function publicGetter(arg?: string | PublishGetterArgs): ClassGetterDecorator {
  return <This, Type>(
    getter: () => Type,
    context: ClassGetterDecoratorContext<This, Type>
  ) => {
    let name = String(context.name)

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? name
        if (arg.scope) addScope(name, arg.scope)
      }
    }

    context.addInitializer(function (this: This) {
      publicVariable(name, {
        get: getter.bind(this)
      })
    })
  }
}

/**
 * Makes the property setter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 */
export function publicSetter(): ClassSetterDecorator
/**
 * Makes the property setter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param name - name by which the property will be accessed
 */
export function publicSetter(name: string): ClassSetterDecorator
/**
 * Makes the property setter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * @param args - publish args
 */
export function publicSetter(args: PublishSetterArgs): ClassSetterDecorator
export function publicSetter(arg?: string | PublishSetterArgs): ClassSetterDecorator {
  return <This, Type>(
    setter: (value: Type) => void,
    context: ClassSetterDecoratorContext<This, Type>
  ) => {
    let name = String(context.name)

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else {
        name = arg.name ?? name
        if (arg.scope) addScope(name, arg.scope)
      }
    }

    context.addInitializer(function (this: This) {
      publicVariable(name, {
        set: setter.bind(this)
      })
    })
  }
}
