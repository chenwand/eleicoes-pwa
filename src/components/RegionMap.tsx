import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';
import type { RegionData } from '../types/election';

interface RegionMapProps {
  regions: RegionData[];
  onRegionClick?: (region: string) => void;
}

const regionCoords: Record<string, [number, number]> = {
  norte: [-3.5, -62.0],
  nordeste: [-8.0, -39.0],
  sudeste: [-18.0, -44.0],
  sul: [-27.0, -50.0],
  'centro-oeste': [-15.0, -52.0],
  exterior: [-15.0, -47.0]
};

const candidateColors: Record<number, string> = {
  1: '#e74c3c',
  2: '#3498db',
  3: '#2ecc71',
  4: '#f39c12',
  5: '#9b59b6',
};

export function RegionMap({ regions, onRegionClick }: RegionMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-14.0, -52.0],
      zoom: 4,
      zoomControl: false
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl = theme === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = theme === 'dark'
      ? '© OpenStreetMap contributors © CARTO'
      : '© OpenStreetMap contributors';

    tileLayerRef.current = L.tileLayer(tileUrl, { attribution }).addTo(mapRef.current);
  }, [theme]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    regions.forEach((region) => {
      const leader = region.candidates[0];
      const color = leader ? candidateColors[leader.candidateId % 5] || '#666' : '#999';
      const radius = Math.max(20, Math.min(50, region.totalVotes / 1000000));

      const circle = L.circleMarker(regionCoords[region.region] || [-14, -52], {
        radius,
        fillColor: color,
        color: theme === 'dark' ? '#1e293b' : '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      });

      const popupContent = `
        <div class="dark-popup" style="min-width: 150px; color: ${theme === 'dark' ? '#f9fafb' : '#111827'};">
          <h3 style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}; padding-bottom: 4px;">${region.regionName}</h3>
          <p style="margin: 4px 0;"><strong>Líder:</strong> ${leader?.name || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Votos:</strong> ${region.totalVotes.toLocaleString('pt-BR')}</p>
          <p style="margin: 4px 0;"><strong>Porcentagem:</strong> ${leader?.percentage.toFixed(1) || 0}%</p>
          <p style="margin: 4px 0;"><strong>Totalizado:</strong> ${region.percentageTotalized.toFixed(1)}%</p>
        </div>
      `;

      circle.bindPopup(popupContent, {
        className: theme === 'dark' ? 'leaflet-dark-popup' : ''
      });

      if (onRegionClick) {
        circle.on('click', () => onRegionClick(region.region));
      }

      circle.addTo(map);
    });
  }, [regions, onRegionClick, theme]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden dark:border dark:border-slate-800 transition-colors duration-300">
      <div ref={containerRef} style={{ height: '400px', width: '100%', zIndex: 1 }} />
      <div className="p-4 bg-gray-50 dark:bg-slate-800/30 border-t dark:border-slate-800">
        <div className="flex flex-wrap gap-4">
          {regions.map((region) => {
            const leader = region.candidates[0];
            return (
              <div key={region.region} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: candidateColors[leader?.candidateId % 5] || '#999' }}
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{region.regionName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
