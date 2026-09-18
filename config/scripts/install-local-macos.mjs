#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, openSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { runLocalMacElectronBuilder } from './build-mac-local.mjs'

const repoRoot = resolve(import.meta.dirname, '../..')
const DEFAULT_DEST = '/Applications/Orca.app'
const LOCAL_MAC_ARCH = 'arm64'
const HELP = `Compile this checkout for Apple Silicon, install Orca.app, and launch it.

Usage:
  pnpm install:local [options]

Apple Silicon only (darwin arm64). Does not build Intel/x64.

Options:
  --skip-build         Reuse an already packaged dist/mac-arm64/Orca.app
  --skip-typecheck     Skip pnpm typecheck (still compiles)
  --no-launch          Install without opening the app
  --no-cli             Do not create/update the orca CLI symlink
  --dest <path>        Install destination (default: ${DEFAULT_DEST})
  --help               Show this help

Replaces the destination app (same bundle id as the official build).
If this script is running inside an Orca terminal, the swap is detached
so quitting Orca does not kill the installer.`

export function parseInstallLocalArgs(argv, { dest = DEFAULT_DEST } = {}) {
  const result = {
    dest,
    help: false,
    installCli: true,
    launch: true,
    skipBuild: false,
    skipTypecheck: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--help' || value === '-h') {
      result.help = true
    } else if (value === '--skip-build') {
      result.skipBuild = true
    } else if (value === '--skip-typecheck') {
      result.skipTypecheck = true
    } else if (value === '--no-launch') {
      result.launch = false
    } else if (value === '--no-cli') {
      result.installCli = false
    } else if (value === '--dest') {
      const destPath = argv[index + 1]
      if (!destPath || destPath.startsWith('-')) {
        throw new Error('--dest requires a path')
      }
      result.dest = destPath
      index += 1
    } else if (value.startsWith('--dest=')) {
      const destPath = value.slice('--dest='.length)
      if (!destPath) {
        throw new Error('--dest requires a path')
      }
      result.dest = destPath
    } else {
      throw new Error(`Unknown argument: ${value}`)
    }
  }

  return result
}

export function electronBuilderDirArgs() {
  return ['--dir', `--${LOCAL_MAC_ARCH}`, '--publish', 'never']
}

export function packagedMacAppCandidates() {
  return ['dist/mac-arm64/Orca.app']
}

export function nativeSingleArchPnpmArgs(scriptName) {
  return ['run', scriptName, '--', '--single-arch']
}

export function resolvePackagedMacApp(root, exists = existsSync) {
  for (const relativePath of packagedMacAppCandidates()) {
    const absolutePath = resolve(root, relativePath)
    if (exists(absolutePath)) {
      return absolutePath
    }
  }
  return null
}

export function isRunningInsideOrcaEnv(env = process.env) {
  return Boolean(env.ORCA_WORKTREE_PATH || env.ORCA_ROOT_PATH || env.ORCA_PANE_KEY)
}

export function defaultCliCommandPath({
  homePath = homedir(),
  usrLocalBinExists = existsSync('/usr/local/bin')
} = {}) {
  return usrLocalBinExists ? '/usr/local/bin/orca' : join(homePath, '.local', 'bin', 'orca')
}

