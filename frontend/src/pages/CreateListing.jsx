import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, Upload, ArrowLeft, Tag, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, resolveImageUrl } from '../services/api';

const CATEGORIES = ['Electronics', 'Tools', 'Academic', 'Daily Living'];

export default function CreateListing({ user, onOpenLogin }) {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [dailyRate, setDailyRate] = useState('0');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center bg-white border border-zinc-200 rounded-2xl p-8 space-y-4 my-8 shadow-2xs">
        <h2 className="text-xl font-bold text-zinc-950">Login Required</h2>
        <p className="text-xs text-zinc-500">
          You must be signed in with your campus phone number to list items.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an item title.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let finalImageUrl = null;
      if (imageFile) {
        const uploadRes = await api.uploadItemImage(imageFile);
        finalImageUrl = uploadRes.data.image_url;
      }

      const res = await api.createItem({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        daily_rate: parseFloat(dailyRate) || 0.0,
        image_url: finalImageUrl
      });

      navigate(`/items/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish listing. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Cancel & Return
      </button>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-2xs space-y-6">
        <div>
          <h1 className="text-2xl font-black text-zinc-950">Post Item for Rent or Borrow</h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Share utilities, academic equipment, or tools with your campus hostel peers
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Photo Upload Area */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5">
              Item Photo (EXIF metadata stripped automatically)
            </label>
            <div className="relative border-2 border-dashed border-zinc-300 hover:border-zinc-950 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-zinc-50">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {imagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-xl shadow-xs ring-1 ring-zinc-300"
                  />
                  <span className="text-xs text-zinc-800 font-semibold font-mono">Click to change photo</span>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-zinc-400">
                  <Upload className="w-7 h-7 mb-2 text-zinc-400 stroke-[1.5]" />
                  <span className="text-xs text-zinc-700 font-semibold">Upload clear photo of item</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-mono">PNG, JPG, or WEBP</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5">
              Item Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio Scientific Calculator FX-991CW"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              required
            />
          </div>

          {/* Category & Daily Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-800">
                  Daily Rental Rate (₹) *
                </label>
                <button
                  type="button"
                  onClick={() => setDailyRate('0')}
                  className="text-[11px] text-zinc-700 font-mono font-bold hover:underline"
                >
                  Set Free Borrow (₹0)
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 text-sm font-bold font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs sm:text-sm font-mono text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                Enter 0 for free community borrowing, or daily charge.
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mention accessories, working condition, or return rules..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !title.trim()}
            className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-lime-400" />
            <span>{uploading ? 'Publishing Listing...' : 'Publish Listing to Catalog'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

