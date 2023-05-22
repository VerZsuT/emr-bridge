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

export interface IPublishEventArgs {
  name?: string
  scope?: Scope
}

export interface IPublishPropertyArgs {
  name?: string
  scope?: Scope
  access?: Access
}

export interface ICreateProviderArgs {
  info: IInfo
  scope: Scope
  handleEvent(name: string, type: 'on' | 'once', handler: EventHandler<IIPCResult>): EventUnsubscriber
  callFunction(name: string, ...args: any[]): IIPCResult
  getVariable(name: string): IIPCResult
  setVariable(name: string, value: any): IIPCResult | undefined
  waitPromise(channel: string): Promise<any>
}

export type Scopes = Record<string, Set<Scope>>
export type Accesses = Record<string, Set<Access>>

export type MainEvent<T = undefined> = (handler: EventHandler<T>) => EventUnsubscriber
export type EventEmitter = (...args: any[]) => any
export type EventUnsubscriber = () => void
export type EventHandler<T> = (result: T) => void

export interface IRendererPublic {
  __register__?(instance: any): void
}

export interface IProvider {
  getInfo(): IInfo
  waitPromise(name: string, resolve: (value: any) => void, reject?: (reason?: any) => void): void
  provided: {
    functions: Record<string, (...args: any[]) => IIPCResult>,
    events: Record<string, (type: 'on' | 'once', handler: EventHandler<IIPCResult>) => EventUnsubscriber>
    properties: Record<string, IIPCResult>
  }
}

export type PublicFunction = (...args: any[]) => any

export type PublicProperty = {
  get?(): any,
  set?(value: any): void
}

export interface IInfo {
  properties: Set<string>
  functions: Set<string>
  events: Set<string>
  scopes: Scopes
  accesses: Accesses
}
