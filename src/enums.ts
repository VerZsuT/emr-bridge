export enum Access {
  get = 'get',
  set = 'set'
}

export enum Scope {
  renderer = 'renderer',
  preload = 'preload'
}

export enum IPCChannel {
  getPublicInfo = 'GET_PUBLIC_INFO',
  functionCall = 'FUNCTION_CALL_',
  eventHandleOn = 'EVENT_HANDLE_ON_',
  eventHandleOnce = 'EVENT_HANDLE_ONCE_',
  eventEmit = 'EVENT_EMIT_',
  propertyGet = 'PROPERTY_GET_',
  propertySet = 'PROPERTY_SET_',
  promisePostfix = '_PROMISE'
}
