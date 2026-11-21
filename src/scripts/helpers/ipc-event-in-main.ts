import type { IpcMainEvent } from 'electron'
import type { IResult } from '../../types.js'
import IpcResult from './ipc-result.js'

/**
 * Событие вызова IPC в `main` процессе.
 */
export default class IpcEventInMain {
    /**
     * Оригинальное IPC событие.
     */
    private readonly event: IpcMainEvent

    /**
     * Создать событие вызова IPC в `main` процессе.
     * @param event - Оригинальное IPC событие.
     */
    public constructor(event: IpcMainEvent) {
        this.event = event
    }

    /**
     * Отправить сообщение в канал `renderer` процесса.
     *
     * Уничтоженный получатель или ошибка сериализации не должны
     * ронять main процесс.
     * @param channel - IPC канал.
     * @param result - Отправляемый результат.
     */
    public send(channel: string, result: IResult): void {
        const sender = this.event.sender

        if (!sender || sender.isDestroyed()) {
            return
        }

        try {
            sender.send(channel, result)
        } catch {
            // Получатель мог быть уничтожен между проверкой и отправкой.
        }
    }

    /**
     * Вернуть результат вызова IPC.
     * @param value - Результат.
     */
    public return(value: any): void {
        try {
            this.event.returnValue = value
        } catch (error) {
            this.event.returnValue = IpcResult.createWithError(error)
        }
    }
}
