import { Routes, Route } from "react-router-dom";
import "@/App.css";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Papers from "@/pages/Papers";
import Workspace from "@/pages/Workspace";
import Search from "@/pages/Search";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Workflow from "@/pages/Workflow";
import Settings from "@/pages/Settings";
import AppShell from "@/components/AppShell";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/paper/:id" element={<Workspace />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/search" element={<Search />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
