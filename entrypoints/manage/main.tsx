import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

import '../popup/style.css';
import './manage.css';

const root = document.getElementById('root');
if (!root) throw new Error('Page root element missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
