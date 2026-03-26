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
      <header className="bg-[#fdf8f0] border-b border-stone-200/70 shadow-[0_1px_6px_rgba(0,0,0,0.05)] no-print">
        {/* Deep red top stripe */}
        <div className="h-1.5 bg-primary-700" style={{ paddingTop: 'env(safe-area-inset-top)' }} />

        {/* App title bar */}
        <div className="max-w-7xl mx-auto px-4 pt-2.5 pb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-3xl sm:text-4xl opacity-90">🍽️</span>
            <div>
              <h1 className="font-display text-xl sm:text-3xl font-bold text-primary-800 leading-tight tracking-tight">
                Patty's Recipe Box
              </h1>
              <p className="hidden sm:block text-stone-400 text-sm italic leading-none mt-0.5">
                Family favorites, all in one place
              </p>
            </div>
          </div>

          {/* Selected recipes indicator — desktop only */}
          {selectedRecipesCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-primary-50 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium">
              {selectedRecipesCount} recipe{selectedRecipesCount !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* ── Desktop tab navigation (sm+) ── */}
        <nav className="hidden sm:block max-w-7xl mx-auto px-4 pb-2.5 pt-0.5">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const badge = tab.id === 'shopping' ? shoppingListCount : undefined;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${isActive
                      ? 'bg-primary-600/90 text-white shadow-sm'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                    }
                  `}
                >
                  <span className={`text-base transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={`
                      text-xs font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1
                      ${isActive ? 'bg-white/25 text-white' : 'bg-primary-100 text-primary-600'}
                    `}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 no-print
                   bg-white/95 backdrop-blur-sm border-t border-stone-200 flex"
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
                transition-colors duration-150 min-h-[56px] relative
                ${isActive ? 'text-primary-700' : 'text-stone-400'}
              `}
            >
              <span className={`relative text-2xl leading-none transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                {tab.icon}
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-semibold leading-none transition-colors duration-150 ${isActive ? 'text-primary-700' : 'text-stone-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
