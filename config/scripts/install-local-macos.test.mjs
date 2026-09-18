import { describe, expect, it } from 'vitest'
import { localMacElectronBuilderArgs } from './build-mac-local.mjs'
import {
  defaultCliCommandPath,
  electronBuilderDirArgs,
  isRunningInsideOrcaEnv,
  nativeSingleArchPnpmArgs,
  packagedMacAppCandidates,
  parseInstallLocalArgs,
  renderInstallSwapScript,
  resolvePackagedMacApp
} from './install-local-macos.mjs'

describe('parseInstallLocalArgs', () => {
  it('defaults to installing, launching, and compiling', () => {
    expect(parseInstallLocalArgs([])).toEqual({
      dest: '/Applications/Orca.app',
      help: false,
      installCli: true,
      launch: true,
      skipBuild: false,
      skipTypecheck: false
    })
  })

  it('parses install-and-run flags', () => {
    expect(
      parseInstallLocalArgs([
        '--skip-build',
        '--skip-typecheck',
        '--no-launch',
        '--no-cli',
        '--dest',
        '/tmp/Orca.app'
      ])
    ).toMatchObject({
      dest: '/tmp/Orca.app',
      installCli: false,
      launch: false,
      skipBuild: true,
      skipTypecheck: true
    })
  })

  it('accepts --dest=', () => {
    expect(parseInstallLocalArgs(['--dest=/opt/Orca.app']).dest).toBe('/opt/Orca.app')
  })

  it('rejects unknown arguments', () => {
    expect(() => parseInstallLocalArgs(['--wat'])).toThrow('Unknown argument: --wat')
  })

  it('rejects --dest without a path', () => {
    expect(() => parseInstallLocalArgs(['--dest'])).toThrow('--dest requires a path')
  })
})

describe('packaged mac app resolution', () => {
  it('only accepts the Apple Silicon unpacked app', () => {
    expect(packagedMacAppCandidates()).toEqual(['dist/mac-arm64/Orca.app'])
  })

  it('returns the Apple Silicon app when it exists', () => {
    const existing = new Set(['/repo/dist/mac-arm64/Orca.app', '/repo/dist/mac/Orca.app'])
    expect(resolvePackagedMacApp('/repo', (path) => existing.has(path))).toBe(
      '/repo/dist/mac-arm64/Orca.app'
    )
  })

  it('ignores an Intel unpacked app', () => {
    expect(resolvePackagedMacApp('/repo', (path) => path === '/repo/dist/mac/Orca.app')).toBeNull()
  })

  it('returns null when no packaged app is present', () => {
    expect(resolvePackagedMacApp('/repo', () => false)).toBeNull()
  })
})

describe('local mac packaging args', () => {
  it('packs only an unpacked Apple Silicon build and never publishes', () => {
    expect(electronBuilderDirArgs()).toEqual(['--dir', '--arm64', '--publish', 'never'])
    expect(localMacElectronBuilderArgs(electronBuilderDirArgs())).toEqual([
      'exec',
      'electron-builder',
      '--config',
      'config/electron-builder.config.cjs',
      '--mac',
      '--dir',
      '--arm64',
      '--publish',
      'never'
    ])
  })

  it('builds native helpers for the host arch only', () => {
    expect(nativeSingleArchPnpmArgs('build:computer-macos')).toEqual([
      'run',
      'build:computer-macos',
      '--',
      '--single-arch'
    ])
  })
})

describe('install environment', () => {
  it('detects Orca terminal env vars so the swap can detach', () => {
    expect(isRunningInsideOrcaEnv({})).toBe(false)
    expect(isRunningInsideOrcaEnv({ ORCA_WORKTREE_PATH: '/repo' })).toBe(true)
    expect(isRunningInsideOrcaEnv({ ORCA_ROOT_PATH: '/repo' })).toBe(true)
    expect(isRunningInsideOrcaEnv({ ORCA_PANE_KEY: 'tab-1:leaf-1' })).toBe(true)
  })

  it('falls back to ~/.local/bin when /usr/local/bin is missing', () => {
    expect(defaultCliCommandPath({ homePath: '/Users/dev', usrLocalBinExists: false })).toBe(
      '/Users/dev/.local/bin/orca'
    )
    expect(defaultCliCommandPath({ usrLocalBinExists: true })).toBe('/usr/local/bin/orca')
  })
})

describe('renderInstallSwapScript', () => {
  it('quits Orca, copies the .app, and optionally links the CLI', () => {
    const script = renderInstallSwapScript({
      sourceApp: "/tmp/Orca's.app",
      destApp: '/Applications/Orca.app',
      launch: true,
      cliCommandPath: '/usr/local/bin/orca'
    })

    expect(script).toContain("SOURCE='/tmp/Orca'\\''s.app'")
    expect(script).toContain("DEST='/Applications/Orca.app'")
    expect(script).toContain('osascript -e \'tell application "Orca" to quit\'')
    expect(script).toContain('ditto "$SOURCE" "$DEST"')
    expect(script).toContain('ln -sfn "$LAUNCHER" "$CLI"')
    expect(script).toContain('open "$DEST"')
  })

  it('omits launch and CLI steps when disabled', () => {
    const script = renderInstallSwapScript({
      sourceApp: '/tmp/Orca.app',
      destApp: '/Applications/Orca.app',
      launch: false,
      cliCommandPath: null
    })

    expect(script).not.toContain('open "$DEST"')
    expect(script).not.toContain('ln -sfn')
  })

  it('redirects detached swaps into a log file', () => {
    const script = renderInstallSwapScript({
      sourceApp: '/tmp/Orca.app',
      destApp: '/Applications/Orca.app',
      launch: false,
      logPath: '/tmp/orca-install-local.log'
    })

    expect(script).toContain("LOG='/tmp/orca-install-local.log'")
    expect(script).toContain('exec >>"$LOG" 2>&1')
  })
})
