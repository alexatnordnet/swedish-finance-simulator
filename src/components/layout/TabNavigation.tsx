import { PieChart, TrendingUp, BarChart3, LucideIcon } from 'lucide-react';

export type TabId = 'overview' | 'projections' | 'calculations';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Översikt', icon: PieChart },
  { id: 'projections', label: 'Projektioner', icon: TrendingUp },
  { id: 'calculations', label: 'Beräkningar', icon: BarChart3 }
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="mb-6">
      <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}