"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";
import InfinityLoader from "@/components/InfinityLoader";
import { modelLoader } from "@/lib/modelLoader";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";

interface FoodItem {
  id: string;
  slug: string;
  title: string;
  price: string;
  image: string;
  category: string;
  veg: boolean;
  is4d: boolean;
  modelFolder?: string;
  modelSmallUrl?: string;
  modelOptimizedUrl?: string;
  description: string;
  longDescription: string;
  rating: string;
  time: string;
  nutrition: {
    calories: string;
    protein: string;
    carbs: string;
  };
  ingredients: {
    emoji: string;
    name: string;
  }[];
  reviews: {
    name: string;
    rating: number;
    text: string;
  }[];
  relatedSlugs: string[];
}

export default function ItemClient({ slug }: { slug: string }) {
  const [allItems, setAllItems] = useState<FoodItem[]>([]);
  const [item, setItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [localReviews, setLocalReviews] = useState<{name: string; rating: number; text: string}[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [currency, setCurrencyState] = useState<CurrencyMeta | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrencyState(getCurrency());
    const onCur = () => setCurrencyState(getCurrency());
    window.addEventListener("lfh:currency-changed", onCur);
    return () => window.removeEventListener("lfh:currency-changed", onCur);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const read = () => setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  
  const colorMap = {
    '🧀': [
      { bg: 'rgba(255, 215, 0, 0.15)', border: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)' },
      { bg: 'rgba(255, 223, 128, 0.15)', border: '#FFDF80', glow: 'rgba(255, 223, 128, 0.4)' }
    ],
    '🥬': [
      { bg: 'rgba(34, 197, 94, 0.15)', border: '#22C55E', glow: 'rgba(34, 197, 94, 0.4)' },
      { bg: 'rgba(74, 222, 128, 0.15)', border: '#4ADE80', glow: 'rgba(74, 222, 128, 0.4)' }
    ],
    '🍅': [
      { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' },
      { bg: 'rgba(248, 113, 113, 0.15)', border: '#F87171', glow: 'rgba(248, 113, 113, 0.4)' }
    ],
    '🧂': [
      { bg: 'rgba(148, 163, 184, 0.15)', border: '#94A3B8', glow: 'rgba(148, 163, 184, 0.4)' },
      { bg: 'rgba(203, 213, 225, 0.15)', border: '#CBD5E1', glow: 'rgba(203, 213, 225, 0.4)' }
    ],
    '🌿': [
      { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
      { bg: 'rgba(52, 211, 153, 0.15)', border: '#34D399', glow: 'rgba(52, 211, 153, 0.4)' }
    ],
    '🥖': [
      { bg: 'rgba(217, 119, 6, 0.15)', border: '#D97706', glow: 'rgba(217, 119, 6, 0.4)' },
      { bg: 'rgba(251, 146, 60, 0.15)', border: '#FB923C', glow: 'rgba(251, 146, 60, 0.4)' }
    ],
    '🫒': [
      { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
      { bg: 'rgba(52, 211, 153, 0.15)', border: '#34D399', glow: 'rgba(52, 211, 153, 0.4)' }
    ],
    '🍞': [
      { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
      { bg: 'rgba(251, 191, 36, 0.15)', border: '#FBBF24', glow: 'rgba(251, 191, 36, 0.4)' }
    ],
    '🐟': [
      { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)' },
      { bg: 'rgba(96, 165, 250, 0.15)', border: '#60A5FA', glow: 'rgba(96, 165, 250, 0.4)' }
    ],
    '🍣': [
      { bg: 'rgba(236, 72, 153, 0.15)', border: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)' },
      { bg: 'rgba(244, 114, 182, 0.15)', border: '#F472B6', glow: 'rgba(244, 114, 182, 0.4)' }
    ],
    '🍚': [
      { bg: 'rgba(250, 250, 250, 0.15)', border: '#F3F4F6', glow: 'rgba(250, 250, 250, 0.4)', lightBorder: '#374151', lightText: '#111827' },
      { bg: 'rgba(249, 250, 251, 0.15)', border: '#E5E7EB', glow: 'rgba(249, 250, 251, 0.4)', lightBorder: '#4B5563', lightText: '#1F2937' }
    ],
    '🌱': [
      { bg: 'rgba(34, 197, 94, 0.15)', border: '#22C55E', glow: 'rgba(34, 197, 94, 0.4)' },
      { bg: 'rgba(74, 222, 128, 0.15)', border: '#4ADE80', glow: 'rgba(74, 222, 128, 0.4)' }
    ],
    '🥢': [
      { bg: 'rgba(139, 90, 43, 0.15)', border: '#8B5A2B', glow: 'rgba(139, 90, 43, 0.4)' },
      { bg: 'rgba(168, 85, 247, 0.15)', border: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)' }
    ],
    '🧈': [
      { bg: 'rgba(250, 204, 21, 0.15)', border: '#FACC15', glow: 'rgba(250, 204, 21, 0.4)' },
      { bg: 'rgba(253, 224, 71, 0.15)', border: '#FDE047', glow: 'rgba(253, 224, 71, 0.4)' }
    ],
    '🥓': [
      { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' },
      { bg: 'rgba(248, 113, 113, 0.15)', border: '#F87171', glow: 'rgba(248, 113, 113, 0.4)' }
    ],
    '🥚': [
      { bg: 'rgba(250, 250, 250, 0.15)', border: '#F3F4F6', glow: 'rgba(250, 250, 250, 0.4)', lightBorder: '#374151', lightText: '#111827' },
      { bg: 'rgba(249, 250, 251, 0.15)', border: '#E5E7EB', glow: 'rgba(249, 250, 251, 0.4)', lightBorder: '#4B5563', lightText: '#1F2937' }
    ],
    '🌶️': [
      { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' },
      { bg: 'rgba(248, 113, 113, 0.15)', border: '#F87171', glow: 'rgba(248, 113, 113, 0.4)' }
    ],
    '🍝': [
      { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
      { bg: 'rgba(251, 191, 36, 0.15)', border: '#FBBF24', glow: 'rgba(251, 191, 36, 0.4)' }
    ],
    '🧄': [
      { bg: 'rgba(250, 250, 250, 0.15)', border: '#F3F4F6', glow: 'rgba(250, 250, 250, 0.4)', lightBorder: '#374151', lightText: '#111827' },
      { bg: 'rgba(249, 250, 251, 0.15)', border: '#E5E7EB', glow: 'rgba(249, 250, 251, 0.4)', lightBorder: '#4B5563', lightText: '#1F2937' }
    ],
    '🥩': [
      { bg: 'rgba(185, 28, 28, 0.15)', border: '#B91C1C', glow: 'rgba(185, 28, 28, 0.4)' },
      { bg: 'rgba(220, 38, 38, 0.15)', border: '#DC2626', glow: 'rgba(220, 38, 38, 0.4)' }
    ],
    '🧅': [
      { bg: 'rgba(250, 250, 250, 0.15)', border: '#F3F4F6', glow: 'rgba(250, 250, 250, 0.4)', lightBorder: '#374151', lightText: '#111827' },
      { bg: 'rgba(249, 250, 251, 0.15)', border: '#E5E7EB', glow: 'rgba(249, 250, 251, 0.4)', lightBorder: '#4B5563', lightText: '#1F2937' }
    ],
    '🌮': [
      { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
      { bg: 'rgba(251, 191, 36, 0.15)', border: '#FBBF24', glow: 'rgba(251, 191, 36, 0.4)' }
    ],
    '🍋': [
      { bg: 'rgba(250, 204, 21, 0.15)', border: '#FACC15', glow: 'rgba(250, 204, 21, 0.4)' },
      { bg: 'rgba(253, 224, 71, 0.15)', border: '#FDE047', glow: 'rgba(253, 224, 71, 0.4)' }
    ]
  };
  
  const emojiIndexMap: Record<string, number> = {};
  
  const goToViewer = () => {
    if (item?.is4d && item?.modelFolder) {
      router.push(`/view/${item.modelFolder}?from=${encodeURIComponent(item.slug)}`);
    }
  };
  
  const goToMenu = () => router.push("/menu");

  useEffect(() => {
    fetch("/content/menu.json")
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data.items || [];
        const normalizedSlug = (slug || "").toLowerCase();

        const found = items.find((item: any) => {
          const itemSlug =
            item.slug ||
            item.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

          return itemSlug?.toLowerCase() === normalizedSlug;
        });

        setAllItems(items);
        setItem(found || null);
        setLocalReviews(found?.reviews || []);
        setLoading(false);
        setTimeout(() => setImageLoaded(true), 50);

        // Load favorite state
        try {
          const savedFavorites = localStorage.getItem('lfh-favorites');
          if (savedFavorites) {
            const favorites = JSON.parse(savedFavorites);
            setFavorited(favorites.includes(found?.id));
          }
        } catch (e) {
          console.error('Failed to load favorites', e);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!item?.is4d) return;
    const urls: string[] = [];
    if (item.modelSmallUrl) urls.push(item.modelSmallUrl);
    if (item.modelOptimizedUrl) urls.push(item.modelOptimizedUrl);
    if (urls.length) modelLoader.prioritize(urls);
  }, [item]);

  const getReviewCount = () => {
    if (!item) return 12;
    return localReviews.length;
  };

  const getRelatedItems = (): FoodItem[] => {
    if (!item || !allItems.length) return [];
    const others = allItems.filter((it) => it.slug !== item.slug);
    const currentPrice = parseFloat(item.price) || 0;
    const scored = others.map((it) => {
      let score = 0;
      if (it.category === item.category) score += 100;
      if (it.veg === item.veg) score += 30;
      if (it.is4d && item.is4d) score += 10;
      const priceDelta = Math.abs((parseFloat(it.price) || 0) - currentPrice);
      score += Math.max(0, 20 - priceDelta);
      return { item: it, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((s) => s.item);
  };

  const toggleFavorite = () => {
    if (!item) return;
    try {
      let favorites: string[] = [];
      const savedFavorites = localStorage.getItem('lfh-favorites');
      if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
      }
      if (favorited) {
        favorites = favorites.filter(id => id !== item.id);
      } else {
        favorites.push(item.id);
      }
      localStorage.setItem('lfh-favorites', JSON.stringify(favorites));
      setFavorited(!favorited);
    } catch (e) {
      console.error('Failed to update favorites', e);
    }
  };

  const addToCart = () => {
    if (!item) return;
    window.dispatchEvent(
      new CustomEvent("lfh:open-order-confirm", {
        detail: {
          item: {
            id: item.id,
            title: item.title,
            price: item.price,
            image: item.image,
          },
        },
      })
    );
  };

  const submitReview = () => {
    if (!reviewName.trim() || !reviewText.trim() || selectedRating === 0) {
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Please fill all fields and select a rating!" } }));
      return;
    }
    const newReview = {
      name: reviewName.trim(),
      rating: selectedRating,
      text: reviewText.trim()
    };
    setLocalReviews([newReview, ...localReviews]);
    setReviewName("");
    setReviewText("");
    setSelectedRating(0);
    window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Review submitted!" } }));
  };

  if (loading) {
    return (
      <div id="detail-page" className="page active item-detail-page flex items-center justify-center min-h-screen">
        <InfinityLoader label="Plating your dish" />
      </div>
    );
  }

  if (!item) {
    return (
      <div id="detail-page" className="page active item-detail-page flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Item not found</h2>
        <p className="text-[var(--muted)] mb-4">The item you're looking for doesn't exist.</p>
        <Link href="/menu" className="text-[var(--accent)] font-semibold hover:underline">
          ← Back to Menu
        </Link>
      </div>
    );
  }

  const rating = parseFloat(item.rating);
  const reviewCount = getReviewCount();
  const relatedItems = getRelatedItems();

  return (
    <div id="detail-page" className="page active item-detail-page">
      {(() => {
        if (!allItems.length || !item) return null;
        const siblings = allItems.filter((it) => it.category === item.category);
        const idx = siblings.findIndex((it) => it.slug === item.slug);
        if (idx < 0 || siblings.length < 2) return null;
        const prev = siblings[(idx - 1 + siblings.length) % siblings.length];
        const next = siblings[(idx + 1) % siblings.length];
        return (
          <>
            <Link
              href={`/item/${prev.slug}`}
              className="dish-nav dish-nav-prev"
              aria-label={`Previous: ${prev.title}`}
              title={prev.title}
            >
              <i className="fas fa-chevron-left"></i>
            </Link>
            <Link
              href={`/item/${next.slug}`}
              className="dish-nav dish-nav-next"
              aria-label={`Next: ${next.title}`}
              title={next.title}
            >
              <i className="fas fa-chevron-right"></i>
            </Link>
          </>
        );
      })()}

      <div className="nav" style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', borderBottom: 'none', zIndex: 51 }}>
        <Link href="/menu" className="nav-btn" style={{ textDecoration: 'none' }}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div style={{ flex: 1 }}></div>
        <button id="detail-fav" className="nav-btn" onClick={toggleFavorite}>
          <i className={`${favorited ? 'fas' : 'far'} fa-heart`} style={{ color: favorited ? '#ef4444' : '' }}></i>
        </button>
      </div>

      <div className="detail-visual">
        <img
          id="detail-img"
          className={`detail-img ${imageLoaded ? 'show' : ''}`}
          src={item.image}
          alt={item.title}
          decoding="async"
        />
        <div className="detail-img-overlay"></div>
      </div>
      
      <div className="detail-body">
        <h2 id="detail-title" className="detail-title">{item.title}</h2>
        <p className="detail-subtitle" id="detail-subtitle">{item.description}</p>
        <div className="rating-row" id="detail-rating-row">
          <div className="stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="star">{i < Math.round(rating) ? '★' : '☆'}</span>
            ))}
          </div>
          <span className="rating-value">{rating.toFixed(1)}</span>
          <span className="rating-count">({reviewCount} review{reviewCount === 1 ? '' : 's'})</span>
        </div>
        
        <div className="divider"></div>

        <div className="price-row">
          <span className="detail-price" id="detail-price">{currency ? formatPrice(item.price, currency) : `$${item.price}`}</span>
          <span className="price-label">Starting price</span>
        </div>
        
        <div className="stats-row" id="stats-row">
          <div className="stat-box">
            <div className="stat-num">{item.nutrition.calories}</div>
            <div className="stat-label">Cal</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{item.nutrition.protein}</div>
            <div className="stat-label">Protein</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{item.nutrition.carbs}</div>
            <div className="stat-label">Carbs</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{currency ? formatPrice(item.price, currency) : `$${item.price}`}</div>
            <div className="stat-label">Price</div>
          </div>
        </div>

        <div className="section-label">Ingredients</div>
        <div className="ingredients-row" id="tags-row">
          {item.ingredients.map((t, i) => {
            if (!emojiIndexMap[t.emoji]) emojiIndexMap[t.emoji] = 0;
            const colorOptions = colorMap[t.emoji as keyof typeof colorMap] || [{ bg: 'rgba(212, 165, 116, 0.15)', border: '#D4A574', glow: 'rgba(212, 165, 116, 0.4)' }];
            const colors = colorOptions[emojiIndexMap[t.emoji] % colorOptions.length];
            emojiIndexMap[t.emoji]++;
            
            const isLightTheme = theme === 'light';
            let textColor = colors.border;
            let borderColor = colors.border;
            if (isLightTheme && (colors as any).lightBorder && (colors as any).lightText) {
              borderColor = (colors as any).lightBorder;
              textColor = (colors as any).lightText;
            }
            
            return (
              <div
                key={i}
                className="ing-tag"
                style={{
                  background: colors.bg,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  ['--ing-glow' as any]: colors.glow,
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 18px ${colors.glow}`;
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                }}
              >
                {t.emoji} {t.name}
              </div>
            );
          })}
        </div>

        <div className="section-label">About this dish</div>
        <div className="desc-box">
          <p id="detail-desc" className={`detail-desc ${descExpanded ? 'expanded' : ''}`}>
            {item.longDescription}
          </p>
          <span id="desc-toggle" className="desc-toggle" onClick={() => setDescExpanded(!descExpanded)}>
            {descExpanded ? 'Read less ↑' : 'Read more ↓'}
          </span>
        </div>

        <div className="btn-row">
          <button className="btn btn-gold" onClick={addToCart}>
            <i className="fas fa-shopping-bag"></i> Add to Cart
          </button>
          {item.is4d && item.modelFolder ? (
            <button id="view-3d-btn" className="btn btn-cyan" onClick={goToViewer}>
              <i className="fas fa-cube"></i> View in 3D
            </button>
          ) : (
            <button className="btn btn-cyan" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>
              <i className="fas fa-cube"></i> 3D Preview Unavailable
            </button>
          )}
        </div>

        <div className="section-label" style={{ marginTop: '24px' }}>Customer Reviews</div>
        <div className="review-form" id="review-form">
          <div className="form-title">Rate this dish</div>
          <div className="form-top-row">
            <StarRating value={selectedRating} onChange={setSelectedRating} />
          </div>
          <input 
            type="text" 
            className="review-name-input" 
            id="review-name" 
            placeholder="Your name" 
            value={reviewName}
            onChange={(e) => setReviewName(e.target.value)}
          />
          <textarea 
            className="review-textarea" 
            id="review-text" 
            placeholder="Share your thoughts about this dish..." 
            rows={3}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          ></textarea>
          <button className="btn-submit-review" id="submit-review" onClick={submitReview}>Submit Review</button>
        </div>
        <div className="reviews-section" id="reviews-section">
          {localReviews.map((review, i) => (
            <div key={i} className="review-card">
              <div className="review-stars">
                {Array.from({ length: 5 }, (_, j) => (
                  <svg key={j} className={`review-star ${j < review.rating ? '' : 'empty'}`} viewBox="0 0 24 24">
                    <polygon points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8"/>
                  </svg>
                ))}
              </div>
              <div className="review-name">{review.name}</div>
              <div className="review-comment">{review.text}</div>
            </div>
          ))}
        </div>
        
        {relatedItems.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 0 }}>You might also like</div>
            <div className="related-section" id="related-section">
              {relatedItems.map((related) => (
                <Link key={related.slug} href={`/item/${related.slug}`} className="related-card-link" style={{ textDecoration: 'none' }}>
                  <div className="related-card">
                    <img
                      className="related-img"
                      src={related.image}
                      alt={related.title}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="related-name">{related.title}</div>
                    <div className="related-price">{currency ? formatPrice(related.price, currency) : `$${related.price}`}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
        
        <div className="btn-row" style={{ marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={goToMenu}>
            <i className="fas fa-arrow-left"></i> Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
