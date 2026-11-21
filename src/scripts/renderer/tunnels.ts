import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'

import type { EventListener, EventUnsubscribe, IRequest, IResult } from '../../types.js'
import { IpcChannel, IpcPayload, IpcResult, Names, Transfer } from '../helpers/index.js'

/**
 * IPC туннель для функции.
 */
class FunctionTunnel {
    /**
     * Туннель.
     */
    private readonly tunnel: IPCTunnel

    /**
     * Создать IPC туннель для функции.
     * @param name - Имя функции.
     */
    public constructor(name: string) {
        Names.validateEntity(name)

        this.tunnel = new IPCTunnel(IpcChannel.func.call(name))
    }

    /**
     * Вызвать функцию.
     * @param args - Аргументы вызова.
     * @returns Результат вызова.
     */
    public call(args: IRequest = { args: [] }): IResult {
        return this.tunnel.request(args)
    }
}

/**
 * Туннель для переменной.
 */
class VariableTunnel {
    /**
     * Туннель для получения значения.
     */
    private readonly getTunnel: IPCTunnel

    /**
     * Туннель для установки значения.
     */
    private readonly setTunnel: IPCTunnel

    /**
     * Создать туннель для переменной.
     * @param name - Имя переменной.
     */
    public constructor(name: string) {
        Names.validateEntity(name)

        this.getTunnel = new IPCTunnel(IpcChannel.prop.get(name))
        this.setTunnel = new IPCTunnel(IpcChannel.prop.set(name))
    }

    /**
     * Получить значение переменной.
     */
    public get(): IResult {
        return this.getTunnel.request()
    }

    /**
     * Установить значение переменной.
     * @param value - Значение.
     */
    public set(value: any): IResult {
        return this.setTunnel.request({ args: [value] })
    }
}

/**
 * Туннель для обработки обещания.
 */
class PromiseTunnel {
    /**
     * Туннель.
     */
    private readonly tunnel: IPCTunnel

    /**
     * Создать туннель для обработки обещания.
     * @param channel - Канал возвращающий обещание.
     */
    public constructor(channel: string) {
        this.tunnel = new IPCTunnel(channel)
    }

    /**
     * Ожидать завершения обещания.
     * @param id - Уникальный идентификатор.
     */
    public wait(id?: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const handler = (_: IpcRendererEvent, payload: unknown) => {
                const result = IpcPayload.result(payload)

                if (!result) {
                    return
                }

                if (id !== undefined && result.id !== id) {
                    return
                }

                this.tunnel.removeListener(handler)

                if (result.error) {
                    reject(result.error)
                } else {
                    resolve(result.value)
                }
            }

            this.tunnel.on(handler)
        })
    }
}

/**
 * Туннель для события.
 */
class EventTunnel {
    /**
     * Имя события.
     */
    private readonly name: string

    /**
     * Туннель вызова события.
     */
    private readonly emitTunnel: IPCTunnel

    /**
     * Туннель обработки события.
     */
    private readonly onTunnel: IPCTunnel

    /**
     * Туннель однократной обработки события.
     */
    private readonly onceTunnel: IPCTunnel

    /**
     * Туннель отписки от события.
     */
    private readonly offTunnel: IPCTunnel

    /**
     * Создать туннель для события.
     * @param name - Имя события.
     */
    public constructor(name: string) {
        Names.validateEvent(name)

        this.name = name
        this.emitTunnel = new IPCTunnel(IpcChannel.event.emit(name))
        this.onTunnel = new IPCTunnel(IpcChannel.event.on())
        this.onceTunnel = new IPCTunnel(IpcChannel.event.once())
        this.offTunnel = new IPCTunnel(IpcChannel.event.off())
    }

    /**
     * Добавить обработчик события.
     * @param listener - Обработчик события.
     * @returns Функция отписки от события.
     */
    public on(listener: EventListener<IResult>): EventUnsubscribe {
        return this.subscribe(listener, false)
    }

