import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, History, Navigation, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

const BranchSelector = ({ branches, selectedBranch, onSelect, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [recentBranches, setRecentBranches] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);

    // Load recent visits from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('vocalize_recent_branches');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Filter out branches that might have been deleted or don't belong to current business
                const validRecents = parsed.filter(id => branches.some(b => b.id === id));
                setRecentBranches(validRecents);
            }
        } catch (e) {
            console.error("Failed to load recent branches", e);
        }
    }, [branches]);

    // Save selected branch to recent visits
    const handleSelect = (branchId) => {
        onSelect(branchId);
        setIsOpen(false);

        // Update recent branches
        const newRecents = [branchId, ...recentBranches.filter(id => id !== branchId)].slice(0, 3);
        setRecentBranches(newRecents);
        localStorage.setItem('vocalize_recent_branches', JSON.stringify(newRecents));
    };

    // Get user location
    const handleGeolocation = () => {
        setIsLocating(true);
        if (!navigator.geolocation) {
            alert("Tarayıcınız konum servisini desteklemiyor.");
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsLocating(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                setIsLocating(false);
            }
        );
    };

    // Calculate distance (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Filter and sort branches
    const filteredBranches = useMemo(() => {
        let result = branches;

        // Filter by search
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase('tr');
            result = result.filter(b => b.branch_name_tr.toLowerCase('tr').includes(query));
        }

        // Sort by location if available
        if (userLocation) {
            result = [...result].sort((a, b) => {
                // Assuming branches have lat/lng. If not, this won't work perfectly.
                // For now, let's assume branches might have coordinates in metadata or columns.
                // Since schema isn't fully known, we'll skip if no coordinates.
                const distA = (a.latitude && a.longitude) ? calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : Infinity;
                const distB = (b.latitude && b.longitude) ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : Infinity;
                return distA - distB;
            });
        }

        return result;
    }, [branches, searchTerm, userLocation]);

    // Render selected branch display
    const selectedBranchName = branches.find(b => b.id === selectedBranch)?.branch_name_tr || t.branch.placeholder;

    return (
        <div className="relative">
            <label className="text-xs text-slate-400 mb-1 block pl-1">{t.stepsUI.branchLabel}</label>

            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-3 px-3 flex items-center justify-between focus:ring-1 focus:ring-teal-500 transition-all hover:bg-slate-800"
                >
                    <span className={selectedBranch ? "text-white" : "text-slate-400"}>
                        {selectedBranchName}
                    </span>
                    <Search className="h-4 w-4 text-slate-400" />
                </button>
            ) : (
                <div className="bg-slate-900 border border-slate-600 rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Search Header */}
                    <div className="p-2 border-b border-slate-700 flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-400 ml-1" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Şube veya ilçe ara..."
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 text-sm h-9"
                            autoFocus
                        />
                        <button
                            onClick={handleGeolocation}
                            className={cn("p-2 rounded-md transition-colors", isLocating || userLocation ? "text-teal-400 bg-teal-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                            title="Yakınımdakileri Bul"
                        >
                            <Navigation className={cn("h-4 w-4", isLocating && "animate-pulse")} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="max-h-[250px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">

                        {/* Recent Visits */}
                        {!searchTerm && recentBranches.length > 0 && (
                            <div className="mb-2">
                                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <History className="h-3 w-3" /> Son Ziyaretler
                                </div>
                                {recentBranches.map(id => {
                                    const b = branches.find(br => br.id === id);
                                    if (!b) return null;
                                    return (
                                        <button
                                            key={`recent-${b.id}`}
                                            onClick={() => handleSelect(b.id)}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between group",
                                                selectedBranch === b.id ? "bg-teal-500/10 text-teal-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            )}
                                        >
                                            <span className="truncate">{b.branch_name_tr}</span>
                                            {selectedBranch === b.id && <Check className="h-4 w-4 text-teal-500" />}
                                        </button>
                                    );
                                })}
                                <div className="h-px bg-slate-800 my-1 mx-2" />
                            </div>
                        )}

                        {/* All Branches */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {userLocation ? 'Mesafeye Göre' : 'Tüm Şubeler'} ({filteredBranches.length})
                        </div>

                        {filteredBranches.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                Sonuç bulunamadı.
                            </div>
                        ) : (
                            filteredBranches.slice(0, 50).map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => handleSelect(b.id)}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between group",
                                        selectedBranch === b.id ? "bg-teal-500/10 text-teal-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
                                        <span className="truncate">{b.branch_name_tr}</span>
                                    </div>
                                    {selectedBranch === b.id && <Check className="h-4 w-4 text-teal-500" />}
                                </button>
                            ))
                        )}

                        {filteredBranches.length > 50 && (
                            <div className="p-2 text-center text-xs text-slate-500">
                                ve {filteredBranches.length - 50} şube daha...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
};

export default BranchSelector;
