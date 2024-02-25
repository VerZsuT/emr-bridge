import type { WebContents } from 'electron'
import electron from 'electron'

import { Access, IPCChannel, Scope } from '../enums.js'
import type {
  EventHandler,
  IPCRequest,
  IPCResult,
  Info,
  PublicFunction,
  PublicProperty,
  RendererEvent
} from '../types.js'

const publicInfo: Info = {
  properties: new Set(),
  functions: new Set(),
  mainEvents: new Set(),
  rendererEvents: new Set(),
  accesses: new Map(),
  scopes: new Map()
}

/** Выбрасывает ошибку если используется не в том процессе */
let mayThrowError: () => void | never = () => { }

if (typeof window !== 'undefined' || !('ipcMain' in electron)) {
  mayThrowError = () => { throw new Error('Publish methods is available only in main process.') }
}
else {
  electron.ipcMain.on(IPCChannel.getPublicInfo, e => e.returnValue = publicInfo)
}

/**
 * Makes the event from **main** available for **renderer** and **preload** processes.
 *
 * @param name - name by which the event will be accessed
 * @param procFn - function of processing before sending the event
 * @param scopes - event scopes
 */
export function publicMainEvent<
  In = void,
  Out = In extends Array<any> ? In[0] : In,
  ProcFn extends (...args: any[]) => any = In extends Array<any> ? (...args: In) => Out : (val: In) => Out
>(
  name: string,
  procFn: ProcFn = <any>((...args: any[]) => args[0]),
  scopes = [Scope.preload, Scope.renderer]
): (...args: Parameters<ProcFn>) => void {
  mayThrowError()
  const { ipcMain } = electron
  const { mainEvents } = publicInfo
  const mainEmitChannel = IPCChannel.mainEventEmit + name
  const mainHandleChannel = IPCChannel.mainEventOn + name
  const mainHandleChannelOnce = IPCChannel.mainEventOnce + name
  let senders: WebContents[] = []
  let sendersOnce: WebContents[] = []

  mainEvents.add(name)
  const rendererNameOn = `on${name[0].toUpperCase()}${name.slice(1)}`
  const rendererNameOnce = `once${name[0].toUpperCase()}${name.slice(1)}`
  if (!publicInfo.scopes.has(rendererNameOn)) {
    publicInfo.scopes.set(rendererNameOn, new Set(scopes))
    publicInfo.scopes.set(rendererNameOnce, new Set(scopes))
  }

  ipcMain.removeAllListeners(mainHandleChannel)
  ipcMain.removeAllListeners(mainHandleChannelOnce)
  ipcMain.on(mainHandleChannel, ({ sender }) => !senders.includes(sender) && senders.push(sender))
  ipcMain.on(mainHandleChannelOnce, ({ sender }) => !sendersOnce.includes(sender) && sendersOnce.push(sender))

  return (...args) => {
    function filterSenders() {
      senders = senders.filter(sender => !sender.isDestroyed())
      sendersOnce = sendersOnce.filter(sender => !sender.isDestroyed())
    }

    filterSenders()
    const allSenders = [...senders, ...sendersOnce]

    try {
      const result = procFn(...args)
      if (result instanceof Promise) {
        result
          .then(value => {
            filterSenders();
            [...senders, ...sendersOnce].forEach(sender => sender.send(mainEmitChannel, { value } satisfies IPCResult))
            sendersOnce = []
          })
          .catch(reason => {
            filterSenders();
            [...senders, ...sendersOnce].forEach(sender => sender.send(mainEmitChannel, { error: String(reason?.stack || reason) } satisfies IPCResult))
            sendersOnce = []
          })
      }
      else {
        allSenders.forEach(sender => sender.send(mainEmitChannel, { value: result } satisfies IPCResult))
        sendersOnce = []
      }
    }
    catch (error: any) {
      allSenders.forEach(sender => sender.send(mainEmitChannel, { error: String(error?.stack || error) } satisfies IPCResult))
      sendersOnce = []
    }
  }
}

/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * @param name - name by which the event will be accessed
 * @param procFn - processing function before calling handlers
 * @param scopes - event scopes
 */
export function publicRendererEvent<
  In = void,
  Out = In,
  ProcFn extends (...args: any[]) => any = (v?: In) => Out