    /**
     * Добавить одноразовый обработчик события.
     * @param listener - Обработчик события.
     * @returns Функция отписки от события.
     */
    public once(listener: EventListener<IResult>): EventUnsubscribe {
        return this.subscribe(listener, true)
    }

    /**
     * Вызвать событие.
     * @param value - Передаваемое значение.
     */
    public emit(value: any): void {
        this.emitTunnel.response({ value })
    }

    /**
     * Бросить ошибку.
     * @param error - Ошибка.
     */
    public error(error: unknown): void {
        this.emitTunnel.response(IpcResult.createWithError(error))
    }

    /**
     * Подписаться на событие.
     * @param listener - Обработчик события.
     * @param isOnce - Одноразовая подписка.
     * @returns Функция отписки от события.
     */
    private subscribe(listener: EventListener<IResult>, isOnce: boolean): EventUnsubscribe {
        if (typeof listener !== 'function') {
            throw new TypeError('Обработчик события должен быть функцией.')
        }

        const handler = (_: IpcRendererEvent, payload: unknown) => {
            const result = IpcPayload.result(payload)

            if (result) {
                listener(result)
            }
        }

        if (isOnce) {
            this.emitTunnel.once(handler)
        } else {
            this.emitTunnel.on(handler)
        }

        try {
            const registration = IpcResult.createWithValue(this.name)

            if (isOnce) {
                this.onceTunnel.response(registration)
            } else {
                this.onTunnel.response(registration)
            }
        } catch (error) {
            this.emitTunnel.removeListener(handler)
            throw error
        }

        let isActive = true

        return () => {
            if (!isActive) {
                return
            }

            isActive = false
            this.emitTunnel.removeListener(handler)

            // Без этого main процесс навсегда сохранял бы ссылку на
            // `WebContents` и продолжал отправлять ему события.
            try {
                this.offTunnel.response({
                    value: this.name,
                    type: isOnce ? 'once' : 'on'
                })
            } catch {
                // Renderer уже завершается — отписываться больше некуда.
            }
        }
    }
}

/**
 * IPC туннель.
 */
export default class IPCTunnel {
    /**
     * Туннель для функции.
     */
    public static readonly Function = FunctionTunnel

    /**
     * Туннель для переменной.
     */
    public static readonly Variable = VariableTunnel

    /**
     * Туннель для обещания.
     */
    public static readonly Promise = PromiseTunnel

    /**
     * Туннель для события.
     */
    public static readonly Event = EventTunnel

    /**
     * Канал.
     */
    private readonly channel: string

    /**
     * Создать IPC туннель.
     * @param channel - Канал.
     */
    public constructor(channel: string) {
        this.channel = channel
    }

    /**
     * Отправить запрос.
     * @param args - Аргументы запроса.
     * @returns Результат запроса.
     */
    public request(args: IRequest = { args: [] }): IResult {
        const result = IpcPayload.result(ipcRenderer.sendSync(this.channel, args))

        if (!result) {
            return IpcResult.createWithError(new Error(`Нет ответа по каналу '${this.channel}'.`))
        }

        return result
    }

    /**
     * Отправить ответ.
     * @param result - Результат.
     */
    public response(result: IResult = {}): void {
        ipcRenderer.send(this.channel, result)
    }

    /**
     * Добавить обработчик IPC.
     * @param listener - Обработчик.
     */
    public on(listener: (event: IpcRendererEvent, ...args: any[]) => void): void {
        ipcRenderer.on(this.channel, listener)
    }

    /**
     * Добавить одноразовый обработчик IPC.
     * @param listener - Обработчик.
     */
    public once(listener: (event: IpcRendererEvent, ...args: any[]) => void): void {
        ipcRenderer.once(this.channel, listener)
    }

    /**
     * Удалить обработчик IPC.
     * @param listener - Обработчик.
     */
    public removeListener(listener: (event: IpcRendererEvent, ...args: any[]) => void): void {
        ipcRenderer.removeListener(this.channel, listener)
    }

    /**
     * Удалить все обработчики IPC.
     */
    public removeAllListeners(): void {
        ipcRenderer.removeAllListeners(this.channel)
    }
}
