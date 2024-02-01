import electron from 'electron'
import { IPCChannel, Scope } from '../enums'
import { NotProvidedFromMain, TryUseMainInMain, TryUseMainInRenderer } from '../errors'
import type { EventHandler, EventUnsubscriber, IPCResult, Target } from '../types'
import Provider from './provider'
import IPCTunnel from './renderer-tunnels'

/**
 * Bridge between `preload` and `main` processes.
 *   
 * _only for preload process_
 */
let Main: Target = new Proxy({ as() { throwError() } }, {
  get() { throwError() },
  set() { throwError() },
  apply() { throwError() }
})

class ProviderIntoPreload extends Provider {
  #ipcRenderer = electron.ipcRenderer

  protected info = this.#ipcRenderer.sendSync(IPCChannel.getPublicInfo)
  protected scope = Scope.preload

  constructor() {
    super(); if (!this.info) throw new NotProvidedFromMain()
  }

  protected callFunction(name: string, secret: number, args: any[]): IPCResult {
    return new IPCTunnel.Function(name).call({ args, secret })
  }

  protected getVariable(name: string): IPCResult {
    return new IPCTunnel.Property(name).get()
  }

  protected setVariable(name: string, value: any): IPCResult {
    return new IPCTunnel.Property(name).set(value)
  }

  protected async waitPromise(channel: string, secret?: number | undefined): Promise<any> {
    return await new IPCTunnel.Promise(channel).wait(secret)
  }

  protected handleMainEvent(name: string, type: 'on' | 'once', handler: EventHandler<IPCResult>): EventUnsubscriber {
    const tunnel = new IPCTunnel.MainEvent(name)

    if (type === 'on') return tunnel.on(handler)
    else return tunnel.once(handler)
  }

  protected emitRendererEvent(name: string, arg: any): void {
    const tunnel = new IPCTunnel.RendererEvent(name)

    if (arg instanceof Promise) {
      arg.then(value => tunnel.emit(value))
        .catch(reason => tunnel.error(String(reason)))
    }
    else {
      tunnel.emit(arg)
    }
  }
}

/** Выбрасывает ошибку если используется не в том процессе */
let throwError: () => never

if (typeof window !== 'undefined') {
  throwError = () => { throw new TryUseMainInRenderer() }
}
else if (!('ipcRenderer' in electron)) {
  throwError = () => { throw new TryUseMainInMain() }
}
else {
  // Выполняется только в NodeJS
  Main = new ProviderIntoPreload()
}

export default Main
