import { Access, Scope } from '../enums.js'
import { NoGetAccessError, NoSetAccessError, NotProvidedIntoScopeError, TrySetReadonlyError } from '../errors.js'
import type { EventHandler, EventUnsubscriber, IPCResult, Info, Target } from '../types.js'

export default abstract class Provider implements Target {
  protected abstract info: Info
  protected abstract scope: Scope

  protected abstract getVariable(name: string): IPCResult
  protected abstract setVariable(name: string, value: any): IPCResult
  protected abstract callFunction(name: string, secret: number, args: any[]): IPCResult
  protected abstract waitPromise(channel: string, secret?: number): Promise<any>
  protected abstract emitRendererEvent(name: string, arg: any): void
  protected abstract handleMainEvent(name: string, type: 'on' | 'once', handler: EventHandler<IPCResult>): EventUnsubscriber

  as<T>() { return this.target as T }

  protected readonly target: any = {}

  protected init() {
    this.initFunctions()
    this.initProperties()
    this.initMainEvents()
    this.initRendererEvents()
  }

  protected errorHandler(error: string, channel: string): never {
    throw new Error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
  }

  protected initFunctions() {
    for (const name of this.info.functions) {
      this.define(name, {
        value: (...args: any[]): any => {
          const secret = Math.random()
          const { error, promiseChannel, value } = this.callFunction(name, secret, args)
          if (error) {
            this.errorHandler(error, name)
          }
  
          if (promiseChannel) return this.waitPromise(promiseChannel, secret)
          return value
        }
      })
    }
  }

  protected initRendererEvents() {
    for (const name of this.info.rendererEvents) {
      this.define(name, {
        value: (arg: any) => {
          this.emitRendererEvent(name, arg)
        }
      })
    }
  }

  protected initMainEvents() {
    for (const name of this.info.mainEvents) {
      const eventNameOn = `on${name[0].toUpperCase()}${name.slice(1)}`
      const eventNameOnce = `once${name[0].toUpperCase()}${name.slice(1)}`

      this.define(eventNameOn, {
        value: (handler: (...args: any[]) => any): EventUnsubscriber => {
          return this.handleMainEvent(name, 'on', ({ error, value }: IPCResult) => {
            if (error) {
              this.errorHandler(error, name)
            }
            handler(value)
          })
        }
      })
      this.define(eventNameOnce, {
        value: (handler: (...args: any[]) => any): EventUnsubscriber => {
          return this.handleMainEvent(name, 'once', ({ error, value }: IPCResult) => {
            if (error) {
              this.errorHandler(error, name)
            }
            handler(value)
          })
        }
      })
    }
  }

  protected initProperties() {
    for (const name of this.info.properties) {
      this.define(name, {
        get: this.info.accesses.get(name)!.has(Access.get)
          ? (): any => {
            const { error, value } = this.getVariable(name)
            if (error) {
              this.errorHandler(error, name)
            }
            return value
          }
          : () => { throw new NoGetAccessError(name) },
        set: this.info.accesses.get(name)!.has(Access.set)
          ? (value: any): void => {
            const { error } = this.setVariable(name, value)
            if (error) {
              this.errorHandler(error, name)
            }
          }
          : () => { throw new NoSetAccessError(name) }
      })
    }
  }

  protected define(name: string, attrs?: { get?: () => any, set?: (v: any) => void, value?: any }) {
    let descriptor: PropertyDescriptor

    if (!this.info.scopes.get(name)!.has(this.scope)) {
      descriptor = {
        get: () => { throw new NotProvidedIntoScopeError(name, this.scope) },
        set: () => { throw new NotProvidedIntoScopeError(name, this.scope) }
      }
    }
    else if (attrs?.value) {
      descriptor = {
        get: () => attrs.value,
        set: () => { throw new TrySetReadonlyError(name) },
        enumerable: true
      }
    }
    else {
      descriptor = {
        get: attrs?.get || (() => { throw new NoSetAccessError(name) }),
        set: attrs?.set || (() => { throw new TrySetReadonlyError(name) }),
        enumerable: true
      }
    }

    Object.defineProperty(this.target, name, descriptor)
  }
}
