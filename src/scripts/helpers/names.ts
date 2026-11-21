import { InvalidEntityNameError, InvalidEventNameError } from '../../errors.js'

/**
 * Максимальная длина имени публикуемой сущности.
 */
const MAX_ENTITY_NAME_LENGTH = 256

/**
 * Максимальная длина имени события.
 */
const MAX_EVENT_NAME_LENGTH = 1024

/**
 * Имена, которые нельзя использовать для сущностей моста.
 *
 * Часть из них уже занята API моста, часть может сломать объект
 * (например, `then` делает мост "thenable", а `__proto__` меняет прототип).
 */
const RESERVED_ENTITY_NAMES = new Set([
    'as',
    'emit',
    'on',
    'once',
    'call',
    'returns',
    'then',
    'catch',
    'finally',
    'constructor',
    'prototype',
    '__proto__',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf',
    'toJSON',
    'inspect'
])

/**
 * Хелпер для проверки имён сущностей и событий.
 */
export default class Names {
    /**
     * Зарезервировано ли имя для API моста.
     * @param name - Имя.
     */
    public static isReserved(name: string): boolean {
        return RESERVED_ENTITY_NAMES.has(name)
    }

    /**
     * Проверить имя публикуемой сущности.
     * @param name - Имя.
     */
    public static validateEntity(name: unknown): asserts name is string {
        if (typeof name !== 'string' || name.length === 0 || name.length > MAX_ENTITY_NAME_LENGTH) {
            throw new InvalidEntityNameError(name)
        }

        if (RESERVED_ENTITY_NAMES.has(name)) {
            throw new InvalidEntityNameError(name, true)
        }
    }

    /**
     * Проверить имя события.
     * @param name - Имя.
     */
    public static validateEvent(name: unknown): asserts name is string {
        if (typeof name !== 'string' || name.length === 0 || name.length > MAX_EVENT_NAME_LENGTH) {
            throw new InvalidEventNameError(name)
        }
    }
}
