import { NoGetAccessError, NoResponseFromMainError, TrySetReadonlyError } from '../errors.js'
import type { EventListener, EventUnsubscribe, IBridge, IEntitiesInfo, IHasSnapshot, IResult } from '../types.js'
import { Errors, Id, Names, Transfer } from './helpers/index.js'

/**
 * Базовый класс моста до main.
 */
export default abstract class BaseBridge implements IBridge {
    /**
     * Информация о сущностях.
     */
    protected abstract entitiesInfo: IEntitiesInfo

    /**
     * Объект, который будет использоваться пользователем.
     */
    protected readonly target = {
        as: () => this.as<any>(),
        emit: (...args: Parameters<typeof this.emit>) => this.emit(...args),
        on: (...args: Parameters<typeof this.on<any>>) => this.on(...args),
        once: (...args: Parameters<typeof this.once<any>>) => this.once(...args),
        call: (...args: Parameters<typeof this.call<any, any>>) => this.call(...args),
        returns: (...args: Parameters<typeof this.returns<any, any>>) => this.returns(...args)
    } satisfies IBridge
    
    public as<TTarget>(): IBridge & TTarget {
        return this.target as any
    }

    public emit(name: string, value: any): void {
        Names.validateEvent(name)
        this.emitEvent(name, Transfer.toTransferable(value))
    }

    public on<TValue = any>(name: string, listener: EventListener<TValue>): EventUnsubscribe {
        Names.validateEvent(name)
        this.assertListener(listener)

        return this.handleEvent(name, 'on', (result) => {
            if (!result) {
                return
            }

            this.handlePossibleError(`event: ${name}`, result.error)
            listener(result.value as any)
        })
    }

    public once<TValue = any>(name: string, listener: EventListener<TValue>): EventUnsubscribe {
        Names.validateEvent(name)
        this.assertListener(listener)

        return this.handleEvent(name, 'once', (result) => {
            if (!result) {
                return
            }

            this.handlePossibleError(`event: ${name}`, result.error)
            listener(result.value as any)
        })
    }

    public call<
        TFunc extends (...args: any[]) => InstanceType<TClass>,
        TClass extends { new(): IHasSnapshot }
    >(func: TFunc, Class: TClass, args: Parameters<TFunc> = [] as unknown as Parameters<TFunc>): InstanceType<TClass> {
        const value = func(...args)

        if (Transfer.isSnapshotValue(value)) {
            return Transfer.getFromSnapshot(value, Class)
        }

        if (Transfer.isPromiseLike(value)) {
            return value.then(result => (
                Transfer.isSnapshotValue(result)
                    ? Transfer.getFromSnapshot(result, Class)
                    : result
            )) as InstanceType<TClass>
        }

        return value
    }

    public returns<
        TFunc extends (...args: any[]) => InstanceType<TClass>,
        TClass extends { new(): IHasSnapshot }
    >(func: TFunc, Class: TClass): TFunc {
        return ((...args: Parameters<TFunc>) => this.call(func, Class, args)) as TFunc
    }

    /**
     * Получить значение публичной переменной.
     * @param name - Имя переменной.
     */
    protected abstract getVariable<TValue = unknown>(name: string): IResult<TValue>

    /**
     * Установить значение публичной переменной.
     * @param name - Имя переменной.
     * @param value - Устанавливаемое значение.
     */
    protected abstract setVariable<TValue>(name: string, value: TValue): IResult<TValue>

    /**
     * Вызвать публичную функцию.
     * @param name - Имя функции.
     * @param id - Уникальный идентификатор.
     * @param args - Аргументы вызова.
     */
    protected abstract callFunction<TReturns = unknown>(name: string, id: string, args: any[]): IResult<TReturns>

    /**
     * Ожидать завершения обещания.
     * @param channel - Канал обработки обещания.
     * @param id - Уникальный идентификатор.
     */
    protected abstract waitPromise<TReturns = unknown>(channel: string, id?: string): Promise<TReturns>

