/* This module groups developer-specific functions that allow for detection of development environment, and perform
   actions that only should be performed in development environment.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

function isIpAddress(hostName:string):boolean {
  return hostName.match(/^\d+\.\d+\.\d+\.\d+$/g) !== null;
}

export function isServingLocally() {
  const hostName = window.location.hostname;
  return hostName === "localhost" || isIpAddress(hostName);
}