import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Guard, NotFound } from './components/Guard';
import Home from './pages/Home';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Guard perm="home.view"><Home /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
