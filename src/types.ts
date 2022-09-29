import type { Scope } from './enums'
import { Access } from './enums'

export interface IIPCResult {
  value?: any
  error?: string
  promiseChannel?: string
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
  getScopes(): IScopes
  getAccesses(): IAccesses
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
}
