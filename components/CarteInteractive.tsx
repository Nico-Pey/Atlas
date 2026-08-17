import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import type { Pool } from '../engine/srs';
import { colors } from './theme';

/**
 * Carte cliquable d'une région, département par département.
 *
 * IMPORTANT — simplification assumée : ce ne sont PAS les tracés
 * géographiques réels des départements. Aucune source de données
 * cartographiques (topoJSON, tracés SVG officiels) n'était accessible
 * pour cette V1. Chaque département est donc une forme schématique
 * (rectangle arrondi) positionnée pour respecter grossièrement sa position
 * relative réelle (ouest/est, nord/sud) — assez pour rendre la carte
 * lisible et cliquable, pas pour représenter des frontières exactes.
 *
 * Remplacer par de vrais tracés SVG plus tard ne demande de toucher QUE ce
 * fichier : les écrans appelants passent juste un `mapId` (code INSEE, voir
 * .claude/skills/format-contenu/) et ne connaissent pas la forme utilisée.
 */

interface DepartmentShape {
  mapId: string;
  /** Centre et taille du rectangle, dans le repère du viewBox ci-dessous. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Positions approximatives des 12 départements de Nouvelle-Aquitaine. */
const DEPARTMENTS: DepartmentShape[] = [
  { mapId: '79', x: 90, y: 30, width: 70, height: 55 }, // Deux-Sèvres
  { mapId: '86', x: 190, y: 20, width: 70, height: 60 }, // Vienne
  { mapId: '23', x: 252, y: 70, width: 55, height: 55 }, // Creuse
  { mapId: '17', x: 40, y: 110, width: 65, height: 70 }, // Charente-Maritime
  { mapId: '16', x: 150, y: 110, width: 65, height: 60 }, // Charente
  { mapId: '87', x: 242, y: 140, width: 60, height: 60 }, // Haute-Vienne
  { mapId: '24', x: 176, y: 195, width: 75, height: 70 }, // Dordogne
  { mapId: '19', x: 270, y: 210, width: 60, height: 65 }, // Corrèze
  { mapId: '33', x: 60, y: 220, width: 90, height: 95 }, // Gironde
  { mapId: '47', x: 190, y: 280, width: 65, height: 55 }, // Lot-et-Garonne
  { mapId: '40', x: 70, y: 310, width: 75, height: 80 }, // Landes
  { mapId: '64', x: 60, y: 390, width: 70, height: 55 }, // Pyrénées-Atlantiques
];

const VIEW_BOX_WIDTH = 320;
const VIEW_BOX_HEIGHT = 420;

export type DepartmentStatus = Pool | 'non_vue';

interface CarteInteractiveProps {
  /** Statut de chaque département, par mapId (code INSEE). */
  status: Record<string, DepartmentStatus>;
  /** mapId actuellement sélectionné, pour le mettre en évidence. */
  selectedMapId?: string | null;
  onSelect: (mapId: string) => void;
}

/**
 * Une seule teinte (l'accent d'Atlas), dont l'opacité augmente avec la
 * maîtrise de la carte : lisible sans dépendre de rouge/vert (accessibilité
 * daltonisme, voir .claude/skills/conventions-ui/).
 */
const OPACITY_BY_STATUS: Record<DepartmentStatus, number> = {
  non_vue: 0,
  nouvelle: 0.25,
  en_cours: 0.55,
  connue: 1,
};

export default function CarteInteractive({ status, selectedMapId, onSelect }: CarteInteractiveProps) {
  return (
    <Svg
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      style={{ width: '100%', aspectRatio: VIEW_BOX_WIDTH / VIEW_BOX_HEIGHT }}
    >
      {DEPARTMENTS.map((dep) => {
        const depStatus = status[dep.mapId] ?? 'non_vue';
        const opacity = OPACITY_BY_STATUS[depStatus];
        const isSelected = dep.mapId === selectedMapId;
        // Texte lisible : blanc une fois le fond assez foncé, sombre sinon.
        const textColor = opacity >= 0.55 ? '#FFFFFF' : colors.text;

        // Fond neutre plein pour "non vue" (une opacité 0 sur colors.accent
        // laisserait transparaître le fond de l'écran, illisible).
        const fill = depStatus === 'non_vue' ? colors.surface : colors.accent;
        const fillOpacity = depStatus === 'non_vue' ? 1 : opacity;

        return (
          <G key={dep.mapId} onPress={() => onSelect(dep.mapId)}>
            <Rect
              x={dep.x - dep.width / 2}
              y={dep.y - dep.height / 2}
              width={dep.width}
              height={dep.height}
              rx={10}
              fill={fill}
              fillOpacity={fillOpacity}
              stroke={isSelected ? colors.accent : colors.separator}
              strokeWidth={isSelected ? 3 : 1}
            />
            <SvgText
              x={dep.x}
              y={dep.y + 4}
              fontSize={13}
              fontWeight="600"
              fill={depStatus === 'non_vue' ? colors.textMuted : textColor}
              textAnchor="middle"
            >
              {dep.mapId}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
