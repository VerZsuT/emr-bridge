/**
 * Нет доступа к получению переменной.
 */
export class NoGetAccessError extends Error {
    public constructor(name: string) {
        super(`Нет доступа к получению '${name}'.`)
    }
}

/**
 * Нет публичных сущностей.
 */
export class NotProvidedFromMainError extends Error {
    public constructor() {
        super('Публичные сущности не найдены. Добавьте их в main процессе.')
    }
}

/**
 * Публикация доступна только в main процессе.
 */
export class PublishMethodsUnavailableError extends Error {
    public constructor() {
        super('Публикация доступна только в main процессе.')
    }
}

/**
 * Нет провайдера.
 */
export class GlobalProviderNotFoundError extends Error {
    public constructor() {
        super('Провайдер не найден. Вызовите "provideFromMain" в preload процессе.')
    }
}

/**
 * Попытка установить свойство, доступное только для чтения.
 */
export class TrySetReadonlyError extends Error {
    public constructor(name: string) {
        super(`'${name}' доступно только для чтения.`)
    }
}

/**
 * Использование неверного `Bridge` в preload процессе.
 */
export class WrongBridgeInPreloadError extends Error {
    public constructor() {
        super('Попытка использовать в preload процессе "Bridge" для renderer процесса. Проверьте импорт.')
    }
}

/**
 * Использование неверного `Bridge` в renderer процессе.
 */
export class WrongBridgeInRendererError extends Error {
    public constructor() {
        super('Попытка использовать в renderer процессе "Bridge" для preload процесса. Проверьте импорт.')
    }
}

/**
 * Попытка использовать `Bridge` в main процессе.
 */
export class TryUseBridgeInMainError extends Error {
    public constructor() {
        super('"Bridge" недоступен в main процессе.')
    }
}

/**
 * Попытка добавить провайдер в main процессе.
 */
export class TryProvideInMainError extends Error {
    public constructor() {
        super('"provideFromMain" недоступен в main процессе.')
    }
}

/**
 * Попытка добавить провайдер в renderer процессе.
 */
export class TryProvideInRendererError extends Error {
    public constructor() {
        super('"provideFromMain" недоступен в renderer процессе.')
    }
}

/**
 * Некорректное имя публикуемой сущности.
 */
export class InvalidEntityNameError extends Error {
    public constructor(name: unknown, reserved = false) {
        const reason = reserved
            ? 'Имя зарезервировано мостом.'
            : 'Имя должно быть непустой строкой допустимой длины.'

        super(`Некорректное имя сущности '${String(name)}'. ${reason}`)
        this.name = 'InvalidEntityNameError'
    }
}

/**
 * Некорректное имя события.
 */
export class InvalidEventNameError extends Error {
    public constructor(name: unknown) {
        super(`Некорректное имя события '${String(name)}'. Имя должно быть непустой строкой допустимой длины.`)
        this.name = 'InvalidEventNameError'
    }
}

/**
 * Нет ответа от main процесса.
 */
export class NoResponseFromMainError extends Error {
    public constructor(channel: string) {
        super(`Нет ответа от main процесса по каналу '${channel}'.`)
        this.name = 'NoResponseFromMainError'
    }
}