>(
  name: string,
  procFn: ProcFn = <any>((v?: In) => v),
  scopes = [Scope.preload, Scope.renderer]
): RendererEvent<Out> {
  mayThrowError()
  const { ipcMain } = electron

  if (name.startsWith('on')) {
    name = name.replace('on', '')
    name = `${name[0].toLowerCase()}${name.slice(1)}`
  }

  const { rendererEvents } = publicInfo
  const rendererEmitChannel = IPCChannel.rendererEventEmit + name

  const handlers = new Set<EventHandler<Out>>()
  const handlersOnce = new Set<EventHandler<Out>>()

  rendererEvents.add(name)
  if (!publicInfo.scopes.has(name)) {
    publicInfo.scopes.set(name, new Set(scopes))
  }

  ipcMain.removeAllListeners(rendererEmitChannel)

  ipcMain.on(rendererEmitChannel, (_, { error, value }: IPCResult) => {
    if (error) throw new Error(error)

    const converted = procFn(value)
    handlers.forEach(handler => handler(converted))
    handlersOnce.forEach(handler => handler(converted))
    handlersOnce.clear()
  })

  return (handler, isOnce = false) => {
    if (isOnce) {
      handlersOnce.add(handler)
      return () => handlersOnce.delete(handler)
    }
    else {
      handlers.add(handler)
      return () => handlers.delete(handler)
    }
  }
}

/**
 * Makes the function available for **renderer** and **preload** processes.
 *
 * _only for function_
 * 
 * @param name - name by which the function will be accessed
 * @param func - linked function
 * @param scopes - function scopes
 */
export function publicFunction<F extends PublicFunction>(name: string, func: F, scopes = [Scope.preload, Scope.renderer]): void {
  mayThrowError()
  const { ipcMain } = electron
  const { functions } = publicInfo
  const channel = IPCChannel.functionCall + name

  functions.add(name)
  if (!publicInfo.scopes.has(name)) {
    publicInfo.scopes.set(name, new Set(scopes))
  }

  ipcMain.removeAllListeners(channel)
  ipcMain.on(channel, (e, { args, secret }: IPCRequest) => {
    try {
      const result = func(...args)
      if (result instanceof Promise) {
        const promiseChannel = channel + IPCChannel.promisePostfix
        result
          .then(value => e.sender.send(promiseChannel, { value, secret } satisfies IPCResult))
          .catch(reason => e.sender.send(promiseChannel, { error: String(reason?.stack || reason), secret } satisfies IPCResult))
        e.returnValue = { promiseChannel } satisfies IPCResult
      }
      else {
        e.returnValue = { value: result } satisfies IPCResult
      }
    }
    catch (error: any) {
      e.returnValue = { error: String(error?.stack || error) } satisfies IPCResult
    }
  })
}

/**
 * Makes the function available for **renderer** and **preload** processes.
 *
 * _only for variables_
 * 
 * @param name - name by which the variable will be accessed
 * @param value - variable getter/setter
 * @param scopes - variable scopes
 */
export function publicVariable<T>(name: string, value: PublicProperty<T>, scopes = [Scope.renderer, Scope.preload]): void {
  mayThrowError()
  const { ipcMain } = electron
  const { properties } = publicInfo
  const getChannel = IPCChannel.propertyGet + name
  const setChannel = IPCChannel.propertySet + name

  const { get: getter, set: setter } = value

  properties.add(name)
  if (!publicInfo.scopes.has(name)) {
    publicInfo.scopes.set(name, new Set(scopes))
  }

  if (!publicInfo.accesses.has(name)) {
    const accesses: Access[] = []
    getter && accesses.push(Access.get)
    setter && accesses.push(Access.set)
    publicInfo.accesses.set(name, new Set(accesses))
  }
  else {
    const accesses = publicInfo.accesses.get(name)!
    getter && accesses.add(Access.get)
    setter && accesses.add(Access.set)
  }

  if (getter) {
    ipcMain.removeAllListeners(getChannel)
    ipcMain.on(getChannel, (event) => {
      try {
        const result = getter()
        event.returnValue = { value: result } satisfies IPCResult
      }
      catch (error: any) {
        event.returnValue = { error: String(error?.stack || error) } satisfies IPCResult
      }
    })
  }

  if (setter) {
    ipcMain.removeAllListeners(setChannel)
    ipcMain.on(setChannel, (event, { args }: IPCRequest) => {
      try {
        setter(args.at(0))
        event.returnValue = { value: null } satisfies IPCResult
      }
      catch (error: any) {
        event.returnValue = { error: String(error?.stack || error) } satisfies IPCResult
      }
    })
  }
}

export function addScope(key: string, scope: Scope): void {
  publicInfo.scopes.set(key, new Set([scope]))
}

export function addAccess(key: string, access: Access): void {
  publicInfo.accesses.set(key, new Set([access]))
}
