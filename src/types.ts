import type { Scope } from './enums'
import { Access } from './enums'

export interface Target {
  as<T>(): T
}

export type ClassMethodDecorator = <This, Args extends any[], Return>(
  method: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) => void

export type ClassPropertyDecorator = <This, Value>(
  target: undefined,
  context: ClassFieldDecoratorContext<This, Value>
) => void

export type ClassGetterDecorator = <This, Value>(
  getter: () => Value,
  context: ClassGetterDecoratorContext<This, Value>
) => void

export type ClassSetterDecorator = <This, Value>(
  setter: (value: Value) => void,
  context: ClassSetterDecoratorContext<This, Value>
) => void

export type PublishSetterArgs = Omit<PublishPropertyArgs, 'access'>

export type PublishGetterArgs = Omit<PublishPropertyArgs, 'access'>

export interface IPCResult {
  value?: any
  error?: string
  promiseChannel?: string
  secret?: number
}

export interface IPCRequest {
  args: any[]
  secret?: number
}

export interface PublishMethodArgs {
  name?: string
  scope?: Scope
}

export interface PublishMainEventArgs {
  name?: string
  scope?: Scope
}

export interface PublishRendererEventArgs {
  name?: string
  scope?: Scope
  procFn?: EventReceiver
}

export interface PublishPropertyArgs {
  name?: string
  scope?: Scope
  access?: Access
}

export type RendererEvent<T = void> = (handler: EventHandler<T>, isOnce?: boolean) => EventUnsubscriber
export type MainEvent<T = void> = (handler: EventHandler<T>) => EventUnsubscriber
export type EventEmitter = (...args: any[]) => any
export type EventReceiver<I = void, O = I> = (input: I) => O
export type EventUnsubscriber = () => void
export type EventHandler<T = void> = (result: T) => void

export type PublicFunction = (...args: any[]) => any

export interface PublicProperty<T> {
  get?(): T,
  set?(value: T): void
}

export interface RendererPublic {
  __register__?(instance: any): void
}

export interface GlobalProvider {
  getInfo(): Info
  waitPromise(name: string, resolve: (value: any) => void, reject?: (reason?: any) => void, secret?: number): void
  provided: {
    functions: Record<string, (secret: number, args: any[]) => IPCResult>,
    mainEvents: Record<string, (type: 'on' | 'once', handler: EventHandler<IPCResult>) => EventUnsubscriber>
    rendererEvents: Record<string, (arg: any) => void>
    properties: Record<string, { get(): IPCResult, set(val: any): IPCResult }>
  }
}

export interface Info {
  properties: Set<string>
  functions: Set<string>
  mainEvents: Set<string>
  rendererEvents: Set<string>
  scopes: Map<string, Set<Scope>>
  accesses: Map<string, Set<Access>>
}
