import type { IpcRendererEvent } from 'electron'
import electron from 'electron'
import { IPCChannel } from '../enums.js'
import type { EventHandler, EventUnsubscriber, IPCRequest, IPCResult } from '../types.js'

class FunctionTunnel {
  readonly #tunnel: IPCTunnel

  constructor(name: string) {
    this.#tunnel = new IPCTunnel(IPCChannel.functionCall + name)
  }

  call(args: IPCRequest = { args: [] }): IPCResult {
    return this.#tunnel.request(args)
  }
}

class PropertyTunnel {
  readonly #getTunnel: IPCTunnel
  readonly #setTunnel: IPCTunnel

  constructor(name: string) {
    this.#getTunnel = new IPCTunnel(IPCChannel.propertyGet + name)
    this.#setTunnel = new IPCTunnel(IPCChannel.propertySet + name)
  }

  get(): IPCResult {
    return this.#getTunnel.request()
  }
  set(value: any): IPCResult {
    return this.#setTunnel.request({ args: [value] })
  }
}

class PromiseTunnel {
  readonly #tunnel: IPCTunnel

  constructor(channel: string) {
    this.#tunnel = new IPCTunnel(channel)
  }

  wait(secret?: number) {
    return new Promise<any>((resolve, reject) => {
      const handler = (_: any, { error, value, secret: resSecret }: IPCResult) => {
        if (secret !== undefined && resSecret !== secret) return
        if (error) reject(error)
        else resolve(value)
        this.#tunnel.removeListener(handler)
      }
      this.#tunnel.on(handler)
    })
  }
}

class MainEventTunnel {
  readonly #emitTunnel: IPCTunnel
  readonly #onTunnel: IPCTunnel
  readonly #onceTunnel: IPCTunnel

  constructor(name: string) {
    this.#emitTunnel = new IPCTunnel(IPCChannel.mainEventEmit + name)
    this.#onTunnel =new IPCTunnel(IPCChannel.mainEventOn + name)
    this.#onceTunnel = new IPCTunnel(IPCChannel.mainEventOnce + name)
  }

  on(handler: EventHandler<IPCResult>): EventUnsubscriber {
    const listener = (_: any, result: IPCResult) => handler(result)
    this.#onTunnel.response()
    this.#emitTunnel.on(listener)
    
    return () => this.#emitTunnel.removeListener(listener)
  }

  once(handler: EventHandler<IPCResult>): EventUnsubscriber {
    const listener = (_: any, result: IPCResult) => handler(result)
    this.#onceTunnel.response()
    this.#emitTunnel.once(listener)

    return () => this.#emitTunnel.removeListener(listener)
  }
}

class RendererEventTunnel {
  readonly #emitTunnel: IPCTunnel

  constructor(name: string) {
    this.#emitTunnel = new IPCTunnel(IPCChannel.rendererEventEmit + name)
  }

  emit(value: any) {
    this.#emitTunnel.response({ value })
  }

  error(error: string) {
    this.#emitTunnel.response({ error })
  }
}

export default class IPCTunnel {
  readonly #ipcRenderer = electron.ipcRenderer
  
  static readonly Function = FunctionTunnel
  static readonly Property = PropertyTunnel
  static readonly Promise = PromiseTunnel
  static readonly MainEvent = MainEventTunnel
  static readonly RendererEvent = RendererEventTunnel

  constructor(
    private channel: string
  ) {}

  request(args: IPCRequest = { args: [] }): IPCResult {
    return this.#ipcRenderer.sendSync(this.channel, args)
  }

  response(args: IPCResult = {}) {
    this.#ipcRenderer.send(this.channel, args)
  }

  on(listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    this.#ipcRenderer.on(this.channel, listener)
  }

  once(listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    this.#ipcRenderer.once(this.channel, listener)
  }

  removeListener(listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    this.#ipcRenderer.removeListener(this.channel, listener)
  }

  removeAllListeners() {
    this.#ipcRenderer.removeAllListeners(this.channel)
  }
}
