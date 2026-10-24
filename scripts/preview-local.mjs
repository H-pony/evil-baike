#!/usr/bin/env node
/** Build and serve the complete app with an isolated, local-only D1 database. */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, chmod, lstat, mkdir, readlink, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const localRoot = path.join(projectRoot, '.wrangler', 'local-preview');
const stateDirectory = path.join(localRoot, 'state');
const buildEnvDirectory = path.join(localRoot, 'build-env');
const configPath = path.join(localRoot, 'wrangler.json');
const astroConfigPath = path.join(localRoot, 'astro.config.mjs');
const credentialsPath = path.join(localRoot, '.dev.vars');
const databaseName = 'evil-baike-local-preview';
const databaseId = '00000000-0000-4000-8000-000000008788';
const wranglerPath = path.join(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const port = Number(process.env.PORT ?? 8788);

// Keep operating-system essentials, without passing account tokens or production
// app bindings from the launching shell into either build or Wrangler.
const childEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  /^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|TMP|TEMP|LANG|TERM|COLORTERM|FORCE_COLOR|NO_COLOR|SystemRoot|WINDIR|SystemDrive|COMSPEC|PATHEXT)$/.test(name) || name.startsWith('LC_')
));
Object.assign(childEnv, {
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
  CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false',
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_LOG: 'info',
  ASTRO_TELEMETRY_DISABLED: '1',
  BROWSER: 'none',
});

let activeChild;
let stopping = false;
let killTimer;

function signalChild(signal) {
  if (!activeChild?.pid) return;
  try {
    // Kill npm/Wrangler's descendants too, including the local workerd process.
    if (process.platform !== 'win32') process.kill(-activeChild.pid, signal);
    else activeChild.kill(signal);
  } catch (error) {
    if (error.code !== 'ESRCH') activeChild.kill(signal);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (stopping) { signalChild('SIGKILL'); return; }
    stopping = true;
    process.exitCode = signal === 'SIGINT' ? 130 : 143;
    signalChild(signal);
    killTimer = setTimeout(() => signalChild('SIGKILL'), 5000);
    killTimer.unref();
  });
}

function run(command, args, cwd) {
  if (stopping) throw new Error('本地预览已停止。');
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: childEnv,
      // D1 migration confirmations default to yes in non-interactive local mode.
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: process.platform !== 'win32',
    });
    activeChild = child;
    child.once('error', (error) => { activeChild = undefined; reject(error); });
    child.once('exit', (code, signal) => {
      activeChild = undefined;
      clearTimeout(killTimer);
      if (code === 0 && !stopping) resolve();
      else reject(new Error(`本地预览步骤退出（${signal ?? code ?? 'unknown'}）。`));
    });
  });
}

async function prepareFunctionsLink() {
  const destination = path.join(localRoot, 'functions');
  const source = path.join(projectRoot, 'functions');
  try {
    const existing = await lstat(destination);
    if (!existing.isSymbolicLink() || path.resolve(localRoot, await readlink(destination)) !== path.resolve(source)) {
      throw new Error(`本地 Functions 路径已被其他内容占用，请检查：${destination}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await symlink(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
  }
}

async function prepareCredentials() {
  try {
    const contents = [
      '# Generated for this local preview only. Never use these values in production.',
      `ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}`,
      `SESSION_SECRET=${randomBytes(48).toString('base64url')}`,
      '',
    ].join('\n');
    await writeFile(credentialsPath, contents, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Preserve the local password across restarts, without reading or logging it.
    const existing = await lstat(credentialsPath);
    if (!existing.isFile() || existing.isSymbolicLink()) {
      throw new Error(`本地凭证必须是普通文件：${credentialsPath}`);
    }
  }
  await chmod(credentialsPath, 0o600);
}

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必须是 1–65535 之间的整数。');
  }
  await access(wranglerPath);
  await mkdir(localRoot, { recursive: true, mode: 0o700 });
  await chmod(localRoot, 0o700);
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  await mkdir(buildEnvDirectory, { recursive: true, mode: 0o700 });

  // Astro's env loader follows vite.envDir. Override it in a generated config
  // so npm run build cannot load the project-root .env or .env.production.
  await writeFile(astroConfigPath, [
    `import config from ${JSON.stringify(pathToFileURL(path.join(projectRoot, 'astro.config.mjs')).href)};`,
    'export default {',
    '  ...config,',
    `  root: ${JSON.stringify(projectRoot)},`,
    `  vite: { ...config.vite, envDir: ${JSON.stringify(buildEnvDirectory)} },`,
    '};',
    '',
  ].join('\n'));

  console.log('正在构建本地预览…');
  // Astro resolves --config with path.join(root, value), so it requires a
  // project-relative path even when the generated config exists absolutely.
  const buildArgs = ['run', 'build', '--', '--config', path.relative(projectRoot, astroConfigPath)];
  if (process.env.npm_execpath) await run(process.execPath, [process.env.npm_execpath, ...buildArgs], projectRoot);
  else await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', buildArgs, projectRoot);

  await prepareCredentials();
  await prepareFunctionsLink();
  await writeFile(configPath, `${JSON.stringify({
    name: databaseName,
    compatibility_date: '2025-01-01',
    pages_build_output_dir: path.join(projectRoot, 'dist'),
    d1_databases: [{
      binding: 'ANALYTICS_DB',
      database_name: databaseName,
      database_id: databaseId,
      migrations_dir: path.join(projectRoot, 'migrations'),
    }],
  }, null, 2)}\n`);

  console.log('正在应用隔离的本地数据库迁移…');
  await run(process.execPath, [wranglerPath, 'd1', 'migrations', 'apply', databaseName,
    '--local', '--config', configPath, '--persist-to', stateDirectory], localRoot);

  console.log(`本地预览启动地址：http://127.0.0.1:${port}`);
  console.log(`后台登录页：http://127.0.0.1:${port}/admin`);
  console.log(`本地登录密码请查看 ${credentialsPath} 中的 ADMIN_PASSWORD；凭证不会输出到日志。`);
  await run(process.execPath, [wranglerPath, 'pages', 'dev',
    '--cwd', localRoot, '--ip', '127.0.0.1', '--port', String(port),
    '--d1', `ANALYTICS_DB=${databaseId}`, '--persist-to', stateDirectory,
    '--inspector-port', '0'], localRoot);
} catch (error) {
  if (!stopping) {
    console.error(`本地预览未启动：${error.message}`);
    process.exitCode = 1;
  }
}
