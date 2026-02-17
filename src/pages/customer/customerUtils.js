export const isOlderThan48Hours = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffHours = (now - created) / (1000 * 60 * 60);
    return diffHours >= 48;
};

export const getStatusBadge = (feedback, t) => {
    const isOld = isOlderThan48Hours(feedback.created_at);
    if (feedback.status === 'resolved' || feedback.status === 'auto_resolved' || isOld) {
        return { label: t.resolved, color: 'green', icon: '✅' };
    }
    if (feedback.status === 'viewed' || feedback.status === 'in_progress') {
        return { label: t.reviewing, color: 'orange', icon: '👀' };
    }
    return { label: t.delivered, color: 'blue', icon: '📬' };
};

export const formatDate = (dateString, language) => {
    if (!dateString) return '';
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
};

export const extractCoordsFromMapsUrl = (url) => {
    if (!url) return null;
    try {
        // Google Maps URL patterns
        const qMatch = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

        const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        const placeMatch = url.match(/\/place\/[^/]+\/@([0-9.-]+),([0-9.-]+)/);
        if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

        // ll= pattern (common in Google Maps)
        const llMatch = url.match(/[?&]ll=([0-9.-]+),([0-9.-]+)/);
        if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

        return null;
    } catch (e) {
        return null;
    }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const getBranchCoords = (branch) => {
    // Try google_review_url first (as per Supabase schema)
    const urlCoords = extractCoordsFromMapsUrl(branch.google_review_url || branch.google_maps_url || branch.map_url);
    if (urlCoords) return urlCoords;
    if (branch.latitude && branch.longitude) {
        return { lat: branch.latitude, lng: branch.longitude };
    }
    return null;
};
