import React from 'react';
import { ShoppingBag, UtensilsCrossed, Package, BarChart3, Settings, Lock } from 'lucide-react';
import { UserRole } from '../types';

export type NavTab = 'kasir' | 'menu' | 'stok' | 'laporan' | 'setting';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  lowStockCount: number;
  currentRole: UserRole;
  onRequireAdmin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  lowStockCount,
  currentRole,
  onRequireAdmin,
}) => {
  const tabs = [
    {
      id: 'kasir' as NavTab,
      label: 'Kasir',
      icon: ShoppingBag,
      requiresAdmin: false,
    },
    {
      id: 'menu' as NavTab,
      label: 'Menu',
      icon: UtensilsCrossed,
      requiresAdmin: false,
    },
    {
      id: 'stok' as NavTab,
      label: 'Stok',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      requiresAdmin: false,
    },
    {
      id: 'laporan' as NavTab,
      label: 'Laporan',
      icon: BarChart3,
      requiresAdmin: true,
    },
    {
      id: 'setting' as NavTab,
      label: 'Setting',
      icon: Settings,
      requiresAdmin: true,
    },
  ];

  const handleTabClick = (tabId: NavTab, requiresAdmin: boolean) => {
    if (requiresAdmin && currentRole !== 'admin') {
      onRequireAdmin();
      return;
    }
    onChangeTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-zinc-800 safe-bottom select-none">
      <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isLocked = tab.requiresAdmin && currentRole !== 'admin';
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.requiresAdmin)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-1 py-1 transition-all active:scale-95 ${
                isActive ? 'text-[#F97316]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Active Tab indicator dot */}
              {isActive && (
                <span className="absolute top-1 w-6 h-1 bg-[#F97316] rounded-full" />
              )}

              <div className="relative mt-1">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />

                {/* Low stock badge */}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 bg-[#DC2626] text-white text-[10px] font-black rounded-full px-1 flex items-center justify-center ring-2 ring-[#111111]">
                    {tab.badge}
                  </span>
                )}

                {/* Admin lock badge */}
                {isLocked && (
                  <span className="absolute -bottom-1 -right-1.5 w-3.5 h-3.5 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center ring-1 ring-zinc-700">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              <span className={`text-[11px] mt-0.5 tracking-tight font-medium ${
                isActive ? 'font-bold text-[#F97316]' : 'text-zinc-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
