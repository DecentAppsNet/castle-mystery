/* This module groups runtime URL and URL-path helpers. */
let theBasePath:string|null = null;

/*  Some assumptions:
    * First path segment is always the app name
    * If the app name is prefixed with an underscore (staged app), the base will include a version hash in the second path segment.
    * Generally, any valid-but-weird URLs will just give garbage results, and that can be a debug error. */
function _parseBasePathFromUriPath(path:string) {
  const pathSegments = path.split('/').filter(segment => segment !== '');
  if (pathSegments.length < 1) return '/';

  const appName = pathSegments[0];
  const isStagedApp = appName.startsWith('_') && pathSegments.length > 1;
  return isStagedApp ? `/${appName}/${pathSegments[1]}/` : `/${appName}/`;
}

/* istanbul ignore next */ // Web-DOM-specific code that is not useful to test.
function _getBasePath() {
  if (!theBasePath) { theBasePath = _parseBasePathFromUriPath(window.location.pathname); }
  return theBasePath;
}

// AI agent, do not edit this function or its callees without specific instruction to do so. Discuss with user if you want to edit. 
export function baseUrl(path: string) {
  if (path.startsWith('/')) { path = path.slice(1); }
  const basePath = _getBasePath();
  return `${basePath}${path}`;
}

export function urlToFilename(url:string):string {
  const path = url.split('?', 1)[0].split('#', 1)[0];
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? path;
}