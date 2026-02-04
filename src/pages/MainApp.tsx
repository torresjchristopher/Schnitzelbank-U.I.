import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ImageIcon, 
  Users, 
  Search, 
  Download, 
  Lock, 
  Terminal,
  ArrowLeft
} from 'lucide-react';
import type { MemoryTree } from '../types';
import { Header } from '../components/Header';
import GalleryTab from './tabs/GalleryTab';
import PeopleTab from './tabs/PeopleTab';
import SearchTab from './tabs/SearchTab';
import ExportTab from './tabs/ExportTab';
import PrivacyTab from './tabs/PrivacyTab';
import ArtifactCliTab from './tabs/ArtifactCliTab';

interface MainAppProps {
  tree: MemoryTree;
  onExport: (format: 'ZIP' | 'PDF') => void;
}

export default function MainApp({ tree, onExport }: MainAppProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('gallery');

  const tabs = [
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'people', label: 'People', icon: Users },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'artifact', label: 'Artifact CLI', icon: Terminal },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'gallery':
        return <GalleryTab tree={tree} onExport={onExport} />;
      case 'people':
        return <PeopleTab tree={tree} />;
      case 'search':
        return <SearchTab tree={tree} onExport={onExport} />;
      case 'export':
        return <ExportTab tree={tree} onExport={onExport} />;
      case 'privacy':
        return <PrivacyTab />;
      case 'artifact':
        return <ArtifactCliTab />;
      default:
        return <GalleryTab tree={tree} onExport={onExport} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header familyName={tree.familyName} />
      
      {/* Tabs Navigation */}
      <div className="fixed top-16 left-0 right-0 z-40 border-b border-slate-700 bg-slate-950/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => navigate('/')}
              className="flex-shrink-0 p-2 hover:bg-foreground/10 rounded-lg transition-colors mr-4"
              title="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button flex items-center gap-2 whitespace-nowrap py-4 px-4 ${
                    isActive 
                      ? 'border-b-2 border-blue-500 text-slate-50' 
                      : 'border-b-2 border-transparent text-slate-50/60 hover:text-slate-50'
                  } transition-colors`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-32">
        {renderTab()}
      </div>
    </div>
  );
}
