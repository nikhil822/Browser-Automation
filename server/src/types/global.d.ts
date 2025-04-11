// Type definitions for global variables
import { Browser } from 'playwright';

declare global {
  var activeBrowser: Browser | undefined;
}
