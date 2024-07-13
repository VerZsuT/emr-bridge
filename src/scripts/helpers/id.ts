/**
 * Хелпер для работы с идентификаторами.
 */
export default class Id {
    /**
     * Создать новый идентификатор.
     */
    public static new(): string {
        return Math.random().toString()
    }
}
