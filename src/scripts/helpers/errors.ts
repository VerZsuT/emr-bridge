/**
 * Хелпер для работы с ошибками.
 */
export default class Errors {
    /**
     * Получить функцию выброса ошибки.
     * @param errorClass - Класс ошибки.
     * @param args - Аргументы создания класса.
     * @returns Функция выброса ошибки.
     */
    public static getThrower<
        TClass extends new (...args: TArgs) => InstanceType<TClass>,
        TArgs extends any[]
    >(errorClass: TClass, ...args: TArgs): () => never {
        return () => { throw new errorClass(...args) }
    }
}
