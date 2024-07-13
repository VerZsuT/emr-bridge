import type { WebContents } from 'electron'

/**
 * Обёртка над стандартным `WebContents`, позволяющая использовать события.
 */
export default class WebContentsEventContainer {
    /**
     * Контейнер событий.
     */
    private container = {} as {
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
        this.addEvent(event)
        this.container[event].on.push(sender)
    }

    /**
     * Добавить одноразового отправителя для события.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public addOnce(event: string, sender: WebContents): void {
        this.addEvent(event)
        this.container[event].once.push(sender)
    }

    /**
     * Получить многоразовых отправителей для события.
     * @param event - Имя события.
     * @returns многоразовые отправители для события.
     */
    public getOn(event: string): WebContents[] {
        return this.getEvent(event).on.filter(sender => !sender.isDestroyed())
    }

    /**
     * Получить одноразовых отправителей для события.
     * @param event - Имя события.
     * @returns Одноразовые отправители для события.
     */
    public getOnce(event: string): WebContents[] {
        return this.getEvent(event).once.filter(sender => !sender.isDestroyed())
    }

    /**
     * Получить всех отправителей для события.
     * @param event - Имя события.
     * @returns Отправители для события.
     */
    public getAll(event: string): WebContents[] {
        const senders = this.getEvent(event)

        return [...senders.on, ...senders.once]
    }

    /**
     * Удалить одноразовых отправителей для события.
     * @param event - Имя события.
     */
    public clearOnce(event: string): void {
        this.getEvent(event).once = []
    }

    /**
     * Добавить контейнер события.
     * @param name - Имя события.
     */
    private addEvent(name: string): void {
        this.container[name] ??= { on: [], once: [] }
    }

    /**
     * Получить контейнер события.
     * @param name - Имя события.
     * @returns Контейнер события.
     */
    private getEvent(name: string): (typeof this.container)[string] {
        this.addEvent(name)

        return this.container[name]
    }
}
