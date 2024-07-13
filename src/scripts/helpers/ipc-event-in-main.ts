import type { IpcMainEvent } from 'electron'
import type { IResult } from '../../types.js'

/**
 * Событие вызова IPC в `main` процессе.
 */
export default class IpcEventInMain {
    /**
     * Создать событие вызова IPC в `main` процессе.
     * @param event - Оригинальное IPC событие.
     */
    public constructor(
        private event: IpcMainEvent
    ) {}

    /**
     * Отправить сообщение в канал `renderer` процесса.
     * @param channel - IPC канал.
     * @param result - Отправляемый результат.
     */
    public send(channel: string, result: IResult): void {
        this.event.sender.send(channel, result)
    }

    /**
     * Вернуть результат вызова IPC.
     * @param value - Результат.
     */
    public return(value: any): void {
        this.event.returnValue = value
    }
}
