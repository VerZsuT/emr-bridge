import type { Scope } from './enums'
import { Access } from './enums'

export interface ITarget {
  as<T>(): T
}

export type ClassMethodDecorator = <This, Args extends any[], Return> (
  method: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) => void

export type ClassPropertyDecorator = <This, Type> (
  target: undefined,
  context: ClassFieldDecoratorContext<This, Type>
) => void

export type ClassGetterDecorator = <This, Type> (
  getter: () => Type,
  context: ClassGetterDecoratorContext<This, Type>
) => void

export type ClassSetterDecorator = <This, Type> (
  setter: (value: Type) => void,
  context: ClassSetterDecoratorContext<This, Type>
) => void

export type PublishSetterArgs = Omit<IPublishPropertyArgs, 'access'>

export type PublishGetterArgs = Omit<IPublishPropertyArgs, 'access'>

export interface IIPCResult {
  value?: any
  error?: string
  promiseChannel?: string
}

export interface IPublishMethodArgs {
  name?: string
  scope?: Scope
}

export interface IPublishMainEventArgs {
  name?: string
  scope?: Scope
}

export interface IPublishRendererEventArgs {
  name?: string
  scope?: Scope
  procFn?: EventReceiver
}

export interface IPublishPropertyArgs {
  name?: string
  scope?: Scope
  access?: Access
}

export interface ICreateProviderArgs {
  info: IInfo
  scope: Scope
  handleMainEvent(name: string, type: 'on' | 'once', handler: EventHandler<IIPCResult>): EventUnsubscriber
  emitRendererEvent(name: string, arg: any): void
  callFunction(name: string, ...args: any[]): IIPCResult
  getVariable(name: string): IIPCResult
  setVariable(name: string, value: any): IIPCResult | undefined
  waitPromise(channel: string): Promise<any>
}

export type Scopes = Map<string, Set<Scope>>
export type Accesses = Map<string, Set<Access>>

export type RendererEvent<T = void> = (handler: EventHandler<T>, isOnce?: boolean) => EventUnsubscriber
export type MainEvent<T = void> = (handler: EventHandler<T>) => EventUnsubscriber
export type EventEmitter = (...args: any[]) => any
export type EventReceiver<I = void, O = I> = (input: I) => O
export type EventUnsubscriber = () => void
export type EventHandler<T = void> = (result: T) => void

export interface IRendererPublic {
  __register__?(instance: any): void
}

export interface IProvider {
  getInfo(): IInfo
  waitPromise(name: string, resolve: (value: any) => void, reject?: (reason?: any) => void): void
  provided: {
    functions: Record<string, (...args: any[]) => IIPCResult>,
    mainEvents: Record<string, (type: 'on' | 'once', handler: EventHandler<IIPCResult>) => EventUnsubscriber>
    rendererEvents: Record<string, (arg: any) => void>
    properties: Record<string, { get(): IIPCResult, set(val: any): void }>
  }
}

export type PublicFunction = (...args: any[]) => any

export type PublicProperty<T> = {
  get?(): T,
  set?(value: T): void
}

export interface IInfo {
  properties: Set<string>
  functions: Set<string>
  mainEvents: Set<string>
  rendererEvents: Set<string>
  scopes: Scopes
  accesses: Accesses
}
