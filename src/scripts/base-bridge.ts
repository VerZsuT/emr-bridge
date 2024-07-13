import { NoGetAccessError, TrySetReadonlyError } from '../errors.js'
import type { EventListener, EventUnsubscribe, IBridge, IEntitiesInfo, IHasSnapshot, IResult } from '../types.js'
import { Errors, Id, Transfer } from './helpers/index.js'

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
        this.emitEvent(name, Transfer.toTransferable(value))
    }

    public on<TValue = any>(name: string, listener: EventListener<TValue>): EventUnsubscribe {
        return this.handleEvent(name, 'on', ({ value, error }) => {
            this.handlePossibleError(`event: ${name}`, error)
            listener(value as any)
        })
    }

    public once<TValue = any>(name: string, listener: EventListener<TValue>): EventUnsubscribe {
        return this.handleEvent(name, 'once', ({ value, error }) => {
            this.handlePossibleError(`event: ${name}`, error)
            listener(value as any)
        })
    }

    public call<
        TFunc extends (...args: any[]) => InstanceType<TClass>,
        TClass extends { new(): IHasSnapshot }
    >(func: TFunc, Class: TClass, args: Parameters<TFunc>): InstanceType<TClass> {
        const value = func(...args)

        if (Transfer.isSnapshotValue(value)) {
            return Transfer.getFromSnapshot(value, Class)
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
        this.initFunctions()
        this.initVariables()
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

        throw new Error(`Error on ${channel}.\n${error}`.replace('Error: ', ''))
    }

    /**
     * Инициализировать доступ к публичным функциям.
     */
    protected initFunctions(): void {
        for (const name of this.entitiesInfo.functions) {
            this.define(name, {
                value: (...args: any[]) => {
                    const id = Id.new()
                    const preparedArgs = args.map(arg => Transfer.toTransferable(arg))
                    const { error, promiseChannel, value } = this.callFunction(name, id, preparedArgs)

                    this.handlePossibleError(name, error)
            
                    return promiseChannel
                        ? this.waitPromise(promiseChannel, id)
                        : value
                    }
            })
        }
    }

    /**
     * Инициализировать доступ к публичным переменным.
     */
    protected initVariables(): void {
        for (const name of this.entitiesInfo.variables) {
            this.define(name, {
                get: () => {
                    const { error, value } = this.getVariable(name)

                    this.handlePossibleError(name, error)

                    return value
                },
                set: (value: any): void => {
                    const { error } = this.setVariable(name, value)
                    
                    this.handlePossibleError(name, error)
                }
            })
        }
    }

    /**
     * Добавить сущность в `target`.
     * @param name - Имя.
     * @param descriptor - Дескриптор значения.
     */
    protected define<TValue = unknown>(name: string, descriptor?: TypedPropertyDescriptor<TValue>) {
        const hasValue = Boolean(descriptor?.value)

        const defaultDescriptor: PropertyDescriptor = {
            get: () => descriptor!.value,
            set: Errors.getThrower(TrySetReadonlyError, name),
            enumerable: true
        }
        const noValueDescriptor: PropertyDescriptor = {
            get: descriptor?.get || Errors.getThrower(NoGetAccessError, name),
            set: descriptor?.set || Errors.getThrower(TrySetReadonlyError, name),
            enumerable: true
        }

        Object.defineProperty(
            this.target,
            name,
            hasValue
                ? defaultDescriptor
                : noValueDescriptor
        )
    }
}
