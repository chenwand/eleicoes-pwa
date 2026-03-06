import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-14.0, -52.0],
      zoom: 4,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      });

      circle.bindPopup(`
        <div style="min-width: 150px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${region.regionName}</h3>
          <p><strong>Líder:</strong> ${leader?.name || 'N/A'}</p>
          <p><strong>Votos:</strong> ${region.totalVotes.toLocaleString('pt-BR')}</p>
          <p><strong>Porcentagem:</strong> ${leader?.percentage.toFixed(1) || 0}%</p>
          <p><strong>Totalizado:</strong> ${region.percentageTotalized.toFixed(1)}%</p>
        </div>
      `);

      if (onRegionClick) {
        circle.on('click', () => onRegionClick(region.region));
      }

      circle.addTo(map);
    });
  }, [regions, onRegionClick]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div ref={containerRef} style={{ height: '400px', width: '100%' }} />
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {regions.map((region) => {
            const leader = region.candidates[0];
            return (
              <div key={region.region} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: candidateColors[leader?.candidateId % 5] || '#999' }}
                />
                <span className="text-sm">{region.regionName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
