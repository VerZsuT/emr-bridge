import { contextBridge, ipcRenderer } from 'electron'

import { NotProvidedFromMainError, TryProvideInMainError, TryProvideInRendererError } from '../../errors.js'
import type { IEntitiesInfo, IGlobalProvider } from '../../types.js'
import { Errors, IpcChannel, Transfer } from '../helpers/index.js'
import IPCTunnel from '../renderer/tunnels.js'

/**
 * Бросить ошибку если есть повод.
 */
let throwPossibleError: () => void | never = () => {}

if (!ipcRenderer) {
    throwPossibleError = Errors.getThrower(TryProvideInMainError)
} else if (!contextBridge) {
    throwPossibleError = Errors.getThrower(TryProvideInRendererError)
}

/**
 * Добавляет необходимые для работы функции.
 * 
 * @param contextIsolation - Изоляция контекста. _По умолчанию_: `true`
 */
function provideFromMain(contextIsolation = true) {
    throwPossibleError()

    const entitiesInfo: IEntitiesInfo = ipcRenderer!.sendSync(IpcChannel.publicInfo.get())

    if (!entitiesInfo) {
        throw new NotProvidedFromMainError()
    }

    const provider: IGlobalProvider = {
        getEntitiesInfo: () => entitiesInfo,
        waitPromise: (channel, resolve, reject, id) => (
            new IPCTunnel.Promise(channel).wait(id)
                .then(resolve)
                .catch(reject)
        ),
        entities: {
            functions: getFunctions(),
            variables: getVariables(),
            events: {
                emit: (name, value) => {
                    const tunnel = new IPCTunnel.Event(name)

                    if (value instanceof Promise) {
                        value
                            .then(val => tunnel.emit(Transfer.toTransferable(val)))
                            .catch(reason => tunnel.error(String(reason)))
                    } else {
                        tunnel.emit(value)
                    }
                },
                on: (name, listener) => new IPCTunnel.Event(name).on(listener),
                once: (name, listener) => new IPCTunnel.Event(name).once(listener)
            }
        }
    }

    if (contextIsolation) {
        contextBridge!.exposeInMainWorld('__provider__', provider)
    } else {
        window.__provider__ = provider
    }

    /**
     * Получить доступ к публичным функциям.
     */
    function getFunctions() {
        const result: IGlobalProvider['entities']['functions'] = {}

        for (const name of entitiesInfo.functions) {
            result[name] = (id: string, args: any[]) => {
                return new IPCTunnel.Function(name).call({ args, id: id })
            }
        }

        return result
    }

    /**
     * Получить доступ к публичным переменным.
     */
    function getVariables() {
        const result: IGlobalProvider['entities']['variables'] = {}

        for (const name of entitiesInfo.variables) {
            const tunnel = new IPCTunnel.Variable(name)

            result[name] = {
                get: () => tunnel.get(),
                set: (value: any) => tunnel.set(value)
            }
        }

        return result
    }
}

export default provideFromMain
