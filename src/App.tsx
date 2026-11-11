import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './store/session';
import Layout from './components/Layout';
import { Guard, NotFound } from './components/Guard';
import Home from './pages/Home';
import Board from './pages/Board';
import InitiativeDetail from './pages/InitiativeDetail';
import InitiativeForm from './pages/InitiativeForm';
import Documents, { Templates } from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Calendar, { DecisionLog } from './pages/Calendar';
import MeetingDetail from './pages/MeetingDetail';
import Discussions, { AskNetwork, NotificationSettings } from './pages/Discussions';
import ThreadDetail from './pages/ThreadDetail';
import Network, { CountryOverview, OrgProfile } from './pages/Network';
import Learning, { Facilitators, Inbox } from './pages/Learning';
import Guides, { GuideDetail } from './pages/Guides';
import AdminMembers, { AdminProposals, AdminRoles, AdminStats } from './pages/Admin';
import SearchPage from './pages/SearchPage';

/** Associated partners only have "Ask the network". */
function DiscussionsHome() {
  const { can } = useSession();
  return can('discussions.viewAll') ? <Discussions /> : <Navigate to="/discussions/ask" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Guard perm="home.view"><Home /></Guard>} />
        <Route path="initiatives" element={<Guard perm="initiatives.view"><Board /></Guard>} />
        <Route path="initiatives/new" element={<Guard perm="initiatives.edit"><InitiativeForm /></Guard>} />
        <Route path="initiatives/:id" element={<Guard perm="initiatives.view"><InitiativeDetail /></Guard>} />
        <Route path="initiatives/:id/edit" element={<Guard perm="initiatives.edit"><InitiativeForm key="edit" /></Guard>} />
        <Route path="documents" element={<Guard perm="documents.viewApproved"><Documents /></Guard>} />
        <Route path="documents/templates" element={<Guard perm="documents.viewApproved"><Templates /></Guard>} />
        <Route path="documents/:id" element={<Guard perm="documents.viewApproved"><DocumentDetail /></Guard>} />
        <Route path="calendar" element={<Guard perm="calendar.viewOpen"><Calendar /></Guard>} />
        <Route path="calendar/decisions" element={<Guard perm="calendar.viewAll"><DecisionLog /></Guard>} />
        <Route path="calendar/:id" element={<Guard perm="calendar.viewOpen"><MeetingDetail /></Guard>} />
        <Route path="discussions" element={<Guard perm="discussions.network"><DiscussionsHome /></Guard>} />
        <Route path="discussions/ask" element={<Guard perm="discussions.network"><AskNetwork /></Guard>} />
        <Route path="discussions/settings" element={<Guard perm="discussions.network"><NotificationSettings /></Guard>} />
        <Route path="discussions/:id" element={<Guard perm="discussions.network"><ThreadDetail /></Guard>} />
        <Route path="network" element={<Guard perm="network.view"><Network /></Guard>} />
        <Route path="network/countries" element={<Guard perm="network.view"><CountryOverview /></Guard>} />
        <Route path="network/:id" element={<Guard perm="network.view"><OrgProfile /></Guard>} />
        <Route path="learning" element={<Guard perm="learning.view"><Learning /></Guard>} />
        <Route path="learning/facilitators" element={<Guard perm="learning.facilitators"><Facilitators /></Guard>} />
        <Route path="learning/inbox" element={<Guard perm="learning.inbox"><Inbox /></Guard>} />
        <Route path="guides" element={<Guard perm="guides.view"><Guides /></Guard>} />
        <Route path="guides/:orgId" element={<Guard perm="guides.view"><GuideDetail /></Guard>} />
        <Route path="admin" element={<Guard perm="admin.view"><AdminMembers /></Guard>} />
        <Route path="admin/roles" element={<Guard perm="admin.view"><AdminRoles /></Guard>} />
        <Route path="admin/proposals" element={<Guard perm="admin.view"><AdminProposals /></Guard>} />
        <Route path="admin/statistics" element={<Guard perm="admin.view"><AdminStats /></Guard>} />
        <Route path="search" element={<Guard perm="home.view"><SearchPage /></Guard>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
