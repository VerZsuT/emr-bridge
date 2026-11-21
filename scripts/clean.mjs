import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/*
 * Удаляем только каталоги сборки, созданные `npm run compile`.
 * Без очистки `tsc` оставляет файлы от прошлых конфигураций,
 * и они попадают в публикуемый пакет.
 */
for (const directory of ['../esm', '../cjs']) {
    rmSync(fileURLToPath(new URL(directory, import.meta.url)), {
        recursive: true,
        force: true
    })
}
