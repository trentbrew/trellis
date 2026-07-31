import React, { useState, useEffect } from 'react';
import { createComboboxCore } from '../combobox/core/index.js';
import type { ComboboxConfig } from '../combobox/core/types.js';

export function InspectorExample() {
  const [items, setItems] = useState([
    { id: 'task-1', label: 'Complete report', keywords: ['work', 'urgent'], group: 'Work' },
    { id: 'task-2', label: 'Meeting with team', keywords: ['sync', 'meeting'], group: 'Team' },
    { id: 'task-3', label: 'Review pull request', keywords: ['code', 'review'], group: 'Code' },
    { id: 'task-4', label: 'Update documentation', keywords: ['doc', 'update'], group: 'Documentation' },
  ]);

  const [descriptor, setDescriptor] = useState<ComboboxConfig>({ items });

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>Combobox Inspector Example</h2>
      <p>Use this inspector to test and explore the Combobox component with different configurations.</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', alignItems: 'center' }}>
          <label>Query:</label>
          <input
            type="text"
            placeholder="Search..."
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />

          <label>Items:</label>
          <textarea
            value={JSON.stringify(items, null, 2)}
            onChange={(e) => {
              try {
                setItems(JSON.parse(e.target.value));
              } catch (error) {
                console.error('Invalid JSON:', error);
              }
            }}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4', fontFamily: 'monospace', fontSize: '12px' }}
          />

          <label>Close on select:</label>
          <input type="checkbox" defaultChecked />

          <label>Wrap selection:</label>
          <input type="checkbox" defaultChecked />
        </div>
      </div>

      <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
        <h3>Rendered Component</h3>
        <Inspector
          componentType="combobox"
          descriptor={descriptor}
          framework="react"
          height="300px"
          showControls={false}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Component State</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(descriptor, null, 2)}
        </pre>
      </div>
    </div>
  );
}