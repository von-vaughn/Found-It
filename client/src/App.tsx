import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { FoundItMarquee } from '@/components/FoundItMarquee';
import { ItemsFeed } from '@/components/ItemsFeed';
import { HowItWorks } from '@/components/HowItWorks';
import { CommunityReunions } from '@/components/CommunityReunions';
import { ReportModal } from '@/components/ReportModal';
import { ItemDetailModal } from '@/components/ItemDetailModal';
import { Footer } from '@/components/Footer';
import { initialItems, type Item } from '@/data/mockItems';

export function App() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportDefaultType, setReportDefaultType] = useState<'lost' | 'found'>('lost');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [navActiveTab, setNavActiveTab] = useState('home');
  const [feedType, setFeedType] = useState<'all' | 'lost' | 'found'>('all');

  // Trigger report modal
  const handleOpenReport = (type: 'lost' | 'found' = 'lost') => {
    setReportDefaultType(type);
    setReportModalOpen(true);
  };

  // Trigger browse found items
  const handleBrowseFound = () => {
    setFeedType('found');
    setNavActiveTab('found');
    const itemsElem = document.getElementById('items');
    if (itemsElem) {
      itemsElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Select item by id (from Hero phone preview)
  const handleSelectById = (id: string) => {
    const found = items.find((i) => i.id === id);
    if (found) {
      setSelectedItem(found);
      setDetailModalOpen(true);
    }
  };

  // Select item from feed
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  // Add new item from report modal
  const handleAddItem = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev]);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#171717',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
          },
        }}
      />

      {/* Navigation */}
      <Navbar
        onOpenReport={handleOpenReport}
        activeTab={navActiveTab}
        setActiveTab={(tab) => {
          setNavActiveTab(tab);
          if (tab === 'lost') setFeedType('lost');
          if (tab === 'found') setFeedType('found');
          if (tab === 'home') setFeedType('all');
        }}
      />

      {/* Hero Section */}
      <main>
        <HeroSection
          onReportLost={() => handleOpenReport('lost')}
          onBrowseFound={handleBrowseFound}
          onSelectItem={handleSelectById}
        />

        {/* Infinite Moving 'found it' Marquee */}
        <FoundItMarquee />

        {/* Interactive Items Feed */}
        <ItemsFeed
          items={items}
          onSelectItem={handleSelectItem}
          onOpenReport={handleOpenReport}
          feedType={feedType}
          setFeedType={setFeedType}
        />

        {/* How It Works */}
        <HowItWorks onReportClick={() => handleOpenReport('lost')} />
      </main>

      {/* Modals */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        defaultType={reportDefaultType}
        onAddItem={handleAddItem}
      />

      <ItemDetailModal
        item={selectedItem}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      {/* Footer */}
      <Footer />

      {/* Big Display LOST AND FOUND Section */}
      <CommunityReunions />
    </div>
  );
}

export default App;
