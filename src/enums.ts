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
  mainEventOn = 'MAIN_EVENT_ON_',
  mainEventOnce = 'MAIN_EVENT_ONCE_',
  mainEventEmit = 'MAIN_EVENT_EMIT_',
  propertyGet = 'PROPERTY_GET_',
  propertySet = 'PROPERTY_SET_',
  promisePostfix = '_PROMISE',
  rendererEventEmit = "RENDERER_EMIT_"
}
