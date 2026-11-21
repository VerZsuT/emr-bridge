import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * Каталог `cjs` содержит CommonJS-сборку, но корневой package.json
 * объявляет "type": "module". Без собственного package.json Node
 * попытается разобрать файлы каталога как ESM и упадёт на `require`.
 */
const target = fileURLToPath(new URL('../cjs/package.json', import.meta.url))

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, JSON.stringify({ type: 'commonjs' }, null, 2) + '\n')
