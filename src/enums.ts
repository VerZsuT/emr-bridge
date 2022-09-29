export enum Access {
  get = 'get',
  set = 'set'
}

export enum Scope {
  renderer = 'renderer',
  preload = 'preload'
}

export enum IPCChannel {
  getPublicScopes = 'GET_PUBLIC_SCOPES',
  getPublicInfo = 'GET_PUBLIC_INFO',
  getPublicAccesses = 'GET_PUBLIC_ACCESSES',
  functionCall = 'FUNCTION_CALL_',
  propertyGet = 'PROPERTY_GET_',
  propertySet = 'PROPERTY_SET_',
  promisePostfix = '_PROMISE'
}