export function renderInstallSwapScript({
  sourceApp,
  destApp,
  launch,
  cliCommandPath = null,
  logPath = null
}) {
  const lines = [
    '#!/bin/bash',
    'set -euo pipefail',
    ...(logPath
      ? [
          `LOG=${shellQuote(logPath)}`,
          'mkdir -p "$(dirname "$LOG")"',
          'exec >>"$LOG" 2>&1',
          'echo "[install:local] $(date) starting swap"'
        ]
      : []),
    `SOURCE=${shellQuote(sourceApp)}`,
    `DEST=${shellQuote(destApp)}`,
    'echo "[install:local] quitting Orca"',
    `osascript -e 'tell application "Orca" to quit' >/dev/null 2>&1 || true`,
    'killall "Orca Computer Use" >/dev/null 2>&1 || true',
    'for ((i=1; i<=40; i++)); do',
    '  if ! pgrep -x Orca >/dev/null 2>&1; then',
    '    break',
    '  fi',
    '  sleep 0.5',
    'done',
    'if pgrep -x Orca >/dev/null 2>&1; then',
    '  pkill -x Orca >/dev/null 2>&1 || true',
    '  sleep 1',
    'fi',
    'echo "[install:local] installing $SOURCE -> $DEST"',
    'rm -rf "$DEST"',
    'ditto "$SOURCE" "$DEST"',
    'xattr -cr "$DEST" >/dev/null 2>&1 || true'
  ]

  if (cliCommandPath) {
    const launcher = '"$DEST/Contents/Resources/bin/orca"'
    lines.push(
      `CLI=${shellQuote(cliCommandPath)}`,
      `LAUNCHER=${launcher}`,
      'if [ -x "$LAUNCHER" ]; then',
      '  if [ -e "$CLI" ] && [ ! -L "$CLI" ]; then',
      '    echo "[install:local] skipping CLI: $CLI exists and is not a symlink"',
      '  else',
      '    mkdir -p "$(dirname "$CLI")"',
      '    if ln -sfn "$LAUNCHER" "$CLI"; then',
      '      echo "[install:local] CLI -> $CLI"',
      '    else',
      '      echo "[install:local] could not write $CLI. Run:"',
      '      echo "  sudo ln -sfn $LAUNCHER $CLI"',
      '    fi',
      '  fi',
      'fi'
    )
  }

  if (launch) {
    lines.push('echo "[install:local] launching $DEST"', 'open "$DEST"')
  }

  lines.push('echo "[install:local] done"')
  return `${lines.join('\n')}\n`
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`
}

function runPnpm(args) {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit'
  })
  if (result.signal) {
    process.kill(process.pid, result.signal)
  }
  if (result.status !== 0 || result.error) {
    process.exit(result.status ?? 1)
  }
}

function compileLocalApp({ skipTypecheck }) {
  if (skipTypecheck) {
    for (const scriptName of [
      'build:relay',
      'build:cli',
      'build:electron-vite',
      'verify:built-skills-cli',
      'build:web-from-renderer'
    ]) {
      runPnpm(['run', scriptName])
    }
  } else {
    runPnpm(['run', 'build:desktop'])
  }

  runPnpm(nativeSingleArchPnpmArgs('build:computer-macos'))
  runPnpm(nativeSingleArchPnpmArgs('build:keyboard-layout-macos'))
  runPnpm(nativeSingleArchPnpmArgs('build:notification-status-macos'))
  runPnpm(['run', 'ensure:electron-runtime'])
  runLocalMacElectronBuilder({ extraArgs: electronBuilderDirArgs() })
}

function runSwapScript(scriptText, { detach, logPath }) {
  const scratch = mkdtempSync(join(tmpdir(), 'orca-install-local-'))
  const scriptPath = join(scratch, 'swap.sh')
  writeFileSync(scriptPath, scriptText)
  chmodSync(scriptPath, 0o755)

  if (!detach) {
    const result = spawnSync('/bin/bash', [scriptPath], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit'
    })
    if (result.status !== 0 || result.error) {
      process.exit(result.status ?? 1)
    }
    return
  }

  mkdirSync(dirname(logPath), { recursive: true })
  const logFd = openSync(logPath, 'a')
  const child = spawn('/bin/bash', [scriptPath], {
    cwd: repoRoot,
    detached: true,
    env: process.env,
    stdio: ['ignore', logFd, logFd]
  })
  child.unref()
}

function main() {
  const args = parseInstallLocalArgs(process.argv.slice(2))
  if (args.help) {
    console.log(HELP)
    return
  }

  if (process.platform !== 'darwin' || process.arch !== LOCAL_MAC_ARCH) {
    console.error('pnpm install:local only supports Apple Silicon (darwin arm64).')
    process.exit(1)
  }

  process.chdir(repoRoot)

  if (!args.skipBuild) {
    console.log('[install:local] compiling current checkout (Apple Silicon unpacked, no Intel)')
    compileLocalApp({ skipTypecheck: args.skipTypecheck })
  }

  const sourceApp = resolvePackagedMacApp(repoRoot)
  if (!sourceApp) {
    console.error(
      `[install:local] packaged app not found. Looked for:\n${packagedMacAppCandidates()
        .map((path) => `  ${path}`)
        .join('\n')}`
    )
    process.exit(1)
  }

  const cliCommandPath = args.installCli ? defaultCliCommandPath() : null
  const detach = isRunningInsideOrcaEnv()
  const logPath = join(tmpdir(), 'orca-install-local-logs', 'latest.log')
  const scriptText = renderInstallSwapScript({
    sourceApp,
    destApp: resolve(args.dest),
    launch: args.launch,
    cliCommandPath,
    logPath: detach ? logPath : null
  })

  if (detach) {
    console.log(
      `[install:local] running inside Orca; swapping ${args.dest} in the background after Orca quits`
    )
    console.log(`[install:local] log: ${logPath}`)
  }

  runSwapScript(scriptText, { detach, logPath })
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