    /**
     * Вызвать событие.
     * @param name - Имя события.
     * @param value - Передаваемое значение. 
     */
    protected abstract emitEvent<TValue = unknown>(name: string, value?: TValue): void

    /**
     * Добавить обработчик события.
     * @param name - Имя события.
     * @param type - Тип события.
     * @param handler - Обработчик события.
     * @returns Функция отписки от события.
     */
    protected abstract handleEvent<TValue = unknown>(name: string, type: 'on' | 'once', handler: EventListener<IResult<TValue>>): EventUnsubscribe

    /**
     * Инициализация моста.
     */
    protected init(): void {
        const info = this.entitiesInfo

        if (!info) {
            throw new NoResponseFromMainError('entitiesInfo')
        }

        this.initFunctions(info.functions)
        this.initVariables(info.variables)
    }

    /**
     * Обработать возможную ошибку.
     * 
     * Бросает ошибку если она была передана.
     * @param channel - IPC канал.
     * @param error - Возможная ошибка (текст).
     */
    protected handlePossibleError(channel: string, error?: string): void | never {
        if (!error) {
            return
        }

        const message = error.startsWith('Error: ') ? error.slice(7) : error

        throw new Error(`Error on ${channel}.\n${message}`)
    }

    /**
     * Инициализировать доступ к публичным функциям.
     * @param functions - Имена функций.
     */
    protected initFunctions(functions?: Iterable<string>): void {
        for (const name of functions ?? []) {
            Names.validateEntity(name)

            this.define(name, {
                value: (...args: any[]) => {
                    const id = Id.new()
                    const preparedArgs = args.map(arg => Transfer.toTransferable(arg))
                    const result = this.callFunction(name, id, preparedArgs)

                    if (!result) {
                        throw new NoResponseFromMainError(name)
                    }

                    this.handlePossibleError(name, result.error)

                    return result.promiseChannel
                        ? this.waitPromise(result.promiseChannel, id)
                        : result.value
                }
            })
        }
    }

    /**
     * Инициализировать доступ к публичным переменным.
     * @param variables - Имена переменных.
     */
    protected initVariables(variables?: Iterable<string>): void {
        for (const name of variables ?? []) {
            Names.validateEntity(name)

            this.define(name, {
                get: () => {
                    const result = this.getVariable(name)

                    if (!result) {
                        throw new NoResponseFromMainError(name)
                    }

                    this.handlePossibleError(name, result.error)

                    return result.value
                },
                set: (value: any): void => {
                    const result = this.setVariable(name, value)

                    if (!result) {
                        throw new NoResponseFromMainError(name)
                    }

                    this.handlePossibleError(name, result.error)
                }
            })
        }
    }

    /**
     * Добавить сущность в `target`.
     * @param name - Имя.
     * @param descriptor - Дескриптор значения.
     */
    protected define<TValue = unknown>(name: string, descriptor?: TypedPropertyDescriptor<TValue>): void {
        if (!descriptor) {
            throw new TypeError(`Не задан дескриптор сущности '${name}'.`)
        }

        const hasValue = 'value' in descriptor

        const defaultDescriptor: PropertyDescriptor = {
            get: () => descriptor.value,
            set: Errors.getThrower(TrySetReadonlyError, name),
            enumerable: true,
            configurable: true
        }
        const noValueDescriptor: PropertyDescriptor = {
            get: descriptor.get || Errors.getThrower(NoGetAccessError, name),
            set: descriptor.set || Errors.getThrower(TrySetReadonlyError, name),
            enumerable: true,
            configurable: true
        }

        Object.defineProperty(
            this.target,
            name,
            hasValue
                ? defaultDescriptor
                : noValueDescriptor
        )
    }

    /**
     * Проверить, что обработчик события является функцией.
     * @param listener - Обработчик.
     */
    private assertListener(listener: unknown): asserts listener is (...args: any[]) => void {
        if (typeof listener !== 'function') {
            throw new TypeError('Обработчик события должен быть функцией.')
        }
    }
}
