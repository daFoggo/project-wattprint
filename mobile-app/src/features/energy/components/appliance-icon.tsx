import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export interface ApplianceIconProps {
  name: string;
  id?: string;
  size?: number;
  color?: string;
}

export function ApplianceIcon({
  name = '',
  id = '',
  size = 20,
  color = '#164437',
}: ApplianceIconProps) {
  const cleanName = name.toLowerCase().trim();
  const cleanId = id.toLowerCase().trim();

  // 1. Tủ lạnh (Refrigerator) - check before general AC to avoid "lạnh" collision
  if (
    cleanName.includes('tủ lạnh') ||
    cleanName.includes('tu lanh') ||
    cleanName.includes('fridge') ||
    cleanName.includes('refrigerator') ||
    cleanId === 'fridge'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Fridge outer frame */}
        <Rect
          x="5"
          y="2"
          width="14"
          height="20"
          rx="2.5"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Freezer divider line */}
        <Line
          x1="5"
          y1="9.5"
          x2="19"
          y2="9.5"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Top freezer door handle */}
        <Line
          x1="8"
          y1="5"
          x2="8"
          y2="7.5"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Main bottom door handle */}
        <Line
          x1="8"
          y1="12"
          x2="8"
          y2="16"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  // 2. Bình nóng lạnh (Water Heater / Boiler) - check before AC
  if (
    cleanName.includes('nóng lạnh') ||
    cleanName.includes('nong lanh') ||
    cleanName.includes('bình nước') ||
    cleanName.includes('nước nóng') ||
    cleanName.includes('heater') ||
    cleanName.includes('boiler') ||
    cleanId === 'water-heater'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Tank cylinder */}
        <Rect
          x="6"
          y="3"
          width="12"
          height="18"
          rx="6"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Water droplet core */}
        <Path
          d="M12 7C12 7 9.5 10.5 9.5 12.5C9.5 13.88 10.62 15 12 15C13.38 15 14.5 13.88 14.5 12.5C14.5 10.5 12 7 12 7Z"
          fill={color}
        />
        {/* Temperature gauge bars */}
        <Line x1="10" y1="18" x2="14" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    );
  }

  // 3. Điều hòa / Máy lạnh (Air Conditioner / HVAC)
  if (
    cleanName.includes('điều hòa') ||
    cleanName.includes('dieu hoa') ||
    cleanName.includes('máy lạnh') ||
    cleanName.includes('may lanh') ||
    cleanName.includes('aircon') ||
    cleanName.includes('air con') ||
    cleanName.includes('hvac') ||
    cleanId === 'ac'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Indoor AC Unit body */}
        <Rect
          x="2.5"
          y="4"
          width="19"
          height="10"
          rx="2"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Front horizontal airflow slot */}
        <Line
          x1="6"
          y1="10.5"
          x2="18"
          y2="10.5"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Cool breeze waves */}
        <Path
          d="M6 18C7.5 17 8.5 17 10 18"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M14 18C15.5 17 16.5 17 18 18"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M10 21C11 20 13 20 14 21"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  // 4. Bếp từ / Nấu ăn (Induction Stove / Cooktop)
  if (
    cleanName.includes('bếp') ||
    cleanName.includes('bep') ||
    cleanName.includes('nấu') ||
    cleanName.includes('cook') ||
    cleanName.includes('stove') ||
    cleanName.includes('induction') ||
    cleanId === 'induction'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Cooktop glass surface */}
        <Rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2.5"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Left induction burner ring */}
        <Circle cx="8.5" cy="12" r="3.2" stroke={color} strokeWidth="1.6" />
        <Circle cx="8.5" cy="12" r="1.2" fill={color} />
        {/* Right induction burner ring */}
        <Circle cx="15.5" cy="12" r="3.2" stroke={color} strokeWidth="1.6" />
        <Circle cx="15.5" cy="12" r="1.2" fill={color} />
      </Svg>
    );
  }

  // 5. Chạy ngầm (Standby Power / Idle draw)
  if (
    cleanName.includes('chạy ngầm') ||
    cleanName.includes('chay ngam') ||
    cleanName.includes('ngầm') ||
    cleanName.includes('standby') ||
    cleanName.includes('idle') ||
    cleanId === 'standby'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* International Standby Power Icon (⏻) */}
        <Path
          d="M16.24 7.76A6 6 0 1 1 7.76 7.76"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Line
          x1="12"
          y1="4"
          x2="12"
          y2="11"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  // 6. Xe điện / Ô tô (Electric Vehicle / Car) - strict match to avoid 'dev' in id
  if (
    cleanName.includes('xe điện') ||
    cleanName.includes('xe dien') ||
    cleanName.includes('ô tô') ||
    cleanName.includes('o to') ||
    cleanId === 'ev' ||
    cleanId === 'car'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 14L6 8H18L20 14V18C20 18.55 19.55 19 19 19H18C17.45 19 17 18.55 17 18V17H7V18C7 18.55 6.55 19 6 19H5C4.45 19 4 18.55 4 18V14Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <Circle cx="7.5" cy="14" r="1.5" fill={color} />
        <Circle cx="16.5" cy="14" r="1.5" fill={color} />
        <Line x1="7" y1="10.5" x2="17" y2="10.5" stroke={color} strokeWidth="1.5" />
      </Svg>
    );
  }

  // 7. Máy giặt (Washing machine)
  if (
    cleanName.includes('máy giặt') ||
    cleanName.includes('may giat') ||
    cleanName.includes('giặt') ||
    cleanName.includes('washer') ||
    cleanId === 'washer'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2.5"
          stroke={color}
          strokeWidth="1.8"
        />
        <Circle cx="12" cy="13" r="4.5" stroke={color} strokeWidth="1.8" />
        <Circle cx="12" cy="13" r="2" fill={color} />
        <Circle cx="7.5" cy="6" r="1" fill={color} />
        <Line x1="11" y1="6" x2="16.5" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    );
  }

  // 8. TV / Màn hình (Display / Screens)
  if (
    cleanName.includes('tivi') ||
    cleanName.includes('tv') ||
    cleanName.includes('màn hình') ||
    cleanName.includes('screen') ||
    cleanId === 'tv'
  ) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
          x="3"
          y="4"
          width="18"
          height="12"
          rx="2"
          stroke={color}
          strokeWidth="1.8"
        />
        <Line x1="12" y1="16" x2="12" y2="19" stroke={color} strokeWidth="1.8" />
        <Line x1="8" y1="19" x2="16" y2="19" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }

  // 9. Default / Thiết bị khác (Standby / Others: clean 3-dots)
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="12" r="2" fill={color} />
      <Circle cx="12" cy="12" r="2" fill={color} />
      <Circle cx="18" cy="12" r="2" fill={color} />
    </Svg>
  );
}
