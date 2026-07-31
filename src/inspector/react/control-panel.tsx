import React from 'react';
import { createElement } from 'react';
import { InspectorState } from '../types.js';

export interface ControlPanelProps {
  state: InspectorState;
  setState: React.Dispatch<React.SetStateAction<InspectorState>>;
  controls?: Record<string, any>;
  componentType: string;
}

export function ControlPanel({ state, setState, controls, componentType }: ControlPanelProps) {
  if (!controls) return null;

  const renderControl = (key: string, control: any) => {
    const label = control.label || key;
    const type = control.type || 'text';

    switch (type) {
      case 'text':
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '150px', fontSize: '14px' }}>{label}:</label>
            <input
              type="text"
              value={state[key as keyof InspectorState] as string || ''}
              onChange={(e) => setState({ ...state, [key]: e.target.value })}
              style={{ padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        );
      case 'checkbox':
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '150px', fontSize: '14px' }}>{label}:</label>
            <input
              type="checkbox"
              checked={state[key as keyof InspectorState] as boolean}
              onChange={(e) => setState({ ...state, [key]: e.target.checked })}
            />
          </div>
        );
      case 'select':
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '150px', fontSize: '14px' }}>{label}:</label>
            <select
              value={state[key as keyof InspectorState] as string}
              onChange={(e) => setState({ ...state, [key]: e.target.value })}
              style={{ padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {control.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case 'range':
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ width: '150px', fontSize: '14px' }}>{label}:</label>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={state[key as keyof InspectorState] as number}
              onChange={(e) => setState({ ...state, [key]: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span style={{ width: '40px', textAlign: 'right', fontSize: '12px' }}>
              {state[key as keyof InspectorState] as number}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ 
      width: '250px', 
      padding: '16px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        Component Controls
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(controls).map(([key, control]) => renderControl(key, control))}
      </div>
    </div>
  );
}