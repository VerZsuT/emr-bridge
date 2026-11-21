import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

const electronStub = new URL('./stubs/electron.mjs', import.meta.url).href

/*
 * Node исполняет TypeScript без транспиляции, поэтому:
 * 1. подменяем `electron` на тестовую модель;
 * 2. разрешаем `.js`-импорты исходников в соседние `.ts`-файлы
 *    (TypeScript требует `.js` в спецификаторах для NodeNext).
 */
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === 'electron') {
            return { url: electronStub, shortCircuit: true }
        }

        if (
            specifier.startsWith('.')
            && specifier.endsWith('.js')
            && context.parentURL
        ) {
            const parent = new URL(context.parentURL)

            if (parent.pathname.endsWith('.ts')) {
                const candidate = new URL(specifier.slice(0, -3) + '.ts', parent)

                if (existsSync(fileURLToPath(candidate))) {
                    return { url: candidate.href, shortCircuit: true }
                }
            }
        }

        return nextResolve(specifier, context)
    }
})
