/**
 * Temporary: Task 32's controls, live, so they can be checked by eye on macOS
 * and iOS. Mounted from SurfacesGallery until the pages exist (Phase H);
 * delete it then.
 */

import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';

const types = [
  { value: 'expense', label: 'Expense' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
] as const;

const ranges = [
  { value: '6M', label: '6M' },
  { value: '12M', label: '12M' },
  { value: '24M', label: '24M' },
] as const;

const accounts = [
  { value: 'dbs', label: 'DBS Multiplier' },
  { value: 'ocbc', label: 'OCBC 360' },
  { value: 'ibkr', label: 'IBKR' },
];

const dot = (color: string) => (
  <Svg width={7} height={7}>
    <Circle cx={3.5} cy={3.5} r={3.5} fill={color} />
  </Svg>
);

const categories = ['Food', 'Transport', 'Shopping', 'Bills'].map(label => ({
  value: label,
  label,
  icon: dot,
}));

const plus = (color: string) => (
  <Svg width={10} height={10}>
    <Path d="M5 0v10M0 5h10" stroke={color} strokeWidth={1.6} />
  </Svg>
);

export function ControlsGallery() {
  const [type, setType] = useState<(typeof types)[number]['value']>('expense');
  const [range, setRange] = useState<(typeof ranges)[number]['value']>('12M');
  const [from, setFrom] = useState('dbs');
  const [to, setTo] = useState<string | null>(null);
  const [category, setCategory] = useState('Food');
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);

  return (
    <View className="gap-y-3">
      <View className="flex-row flex-wrap items-center gap-3">
        <Segmented options={types} value={type} onChange={setType} />
        <Segmented options={ranges} value={range} onChange={setRange} />
        <Segmented
          options={ranges}
          value="6M"
          onChange={() => {}}
          disabled
        />
      </View>
      <ChipRow options={accounts} value={from} onChange={setFrom} />
      <ChipRow
        options={accounts.map(a => ({ ...a, dimmed: a.value === from }))}
        value={to}
        onChange={setTo}
      />
      <ChipRow options={categories} value={category} onChange={setCategory} />
      <View className="flex-row flex-wrap items-center gap-3">
        <Button variant="primary" label="Add" icon={plus} onPress={() => {}} />
        <Button variant="ghost" label="Cancel" onPress={() => {}} />
        <Button variant="danger" label="Delete" onPress={() => {}} />
        <Button
          variant="primary"
          label="Ask Finny"
          icon={plus}
          onPress={() => {}}
          disabled
        />
      </View>
      <View className="flex-row items-center gap-3">
        <Toggle value={on} onChange={setOn} accessibilityLabel="On" />
        <Toggle value={off} onChange={setOff} accessibilityLabel="Off" />
        <Toggle
          value
          onChange={() => {}}
          accessibilityLabel="Disabled"
          disabled
        />
      </View>
    </View>
  );
}
