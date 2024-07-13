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
        return { value: Transfer.toTransferable(value), id }
    }

    /**
     * Создать результат с ошибкой.
     * @param error - Ошибка.
     * @param id - Уникальный идентификатор.
     * @returns Результат с ошибкой.
     */
    public static createWithError(error?: Error | string, id?: string): IResult {
        let resultError: string

        if (error === undefined) {
            resultError = "Unknown error"
        } else if (typeof error === 'string') {
            resultError = error
        } else {
            resultError = error.stack ?? error.message
        }

        return { error: resultError, id }
    }
}
