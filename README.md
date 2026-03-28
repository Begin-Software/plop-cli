# plop

Put a file on the web.

```
plop upload index.html
# https://plop.so/a8xk2m9f0p
```

Give it a name:

```
plop upload index.html ccar.se/games
# https://plop.so/a8xk2m9f0p
# https://ccar.se/games
```

## Install

```
brew install begin-software/tap/plop
```

## Commands

```
plop login                        # authenticate via browser
plop upload <file> [alias]        # upload a file, optionally map to a path
plop delete <id>                  # delete a plop
plop claim <username>             # claim username.plop.so
plop domains list                 # list your domains
plop domains add <hostname>       # add a custom domain ($5/mo)
plop domains remove <hostname>    # remove a custom domain
```

## Built for agents

plop is designed to be called by AI coding agents. Upload build artifacts, screenshots, reports — anything your agent needs to share.

```python
import subprocess
result = subprocess.run(["plop", "upload", "report.html", "ccar.se/report"], capture_output=True, text=True)
print(result.stdout)  # https://ccar.se/report
```

## Requirements

[Bun](https://bun.sh) runtime (for development). Published releases are self-contained binaries.
