/**
 * Хелпер для работы с исполняемым окружением.
 */
export default class Env {
    /**
     * Есть ли объект `window`.
     */
    static get hasWindow(): boolean {
        return typeof window !== 'undefined'
    }

    /**
     * Есть ли провайдер необходимых методов из `preload` в `renderer`. (`window.__provider__`)
     */
    static get hasProvider(): boolean {
        return Boolean(window.__provider__)
    }

    /**
     * Является ли окружение `preload` процессом.
     * 
     * Работает корректно только если запущено в `preload` или `renderer`.
     */
    static get isPreload(): boolean {
        return typeof global !== 'undefined'
    }
}
