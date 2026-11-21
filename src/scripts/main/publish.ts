// Методы публикации в main процессе.

import { ipcMain } from 'electron'

import { NoGetAccessError, PublishMethodsUnavailableError, TrySetReadonlyError } from '../../errors.js'
import type { EventListener, EventUnsubscribe, HasSnapshotClass, IEntitiesInfo, IResult } from '../../types.js'
import { Env, Errors, IpcChannel, IpcEventInMain, IpcPayload, IpcResult, Names, Transfer, WebContentsEventsContainer } from '../helpers/index.js'

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

/**
 * Безопасно отправить результат в канал `renderer` процесса.
 * @param sender - Получатель.
 * @param channel - IPC канал.
 * @param result - Результат.
 */
function sendToRenderer(sender: Electron.WebContents | undefined, channel: string, result: IResult): void {
    if (!sender || sender.isDestroyed()) {
        return
    }

    try {
        sender.send(channel, result)
    } catch {
        // Получатель мог быть уничтожен между проверкой и отправкой.
    }
}

/**
 * Создать результат со значением, не выбрасывая исключение наружу.
 * @param value - Значение.
 * @param id - Уникальный идентификатор.
 */
function createValueResult(value: unknown, id?: string): IResult {
    try {
        return IpcResult.createWithValue(value, id)
    } catch (error) {
        return IpcResult.createWithError(error, id)
    }
}

if (ipcMain) {
    ipcMain.on(IpcChannel.publicInfo.get(), event => new IpcEventInMain(event).return(entitiesInfo))

    ipcMain.on(IpcChannel.event.on(), (event, payload) => {
        const name = IpcPayload.eventName(payload)

        if (name) {
            eventsContainer.addOn(name, event.sender)
        }
    })
    ipcMain.on(IpcChannel.event.once(), (event, payload) => {
        const name = IpcPayload.eventName(payload)

        if (name) {
            eventsContainer.addOnce(name, event.sender)
        }
    })
    ipcMain.on(IpcChannel.event.off(), (event, payload) => {
        const name = IpcPayload.eventName(payload)

        if (!name) {
            return
        }

        if (IpcPayload.eventType(payload) === 'once') {
            eventsContainer.removeOnce(name, event.sender)
        } else {
            eventsContainer.removeOn(name, event.sender)
        }
    })
}


/**
 * Вызвать событие из main процесса.
 * @param name - Имя события.
 * @param value - Передаваемое значение.
 */
export function emitEvent<T = unknown>(name: string, value?: T): void {
    canThrowError()
    Names.validateEvent(name)

    const emitChannel = IpcChannel.event.emit(name)
    // Подписчики фиксируются на момент вызова: слушатель, добавленный
    // после `emitEvent`, не должен получить уже отправленное событие.
    const senders = eventsContainer.getAll(name)

    eventsContainer.clearOnce(name)

    const deliver = (result: IResult): void => {
        for (const sender of senders) {
            sendToRenderer(sender, emitChannel, result)
        }
    }

    if (Transfer.isPromiseLike(value)) {
        try {
            value.then(
                result => deliver(createValueResult(result)),
                reason => deliver(IpcResult.createWithError(reason))
            )
        } catch (error) {
            deliver(IpcResult.createWithError(error))
        }

        return
    }

    deliver(createValueResult(value))
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
    receives?: HasSnapshotClass<any>
): EventUnsubscribe {
    canThrowError()
    Names.validateEvent(name)

    return subscribeEvent(name, listener, receives, false)
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
    receives?: HasSnapshotClass<any>
): EventUnsubscribe {
    canThrowError()
    Names.validateEvent(name)

    return subscribeEvent(name, listener, receives, true)
}

/**
 * Подписаться на событие из `renderer` процесса.
 * @param name - Имя события.
 * @param listener - Обработчик.
 * @param receives - Класс передаваемого значения.
 * @param isOnce - Одноразовая подписка.
 * @returns Функция отписки от события.
 */
