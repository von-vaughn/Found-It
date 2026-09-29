import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Share2, 
  MessageSquare, 
  Award, 
  Check, 
  Lock
} from 'lucide-react';
import type { Item } from '@/data/mockItems';
import toast from 'react-hot-toast';

interface ItemDetailModalProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  open,
  onOpenChange,
}) => {
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  if (!item) return null;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Listing link copied to clipboard!');
    }
  };

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSubmitted(true);
    toast.success(
      item.type === 'lost' 
        ? 'Your sighting/info was sent to the owner!' 
        : 'Claim request submitted! Verification steps initiated.'
    );
    setTimeout(() => {
      setClaimSubmitted(false);
      setMessage('');
      onOpenChange(false);
    }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          
          {/* Header Image with Badges */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
            <img 
              src={item.image} 
              alt={item.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Type badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {item.type === 'lost' ? (
                <span className="bg-[#E5192D] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  LOST ITEM
                </span>
              ) : (
                <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  FOUND ITEM
                </span>
              )}

              {item.reward && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {item.reward}
                </span>
              )}
            </div>

            {/* Quick Share button */}
            <button
              onClick={handleShare}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-neutral-800 backdrop-blur-md transition-all shadow-md cursor-pointer"
              title="Share listing"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Time bottom badge */}
            <div className="absolute bottom-4 left-4 text-white text-xs font-medium flex items-center gap-1.5 drop-shadow">
              <Clock className="w-4 h-4 text-white/90" />
              <span>Reported {item.timeAgo} • {item.date}</span>
            </div>
          </div>

          {/* Title & Metadata */}
          <div>
            <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              {item.title}
            </DialogTitle>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-neutral-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#E5192D] shrink-0" />
                <span className="font-semibold text-neutral-900">{item.location}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
              <div className="flex items-center gap-1.5 text-neutral-500">
                <span>Reported by:</span>
                <strong className="text-neutral-800">{item.contactName}</strong>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
              Description & Details
            </h4>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Safe Reunion Notice */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">FindIt Safety Standard</strong>
              Always meet at a well-lit, public location (such as campus security, university front desks, or public libraries). Never wire money in advance.
            </div>
          </div>

          {/* Contact / Claim Form */}
          <form onSubmit={handleClaim} className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-neutral-900">
              {item.type === 'lost' ? 'Did you find this item?' : 'Is this your item?'}
            </h4>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                item.type === 'lost'
                  ? 'I think I saw/found this at... (describe location or where you left it)'
                  : 'Describe unique identifiers to verify ownership (passcode, wallpaper, scratch marks, serial number)...'
              }
              rows={3}
              required
              className="w-full p-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            />

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-full text-xs"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={claimSubmitted}
                className={`rounded-full text-xs font-semibold px-6 ${
                  item.type === 'lost'
                    ? 'bg-[#E5192D] hover:bg-[#c81424] text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {claimSubmitted ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Sent Successfully
                  </>
                ) : item.type === 'lost' ? (
                  <>
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Report Sighting / Contact Owner
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1.5" />
                    Submit Claim Verification
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>

        </div>
      </DialogContent>
    </Dialog>
  );
};
