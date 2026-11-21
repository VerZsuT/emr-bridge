import { contextBridge, ipcRenderer } from 'electron'

import { NotProvidedFromMainError, TryProvideInMainError, TryProvideInRendererError } from '../../errors.js'
import type { IEntitiesInfo, IGlobalProvider, IResult } from '../../types.js'
import { EntitiesInfo, Errors, IpcChannel, Names, Transfer } from '../helpers/index.js'
import IPCTunnel from '../renderer/tunnels.js'

/**
 * Максимальное число отслеживаемых каналов обещаний.
 *
 * Защищает от роста множества, если renderer вызывает функции,
 * но никогда не ожидает их результат.
 */
const MAX_PENDING_PROMISES = 1024

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
 * Был ли провайдер уже добавлен.
 */
let isProvided = false

/**
 * Каналы обещаний, выданные текущим вызовам.
 *
 * `waitPromise` доступен странице, поэтому он не должен позволять
 * подписываться на произвольные IPC-каналы main процесса.
 */
const pendingPromiseChannels = new Set<string>()

/**
 * Добавляет необходимые для работы функции.
 * 
 * @param contextIsolation - Изоляция контекста. _По умолчанию_: `true`
 */
function provideFromMain(contextIsolation = true): void {
    throwPossibleError()

    if (isProvided) {
        return
    }

    const entitiesInfo = EntitiesInfo.read(ipcRenderer!.sendSync(IpcChannel.publicInfo.get()))

    if (!entitiesInfo) {
        throw new NotProvidedFromMainError()
    }

    const provider: IGlobalProvider = {
        getEntitiesInfo: () => ({
            variables: new Set(entitiesInfo.variables),
            functions: new Set(entitiesInfo.functions)
        }),
        waitPromise: (channel, resolve, reject, id) => {
            if (!pendingPromiseChannels.has(channel)) {
                const error = new Error(`Неизвестный канал обещания '${String(channel)}'.`)

                if (typeof reject === 'function') {
                    reject(error)
                } else {
                    console.error(error)
                }

                return
            }

            pendingPromiseChannels.delete(channel)

            new IPCTunnel.Promise(channel).wait(id).then(
                value => {
                    try {
                        resolve(value)
                    } catch (error) {
                        console.error(error)
                    }
                },
                reason => {
                    if (typeof reject !== 'function') {
                        console.error(reason)
                        return
                    }

                    try {
                        reject(reason)
                    } catch (error) {
                        console.error(error)
                    }
                }
            )
        },
        entities: {
            functions: getFunctions(entitiesInfo),
            variables: getVariables(entitiesInfo),
            events: {
                emit: (name, value) => {
                    Names.validateEvent(name)

                    const tunnel = new IPCTunnel.Event(name)

                    if (Transfer.isPromiseLike(value)) {
                        value.then(
                            result => tunnel.emit(Transfer.toTransferable(result)),
                            reason => tunnel.error(reason)
                        )
                    } else {
                        tunnel.emit(value)
                    }
                },
                on: (name, listener) => {
                    Names.validateEvent(name)
                    assertListener(listener)

                    return new IPCTunnel.Event(name).on(listener)
                },
                once: (name, listener) => {
                    Names.validateEvent(name)
                    assertListener(listener)

                    return new IPCTunnel.Event(name).once(listener)
                }
            }
        }
    }

    if (contextIsolation) {
        contextBridge!.exposeInMainWorld('__provider__', provider)
    } else {
        if (typeof window === 'undefined') {
            throw new TryProvideInRendererError()
        }

        window.__provider__ = provider
    }

    isProvided = true

    /**
     * Получить доступ к публичным функциям.
     * @param info - Информация о сущностях.
     */
    function getFunctions(info: IEntitiesInfo) {
        const result: IGlobalProvider['entities']['functions'] = {}

        for (const name of info.functions) {
            result[name] = (id: string, args: any[]): IResult => {
                if (typeof id !== 'string' || !Array.isArray(args)) {
                    throw new TypeError('Некорректные аргументы вызова функции моста.')
                }

                const response = new IPCTunnel.Function(name).call({ args, id })

                if (IpcChannel.promise.is(response.promiseChannel)) {
                    rememberPromiseChannel(response.promiseChannel)
                }

                return response
            }
        }

        return result
    }

    /**
     * Получить доступ к публичным переменным.
     * @param info - Информация о сущностях.
     */
    function getVariables(info: IEntitiesInfo) {
        const result: IGlobalProvider['entities']['variables'] = {}

        for (const name of info.variables) {
            const tunnel = new IPCTunnel.Variable(name)

            result[name] = {
                get: () => tunnel.get(),
                set: (value: any) => tunnel.set(value)
            }
        }

        return result
    }
}

/**
 * Запомнить выданный канал обещания.
 * @param channel - Канал.
 */
function rememberPromiseChannel(channel: string): void {
    if (pendingPromiseChannels.size >= MAX_PENDING_PROMISES) {
        const oldest = pendingPromiseChannels.values().next().value

        if (oldest !== undefined) {
            pendingPromiseChannels.delete(oldest)
        }
    }

    pendingPromiseChannels.add(channel)
}

/**
 * Проверить, что обработчик события является функцией.
 * @param listener - Обработчик.
 */
function assertListener(listener: unknown): asserts listener is (...args: any[]) => void {
    if (typeof listener !== 'function') {
        throw new TypeError('Обработчик события должен быть функцией.')
    }
}

export default provideFromMain
