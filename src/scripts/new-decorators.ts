import type {
  ClassGetterDecorator,
  ClassMethodDecorator,
  ClassPropertyDecorator,
  ClassSetterDecorator,
  EventReceiver,
  PublishGetterArgs,
  PublishMainEventArgs,
  PublishMethodArgs,
  PublishPropertyArgs,
  PublishRendererEventArgs,
  PublishSetterArgs
} from '../types.js'
import { addAccess, addScope, publicFunction, publicMainEvent, publicRendererEvent, publicVariable } from './publish.js'

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
 * 
 * @param name - name by which the method will be accessed
*/
export function publicMethod(name: string): ClassMethodDecorator
/**
 * Makes the method available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * 
 * @param args - publish args
 */
export function publicMethod(args: PublishMethodArgs): ClassMethodDecorator
export function publicMethod(arg?: string | PublishMethodArgs): ClassMethodDecorator {
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
 * Makes the event available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 */
export function publicClassMainEvent(): ClassMethodDecorator
/**
 * Makes the event available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * 
 * @param name - name by which the event will be accessed
*/
export function publicClassMainEvent(name: string): ClassMethodDecorator
/**
 * Makes the event available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * 
 * @param args - publish args
 */
export function publicClassMainEvent(args: PublishMainEventArgs): ClassMethodDecorator
export function publicClassMainEvent(arg?: string | PublishMainEventArgs): ClassMethodDecorator {
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
      // @ts-ignore
      this[context.name] = publicMainEvent(name, method.bind(this))
    })
  }
}

/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 * 
 * _only new decorators_
 */
export function publicClassRendererEvent(): ClassPropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 * 
 * _only new decorators_
 * 
 * @param name - name by which the event will be accessed
 */
export function publicClassRendererEvent(name: string): ClassPropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 * 
 * _only new decorators_
 * 
 * @param receiver - linked receiver
 */
export function publicClassRendererEvent(receiver: EventReceiver): ClassPropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 * 
 * * _only new decorators_
 * 
 * @param name - name by which the event will be accessed
 * @param receiver - linked receiver
 */
export function publicClassRendererEvent(name: string, receiver: EventReceiver): ClassPropertyDecorator
/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 * 
 * _only new decorators_
 * 
 * @param args - publish args
 */
export function publicClassRendererEvent(args: PublishRendererEventArgs): ClassPropertyDecorator
export function publicClassRendererEvent(arg?: string | EventReceiver | PublishRendererEventArgs): ClassPropertyDecorator {
  return <This, Type>(
    _: undefined,
    context: ClassFieldDecoratorContext<This, Type>
  ) => {
    let name = String(context.name)
    let receiver = (v: any) => v

    if (arg) {
      if (typeof arg === 'string') {
        name = arg
      }
      else if (typeof arg === 'object') {
        name = arg.name ?? String(context.name)
        receiver = arg.procFn ?? receiver
        if (arg.scope) addScope(name, arg.scope)
      }
      else {
        receiver = arg
      }
    }

    context.addInitializer(function (this: This) {
      // @ts-ignore
      this[context.name] = publicRendererEvent(name, receiver)
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
 * 
 * @param name - name by which the property will be accessed
 */
export function publicProperty(name: string): ClassPropertyDecorator
/**
 * Makes the property available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * 
 * @param args - publish args
 */
export function publicProperty(args: PublishPropertyArgs): ClassPropertyDecorator
export function publicProperty(arg?: string | PublishPropertyArgs): ClassPropertyDecorator {
  return <This, Type>(
    _: undefined,
    context: ClassFieldDecoratorContext<This, Type>
  ) => {
    const key = String(context.name)
    let name = key

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
          // @ts-expect-error
          return this[key]
        },
        set: (value: any) => {
          // @ts-expect-error
          this[key] = value
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
 * 
 * @param name - name by which the property will be accessed
 */
export function publicGetter(name: string): ClassGetterDecorator
/**
 * Makes the property getter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * 
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
 * 
 * @param name - name by which the property will be accessed
 */
export function publicSetter(name: string): ClassSetterDecorator
/**
 * Makes the property setter available for **renderer** and **preload** processes.
 * 
 * _only new decorators_
 * 
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
