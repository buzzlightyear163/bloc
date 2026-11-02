import { Buffer } from 'buffer';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/silkscreen/400.css';
import './site.css';
import './bloc.css';

(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ||= Buffer;

createRoot(document.getElementById('root')!).render(<App />);
