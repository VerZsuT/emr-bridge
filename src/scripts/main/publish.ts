/*
    Методы публикации в main процессе.
*/

import { ipcMain } from 'electron'

import { PublishMethodsUnavailableError } from '../../errors.js'
import type { EventListener, EventUnsubscribe, HasSnapshotClass, IEntitiesInfo, IRequest, IResult } from '../../types.js'
import { Env, Errors, IpcChannel, IpcEventInMain, IpcResult, Transfer, WebContentsEventsContainer } from '../helpers/index.js'

/**
 * Информация о сущностях.
 */
const entitiesInfo: IEntitiesInfo = {
    variables: new Set(),
    functions: new Set()
}

/**
 * Контейнер отправителей для событий.
 */
const eventsContainer = new WebContentsEventsContainer()

/**
 * Выбросить ошибку если есть причина.
 */
const canThrowError = (Env.hasWindow || !ipcMain)
    ? Errors.getThrower(PublishMethodsUnavailableError)
    : () => {}

if (ipcMain) {
    ipcMain.on(IpcChannel.publicInfo.get(), event => new IpcEventInMain(event).return(entitiesInfo))
    ipcMain.on(IpcChannel.event.on(), (event, { value }: IResult) => eventsContainer.addOn(value, event.sender))
    ipcMain.on(IpcChannel.event.once(), (event, { value }: IResult) => eventsContainer.addOn(value, event.sender))
}


/**
 * Вызвать событие из main процесса.
 * @param name - Имя события.
 * @param value - Передаваемое значение.
 */
export function emitEvent<T = unknown>(name: string, value?: T): void {
    canThrowError()

    const emitChannel = IpcChannel.event.emit(name)

    try {
        if (value instanceof Promise) {
            value
                .then(val => {
                    for (const sender of eventsContainer.getAll(name)) {
                        sender.send(emitChannel, IpcResult.createWithValue(val))
                    }
                    eventsContainer.clearOnce(name)
                })
                .catch(reason => {
                    eventsContainer.getAll(name).forEach(sender => sender.send(emitChannel, IpcResult.createWithError(reason)))
                    eventsContainer.clearOnce(name)
                })
            
            return
        }

        for (const sender of eventsContainer.getAll(name)) {
            sender.send(emitChannel, IpcResult.createWithValue(value))
        }
        eventsContainer.clearOnce(name)
    }
    catch (error: any) {
        eventsContainer.getAll(name).forEach(sender => sender.send(emitChannel, IpcResult.createWithError(error)))
        eventsContainer.clearOnce(name)
    }
}

/**
 * Добавить обработчик renderer события.
 * @param name - Имя события.
 * @param listener - Обработчик.
 * @param receives - Принимаемые классы, недоступные для транспортировки по умолчанию. _Порядок важен._
 * @returns Функция отписки от события.
 */
export function on<TValue = any>(
    name: string,
    listener: EventListener<TValue>,
    receives: HasSnapshotClass<TValue>
): EventUnsubscribe {
    canThrowError()

    const emitChannel = IpcChannel.event.emit(name)
    const handler = (_: any, { value }: IResult<TValue>) => {
        if (Transfer.isSnapshotValue(value)) {
            listener(Transfer.getFromSnapshot(value, receives) as TValue)
        } else {
            listener(value!)
        }
    }

    ipcMain.on(emitChannel, handler)

    return () => ipcMain.removeListener(emitChannel, handler)
}

/**
 * Добавить одноразовый обработчик renderer события.
 * @param name - Имя события.
 * @param listener - Обработчик.
 * @param receives - Класс передаваемого значения, если оно не может быть передано стандартным способом.
 * @returns Функция отписки от события.
 */
export function once<TValue = any>(
    name: string,
    listener: EventListener<TValue>,
    receives: HasSnapshotClass<TValue>
): EventUnsubscribe {
    canThrowError()

    const emitChannel = IpcChannel.event.emit(name)
    const handler = (_: any, { value }: IResult<TValue>) => {
        if (Transfer.isSnapshotValue(value)) {
            listener(Transfer.getFromSnapshot(value, receives) as TValue)
        } else {
            listener(value!)
        }
    }

    ipcMain.once(emitChannel, handler)

    return () => ipcMain.removeListener(emitChannel, handler)
}

/**
 * Опубликовать (сделать доступной) функцию из main процесса.
 * @param name - Имя, по которому будет доступна функция в renderer процессе.
 * @param func - Публикуемая функция.
 * @param receives - Принимаемые классы, недоступные для транспортировки по умолчанию. _Порядок важен._
 */
export function publishFunction<TFunc extends (...args: any[]) => any>(
    name: string,
    func: TFunc,
    receives: HasSnapshotClass[] = []
): void {
    canThrowError()

    const channel = IpcChannel.func.call(name)

    entitiesInfo.functions.add(name)
    ipcMain.removeAllListeners(channel)
    ipcMain.on(channel, (e, { args, id }: IRequest) => {
        const event = new IpcEventInMain(e)
        const receivesCopy = [...receives]

        try {
            const preparedArgs = args.map(arg => (
                Transfer.isSnapshotValue(arg) && receivesCopy[0]
                ? Transfer.getFromSnapshot(arg, receivesCopy.shift()!)
                : arg
            ))
            const result = func(...preparedArgs)

            if (result instanceof Promise) {
                const promiseChannel = IpcChannel.promise.get(channel)

                result
                    .then(value => event.send(promiseChannel, IpcResult.createWithValue(value, id)))
                    .catch(reason => event.send(promiseChannel, IpcResult.createWithError(reason, id)))

                event.return(IpcResult.createWithPromise(promiseChannel))
            }
            else {
                event.return(IpcResult.createWithValue(result))
            }
        }
        catch (error: any) {
            event.return(IpcResult.createWithError(error))
        }
    })
}

/**
 * Опубликовать (сделать доступной) переменную из main процесса.
 * @param name - Имя переменной, по которому она будет доступна в renderer процессе.
 * @param descriptor - Дескриптор. Используется только get/set/value.
 */
export function publishVariable<T>(name: string, descriptor: TypedPropertyDescriptor<T>): void {
    canThrowError()

    const getChannel = IpcChannel.prop.get(name)
    const setChannel = IpcChannel.prop.set(name)
    const { set: setter, value } = descriptor
    let { get: getter } = descriptor

    entitiesInfo.variables.add(name)

    if (value) {
        getter = () => value
    }

    if (getter) {
        ipcMain.removeAllListeners(getChannel)
        ipcMain.on(getChannel, e => {
            const event = new IpcEventInMain(e)

            try {
                event.return(IpcResult.createWithValue(getter()))
            }
            catch (error: any) {
                event.return(IpcResult.createWithError(error))
            }
        })
    }

    if (setter) {
        ipcMain.removeAllListeners(setChannel)
        ipcMain.on(setChannel, (e, { args }: IRequest) => {
            const event = new IpcEventInMain(e)

            try {
                setter(args.at(0))
                event.return(IpcResult.createWithValue(null))
            }
            catch (error: any) {
                event.return(IpcResult.createWithError(error))
            }
        })
    }
}
