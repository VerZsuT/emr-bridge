/**
 * Хелпер для работы с идентификаторами.
 */
export default class Id {
    /**
     * Счётчик для генерации идентификаторов без криптографического API.
     */
    private static counter = 0

    /**
     * Создать новый идентификатор.
     *
     * `Math.random` в одиночку не гарантирует уникальность: коллизия
     * идентификаторов может разрешить чужое обещание. Поэтому при наличии
     * используется `crypto.randomUUID`, а запасной вариант содержит
     * монотонный счётчик процесса.
     */
    public static new(): string {
        const crypto = globalThis.crypto

        if (crypto && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }

        Id.counter = (Id.counter + 1) % Number.MAX_SAFE_INTEGER

        return `${Date.now().toString(36)}-${Id.counter.toString(36)}-${Math.random().toString(36).slice(2)}`
    }
}
