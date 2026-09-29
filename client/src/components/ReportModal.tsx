import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Check, 
  PlusCircle
} from 'lucide-react';
import type { Item } from '@/data/mockItems';
import toast from 'react-hot-toast';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'lost' | 'found';
  onAddItem: (item: Item) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  open,
  onOpenChange,
  defaultType = 'lost',
  onAddItem,
}) => {
  const [type, setType] = useState<'lost' | 'found'>(defaultType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Item['category']>('bags');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [contactName, setContactName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('/images/backpack.jpg');

  // Preset available images for easy selection in demo
  const sampleImages = [
    { label: 'Backpack', url: '/images/backpack.jpg' },
    { label: 'Keys', url: '/images/keys.jpg' },
    { label: 'Wallet', url: '/images/wallet.jpg' },
    { label: 'iPhone', url: '/images/iphone.jpg' },
    { label: 'AirPods', url: '/images/airpods.jpg' },
    { label: 'Glasses', url: '/images/glasses.jpg' },
    { label: 'Watch', url: '/images/watch.jpg' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      toast.error('Please enter an item title and location');
      return;
    }

    const newItem: Item = {
      id: `item-${Date.now()}`,
      title: title.trim(),
      type,
      category,
      location: location.trim(),
      date: new Date().toISOString().split('T')[0],
      timeAgo: 'Just now',
      image: selectedImage,
      description: description.trim() || 'No additional details provided.',
      status: 'active',
      reward: type === 'lost' && reward.trim() ? reward.trim() : undefined,
      contactName: contactName.trim() || (type === 'lost' ? 'Community Member' : 'Helpful Finder'),
    };

    onAddItem(newItem);
    toast.success(
      type === 'lost' 
        ? 'Lost item report submitted! Nearby finders notified.' 
        : 'Found item published! Thanks for being an awesome neighbor.'
    );

    // Reset & close
    setTitle('');
    setLocation('');
    setDescription('');
    setReward('');
    setContactName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E5192D]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#E5192D]">
              Community Alert
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold text-neutral-900">
            {type === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-neutral-500">
            Provide details so our smart matching engine can connect you with the community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          
          {/* Toggle Type: Lost or Found */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('lost')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                type === 'lost'
                  ? 'bg-[#E5192D] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              I Lost Something
            </button>
            <button
              type="button"
              onClick={() => setType('found')}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                type === 'found'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              I Found Something
            </button>
          </div>

          {/* Item Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">
              Item Title / Name *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Space Gray iPad Pro, Hydro Flask with stickers"
              className="h-10 rounded-xl text-sm"
              required
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Item['category'])}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="bags">🎒 Bags & Backpacks</option>
                <option value="electronics">📱 Electronics & Phones</option>
                <option value="keys">🔑 Keys & Badges</option>
                <option value="wallets">👛 Wallets & Cards</option>
                <option value="accessories">👓 Glasses & Accessories</option>
                <option value="other">📦 Other Belongings</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                Location *
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Science Library, 2nd floor"
                className="h-10 rounded-xl text-sm"
                required
              />
            </div>
          </div>

          {/* Select Sample Photo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 flex items-center justify-between">
              <span>Photo Demonstration</span>
              <span className="text-[11px] text-neutral-400 font-normal">Pick matching asset</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {sampleImages.map((img) => (
                <button
                  type="button"
                  key={img.url}
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === img.url
                      ? 'border-[#E5192D] ring-2 ring-red-500/30'
                      : 'border-neutral-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  {selectedImage === img.url && (
                    <div className="absolute inset-0 bg-[#E5192D]/40 flex items-center justify-center text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">
              Description & Distinctive Marks
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Color, brand name, scratch marks, stickers, serial digits..."
              rows={3}
              className="w-full p-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            />
          </div>

          {/* Optional Reward & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type === 'lost' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  Optional Reward
                </label>
                <Input
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="e.g. $30 Reward"
                  className="h-10 rounded-xl text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                Your Name / Alias
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`rounded-full text-xs font-semibold px-6 ${
                type === 'lost'
                  ? 'bg-[#E5192D] hover:bg-[#c81424] text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Publish {type === 'lost' ? 'Lost Report' : 'Found Report'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
};
