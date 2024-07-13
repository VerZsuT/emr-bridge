/**
 * Мост до main.
 */
export interface IBridge {
    /**
     * Вернуть в качестве типа.
     */
    as<TTarget>(): IBridge & TTarget

    /**
     * Вызвать событие.
     * @param name - Имя события.
     * @param value - Передаваемое значение.
     */
    emit<TValue = unknown>(name: string, value?: TValue): void

    /**
     * Добавить обработчик события.
     * @param name - Имя события.
     * @param listener - Обработчик.
     * @returns Функция отписки от события.
     */
    on<TValue>(name: string, listener: EventListener<TValue>): EventUnsubscribe

    /**
     * Добавить одноразовый обработчик события.
     * @param name - Имя события.
     * @param listener - Обработчик.
     * @returns Функция отписки от события.
     */
    once<TValue>(name: string, listener: EventListener<TValue>): EventUnsubscribe

    /**
     * Вызвать функцию, возвращающую объект, не передаваемый стандартным путём.
     * @param func - Вызываемая функция.
     * @param Class - Класс, экземпляр которого будет возвращён функцией.
     * @param args - Аргументы вызова функции.
     * @returns Возвращённое функцией значение (преобразованное из снимка).
     */
    call<
        TFunc extends (...args: any[]) => InstanceType<TClass>,
        TClass extends { new(): IHasSnapshot }
    >(func: TFunc, Class: TClass, args: Parameters<TFunc>): InstanceType<TClass>

    /**
     * Обернуть функцию, возвращающую экземпляр класса.
     * @param func - Оригинальная функция.
     * @param Class - Класс.
     */
    returns<
        TFunc extends (...args: any[]) => InstanceType<TClass>,
        TClass extends { new(): IHasSnapshot }
    >(func: TFunc, Class: TClass): TFunc
}

/**
 * Работает со снимками.
 */
export interface IHasSnapshot<TSnapshot = unknown> {
    /**
     * Получить снимок.
     * @returns Снимок.
     */
    takeSnapshot(): TSnapshot

    /**
     * Обновить из снимка.
     * @param snapshot - Снимок.
     */
    updateFromSnapshot(snapshot: TSnapshot): void
}

/**
 * Значение-снимок, передаваемое по IPC.
 */
export interface ISnapshotValue<TSnapshot = unknown> {
    /**
     * Тип значения.
     */
    __type__: 'snapshot',

    /**
     * Снимок.
     */
    __snapshot__: TSnapshot
}

/**
 * Передаваемый по IPC результат.
 */
export interface IResult<TValue = any> {
    /**
     * Значение.
     */
    value?: TValue

    /**
     * Ошибка.
     */
    error?: string

    /**
     * Канал обработки обещания.
     */
    promiseChannel?: string

    /**
     * Уникальный идентификатор.
     */
    id?: string
}

/**
 * Передаваемый по IPC запрос.
 */
export interface IRequest {
    /**
     * Аргументы.
     */
    args: any[]

    /**
     * Уникальный идентификатор.
     */
    id?: string
}

/**
 * Класс объекта, умеющего работать со снимками.
 */
export type HasSnapshotClass<TValue = unknown> = { new(): IHasSnapshot<TValue> }

/**
 * Функция отписки от события.
 */
export type EventUnsubscribe = () => void

/**
 * Обработчик события.
 */
export type EventListener<TResult = undefined> = TResult extends undefined
    ? () => void
    : (result: TResult) => void

/**
 * Провайдер обязательных функций для работы.
 */
export interface IGlobalProvider {
    /**
     * Получить информацию о сущностях.
     * @returns Информация о сущностях.
     */
    getEntitiesInfo(): IEntitiesInfo

    /**
     * Ожидать завершения обещания.
     * @param channel - Канал обработки обещания.
     * @param onSuccess - Функция, вызываемая при успехе.
     * @param onError - Функция, вызываемая при неудаче.
     * @param id - Уникальный идентификатор.
     */
    waitPromise(channel: string, onSuccess: (value: any) => void, onError?: (reason?: any) => void, id?: string): void

    /**
     * Сущности.
     */
    entities: {
        /**
         * Функции.
         */
        functions: {
            [name: string]: (id: string, args: any[]) => IResult
        },
        /**
         * События.
         */
        events: {
            /**
             * Добавить обработчик события.
             * @param name - Имя события.
             * @param listener - Обработчик события.
             * @returns Функция отписки от события.
             */
            on(name: string, listener: EventListener<IResult>): EventUnsubscribe

            /**
             * Добавить одноразовы обработчик события.
             * @param name - Имя события.
             * @param listener - Обработчик события.
             * @returns Функция отписки от события.
             */
            once(name: string, listener: EventListener<IResult>): EventUnsubscribe

            /**
             * Взывать событие.
             * @param name - Имя события.
             * @param value - Передаваемое значение.
             */
            emit(name: string, value: any): void
        }
        /**
         * Переменные.
         */
        variables: {
            [name: string]: {
                get(): IResult
                set(value: any): IResult
            }
        }
    }
}

/**
 * Информация о сущностях.
 */
export interface IEntitiesInfo {
    /**
     * Доступные переменные.
     */
    variables: Set<string>

    /**
     * Доступные функции.
     */
    functions: Set<string>
}
