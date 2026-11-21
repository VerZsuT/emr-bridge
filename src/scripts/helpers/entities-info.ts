import type { IEntitiesInfo } from '../../types.js'

/**
 * Хелпер для безопасного чтения информации о публичных сущностях из IPC.
 */
export default class EntitiesInfo {
    /**
     * Прочитать информацию о сущностях.
     *
     * Значение из IPC недоверенное: неверный формат или мусорные имена
     * должны отбрасываться, а не ломать мост.
     * @param value - Данные из IPC.
     * @returns Информация о сущностях или `null`.
     */
    public static read(value: unknown): IEntitiesInfo | null {
        if (!value || typeof value !== 'object') {
            return null
        }

        const candidate = value as Partial<Record<keyof IEntitiesInfo, unknown>>

        if (!EntitiesInfo.isIterable(candidate.functions) || !EntitiesInfo.isIterable(candidate.variables)) {
            return null
        }

        return {
            functions: new Set(
                Array.from(candidate.functions).filter((name): name is string => typeof name === 'string')
            ),
            variables: new Set(
                Array.from(candidate.variables).filter((name): name is string => typeof name === 'string')
            )
        }
    }

    /**
     * Является ли значение итерируемым.
     * @param value - Значение.
     */
    private static isIterable<T>(value: unknown): value is Iterable<T> {
        return (
            value !== null
            && value !== undefined
            && typeof (value as Iterable<T>)[Symbol.iterator] === 'function'
        )
    }
}
