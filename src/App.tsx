import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Guard, NotFound } from './components/Guard';
import Home from './pages/Home';
import Board from './pages/Board';
import InitiativeDetail from './pages/InitiativeDetail';
import InitiativeForm from './pages/InitiativeForm';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Guard perm="home.view"><Home /></Guard>} />
        <Route path="initiatives" element={<Guard perm="initiatives.view"><Board /></Guard>} />
        <Route path="initiatives/new" element={<Guard perm="initiatives.edit"><InitiativeForm /></Guard>} />
        <Route path="initiatives/:id" element={<Guard perm="initiatives.view"><InitiativeDetail /></Guard>} />
        <Route path="initiatives/:id/edit" element={<Guard perm="initiatives.edit"><InitiativeForm key="edit" /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
