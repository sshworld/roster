# Mixed fixture

Prose mentioning `./scripts/nope.sh` should be ignored outside a fence.

```json
{ "path": "./scripts/nope.sh" }
```

```sh
# a comment line, should be skipped
npm i -g something-global
npx cowsay hello
/plugin marketplace add sshworld/roster
git status
FOO=1 node script.js
npm run build
npm run this-script-does-not-exist
./scripts/does-not-exist.sh
tests/fixtures/doccheck/no-exec.sh
tests/fixtures/doccheck/ok-exec.sh
```

Trailing prose after the fence.
