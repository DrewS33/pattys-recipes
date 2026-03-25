// ============================================================
// Navigation: compact header + bottom tab bar on mobile,
//             full header + top tabs on desktop (sm+)
// ============================================================

interface NavigationProps {
  activeTab: 'recipes' | 'shopping' | 'favorites' | 'planner';
  onTabChange: (tab: 'recipes' | 'shopping' | 'favorites' | 'planner') => void;
  shoppingListCount: number;
  selectedRecipesCount: number;
}

const tabs = [
  { id: 'recipes' as const, label: 'Recipes', icon: '📖' },
  { id: 'planner' as const, label: 'Planner', icon: '📅' },
  { id: 'shopping' as const, label: 'Shopping', icon: '🛒' },
  { id: 'favorites' as const, label: 'Favorites', icon: '⭐' },
];

export default function Navigation({
  activeTab,
  onTabChange,
  shoppingListCount,
  selectedRecipesCount,
}: NavigationProps) {
  return (
    <>
      {/* ── Top header ── */}
      <header className="bg-[#fdf8f0] border-b-2 border-primary-800 shadow-sm no-print">
        {/* Deep red top stripe */}
        <div className="h-2 bg-primary-700" style={{ paddingTop: 'env(safe-area-inset-top)' }} />

        {/* Ornamental divider — hidden on mobile to save space */}
        <div className="hidden sm:flex items-center gap-3 px-6 py-2 border-b border-primary-200">
          <div className="flex-1 border-t border-primary-300" />
          <span className="text-primary-400 text-sm tracking-[0.4em] select-none">✦ ✦ ✦</span>
          <div className="flex-1 border-t border-primary-300" />
        </div>

        {/* App title bar */}
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-2 sm:pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl">🍽️</span>
            <div>
              <h1 className="font-display text-xl sm:text-3xl font-bold text-primary-800 leading-tight tracking-tight">
                Patty's Recipe Box
              </h1>
              <p className="hidden sm:block text-stone-500 text-sm italic leading-none mt-0.5">
                Ricette di famiglia — family favorites, all in one place
              </p>
            </div>
          </div>

          {/* Selected recipes indicator — desktop only */}
          {selectedRecipesCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-primary-100 text-primary-800 rounded-full px-4 py-1.5 text-sm font-semibold border border-primary-200">
              {selectedRecipesCount} recipe{selectedRecipesCount !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* ── Desktop tab navigation (sm+) ── */}
        <nav className="hidden sm:block max-w-7xl mx-auto px-4 pb-3">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const badge = tab.id === 'shopping' ? shoppingListCount : undefined;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold
                    transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-primary-700 text-white shadow-md'
                      : 'text-stone-600 hover:bg-primary-50 hover:text-primary-800'
                    }
                  `}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={`
                      text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1
                      ${activeTab === tab.id
                        ? 'bg-white/30 text-white'
                        : 'bg-primary-100 text-primary-700'
                      }
                    `}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom ornamental divider — desktop only */}
        <div className="hidden sm:flex items-center gap-3 px-6 py-1 border-t border-primary-200">
          <div className="flex-1 border-t border-primary-200" />
          <span className="text-primary-300 text-xs tracking-[0.6em] select-none">· · ·</span>
          <div className="flex-1 border-t border-primary-200" />
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 no-print
                   bg-white border-t-2 border-primary-800 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map((tab) => {
          const badge = tab.id === 'shopping' ? shoppingListCount : undefined;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5
                transition-colors duration-150 min-h-[56px]
                ${isActive ? 'text-primary-700' : 'text-stone-400'}
              `}
            >
              <span className="relative text-2xl leading-none">
                {tab.icon}
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-primary-700' : 'text-stone-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-700 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
