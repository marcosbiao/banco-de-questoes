import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import QuestoesPage from '../pages/QuestoesPage.jsx';
import NovaQuestaoPage from '../pages/NovaQuestaoPage.jsx';
import NovaListaPage from '../pages/NovaListaPage.jsx';
import ListaPreviewPage from '../pages/ListaPreviewPage.jsx';
import EditarQuestaoPage from '../pages/EditarQuestaoPage.jsx';
import ListasPage from '../pages/ListasPage.jsx';
import EditarListaPage from '../pages/EditarListaPage.jsx';
import ProvasPage from '../pages/ProvasPage.jsx';
import NovaProvaPage from '../pages/NovaProvaPage.jsx';
import ProvaDetalhesPage from '../pages/ProvaDetalhesPage.jsx';
import EditarProvaPage from '../pages/EditarProvaPage.jsx';
import BackupPage from '../pages/BackupPage.jsx';
import LimpezaMetadadosPage from '../pages/LimpezaMetadadosPage.jsx';
import ImportarQuestoesPage from '../pages/ImportarQuestoesPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/questoes" element={<QuestoesPage />} />
        <Route path="/questoes/nova" element={<NovaQuestaoPage />} />
        <Route path="/questoes/:id/editar" element={<EditarQuestaoPage />} />
        <Route path="/importar-questoes" element={<ImportarQuestoesPage />} />
        <Route path="/listas" element={<ListasPage />} />
        <Route path="/listas/nova" element={<NovaListaPage />} />
        <Route path="/listas/:id/editar" element={<EditarListaPage />} />
        <Route path="/listas/:id/preview" element={<ListaPreviewPage />} />
        <Route path="/listas/preview" element={<ListaPreviewPage />} />
        <Route path="/provas" element={<ProvasPage />} />
        <Route path="/provas/nova" element={<NovaProvaPage />} />
        <Route path="/provas/:id" element={<ProvaDetalhesPage />} />
        <Route path="/provas/:id/editar" element={<EditarProvaPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/limpeza-metadados" element={<LimpezaMetadadosPage />} />
      </Route>
    </Routes>
  );
}
