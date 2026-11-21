import type { WebContents } from 'electron'

/**
 * Контейнер подписчиков одного события.
 *
 * Счётчики нужны, потому что у одного `WebContents` может быть
 * несколько независимых обработчиков: отписка одного не должна
 * удалять доставку для остальных.
 */
interface IEventContainer {
    /**
     * Многоразовые отправители и число их подписок.
     */
    on: Map<WebContents, number>

    /**
     * Одноразовые отправители и число их подписок.
     */
    once: Map<WebContents, number>
}

/**
 * Обёртка над стандартным `WebContents`, позволяющая использовать события.
 *
 * Хранит только живые `WebContents` и удаляет опустевшие события,
 * чтобы долгоживущий main процесс не накапливал мусор.
 */
export default class WebContentsEventContainer {
    /**
     * Контейнеры событий.
     */
    private readonly containers = new Map<string, IEventContainer>()

    /**
     * Добавить многоразового отправителя для события.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public addOn(event: string, sender: WebContents): void {
        this.increment(event, 'on', sender)
    }

    /**
     * Добавить одноразового отправителя для события.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public addOnce(event: string, sender: WebContents): void {
        this.increment(event, 'once', sender)
    }

    /**
     * Удалить одну подписку многоразового отправителя.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public removeOn(event: string, sender: WebContents): void {
        this.decrement(event, 'on', sender)
    }

    /**
     * Удалить одну подписку одноразового отправителя.
     * @param event - Имя события.
     * @param sender - Отправитель.
     */
    public removeOnce(event: string, sender: WebContents): void {
        this.decrement(event, 'once', sender)
    }

    /**
     * Получить многоразовых отправителей для события.
     * @param event - Имя события.
     * @returns Многоразовые отправители для события.
     */
    public getOn(event: string): WebContents[] {
        const container = this.containers.get(event)

        if (!container) {
            return []
        }

        this.prune(event, container)

        return [...container.on.keys()]
    }

    /**
     * Получить одноразовых отправителей для события.
     * @param event - Имя события.
     * @returns Одноразовые отправители для события.
     */
    public getOnce(event: string): WebContents[] {
        const container = this.containers.get(event)

        if (!container) {
            return []
        }

        this.prune(event, container)

        return [...container.once.keys()]
    }

    /**
     * Получить всех уникальных отправителей для события.
     *
     * Один отправитель получает одно IPC-сообщение, даже если у него
     * есть и многоразовый, и одноразовый обработчик.
     * @param event - Имя события.
     * @returns Отправители для события.
     */
    public getAll(event: string): WebContents[] {
        const container = this.containers.get(event)

        if (!container) {
            return []
        }

        this.prune(event, container)

        const senders = [...container.on.keys()]

        for (const sender of container.once.keys()) {
            if (!container.on.has(sender)) {
                senders.push(sender)
            }
        }

        return senders
    }

    /**
     * Удалить одноразовых отправителей для события.
     * @param event - Имя события.
     */
    public clearOnce(event: string): void {
        const container = this.containers.get(event)

        if (!container) {
            return
        }

        container.once.clear()
        this.prune(event, container)
    }

    /**
     * Увеличить число подписок отправителя.
     * @param event - Имя события.
     * @param type - Тип подписки.
     * @param sender - Отправитель.
     */
    private increment(event: string, type: keyof IEventContainer, sender: WebContents): void {
        const container = this.getOrCreate(event)

        if (!WebContentsEventContainer.isAlive(sender)) {
            this.deleteIfEmpty(event, container)
            return
        }

        container[type].set(sender, (container[type].get(sender) ?? 0) + 1)
    }

    /**
     * Уменьшить число подписок отправителя.
     * @param event - Имя события.
     * @param type - Тип подписки.
     * @param sender - Отправитель.
     */
    private decrement(event: string, type: keyof IEventContainer, sender: WebContents): void {
        const container = this.containers.get(event)

        if (!container) {
            return
        }

        const count = container[type].get(sender)

        if (count === undefined) {
            return
        }

        if (count <= 1) {
            container[type].delete(sender)
        } else {
            container[type].set(sender, count - 1)
        }

        this.deleteIfEmpty(event, container)
    }

    /**
     * Получить контейнер события или создать его.
     * @param event - Имя события.
     * @returns Контейнер события.
     */
    private getOrCreate(event: string): IEventContainer {
        let container = this.containers.get(event)

        if (!container) {
            container = { on: new Map(), once: new Map() }
            this.containers.set(event, container)
        } else {
            this.prune(event, container)

            if (!this.containers.has(event)) {
                container = { on: new Map(), once: new Map() }
                this.containers.set(event, container)
            }
        }

        return container
    }

    /**
     * Удалить уничтоженные отправители.
     * @param event - Имя события.
     * @param container - Контейнер события.
     */
    private prune(event: string, container: IEventContainer): void {
        for (const sender of container.on.keys()) {
            if (!WebContentsEventContainer.isAlive(sender)) {
                container.on.delete(sender)
            }
        }

        for (const sender of container.once.keys()) {
            if (!WebContentsEventContainer.isAlive(sender)) {
                container.once.delete(sender)
            }
        }

        this.deleteIfEmpty(event, container)
    }

    /**
     * Удалить контейнер события, если в нём не осталось подписчиков.
     * @param event - Имя события.
     * @param container - Контейнер события.
     */
    private deleteIfEmpty(event: string, container: IEventContainer): void {
        if (container.on.size === 0 && container.once.size === 0) {
            this.containers.delete(event)
        }
    }

    /**
     * Жив ли отправитель.
     * @param sender - Отправитель.
     */
    private static isAlive(sender: WebContents): boolean {
        const candidate = sender as unknown as { isDestroyed?: () => boolean }

        return typeof candidate.isDestroyed !== 'function' || !candidate.isDestroyed()
    }
}