function subscribeEvent<TValue>(
    name: string,
    listener: EventListener<TValue>,
    receives: HasSnapshotClass<any> | undefined,
    isOnce: boolean
): EventUnsubscribe {
    if (typeof listener !== 'function') {
        throw new TypeError('Обработчик события должен быть функцией.')
    }

    const emitChannel = IpcChannel.event.emit(name)
    const handler = (_: unknown, payload: unknown) => {
        const result = IpcPayload.result(payload)

        if (!result) {
            return
        }

        if (result.error) {
            console.error(`[emr-bridge] Ошибка события '${name}':\n${result.error}`)
            return
        }

        let value: unknown = result.value

        if (Transfer.isSnapshotValue(result.value) && receives) {
            try {
                value = Transfer.getFromSnapshot(result.value, receives)
            } catch (error) {
                // Недоверенный снимок из renderer не должен ронять main процесс.
                console.error(`[emr-bridge] Не удалось восстановить значение события '${name}'.`, error)
                return
            }
        }

        listener(value as TValue)
    }

    if (isOnce) {
        ipcMain.once(emitChannel, handler)
    } else {
        ipcMain.on(emitChannel, handler)
    }

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
    Names.validateEntity(name)

    if (typeof func !== 'function') {
        throw new TypeError(`Публикуемая функция '${name}' должна быть функцией.`)
    }

    if (!Array.isArray(receives)) {
        throw new TypeError('`receives` должен быть массивом классов.')
    }

    const channel = IpcChannel.func.call(name)

    entitiesInfo.functions.add(name)
    ipcMain.removeAllListeners(channel)
    ipcMain.on(channel, (e, payload) => {
        const event = new IpcEventInMain(e)
        const request = IpcPayload.request(payload)

        if (!request) {
            event.return(IpcResult.createWithError(new TypeError('Некорректный запрос вызова функции.')))
            return
        }

        const receivesCopy = [...receives]

        try {
            const preparedArgs = request.args.map(arg => (
                Transfer.isSnapshotValue(arg) && receivesCopy[0]
                ? Transfer.getFromSnapshot(arg, receivesCopy.shift()!)
                : arg
            ))
            const result = func(...preparedArgs)

            if (Transfer.isPromiseLike(result)) {
                const promiseChannel = IpcChannel.promise.get(channel)

                result.then(
                    value => event.send(promiseChannel, createValueResult(value, request.id)),
                    reason => event.send(promiseChannel, IpcResult.createWithError(reason, request.id))
                )

                event.return(IpcResult.createWithPromise(promiseChannel))
            }
            else {
                event.return(createValueResult(result, request.id))
            }
        }
        catch (error) {
            event.return(IpcResult.createWithError(error, request.id))
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
    Names.validateEntity(name)

    if (!descriptor || typeof descriptor !== 'object') {
        throw new TypeError(`Не задан дескриптор переменной '${name}'.`)
    }

    const getChannel = IpcChannel.prop.get(name)
    const setChannel = IpcChannel.prop.set(name)
    const setter = typeof descriptor.set === 'function' ? descriptor.set : undefined
    const getter = 'value' in descriptor
        ? () => descriptor.value as T
        : typeof descriptor.get === 'function'
            ? descriptor.get
            : undefined

    entitiesInfo.variables.add(name)

    // При повторной публикации старые обработчики должны быть удалены,
    // иначе останется висеть доступ к прежнему значению.
    ipcMain.removeAllListeners(getChannel)
    ipcMain.removeAllListeners(setChannel)

    ipcMain.on(getChannel, e => {
        const event = new IpcEventInMain(e)

        if (!getter) {
            event.return(IpcResult.createWithError(new NoGetAccessError(name)))
            return
        }

        try {
            event.return(createValueResult(getter()))
        }
        catch (error) {
            event.return(IpcResult.createWithError(error))
        }
    })

    ipcMain.on(setChannel, (e, payload) => {
        const event = new IpcEventInMain(e)

        if (!setter) {
            event.return(IpcResult.createWithError(new TrySetReadonlyError(name)))
            return
        }

        const request = IpcPayload.request(payload)

        if (!request) {
            event.return(IpcResult.createWithError(new TypeError('Некорректный запрос установки переменной.')))
            return
        }

        try {
            setter(request.args.at(0) as T)
            event.return(IpcResult.createWithValue(null))
        }
        catch (error) {
            event.return(IpcResult.createWithError(error))
        }
    })
}
