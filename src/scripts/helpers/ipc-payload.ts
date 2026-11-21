import type { IRequest, IResult } from '../../types.js'

/**
 * Хелпер для безопасного разбора данных, пришедших по IPC.
 *
 * Любые данные из IPC считаются недоверенными: неверный формат
 * не должен приводить к исключению в обработчике main/preload.
 */
export default class IpcPayload {
    /**
     * Разобрать запрос.
     * @param payload - Данные из IPC.
     * @returns Запрос или `null`, если формат неверен.
     */
    public static request(payload: unknown): IRequest | null {
        if (!IpcPayload.isObject(payload)) {
            return null
        }

        if (!Array.isArray(payload.args)) {
            return null
        }

        if (payload.id !== undefined && typeof payload.id !== 'string') {
            return null
        }

        return {
            args: payload.args,
            id: payload.id
        }
    }

    /**
     * Разобрать результат.
     * @param payload - Данные из IPC.
     * @returns Результат или `null`, если формат неверен.
     */
    public static result(payload: unknown): IResult | null {
        if (!IpcPayload.isObject(payload)) {
            return null
        }

        if (payload.error !== undefined && typeof payload.error !== 'string') {
            return null
        }

        if (payload.promiseChannel !== undefined && typeof payload.promiseChannel !== 'string') {
            return null
        }

        if (payload.id !== undefined && typeof payload.id !== 'string') {
            return null
        }

        return {
            value: payload.value,
            error: payload.error,
            promiseChannel: payload.promiseChannel,
            id: payload.id
        }
    }

    /**
     * Получить имя события из данных регистрации.
     * @param payload - Данные из IPC.
     * @returns Имя события или `null`.
     */
    public static eventName(payload: unknown): string | null {
        if (!IpcPayload.isObject(payload) || typeof payload.value !== 'string' || payload.value.length === 0) {
            return null
        }

        return payload.value
    }

    /**
     * Получить тип регистрации события.
     * @param payload - Данные из IPC.
     * @returns Тип регистрации.
     */
    public static eventType(payload: unknown): 'on' | 'once' {
        return IpcPayload.isObject(payload) && payload.type === 'once' ? 'once' : 'on'
    }

    /**
     * Является ли значение обычным объектом.
     * @param value - Значение.
     */
    private static isObject(value: unknown): value is Record<string, any> {
        return typeof value === 'object' && value !== null
    }
}
