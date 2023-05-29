import { WebContents, ipcMain } from 'electron'

import { Access, IPCChannel, Scope } from '../enums'
import type {
  EventEmitter,
  EventHandler,
  IIPCResult,
  IInfo,
  PublicFunction,
  PublicProperty,
  RendererEvent
} from '../types'

const publicInfo: IInfo = {
  properties: new Set(),
  functions: new Set(),
  mainEvents: new Set(),
  rendererEvents: new Set(),
  accesses: new Map(),
  scopes: new Map()
}

ipcMain.on(IPCChannel.getPublicInfo, e => e.returnValue = publicInfo)

/**
 * Makes the event from **main** available for **renderer** and **preload** processes.
 *
 * @param name - name by which the event will be accessed
 * @param scopes - event scopes
 */
export function publicMainEvent<Emitter extends EventEmitter>(name: string, receiver = ((v = undefined) => v) as Emitter, scopes = [Scope.preload, Scope.renderer]): (...args: Parameters<Emitter>) => void {
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

  return (...args: any[]) => {
    function filterSenders() {
      senders = senders.filter(sender => !sender.isDestroyed())
      sendersOnce = sendersOnce.filter(sender => !sender.isDestroyed())
    }

    filterSenders()
    const allSenders = [...senders, ...sendersOnce]

    try {
      const result = receiver(...args)
      if (result instanceof Promise) {
        result
          .then(value => {
            filterSenders();
            [...senders, ...sendersOnce].forEach(sender => sender.send(mainEmitChannel, { value } satisfies IIPCResult))
            sendersOnce = []
          })
          .catch(reason => {
            filterSenders();
            [...senders, ...sendersOnce].forEach(sender => sender.send(mainEmitChannel, { error: String(reason) } satisfies IIPCResult))
            sendersOnce = []
          })
      }
      else {
        allSenders.forEach(sender => sender.send(mainEmitChannel, { value: result } satisfies IIPCResult))
        sendersOnce = []
      }
    }
    catch (error) {
      allSenders.forEach(sender => sender.send(mainEmitChannel, { error: String(error) } satisfies IIPCResult))
      sendersOnce = []
    }
  }
}

/**
 * Makes the event from **renderer** and **preload** available for **main** process.
 *
 * @param name - name by which the event will be accessed
 * @param scopes - event scopes
 */
export function publicRendererEvent<I = undefined, O = I>(name: string, receiver = ((v = undefined as I) => v as unknown as O), scopes = [Scope.preload, Scope.renderer]): RendererEvent<O> {
  if (name.startsWith('on')) {
    name = name.replace('on', '')
    name = `${name[0].toLowerCase()}${name.slice(1)}`
  }

  const { rendererEvents } = publicInfo
  const rendererEmitChannel = IPCChannel.rendererEventEmit + name

  const handlers = new Set<EventHandler<O>>()
  const handlersOnce = new Set<EventHandler<O>>()

  rendererEvents.add(name)
  if (!publicInfo.scopes.has(name))
    publicInfo.scopes.set(name, new Set(scopes))

  ipcMain.removeAllListeners(rendererEmitChannel)

  ipcMain.on(rendererEmitChannel, (_, result: IIPCResult) => {
    if (result.error) throw new Error(result.error)

    const converted = receiver(result.value)
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
 * @param name - name by which the function will be accessed
 * @param func - linked function
 * @param scopes - function scopes
 */
export function publicFunction(name: string, func: PublicFunction, scopes = [Scope.preload, Scope.renderer]): void {
  const { functions } = publicInfo
  const channel = IPCChannel.functionCall + name

  functions.add(name)
  if (!publicInfo.scopes.has(name))
    publicInfo.scopes.set(name, new Set(scopes))

  ipcMain.removeAllListeners(channel)
  ipcMain.on(channel, (e, ...args) => {
    try {
      const result = func(...args)
      if (result instanceof Promise) {
        const promiseChannel = channel + IPCChannel.promisePostfix
        result
          .then(value => e.sender.send(promiseChannel, { value } satisfies IIPCResult))
          .catch(reason => e.sender.send(promiseChannel, { error: String(reason) } satisfies IIPCResult))
        e.returnValue = { promiseChannel } satisfies IIPCResult
      }
      else {
        e.returnValue = { value: result } satisfies IIPCResult
      }
    }
    catch (error) {
      e.returnValue = { error: String(error) } satisfies IIPCResult
    }
  })
}

/**
 * Makes the function available for **renderer** and **preload** processes.
 *
 * _only for variables_
 * @param name - name by which the variable will be accessed
 * @param value - variable getter/setter
 * @param scopes - variable scopes
 */
export function publicVariable(name: string, value: PublicProperty, scopes = [Scope.renderer, Scope.preload]): void {
  const { properties } = publicInfo
  const getChannel = IPCChannel.propertyGet + name
  const setChannel = IPCChannel.propertySet + name

  const { get: getter, set: setter } = value

  properties.add(name)
  if (!publicInfo.scopes.has(name))
    publicInfo.scopes.set(name, new Set(scopes))

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
    ipcMain.on(getChannel, event => {
      try {
        const result = getter()
        event.returnValue = { value: result }
      }
      catch (error) {
        event.returnValue = { error }
      }
    })
  }

  if (setter) {
    ipcMain.removeAllListeners(setChannel)
    ipcMain.on(setChannel, (event, ...args) => {
      try {
        setter(args[0])
        event.returnValue = { value: null }
      }
      catch (error) {
        event.returnValue = { error }
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
