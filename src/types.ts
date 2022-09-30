import type { Scope } from './enums'
import { Access } from './enums'

export interface IIPCResult {
  value?: any
  error?: string
  promiseChannel?: string
}

export interface IPublishMethodArgs {
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
  callFunction(name: string, ...args: any[]): IIPCResult
  getVariable(name: string): IIPCResult
  setVariable(name: string, value: any): IIPCResult | undefined
  waitPromise(channel: string): Promise<any>
}

export interface IScopes {
  [name: string]: Set<Scope>
}

export interface IAccesses {
  [name: string]: Set<Access>
}

export interface IRendererPublic {
  __register__?(instance: any): void
}

export interface IProvider {
  getInfo(): IInfo
  waitPromise(name: string, resolve: (value: any) => void, reject?: (reason?: any) => void): void
  provided: {
    functions: {
      [key: string]: (...args: any[]) => IIPCResult
    },
    properties: {
      [key: string]: IIPCResult
    }
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
  scopes: IScopes
  accesses: IAccesses
}
