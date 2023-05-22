import { WebContents, ipcMain } from 'electron'

import { Access, IPCChannel, Scope } from '../enums'
import type {
  EventEmitter,
  IIPCResult,
  IInfo,
  PublicFunction,
  PublicProperty
} from '../types'

const publicInfo: IInfo = {
  properties: new Set<string>(),
  functions: new Set<string>(),
  events: new Set<string>(),
  accesses: {},
  scopes: {}
}

ipcMain.on(IPCChannel.getPublicInfo, e => e.returnValue = publicInfo)


/**
 * Makes the event available for **renderer** and **preload** processes.
 *
 * _only for event_
 * @param name - name by which the event will be accessed
 * @param func - linked emitter
 * @param scopes - event scopes
 */
export function publicEvent<Emitter extends EventEmitter>(name: string, func = (() => { }) as Emitter, scopes = [Scope.preload, Scope.renderer]): (...args: Parameters<Emitter>) => void {
  const { events } = publicInfo
  const emitChannel = IPCChannel.eventEmit + name
  const handleChannel = IPCChannel.eventHandleOn + name
  const handleChannelOnce = IPCChannel.eventHandleOnce + name
  let senders: WebContents[] = []
  let sendersOnce: WebContents[] = []

  events.add(name)
  if (!publicInfo.scopes[name])
    publicInfo.scopes[name] = new Set(scopes)

  ipcMain.removeAllListeners(handleChannel)
  ipcMain.removeAllListeners(handleChannelOnce)
  ipcMain.on(handleChannel, ({ sender }) => !senders.includes(sender) && senders.push(sender))
  ipcMain.on(handleChannelOnce, ({ sender }) => !sendersOnce.includes(sender) && sendersOnce.push(sender))

  return (...args: any[]) => {
    function filterSenders() {
      senders = senders.filter(sender => !sender.isDestroyed())
      sendersOnce = sendersOnce.filter(sender => !sender.isDestroyed())
    }

    filterSenders()
    const allSenders = [...senders, ...sendersOnce]

    try {
      const result = func(...args)
      if (result instanceof Promise) {
        const promiseChannel = emitChannel + IPCChannel.promisePostfix
        result
          .then(value => {
            filterSenders();
            [...senders, ...sendersOnce].forEach(sender => sender.send(promiseChannel, { value } satisfies IIPCResult))
            sendersOnce = []
          })
          .catch(reason => {
            filterSenders();
            [...senders, ...sendersOnce].forEach(sender => sender.send(promiseChannel, { error: String(reason) } satisfies IIPCResult))
            sendersOnce = []
          })

        allSenders.forEach(sender => sender.send(promiseChannel, { promiseChannel } satisfies IIPCResult))
      }
      else {
        allSenders.forEach(sender => sender.send(emitChannel, { value: result } satisfies IIPCResult))
        sendersOnce = []
      }
    }
    catch (error) {
      allSenders.forEach(sender => sender.send(emitChannel, { error: String(error) } satisfies IIPCResult))
      sendersOnce = []
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
  if (!publicInfo.scopes[name])
    publicInfo.scopes[name] = new Set(scopes)

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
  if (!publicInfo.scopes[name])
    publicInfo.scopes[name] = new Set(scopes)

  if (!publicInfo.accesses[name]) {
    const accesses: Access[] = []
    getter && accesses.push(Access.get)
    setter && accesses.push(Access.set)
    publicInfo.accesses[name] = new Set(accesses)
  }
  else {
    const accesses = publicInfo.accesses[name]
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
  publicInfo.scopes[key] = new Set([scope])
}

export function addAccess(key: string, access: Access): void {
  publicInfo.accesses[key] = new Set([access])
}
