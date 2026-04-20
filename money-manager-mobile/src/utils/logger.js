import * as Clipboard from 'expo-clipboard';

let logs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

export const initLogger = () => {
  console.log = (...args) => {
    logs.push(`[LOG] ${new Date().toLocaleTimeString()}: ${args.map(a => String(a)).join(' ')}`);
    if (logs.length > 200) logs.shift();
    originalLog(...args);
  };

  console.error = (...args) => {
    logs.push(`[ERR] ${new Date().toLocaleTimeString()}: ${args.map(a => String(a)).join(' ')}`);
    if (logs.length > 200) logs.shift();
    originalError(...args);
  };

  console.warn = (...args) => {
    logs.push(`[WARN] ${new Date().toLocaleTimeString()}: ${args.map(a => String(a)).join(' ')}`);
    if (logs.length > 200) logs.shift();
    originalWarn(...args);
  };
};

export const getLogs = () => logs.join('\n');

export const copyLogsToClipboard = async () => {
  const allLogs = getLogs();
  await Clipboard.setStringAsync(allLogs);
  return allLogs;
};
