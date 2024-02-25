import { Scope } from './enums.js'

export class NoSetAccessError extends Error {
  constructor(name: string) { super(`No access to setting '${name}'`) }
}

export class NoGetAccessError extends Error {
  constructor(name: string) { super(`No access to getting '${name}'`) }
}

export class NotProvidedIntoScopeError extends Error {
  constructor(name: string, scope: Scope) { super(`'${name}' is not provided into ${scope} scope`) }
}

export class NotProvidedFromMain extends Error {
  constructor() { super('Public methods from main is not provided. Call any publish methods to provide it from main process.') }
}

export class GlobalProviderNotFoundError extends Error {
  constructor() { super('Required methods not provided. Call "provideFromMain" in preload process.') }
}

export class TrySetReadonlyError extends Error {
  constructor(name: string) { super(`'${name}' is readonly`) }
}

export class TryUseBridgeInPreload extends Error {
  constructor() { super('"Bridge" is unavailable in main process. In preload use "Main" instead.') }
}

export class TryUseMainInRenderer extends Error {
  constructor() { super('"Main" is unavailable in renderer process. Use "Bridge" instead') }
}

export class TryUseMainInMain extends Error {
  constructor() { super('"Main" is unavailable in main process.') }
}
