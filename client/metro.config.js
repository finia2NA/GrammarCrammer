const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([
  ...(config.watchFolders ?? []),
  workspaceRoot,
]));
config.resolver.nodeModulesPaths = Array.from(new Set([
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]));

function isSharedImport(context, moduleName) {
  if (moduleName === '@grammarcrammer/shared' || moduleName.startsWith('@grammarcrammer/shared/')) {
    return true;
  }

  const isRelativeImport = moduleName.startsWith('./') || moduleName.startsWith('../');
  if (!isRelativeImport) {
    return false;
  }

  return typeof context.originModulePath === 'string'
    && path.normalize(context.originModulePath).startsWith(sharedRoot + path.sep);
}

// Remap .js -> .ts only for workspace shared package imports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolver = context.resolveRequest.bind(context);
  if (moduleName.endsWith('.js') && isSharedImport(context, moduleName)) {
    try {
      return resolver(context, moduleName.slice(0, -3) + '.ts', platform);
    } catch {}
  }
  return resolver(context, moduleName, platform);
};

// NativeWind mode choice:
// 1) forceWriteFileSystem: true (enabled below)
//    Mechanism: write generated styles to disk and let Metro rebundle normally.
//    Tradeoff: more stable across Metro internals, but CSS/theme edits refresh less instantly.
//
// 2) forceWriteFileSystem: false + HMR shim (commented block below)
//    Mechanism: virtual style modules + custom event-shape adapter for Metro 0.83.
//    Tradeoff: faster style-only refresh, but relies on internal Metro event compatibility.
const nativeWindConfig = withNativeWind(config, {
  input: './global.css',
  forceWriteFileSystem: true,
});

/*
const originalEnhanceMiddleware = nativeWindConfig.server?.enhanceMiddleware;

nativeWindConfig.server = {
  ...nativeWindConfig.server,
  enhanceMiddleware(middleware, metroServer) {
    const bundler = metroServer?.getBundler?.()?.getBundler?.();
    if (bundler?.getDependencyGraph) {
      bundler
        .getDependencyGraph()
        .then((graph) => {
          const haste = graph?._haste;
          if (!haste || haste.__grammarcrammerPatchedEmit) return;

          const emit = haste.emit.bind(haste);
          haste.emit = (eventName, payload, ...rest) => {
            if (eventName === 'change' && payload && !payload.changes && Array.isArray(payload.eventsQueue)) {
              const modifiedFiles = payload.eventsQueue
                .map((event) => {
                  if (!event?.filePath) return null;
                  return [
                    event.filePath,
                    {
                      isSymlink: false,
                      modifiedTime: event.metadata?.modifiedTime ?? Date.now(),
                    },
                  ];
                })
                .filter(Boolean);

              payload = {
                ...payload,
                rootDir: payload.rootDir ?? process.cwd(),
                changes: {
                  addedDirectories: new Set(),
                  removedDirectories: new Set(),
                  addedFiles: [],
                  modifiedFiles,
                  removedFiles: [],
                },
              };
            }
            return emit(eventName, payload, ...rest);
          };

          haste.__grammarcrammerPatchedEmit = true;
        })
        .catch(() => {});
    }

    if (typeof originalEnhanceMiddleware === 'function') {
      return originalEnhanceMiddleware(middleware, metroServer);
    }
    return middleware;
  },
};
*/

module.exports = nativeWindConfig;
