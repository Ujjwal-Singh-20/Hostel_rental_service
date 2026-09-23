import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Layers } from 'lucide-react';
import { resolveImageUrl } from '../services/api';

const CATEGORY_STYLES = {
  Electronics: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  Tools: 'bg-amber-50 text-amber-900 border-amber-200',
  Academic: 'bg-violet-50 text-violet-900 border-violet-200',
  'Daily Living': 'bg-lime-50 text-lime-900 border-lime-200',
};

export default function ItemCard({ item }) {
  const isFree = item.daily_rate === 0 || item.daily_rate === 0.0;
  const isAvailable = item.status === 'available';
  const categoryStyle = CATEGORY_STYLES[item.category] || 'bg-zinc-100 text-zinc-700 border-zinc-200';

  return (
    <Link 
      to={`/items/${item.id}`}
      className="card-minimal overflow-hidden flex flex-col group block bg-white"
    >
      {/* Image Preview & Badges */}
      <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
        {item.image_url ? (
          <img 
            src={resolveImageUrl(item.image_url)} 
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
            <Layers className="w-8 h-8 stroke-[1.25] mb-1 text-zinc-300" />
            <span className="text-[10px] font-mono uppercase text-zinc-400">No Image</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${categoryStyle}`}>
            {item.category}
          </span>

          <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
            isAvailable 
              ? 'bg-lime-50 text-lime-900 border-lime-300' 
              : 'bg-zinc-100 text-zinc-700 border-zinc-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-lime-500' : 'bg-zinc-400'}`}></span>
            <span>{isAvailable ? 'Available' : 'In Use'}</span>
          </span>
        </div>

        {/* Price Tag pinned to bottom right */}
        <div className="absolute bottom-2.5 right-2.5">
          {isFree ? (
            <span className="bg-lime-400 text-zinc-950 font-black text-[10px] font-mono uppercase px-2.5 py-1 rounded-md tracking-wider shadow-xs">
              FREE
            </span>
          ) : (
            <div className="bg-zinc-950 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-md shadow-xs">
              <span className="text-lime-300">₹{item.daily_rate}</span>
              <span className="text-[10px] text-zinc-400 font-normal"> /day</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors line-clamp-1 text-sm">
            {item.title}
          </h3>
          <p className="text-zinc-500 text-xs mt-1 line-clamp-2 leading-relaxed">
            {item.description || 'No description provided. Click to view availability.'}
          </p>
        </div>

        {/* Lender Metadata Footer */}
        {item.lender && (
          <div className="pt-2.5 mt-2.5 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {item.lender.avatar_url ? (
                <img 
                  src={resolveImageUrl(item.lender.avatar_url)} 
                  alt={item.lender.display_name} 
                  className="w-4 h-4 rounded-full object-cover ring-1 ring-zinc-200"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 text-[8px] font-bold flex items-center justify-center">
                  {item.lender.display_name ? item.lender.display_name[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-[11px] text-zinc-600 font-medium truncate max-w-[120px]">
                {item.lender.display_name || `@${item.lender.username}`}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
              <span>{item.lender.trust_rating ? item.lender.trust_rating.toFixed(1) : '5.0'}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
