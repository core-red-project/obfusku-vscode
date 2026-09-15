install:
    npm install

dev:
    npm run watch

build:
    npm run build

test:
    npm test

typecheck:
    npm run typecheck

lint:
    npm run lint

format:
    npm run format

check:
    npm run check

clean:
    npm run clean

package: build
    npm run package
