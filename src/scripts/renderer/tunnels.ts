import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'

import type { EventListener, EventUnsubscribe, IRequest, IResult } from '../../types.js'
import { IpcChannel, IpcResult } from '../helpers/index.js'

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
            const handler = (_: any, { error, value, id: resultId }: IResult) => {
                if (id !== undefined && resultId !== id) {
                    return
                }
    
                if (error) {
                    reject(error)
                } else {
                    resolve(value)
                }
    
                this.tunnel.removeListener(handler)
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
     * Создать туннель для события.
     * @param name - Имя события.
     */
    public constructor(
        private readonly name: string
    ) {
        this.emitTunnel = new IPCTunnel(IpcChannel.event.emit(name))
        this.onTunnel = new IPCTunnel(IpcChannel.event.on())
        this.onceTunnel = new IPCTunnel(IpcChannel.event.once())
    }

    /**
     * Добавить обработчик события.
     * @param listener - Обработчик события.
     * @returns Функция отписки от события.
     */
    public on(listener: EventListener<IResult>): EventUnsubscribe {
        const handler = (_: any, result: IResult) => listener(result)

        this.onTunnel.response(IpcResult.createWithValue(this.name))
        this.emitTunnel.on(handler)
        
        return () => this.emitTunnel.removeListener(handler)
    }

    /**
     * Добавить одноразовый обработчик события.
     * @param listener - Обработчик события.
     * @returns Функция отписки от события.
     */
    public once(listener: EventListener<IResult>): EventUnsubscribe {
        const handler = (_: any, result: IResult) => listener(result)

        this.onceTunnel.response(IpcResult.createWithValue(this.name))
        this.emitTunnel.once(handler)

        return () => this.emitTunnel.removeListener(handler)
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
    public error(error: Error | string): void {
        this.emitTunnel.response({ error: String(error) })
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
     * Создать IPC туннель.
     * @param channel - Канал.
     */
    public constructor(
        private channel: string
    ) {}

    /**
     * Отправить запрос.
     * @param args - Аргументы запроса.
     * @returns Результат запроса.
     */
    public request(args: IRequest = { args: [] }): IResult {
        return ipcRenderer.sendSync(this.channel, args)
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
