install:
    pnpm install --frozen-lockfile

dev:
    pnpm run watch

build:
    pnpm run build

test:
    pnpm test

typecheck:
    pnpm run typecheck

lint:
    pnpm run lint

format:
    pnpm run format

format-check:
    pnpm run format:check

# Non-mutating gate: what pre-commit and CI run.
check: format-check lint typecheck test build

clean:
    pnpm run clean

package: build
    pnpm run package

changelog:
    git-cliff --latest --strip all -o RELEASE_NOTES.md
