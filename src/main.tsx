import { Buffer } from 'buffer';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';

(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ||= Buffer;

createRoot(document.getElementById('root')!).render(<App />);
