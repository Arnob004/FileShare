import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Components/Page/HomePage.jsx';
import ShareDataPage from './Components/Page/ShareDataPage.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/share/:roomId" element={<ShareDataPage />} />
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
