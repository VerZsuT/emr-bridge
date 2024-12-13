import type { WebContents } from 'electron'

/**
 * Обёртка над стандартным `WebContents`, позволяющая использовать события.
 */
export default class WebContentsEventContainer {
    /**
     * Контейнер событий.
     */
    private containers = {} as {
        /**
         * Название события.
         */
        [event: string]: {
            /**
             * Многоразовые отправители.
             */
            on: WebContents[]

            /**
             * Одноразовые отправители.
             */
            once: WebContents[]
        }
    }

    /**
     * Добавить многоразового отправителя для события.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public addOn(event: string, sender: WebContents): void {
        this.addEvent(event).on.push(sender)
    }

    /**
     * Добавить одноразового отправителя для события.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public addOnce(event: string, sender: WebContents): void {
        this.addEvent(event).once.push(sender)
    }

    /**
     * Получить многоразовых отправителей для события.
     * @param event - Имя события.
     * @returns многоразовые отправители для события.
     */
    public getOn(event: string): WebContents[] {
        return this.addEvent(event).on
    }

    /**
     * Получить одноразовых отправителей для события.
     * @param event - Имя события.
     * @returns Одноразовые отправители для события.
     */
    public getOnce(event: string): WebContents[] {
        return this.addEvent(event).once
    }

    /**
     * Получить всех отправителей для события.
     * @param event - Имя события.
     * @returns Отправители для события.
     */
    public getAll(event: string): WebContents[] {
        const container = this.addEvent(event)

        return [...container.on, ...container.once]
    }

    /**
     * Удалить одноразовых отправителей для события.
     * @param event - Имя события.
     */
    public clearOnce(event: string): void {
        this.addEvent(event).once = []
    }

    /**
     * Добавить контейнер события.
     * @param name - Имя события.
     * @returns Добавленный контейнер.
     */
    private addEvent(name: string): (typeof this.containers)[string] {
        const container = this.containers[name] ??= { on: [], once: [] }

        return this.containers[name] = {
            on: container.on.filter(item => !item.isDestroyed()),
            once: container.once.filter(item => !item.isDestroyed()),
        }
    }
}
