import type { IResult } from '../../types.js'
import Transfer from './transfer.js'

/**
 * Хелпер для работы с результатом IPC.
 */
export default class IpcResult {
    /**
     * Создать результат с обещанием.
     * @param promiseChannel - Канал обработки обещания.
     * @returns Результат с обещанием.
     */
    public static createWithPromise(promiseChannel: string): IResult {
        return { promiseChannel }
    }

    /**
     * Создать результат со значением.
     * @param value - Значение. **Должно быть передаваемым**.
     * @param id - Уникальный идентификатор.
     * @returns Результат со значением.
     */
    public static createWithValue<T = unknown>(value: T, id?: string): IResult {
        const transferable = Transfer.toTransferable(value)

        return id === undefined
            ? { value: transferable }
            : { value: transferable, id }
    }

    /**
     * Создать результат с ошибкой.
     * @param error - Ошибка.
     * @param id - Уникальный идентификатор.
     * @returns Результат с ошибкой.
     */
    public static createWithError(error?: unknown, id?: string): IResult {
        const message = IpcResult.stringifyError(error)

        return id === undefined
            ? { error: message }
            : { error: message, id }
    }

    /**
     * Привести брошенное значение к строке.
     *
     * Ошибкой может быть что угодно (`throw null`, строка, объект),
     * поэтому сериализация не должна сама бросать исключение.
     * @param error - Брошенное значение.
     */
    private static stringifyError(error: unknown): string {
        if (error === undefined || error === null) {
            return 'Unknown error'
        }

        if (typeof error === 'string') {
            return error
        }

        if (error instanceof Error) {
            return error.stack ?? error.message
        }

        if (typeof error === 'object') {
            try {
                return JSON.stringify(error) ?? String(error)
            } catch {
                return String(error)
            }
        }

        return String(error)
    }
}
